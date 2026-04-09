import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { mockDb } from '@/lib/mock-db';
import type { CrowdStatus } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (supabaseServer) {
      const [activeRes, entriesRes, exitsRes, configRes] = await Promise.all([
        supabaseServer.from('active_vehicles').select('id', { count: 'exact', head: true }),
        supabaseServer.from('vehicle_logs').select('id', { count: 'exact', head: true }).eq('type', 'entry'),
        supabaseServer.from('vehicle_logs').select('id', { count: 'exact', head: true }).eq('type', 'exit'),
        supabaseServer.from('threshold_config').select('*').limit(1).single(),
      ]);

      if (activeRes.error) throw activeRes.error;
      if (entriesRes.error) throw entriesRes.error;
      if (exitsRes.error) throw exitsRes.error;

      const totalEntries = entriesRes.count ?? 0;
      const totalExits = exitsRes.count ?? 0;
      const activeVehicles = activeRes.count ?? 0;

      type ThresholdRow = { normal_limit: number; high_limit: number; critical_limit: number };
      const config = configRes.data as ThresholdRow | null;
      const normalLimit = config?.normal_limit ?? 2000;
      const highLimit = config?.high_limit ?? 5000;
      const criticalLimit = config?.critical_limit ?? 8000;

      let status: CrowdStatus = 'normal';
      if (activeVehicles >= criticalLimit) status = 'critical';
      else if (activeVehicles >= highLimit) status = 'high';

      return NextResponse.json({
        activeVehicles,
        totalEntries,
        totalExits,
        status,
        thresholds: { normal: normalLimit, high: highLimit, critical: criticalLimit },
      });
    }

    const logs = mockDb.vehicleLogs.selectAll();
    const totalEntries = logs.filter((l) => l.type === 'entry').length;
    const totalExits = logs.filter((l) => l.type === 'exit').length;
    const activeVehicles = mockDb.activeVehicles.count();
    const t = mockDb.threshold.get();

    let status: CrowdStatus = 'normal';
    if (activeVehicles >= t.critical_limit) status = 'critical';
    else if (activeVehicles >= t.high_limit) status = 'high';

    return NextResponse.json({
      activeVehicles,
      totalEntries,
      totalExits,
      status,
      thresholds: { normal: t.normal_limit, high: t.high_limit, critical: t.critical_limit },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch crowd data' },
      { status: 500 }
    );
  }
}
