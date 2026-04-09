import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { mockDb } from '@/lib/mock-db';

export async function GET() {
  try {
    if (supabaseServer) {
      const { data, error } = await supabaseServer
        .from('tourist_places')
        .select('*')
        .order('name');

      if (error) throw error;
      return NextResponse.json(data ?? []);
    }

    const places = mockDb.touristPlaces.selectAll();
    return NextResponse.json(places.sort((a, b) => a.name.localeCompare(b.name)));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch places' },
      { status: 500 }
    );
  }
}
