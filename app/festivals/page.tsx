'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { FESTIVAL_CALENDAR, getActiveFestivals, type FestivalEvent } from '@/utils/festivals';

const CATEGORY_META: Record<FestivalEvent['category'], { icon: string; color: string }> = {
  Religious: { icon: '🛕', color: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
  Cultural: { icon: '🎨', color: 'text-purple-300 bg-purple-500/10 border-purple-500/20' },
  Adventure: { icon: '⛷️', color: 'text-blue-300 bg-blue-500/10 border-blue-500/20' },
  Seasonal: { icon: '🌸', color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' },
};

function MultiplierBadge({ m }: { m: number }) {
  const color = m >= 3 ? 'text-red-300 bg-red-500/10 border-red-500/20' : m >= 2 ? 'text-amber-300 bg-amber-500/10 border-amber-500/20' : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
      ×{m.toFixed(1)} traffic
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function FestivalsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const activeToday = getActiveFestivals(today);
  const [filter, setFilter] = useState<FestivalEvent['category'] | 'All'>('All');

  const sorted = [...FESTIVAL_CALENDAR].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const filtered = filter === 'All' ? sorted : sorted.filter((f) => f.category === filter);

  return (
    <div className="min-h-screen bg-navy-900">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-navy-900/80 backdrop-blur-xl border-b border-teal-500/15 flex items-center justify-between px-4 sm:px-6 h-14">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-600 to-teal-500 flex items-center justify-center font-bold text-white text-xs">ST</div>
            <span className="font-bold text-sm text-gradient hidden sm:block">SmartTour</span>
          </Link>
          <span className="text-blue-200/20">/</span>
          <span className="text-sm text-blue-200/60 font-semibold">Festival Calendar</span>
        </div>
        <Link href="/advisory" className="text-xs text-blue-200/40 hover:text-teal-300 px-3 py-1.5 rounded-lg glass border border-teal-500/10">
          Live Advisory →
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-blue-100 mb-1">
            Festival &amp; Season <span className="text-gradient">Calendar</span>
          </h1>
          <p className="text-blue-200/50 text-sm">
            High-impact events drive tourist surges — the AI forecast uses these multipliers automatically.
          </p>
        </motion.div>

        {/* Active today banner */}
        {activeToday.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 glass rounded-2xl p-4 border border-amber-500/30 bg-amber-500/5"
          >
            <p className="text-xs text-amber-400/70 font-semibold uppercase tracking-widest mb-2">
              🔴 Active Today
            </p>
            <div className="flex flex-wrap gap-2">
              {activeToday.map((f) => (
                <span key={f.id} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-300 text-xs font-semibold">
                  {CATEGORY_META[f.category].icon} {f.name}
                  <span className="opacity-60">×{f.impact_multiplier}</span>
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <div className="flex gap-2 flex-wrap mb-6">
          {(['All', 'Religious', 'Cultural', 'Adventure', 'Seasonal'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                filter === cat
                  ? 'bg-teal-600/25 border-teal-500/40 text-teal-300'
                  : 'bg-transparent border-teal-500/10 text-blue-200/40 hover:border-teal-500/25 hover:text-blue-200/60'
              }`}
            >
              {cat === 'All' ? `All (${FESTIVAL_CALENDAR.length})` : cat}
            </button>
          ))}
        </div>

        {/* Table (desktop) / Cards (mobile) */}
        <div className="hidden sm:block glass rounded-2xl border border-teal-500/15 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-teal-500/10">
              <tr className="text-xs text-blue-200/40 uppercase tracking-widest">
                <th className="text-left px-5 py-3 font-semibold">Festival</th>
                <th className="text-left px-5 py-3 font-semibold">Dates</th>
                <th className="text-left px-5 py-3 font-semibold">Location</th>
                <th className="text-left px-5 py-3 font-semibold">Category</th>
                <th className="text-left px-5 py-3 font-semibold">Traffic Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-500/5">
              {filtered.map((f, i) => {
                const isPast = f.end_date < today;
                const isActive = f.start_date <= today && f.end_date >= today;
                const meta = CATEGORY_META[f.category];
                return (
                  <motion.tr
                    key={f.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className={`transition-colors hover:bg-teal-500/3 ${isPast ? 'opacity-40' : ''} ${isActive ? 'bg-amber-500/5' : ''}`}
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-blue-100 flex items-center gap-2">
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                        {f.name}
                      </p>
                      <p className="text-xs text-blue-200/35 mt-0.5">{f.description}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-blue-200/50">
                      {formatDate(f.start_date)}
                      {f.start_date !== f.end_date && <> – {formatDate(f.end_date)}</>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-teal-400/70 font-medium">
                        {f.applies_to_slug
                          ? f.applies_to_slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
                          : 'All Locations'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${meta.color}`}>
                        {meta.icon} {f.category}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <MultiplierBadge m={f.impact_multiplier} />
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden space-y-3">
          {filtered.map((f, i) => {
            const isActive = f.start_date <= today && f.end_date >= today;
            const meta = CATEGORY_META[f.category];
            return (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`glass rounded-2xl p-4 border ${isActive ? 'border-amber-500/30 bg-amber-500/5' : 'border-teal-500/15'}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-blue-100 text-sm">{f.name}</p>
                    <p className="text-xs text-blue-200/40 mt-0.5">{formatDate(f.start_date)}{f.start_date !== f.end_date && ` – ${formatDate(f.end_date)}`}</p>
                  </div>
                  <MultiplierBadge m={f.impact_multiplier} />
                </div>
                <p className="text-xs text-blue-200/40 mb-2">{f.description}</p>
                <div className="flex gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${meta.color}`}>
                    {meta.icon} {f.category}
                  </span>
                  <span className="text-xs text-teal-400/60">
                    {f.applies_to_slug
                      ? f.applies_to_slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
                      : 'All Locations'}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Model note */}
        <div className="mt-8 glass rounded-2xl p-5 border border-teal-500/10">
          <p className="text-xs font-semibold text-blue-200/50 uppercase tracking-widest mb-2">How This Affects Forecasting</p>
          <p className="text-xs text-blue-200/35 leading-relaxed">
            The Holt-Winters model uses these multipliers to scale tomorrow&apos;s predicted inflow. For example,
            a festival with ×2.8 impact during Holi means the model expects 2.8× the baseline daily inflow.
            When multiple events overlap, the maximum multiplier applies. During off-season months, the
            multiplier is 1.0 (no adjustment).
          </p>
        </div>
      </div>
    </div>
  );
}
