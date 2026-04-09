import { NextResponse } from 'next/server';
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

export async function GET() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const fromDate = thirtyDaysAgo.toISOString();

    if (supabaseServer) {
      const { data: logs, error } = await supabaseServer
        .from('vehicle_logs')
        .select('type, created_at')
        .gte('created_at', fromDate);

      if (error) throw error;

      type LogRow = { type: string; created_at: string };
      const logList: LogRow[] = (logs ?? []) as LogRow[];
      const { byDate, byHour } = computeAnalytics(logList);
      return NextResponse.json({ byDate, byHour });
    }

    const logs = mockDb.vehicleLogs.selectSince(fromDate);
    const logList = logs.map((l) => ({ type: l.type, created_at: l.created_at }));
    const { byDate, byHour } = computeAnalytics(logList);
    return NextResponse.json({ byDate, byHour });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
