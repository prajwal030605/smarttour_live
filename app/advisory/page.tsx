'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import type { LocationCrowdSummary, CrowdStatus } from '@/types';

const STATUS_META: Record<CrowdStatus, { label: string; color: string; bar: string; badge: string; dot: string }> = {
  normal: {
    label: 'Normal',
    color: 'border-emerald-500/30 bg-emerald-500/5',
    bar: 'bg-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
    dot: 'bg-emerald-400',
  },
  high: {
    label: 'High',
    color: 'border-amber-500/30 bg-amber-500/5',
    bar: 'bg-amber-400',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
    dot: 'bg-amber-400 animate-pulse',
  },
  critical: {
    label: 'Critical',
    color: 'border-red-500/30 bg-red-500/5',
    bar: 'bg-red-400',
    badge: 'bg-red-500/15 text-red-300 border-red-500/25',
    dot: 'bg-red-400 animate-pulse',
  },
};

const CATEGORY_EMOJI: Record<string, string> = {
  'Hill Station': '🏔️',
  'Religious': '🛕',
  'Religious + Adventure': '🕉️',
  'Adventure': '⛷️',
  'Wildlife': '🐯',
  'Trekking': '🌸',
};

export default function AdvisoryPage() {
  const [summaries, setSummaries] = useState<LocationCrowdSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filter, setFilter] = useState<CrowdStatus | 'all'>('all');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/current-crowd?summary=1', { cache: 'no-store' });
      if (res.ok) {
        setSummaries(await res.json());
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

  const filtered = filter === 'all' ? summaries : summaries.filter((s) => s.status === filter);
  const totalActive = summaries.reduce((s, x) => s + x.activeVehicles, 0);
  const criticalCount = summaries.filter((s) => s.status === 'critical').length;
  const highCount = summaries.filter((s) => s.status === 'high').length;

  return (
    <div className="min-h-screen bg-navy-900 text-foreground">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-navy-900/80 backdrop-blur-xl border-b border-teal-500/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-600 to-teal-500 flex items-center justify-center font-bold text-white text-xs shadow-teal">
              ST
            </div>
            <span className="font-bold text-sm text-gradient hidden sm:block">SmartTour</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span className="text-xs text-teal-300/70 font-medium">Live</span>
            </div>
            {lastUpdated && (
              <span className="text-xs text-blue-200/30 hidden sm:block">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <Link
              href="/register"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-600/15 border border-teal-500/25 text-teal-300 text-xs font-semibold hover:bg-teal-600/25"
            >
              🚗 Register
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-100 mb-1">
            Live Crowd <span className="text-gradient">Advisory</span>
          </h1>
          <p className="text-blue-200/50 text-sm">
            Real-time crowd levels across 10 Uttarakhand destinations. Auto-refreshes every 30s.
          </p>
        </motion.div>

        {/* Summary stats */}
        {!loading && summaries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8"
          >
            {[
              { label: 'Total Active', value: totalActive.toLocaleString(), icon: '🚗', sub: 'vehicles now' },
              { label: 'Locations', value: summaries.length, icon: '📍', sub: 'monitored' },
              { label: 'High Alert', value: highCount, icon: '⚠️', sub: 'locations' },
              { label: 'Critical', value: criticalCount, icon: '🚨', sub: 'locations' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="glass rounded-2xl p-4 border border-teal-500/15 text-center"
              >
                <div className="text-2xl mb-1">{stat.icon}</div>
                <div className="text-xl font-bold text-blue-100">{stat.value}</div>
                <div className="text-xs text-blue-200/40 font-medium">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Filter tabs */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {(['all', 'normal', 'high', 'critical'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                filter === f
                  ? 'bg-teal-600/25 border-teal-500/40 text-teal-300'
                  : 'bg-transparent border-teal-500/10 text-blue-200/40 hover:border-teal-500/25 hover:text-blue-200/60'
              }`}
            >
              {f === 'all' ? `All (${summaries.length})` : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Locations grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((s, i) => {
              const meta = STATUS_META[s.status];
              const emoji = CATEGORY_EMOJI[s.location.category] ?? '🗺️';
              return (
                <motion.div
                  key={s.location.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -3 }}
                  className={`glass rounded-2xl p-5 border ${meta.color} transition-all duration-200 group`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-navy-800/60 border border-teal-500/15 flex items-center justify-center text-xl shrink-0">
                        {emoji}
                      </div>
                      <div>
                        <h3 className="font-bold text-blue-100 text-sm group-hover:text-teal-300 transition-colors">
                          {s.location.name}
                        </h3>
                        <p className="text-xs text-blue-200/40">{s.location.district}</p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${meta.badge}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </span>
                  </div>

                  {/* Capacity bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-blue-200/40 mb-1">
                      <span>Capacity</span>
                      <span className="font-semibold text-blue-200/60">
                        {s.capacityPercent}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-navy-800/60 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${s.capacityPercent}%` }}
                        transition={{ duration: 0.8, delay: i * 0.05 + 0.2 }}
                        className={`h-full rounded-full ${meta.bar}`}
                      />
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-base font-bold text-blue-100">{s.activeVehicles}</p>
                      <p className="text-xs text-blue-200/30">Active</p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-blue-100">{s.todayEntries}</p>
                      <p className="text-xs text-blue-200/30">Entries</p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-blue-100">{s.todayExits}</p>
                      <p className="text-xs text-blue-200/30">Exits</p>
                    </div>
                  </div>

                  {/* Category tag */}
                  <div className="mt-3 pt-3 border-t border-teal-500/10">
                    <span className="text-xs text-blue-200/30">{s.location.category}</span>
                    <span className="ml-2 text-xs text-blue-200/20">
                      · Cap {s.location.max_capacity.toLocaleString()}
                    </span>
                  </div>

                  {/* Warning banner */}
                  {s.status === 'critical' && (
                    <div className="mt-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                      ⚠️ At capacity — consider an alternate destination
                    </div>
                  )}
                  {s.status === 'high' && (
                    <div className="mt-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                      Crowded today — expect delays and limited parking
                    </div>
                  )}
                </motion.div>
              );
            })}

            {filtered.length === 0 && (
              <div className="col-span-full text-center py-16 text-blue-200/30 text-sm">
                No locations match this filter.
              </div>
            )}
          </div>
        )}

        {/* Footer tip */}
        <div className="mt-12 glass rounded-2xl p-6 border border-teal-500/15 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-blue-100 text-sm mb-1">Planning a trip?</p>
            <p className="text-xs text-blue-200/40">
              Register your vehicle once — GPS auto-logging handles entry &amp; exit.
            </p>
          </div>
          <Link
            href="/register"
            className="shrink-0 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 text-white text-sm font-semibold hover:from-teal-500 hover:to-teal-400 transition-all shadow-teal"
          >
            🚗 Register Now →
          </Link>
        </div>
      </div>
    </div>
  );
}
