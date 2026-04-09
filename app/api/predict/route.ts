import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { mockDb } from '@/lib/mock-db';
import { meanSquaredError, predict } from '@/utils/polynomialRegression';
import type { CrowdStatus } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const fromDate = thirtyDaysAgo.toISOString();

    let logList: { type: string; created_at: string }[] = [];

    if (supabaseServer) {
      const { data: logs, error } = await supabaseServer
        .from('vehicle_logs')
        .select('type, created_at')
        .gte('created_at', fromDate)
        .eq('type', 'entry');

      if (error) throw error;
      logList = (logs ?? []) as { type: string; created_at: string }[];
    } else {
      const logs = mockDb.vehicleLogs.selectSince(fromDate).filter((l) => l.type === 'entry');
      logList = logs.map((l) => ({ type: l.type, created_at: l.created_at }));
    }

    const byDateMap = new Map<string, number>();
    for (const log of logList) {
      const dateKey = log.created_at.slice(0, 10);
      byDateMap.set(dateKey, (byDateMap.get(dateKey) ?? 0) + 1);
    }

    const sortedDates = Array.from(byDateMap.keys()).sort();
    const dataPoints = sortedDates.map((date, i) => ({
      x: i,
      y: byDateMap.get(date) ?? 0,
    }));

    const nextDayIndex = dataPoints.length;
    const predictedInflow = Math.max(
      0,
      Math.round(predict(dataPoints, nextDayIndex))
    );
    const mse = meanSquaredError(dataPoints);

    let highLimit = 5000;
    let criticalLimit = 8000;
    if (supabaseServer) {
      const { data: configData } = await supabaseServer
        .from('threshold_config')
        .select('*')
        .limit(1)
        .single();
      type ThresholdRow = { high_limit?: number; critical_limit?: number };
      const config = configData as ThresholdRow | null;
      highLimit = config?.high_limit ?? 5000;
      criticalLimit = config?.critical_limit ?? 8000;
    } else {
      const t = mockDb.threshold.get();
      highLimit = t.high_limit;
      criticalLimit = t.critical_limit;
    }

    let predictedStatus: CrowdStatus = 'normal';
    if (predictedInflow >= criticalLimit) predictedStatus = 'critical';
    else if (predictedInflow >= highLimit) predictedStatus = 'high';

    return NextResponse.json({ predictedInflow, predictedStatus, mse });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to predict' },
      { status: 500 }
    );
  }
}
