import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { mockDb } from '@/lib/mock-db';
import { classifyCrowd } from '@/utils/locations';
import type { CrowdStatus, LocationCrowdSummary } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/current-crowd                       - aggregate across all active locations
 * GET /api/current-crowd?location_id=...       - per-location crowd
 * GET /api/current-crowd?location_slug=xxx     - per-location crowd by slug
 * GET /api/current-crowd?summary=1             - return per-location list (homepage)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('location_id');
    const locationSlug = searchParams.get('location_slug');
    const wantSummary = searchParams.get('summary') === '1';

    if (wantSummary) {
      return NextResponse.json(await buildSummary());
    }

    let resolvedId = locationId;
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

    return NextResponse.json(await buildCrowd(resolvedId));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch crowd data' },
      { status: 500 },
    );
  }
}

async function buildCrowd(locationId: string | null) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  if (supabaseServer) {
    const activeQ = supabaseServer
      .from('active_vehicles')
      .select('id', { count: 'exact', head: true });
    const entriesQ = supabaseServer
      .from('vehicle_logs')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'entry')
      .gte('created_at', todayStart.toISOString());
    const exitsQ = supabaseServer
      .from('vehicle_logs')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'exit')
      .gte('created_at', todayStart.toISOString());

    const filteredActive = locationId ? activeQ.eq('location_id', locationId) : activeQ;
    const filteredEntries = locationId ? entriesQ.eq('location_id', locationId) : entriesQ;
    const filteredExits = locationId ? exitsQ.eq('location_id', locationId) : exitsQ;

    const [activeRes, entriesRes, exitsRes] = await Promise.all([
      filteredActive,
      filteredEntries,
      filteredExits,
    ]);

    const activeVehicles = activeRes.count ?? 0;
    const totalEntries = entriesRes.count ?? 0;
    const totalExits = exitsRes.count ?? 0;

    let normal = 2000, high = 5000, critical = 8000;
    let location: { id: string; slug: string; name: string } | undefined;
    if (locationId) {
      const { data } = await supabaseServer
        .from('locations')
        .select('id, slug, name, normal_limit, high_limit, critical_limit')
        .eq('id', locationId)
        .single();
      if (data) {
        normal = data.normal_limit;
        high = data.high_limit;
        critical = data.critical_limit;
        location = { id: data.id, slug: data.slug, name: data.name };
      }
    } else {
      const { data: cfg } = await supabaseServer
        .from('threshold_config')
        .select('normal_limit, high_limit, critical_limit')
        .limit(1)
        .single();
      if (cfg) {
        normal = cfg.normal_limit;
        high = cfg.high_limit;
        critical = cfg.critical_limit;
      }
    }

    const status = classifyCrowd(activeVehicles, {
      normal_limit: normal,
      high_limit: high,
      critical_limit: critical,
    });

    return {
      activeVehicles,
      totalEntries,
      totalExits,
      status,
      thresholds: { normal, high, critical },
      ...(location ? { location } : {}),
    };
  }

  const logs = mockDb.vehicleLogs.selectSince(todayStart.toISOString(), locationId ?? undefined);
  const totalEntries = logs.filter((l) => l.type === 'entry').length;
  const totalExits = logs.filter((l) => l.type === 'exit').length;
  const activeVehicles = mockDb.activeVehicles.count(locationId ?? undefined);

  let normal = 2000, high = 5000, critical = 8000;
  let location: { id: string; slug: string; name: string } | undefined;
  if (locationId) {
    const loc = mockDb.locations.findById(locationId);
    if (loc) {
      normal = loc.normal_limit;
      high = loc.high_limit;
      critical = loc.critical_limit;
      location = { id: loc.id, slug: loc.slug, name: loc.name };
    }
  } else {
    const t = mockDb.threshold.get();
    normal = t.normal_limit;
    high = t.high_limit;
    critical = t.critical_limit;
  }

  const status: CrowdStatus = classifyCrowd(activeVehicles, {
    normal_limit: normal,
    high_limit: high,
    critical_limit: critical,
  });

  return {
    activeVehicles,
    totalEntries,
    totalExits,
    status,
    thresholds: { normal, high, critical },
    ...(location ? { location } : {}),
  };
}

async function buildSummary(): Promise<LocationCrowdSummary[]> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  if (supabaseServer) {
    // Fetch locations + ALL counts in parallel using one big SQL trip per type
    // (3 round-trips total instead of 1 + 3*N).
    const todayIso = todayStart.toISOString();
    const [locsRes, activeRes, entriesRes, exitsRes] = await Promise.all([
      supabaseServer
        .from('locations')
        .select('id, slug, name, category, district, center_lat, center_lon, max_capacity, normal_limit, high_limit, critical_limit')
        .eq('is_active', true)
        .order('name'),
      supabaseServer
        .from('active_vehicles')
        .select('location_id'),
      supabaseServer
        .from('vehicle_logs')
        .select('location_id')
        .eq('type', 'entry')
        .gte('created_at', todayIso),
      supabaseServer
        .from('vehicle_logs')
        .select('location_id')
        .eq('type', 'exit')
        .gte('created_at', todayIso),
    ]);

    // Group counts by location_id client-side
    const tally = (rows: { location_id: string | null }[] | null) => {
      const m = new Map<string, number>();
      for (const r of rows ?? []) {
        if (!r.location_id) continue;
        m.set(r.location_id, (m.get(r.location_id) ?? 0) + 1);
      }
      return m;
    };
    const activeMap = tally(activeRes.data);
    const entriesMap = tally(entriesRes.data);
    const exitsMap = tally(exitsRes.data);

    return (locsRes.data ?? []).map((loc) => {
      const av = activeMap.get(loc.id) ?? 0;
      return {
        location: {
          id: loc.id,
          slug: loc.slug,
          name: loc.name,
          category: loc.category,
          district: loc.district,
          center_lat: loc.center_lat,
          center_lon: loc.center_lon,
          max_capacity: loc.max_capacity,
        },
        activeVehicles: av,
        todayEntries: entriesMap.get(loc.id) ?? 0,
        todayExits: exitsMap.get(loc.id) ?? 0,
        status: classifyCrowd(av, loc),
        capacityPercent: loc.max_capacity > 0 ? Math.min(100, Math.round((av / loc.max_capacity) * 100)) : 0,
      };
    });
  }

  return mockDb.locations.selectAll().map((loc) => {
    const av = mockDb.activeVehicles.count(loc.id);
    const todays = mockDb.vehicleLogs.selectSince(todayStart.toISOString(), loc.id);
    return {
      location: {
        id: loc.id,
        slug: loc.slug,
        name: loc.name,
        category: loc.category,
        district: loc.district,
        center_lat: loc.center_lat,
        center_lon: loc.center_lon,
        max_capacity: loc.max_capacity,
      },
      activeVehicles: av,
      todayEntries: todays.filter((l) => l.type === 'entry').length,
      todayExits: todays.filter((l) => l.type === 'exit').length,
      status: classifyCrowd(av, loc),
      capacityPercent: loc.max_capacity > 0 ? Math.min(100, Math.round((av / loc.max_capacity) * 100)) : 0,
    };
  });
}
