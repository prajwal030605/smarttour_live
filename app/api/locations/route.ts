import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { mockDb } from '@/lib/mock-db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/locations              - list all active locations
 * GET /api/locations?slug=xxx     - fetch one by slug
 * GET /api/locations?id=uuid      - fetch one by id
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const id = searchParams.get('id');

    if (supabaseServer) {
      let query = supabaseServer.from('locations').select('*').eq('is_active', true).order('name');
      if (slug) query = query.eq('slug', slug);
      if (id) query = query.eq('id', id);
      const { data, error } = await query;
      if (error) throw error;
      if (slug || id) {
        return NextResponse.json(data?.[0] ?? null);
      }
      return NextResponse.json(data ?? []);
    }

    if (slug) return NextResponse.json(mockDb.locations.findBySlug(slug));
    if (id) return NextResponse.json(mockDb.locations.findById(id));
    return NextResponse.json(mockDb.locations.selectAll());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch locations' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/locations  - admin endpoint to update thresholds/quota
 * body: { id, normal_limit?, high_limit?, critical_limit?, daily_quota?, max_capacity? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const id: string = body.id;
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    type Patch = Partial<{
      normal_limit: number;
      high_limit: number;
      critical_limit: number;
      daily_quota: number | null;
      max_capacity: number;
      is_active: boolean;
    }>;
    const updates: Patch = {};
    const numFields: (keyof Patch)[] = ['normal_limit', 'high_limit', 'critical_limit', 'daily_quota', 'max_capacity'];
    for (const f of numFields) {
      if (body[f] !== undefined && body[f] !== null && !isNaN(Number(body[f]))) {
        (updates as Record<string, unknown>)[f] = Number(body[f]);
      }
    }
    if (typeof body.is_active === 'boolean') updates.is_active = body.is_active;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    if (supabaseServer) {
      const { data, error } = await supabaseServer
        .from('locations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json(data);
    }

    const updated = mockDb.locations.update(id, updates);
    if (!updated) return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update location' },
      { status: 500 },
    );
  }
}
