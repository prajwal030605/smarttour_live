import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { mockDb } from '@/lib/mock-db';

export async function GET() {
  try {
    if (supabaseServer) {
      const { data, error } = await supabaseServer
        .from('threshold_config')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      return NextResponse.json(data ?? {});
    }
    return NextResponse.json(mockDb.threshold.get());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch thresholds' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const normal_limit = typeof body.normal_limit === 'number' ? body.normal_limit : parseInt(String(body.normal_limit), 10);
    const high_limit = typeof body.high_limit === 'number' ? body.high_limit : parseInt(String(body.high_limit), 10);
    const critical_limit = typeof body.critical_limit === 'number' ? body.critical_limit : parseInt(String(body.critical_limit), 10);

    type ThresholdUpdate = Partial<{
      normal_limit: number;
      high_limit: number;
      critical_limit: number;
    }>;
    const updates: ThresholdUpdate = {};
    if (!isNaN(normal_limit)) updates.normal_limit = normal_limit;
    if (!isNaN(high_limit)) updates.high_limit = high_limit;
    if (!isNaN(critical_limit)) updates.critical_limit = critical_limit;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    if (supabaseServer) {
      const { data: existingData } = await supabaseServer
        .from('threshold_config')
        .select('id')
        .limit(1)
        .single();

      const existing = existingData as { id: string } | null;
      if (existing?.id) {
        const { data, error } = await supabaseServer
          .from('threshold_config')
          .update(updates)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return NextResponse.json(data);
      }
      const { data, error } = await supabaseServer
        .from('threshold_config')
        .insert({
          normal_limit: updates.normal_limit ?? 2000,
          high_limit: updates.high_limit ?? 5000,
          critical_limit: updates.critical_limit ?? 8000,
        })
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json(data);
    }

    const result = mockDb.threshold.update(updates);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update thresholds' },
      { status: 500 }
    );
  }
}
