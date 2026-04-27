'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import Link from 'next/link';
import type { LocationCrowdSummary, CrowdStatus } from '@/types';

// Leaflet must not be SSR'd
const CrowdMap = dynamic(() => import('@/components/map/CrowdMap'), { ssr: false });

const STATUS_META: Record<CrowdStatus, { label: string; dot: string }> = {
  normal: { label: 'Normal', dot: 'bg-emerald-400' },
  high: { label: 'High', dot: 'bg-amber-400 animate-pulse' },
  critical: { label: 'Critical', dot: 'bg-red-400 animate-pulse' },
};

export default function MapPage() {
  const [summaries, setSummaries] = useState<LocationCrowdSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selected, setSelected] = useState<LocationCrowdSummary | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/current-crowd?summary=1', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setSummaries(data);
        setLastUpdated(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 30_000);
    return () => clearInterval(t);
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-navy-900/80 backdrop-blur-xl border-b border-teal-500/15 flex items-center justify-between px-4 sm:px-6 h-14">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-600 to-teal-500 flex items-center justify-center font-bold text-white text-xs">
              ST
            </div>
            <span className="font-bold text-sm text-gradient hidden sm:block">SmartTour</span>
          </Link>
          <span className="text-blue-200/20">/</span>
          <span className="text-sm text-blue-200/60 font-semibold">Live Map</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-xs text-teal-300/70 font-medium hidden sm:block">Live · refreshes 30s</span>
          </div>
          <Link href="/advisory" className="text-xs text-blue-200/40 hover:text-teal-300 px-3 py-1.5 rounded-lg glass border border-teal-500/10">
            List View
          </Link>
        </div>
      </nav>

      <div className="flex flex-col lg:flex-row flex-1 gap-0 overflow-hidden">
        {/* Sidebar panel */}
        <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-teal-500/10 bg-navy-900/50 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-teal-500/10">
            <h1 className="font-extrabold text-blue-100 text-base">Uttarakhand Crowd Map</h1>
            <p className="text-xs text-blue-200/40 mt-0.5">
              {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading…'}
            </p>
          </div>

          {/* Legend */}
          <div className="px-4 py-3 border-b border-teal-500/10 flex items-center gap-4">
            {(['normal', 'high', 'critical'] as CrowdStatus[]).map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${STATUS_META[s].dot}`} />
                <span className="text-xs text-blue-200/40 capitalize">{s}</span>
              </div>
            ))}
          </div>

          {/* Location list */}
          <div className="flex-1 overflow-y-auto divide-y divide-teal-500/5">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              summaries.map((s) => (
                <button
                  key={s.location.id}
                  onClick={() => setSelected(selected?.location.id === s.location.id ? null : s)}
                  className={`w-full px-4 py-3 text-left hover:bg-teal-500/5 transition-all duration-150 ${
                    selected?.location.id === s.location.id ? 'bg-teal-500/8' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-blue-100">{s.location.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${STATUS_META[s.status].dot}`} />
                      <span className="text-xs text-blue-200/40 capitalize">{s.status}</span>
                    </div>
                  </div>
                  {/* Mini bar */}
                  <div className="h-1 rounded-full bg-navy-800/60 overflow-hidden mb-1">
                    <div
                      className={`h-full rounded-full ${
                        s.status === 'critical' ? 'bg-red-400' : s.status === 'high' ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${s.capacityPercent}%` }}
                    />
                  </div>
                  <div className="flex gap-3 text-xs text-blue-200/30">
                    <span>{s.activeVehicles} active</span>
                    <span>{s.capacityPercent}% cap</span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Selected detail panel */}
          {selected && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 border-t border-teal-500/20 bg-teal-500/5"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-teal-300 text-sm">{selected.location.name}</p>
                <button onClick={() => setSelected(null)} className="text-blue-200/30 hover:text-blue-200/60 text-xs">✕</button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: 'Active', value: selected.activeVehicles },
                  { label: 'Capacity', value: `${selected.capacityPercent}%` },
                  { label: 'Today Entries', value: selected.todayEntries },
                  { label: 'Today Exits', value: selected.todayExits },
                  { label: 'Max Capacity', value: selected.location.max_capacity.toLocaleString() },
                  { label: 'District', value: selected.location.district ?? '—' },
                ].map((item) => (
                  <div key={item.label} className="glass rounded-lg p-2 text-center border border-teal-500/10">
                    <p className="font-bold text-blue-100">{item.value}</p>
                    <p className="text-blue-200/30">{item.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Map */}
        <div className="flex-1 min-h-[400px] lg:min-h-0 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-navy-900">
              <div className="text-center">
                <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-blue-200/40 text-sm">Loading map…</p>
              </div>
            </div>
          ) : (
            <CrowdMap summaries={summaries} />
          )}

          {/* Map overlay hint */}
          <div className="absolute bottom-4 left-4 z-[400] glass rounded-xl px-3 py-2 border border-teal-500/15 text-xs text-blue-200/40 pointer-events-none">
            Circle size = crowd density · Click marker for details
          </div>
        </div>
      </div>
    </div>
  );
}
