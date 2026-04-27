import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { mockDb } from '@/lib/mock-db';

export const dynamic = 'force-dynamic';

function computeAnalytics(logList: { type: string; created_at: string }[]) {
  const byDateMap = new Map<string, { entries: number; exits: number }>();
  const byHourMap = new Map<number, { entries: number; exits: number }>();

  for (let h = 0; h < 24; h++) {
    byHourMap.set(h, { entries: 0, exits: 0 });
  }

  for (const log of logList) {
    const d = new Date(log.created_at);
    const dateKey = d.toISOString().slice(0, 10);
    const hour = d.getHours();

    if (!byDateMap.has(dateKey)) {
      byDateMap.set(dateKey, { entries: 0, exits: 0 });
    }
    const dayData = byDateMap.get(dateKey)!;
    const hourData = byHourMap.get(hour)!;

    if (log.type === 'entry') {
      dayData.entries++;
      hourData.entries++;
    } else {
      dayData.exits++;
      hourData.exits++;
    }
  }

  const byDate = Array.from(byDateMap.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const byHour = Array.from(byHourMap.entries())
    .map(([hour, v]) => ({ hour, ...v }))
    .sort((a, b) => a.hour - b.hour);

  return { byDate, byHour };
}

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

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const fromDate = thirtyDaysAgo.toISOString();

    if (supabaseServer) {
      let q = supabaseServer
        .from('vehicle_logs')
        .select('type, created_at')
        .gte('created_at', fromDate);
      if (resolvedId) q = q.eq('location_id', resolvedId);
      const { data: logs, error } = await q;
      if (error) throw error;

      const logList = (logs ?? []) as { type: string; created_at: string }[];
      return NextResponse.json(computeAnalytics(logList));
    }

    const logs = mockDb.vehicleLogs.selectSince(fromDate, resolvedId ?? undefined);
    const logList = logs.map((l) => ({ type: l.type, created_at: l.created_at }));
    return NextResponse.json(computeAnalytics(logList));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch analytics' },
      { status: 500 },
    );
  }
}
