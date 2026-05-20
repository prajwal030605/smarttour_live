import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { mockDb } from '@/lib/mock-db';
import { trainHoltWinters } from '@/utils/holtWinters';
import type { CrowdStatus } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/predict                         - forecast across all locations (aggregate)
 * GET /api/predict?location_id=...         - per-location forecast
 * GET /api/predict?location_slug=...       - per-location forecast by slug
 *
 * Model: Holt-Winters Triple Exponential Smoothing (Phase 4)
 * Uses 30 days of daily entry counts, period = 7 (weekly seasonality).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('location_id');
    const locationSlug = searchParams.get('location_slug');

    let resolvedId: string | null = locationId;
    if (!resolvedId && locationSlug) {
      if (supabaseServer) {
        const { data } = await supabaseServer
          .from('locations')
          .select('id')
          .eq('slug', locationSlug)
          .single();
        resolvedId = data?.id ?? null;
      } else {
        resolvedId = mockDb.locations.findBySlug(locationSlug)?.id ?? null;
      }
    }

    // ─── Pull daily entry counts via RPC (bypasses 1000-row cap).
    // Falls back to row-fetch if RPC isn't installed (defensive).
    const byDateMap = new Map<string, number>();

    if (supabaseServer) {
      const { data: dailyData, error: rpcError } = await supabaseServer
        .rpc('get_daily_entry_counts', { loc_id: resolvedId, days_back: 30 });

      if (rpcError) {
        // Fallback: pre-RPC era — fetch rows (capped, but works for small datasets)
        let q = supabaseServer
          .from('vehicle_logs')
          .select('created_at')
          .gte('created_at', new Date(Date.now() - 30 * 86_400_000).toISOString())
          .eq('type', 'entry');
        if (resolvedId) q = q.eq('location_id', resolvedId);
        const { data } = await q;
        for (const log of (data ?? [])) {
          const k = (log.created_at as string).slice(0, 10);
          byDateMap.set(k, (byDateMap.get(k) ?? 0) + 1);
        }
      } else {
        for (const row of (dailyData ?? []) as { entry_date: string; entry_count: number }[]) {
          byDateMap.set(row.entry_date, Number(row.entry_count));
        }
      }
    } else {
      const fromDate = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const logs = mockDb.vehicleLogs
        .selectSince(fromDate, resolvedId ?? undefined)
        .filter((l) => l.type === 'entry');
      for (const l of logs) {
        const k = l.created_at.slice(0, 10);
        byDateMap.set(k, (byDateMap.get(k) ?? 0) + 1);
      }
    }

    // Build dense 30-day series (last 30 calendar days, padded with 0 where missing)
    const series: number[] = [];
    for (let d = 29; d >= 0; d--) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      const key = date.toISOString().slice(0, 10);
      series.push(byDateMap.get(key) ?? 0);
    }

    // Train model and produce a 7-day forecast
    const model = trainHoltWinters(series);
    const forecast7: number[] = [];
    for (let h = 1; h <= 7; h++) forecast7.push(Math.max(0, Math.round(model.forecast(h))));
    const predictedInflow = forecast7[0];
    const mse = Math.round(model.rmse * model.rmse * 100) / 100;

    // Threshold resolution
    let highLimit = 5000;
    let criticalLimit = 8000;
    if (resolvedId) {
      if (supabaseServer) {
        const { data } = await supabaseServer
          .from('locations')
          .select('high_limit, critical_limit')
          .eq('id', resolvedId)
          .single();
        if (data) { highLimit = data.high_limit; criticalLimit = data.critical_limit; }
      } else {
        const loc = mockDb.locations.findById(resolvedId);
        if (loc) { highLimit = loc.high_limit; criticalLimit = loc.critical_limit; }
      }
    } else if (supabaseServer) {
      const { data: cfg } = await supabaseServer
        .from('threshold_config')
        .select('high_limit, critical_limit')
        .limit(1)
        .single();
      if (cfg) { highLimit = cfg.high_limit ?? 5000; criticalLimit = cfg.critical_limit ?? 8000; }
    } else {
      const t = mockDb.threshold.get();
      highLimit = t.high_limit;
      criticalLimit = t.critical_limit;
    }

    let predictedStatus: CrowdStatus = 'normal';
    if (predictedInflow >= criticalLimit) predictedStatus = 'critical';
    else if (predictedInflow >= highLimit) predictedStatus = 'high';

    // Resolve location name for display
    let locationName: string | null = null;
    let locationSlugOut: string | null = null;
    if (resolvedId && supabaseServer) {
      const { data: locRow } = await supabaseServer
        .from('locations')
        .select('name, slug')
        .eq('id', resolvedId)
        .single();
      locationName = locRow?.name ?? null;
      locationSlugOut = locRow?.slug ?? null;
    } else if (resolvedId) {
      const loc = mockDb.locations.findById(resolvedId);
      locationName = loc?.name ?? null;
      locationSlugOut = loc?.slug ?? null;
    }

    // 7-day forecast with day-of-week labels
    const forecastDays = forecast7.map((value, idx) => {
      const date = new Date();
      date.setDate(date.getDate() + idx + 1);
      const dow = date.toLocaleDateString('en-US', { weekday: 'short' });
      const iso = date.toISOString().slice(0, 10);
      let status: CrowdStatus = 'normal';
      if (value >= criticalLimit) status = 'critical';
      else if (value >= highLimit) status = 'high';
      return { date: iso, dow, value, status };
    });

    return NextResponse.json({
      predictedInflow,
      predictedStatus,
      mse,
      modelName: 'Holt-Winters Triple Exponential Smoothing',
      components: model.components,
      locationId: resolvedId,
      locationName,
      locationSlug: locationSlugOut,
      forecast: forecastDays,         // [{date, dow, value, status}] × 7
      historicalSeries: series,        // last 30 days of actuals
      thresholds: { high: highLimit, critical: criticalLimit },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to predict' },
      { status: 500 },
    );
  }
}
