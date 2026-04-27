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

    // Pull 30-day entry log
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const fromDate = thirtyDaysAgo.toISOString();

    let logList: { created_at: string }[] = [];

    if (supabaseServer) {
      let q = supabaseServer
        .from('vehicle_logs')
        .select('created_at')
        .gte('created_at', fromDate)
        .eq('type', 'entry');
      if (resolvedId) q = q.eq('location_id', resolvedId);
      const { data, error } = await q;
      if (error) throw error;
      logList = data ?? [];
    } else {
      const logs = mockDb.vehicleLogs
        .selectSince(fromDate, resolvedId ?? undefined)
        .filter((l) => l.type === 'entry');
      logList = logs.map((l) => ({ created_at: l.created_at }));
    }

    // Aggregate into daily counts, filling in 0-gaps for missing days
    const byDateMap = new Map<string, number>();
    for (const log of logList) {
      const key = log.created_at.slice(0, 10);
      byDateMap.set(key, (byDateMap.get(key) ?? 0) + 1);
    }

    // Build dense 30-day series (last 30 calendar days, padded with 0 where missing)
    const series: number[] = [];
    for (let d = 29; d >= 0; d--) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      const key = date.toISOString().slice(0, 10);
      series.push(byDateMap.get(key) ?? 0);
    }

    // Train model and forecast tomorrow (h=1)
    const model = trainHoltWinters(series);
    const predictedInflow = model.forecast(1);
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

    return NextResponse.json({
      predictedInflow,
      predictedStatus,
      mse,
      modelName: 'Holt-Winters Triple Exponential Smoothing',
      components: model.components,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to predict' },
      { status: 500 },
    );
  }
}
