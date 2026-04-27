'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { CrowdStatus, LocationCrowdSummary } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsData {
  byDate: { date: string; entries: number; exits: number }[];
  byHour: { hour: number; entries: number; exits: number }[];
}

interface PredictionData {
  predictedInflow: number;
  predictedStatus: CrowdStatus;
  mse: number;
  modelName?: string;
  components?: { level: number; trend: number; seasonality: number };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ADMIN_USERNAME = 'peppa_pig';
const ADMIN_PASSWORD = '1234';

const STATUS_BADGE: Record<CrowdStatus, string> = {
  normal: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  high: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  critical: 'bg-red-500/15 text-red-300 border-red-500/25',
};

const CHART_TOOLTIP_STYLE = {
  background: '#0a1628',
  border: '1px solid rgba(13,148,136,0.2)',
  borderRadius: '10px',
  color: '#cbd5e1',
  fontSize: 12,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [isAuth, setIsAuth] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [summaries, setSummaries] = useState<LocationCrowdSummary[]>([]);
  const [selectedLocId, setSelectedLocId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [tab, setTab] = useState<'overview' | 'analytics' | 'forecast' | 'quotas'>('overview');
  const [quotaSaving, setQuotaSaving] = useState<string | null>(null);
  const [quotaEdits, setQuotaEdits] = useState<Record<string, string>>({});

  // ─── Data fetching ─────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const locParam = selectedLocId ? `?location_id=${selectedLocId}` : '';
      const [sumRes, analyticsRes, predRes] = await Promise.all([
        fetch('/api/current-crowd?summary=1', { cache: 'no-store' }),
        fetch(`/api/analytics${locParam}`, { cache: 'no-store' }),
        fetch(`/api/predict${locParam}`, { cache: 'no-store' }),
      ]);
      if (sumRes.ok) setSummaries(await sumRes.json());
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      if (predRes.ok) setPrediction(await predRes.json());
      setLastUpdated(new Date());
    } catch {
      // Non-fatal
    } finally {
      setLoading(false);
    }
  }, [selectedLocId]);

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_auth');
    if (saved === 'ok') { setIsAuth(true); return; }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAuth) return;
    setLoading(true);
    fetchData();
    const t = setInterval(fetchData, 30_000);
    return () => clearInterval(t);
  }, [isAuth, fetchData]);

  // ─── Auth ──────────────────────────────────────────────────────────────────

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_auth', 'ok');
      setIsAuth(true);
      setLoading(true);
    } else {
      setAuthError('Invalid credentials');
    }
  };

  // ─── Derived data ──────────────────────────────────────────────────────────

  const selectedSummary = selectedLocId
    ? summaries.find((s) => s.location.id === selectedLocId) ?? null
    : null;

  // PDF / Print export
  const handleExport = () => {
    const rows = summaries
      .map((s) =>
        `${s.location.name}\t${s.status}\t${s.activeVehicles}\t${s.todayEntries}\t${s.todayExits}\t${s.capacityPercent}%`
      )
      .join('\n');
    const header = 'Location\tStatus\tActive\tEntries\tExits\tCapacity %';
    const blob = new Blob([`SmartTour Report — ${new Date().toLocaleString()}\n\n${header}\n${rows}`], {
      type: 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smarttour-report-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveQuota = async (locationId: string) => {
    const raw = quotaEdits[locationId];
    const newVal = raw === '' ? null : parseInt(raw, 10);
    if (newVal !== null && isNaN(newVal)) return;
    setQuotaSaving(locationId);
    try {
      await fetch('/api/locations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: locationId, daily_quota: newVal }),
      });
      setQuotaEdits((prev) => { const n = { ...prev }; delete n[locationId]; return n; });
      fetchData();
    } finally {
      setQuotaSaving(null);
    }
  };

  const totalActive = summaries.reduce((s, x) => s + x.activeVehicles, 0);
  const totalEntries = summaries.reduce((s, x) => s + x.todayEntries, 0);
  const criticalCount = summaries.filter((s) => s.status === 'critical').length;

  const lineData = (analytics?.byDate ?? []).slice(-14).map((d) => ({
    name: d.date.slice(5),
    Entries: d.entries,
    Exits: d.exits,
  }));

  const barData = (analytics?.byHour ?? []).filter((d) => d.hour >= 6 && d.hour <= 22).map((d) => ({
    name: `${d.hour}h`,
    Entries: d.entries,
    Exits: d.exits,
  }));

  // ─── Login screen ──────────────────────────────────────────────────────────

  if (!isAuth) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-3xl p-8 max-w-sm w-full border border-teal-500/20 teal-glow"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-xl">
              🔒
            </div>
            <div>
              <h1 className="font-bold text-blue-100">Admin Dashboard</h1>
              <p className="text-xs text-blue-200/40">SmartTour Operations</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-blue-200/60 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-navy-800/60 border border-teal-500/20 focus:border-teal-500 focus:outline-none text-blue-100 text-sm"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-blue-200/60 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-navy-800/60 border border-teal-500/20 focus:border-teal-500 focus:outline-none text-blue-100 text-sm"
                required
              />
            </div>
            {authError && <p className="text-red-400 text-xs">{authError}</p>}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 font-semibold text-white text-sm shadow-teal"
            >
              Sign In
            </button>
          </form>
          <div className="mt-4 p-3 rounded-xl bg-navy-800/40 border border-teal-500/10 text-xs text-blue-200/30 space-y-0.5">
            <p>user: peppa_pig</p>
            <p>pass: 1234</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-navy-900">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-navy-900/80 backdrop-blur-xl border-b border-teal-500/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-600 to-teal-500 flex items-center justify-center font-bold text-white text-xs">
                ST
              </div>
              <span className="text-sm font-bold text-gradient hidden sm:block">SmartTour</span>
            </Link>
            <span className="text-blue-200/20">/</span>
            <span className="text-sm font-semibold text-blue-200/60">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-blue-200/30 hidden sm:block">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => { setLoading(true); fetchData(); }}
              className="text-xs text-teal-400 hover:text-teal-300 font-medium px-3 py-1.5 rounded-lg glass border border-teal-500/15"
            >
              ↺ Refresh
            </button>
            <button
              onClick={() => { sessionStorage.removeItem('admin_auth'); setIsAuth(false); }}
              className="text-xs text-blue-200/30 hover:text-red-400"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header + location selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-extrabold text-blue-100">Operations Dashboard</h1>
            <p className="text-xs text-blue-200/40 mt-0.5">Real-time crowd analytics across 10 locations</p>
          </div>
          <select
            value={selectedLocId ?? ''}
            onChange={(e) => setSelectedLocId(e.target.value || null)}
            className="px-4 py-2 rounded-xl bg-navy-800/60 border border-teal-500/20 text-blue-100 text-sm focus:outline-none focus:border-teal-500"
          >
            <option value="">All Locations</option>
            {summaries.map((s) => (
              <option key={s.location.id} value={s.location.id}>
                {s.location.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {[
                {
                  label: selectedSummary ? 'Active Now' : 'Total Active',
                  value: selectedSummary ? selectedSummary.activeVehicles : totalActive,
                  icon: '🚗',
                  sub: 'vehicles',
                },
                {
                  label: "Today's Entries",
                  value: selectedSummary ? selectedSummary.todayEntries : totalEntries,
                  icon: '📥',
                  sub: 'vehicles in',
                },
                {
                  label: 'Critical Locations',
                  value: criticalCount,
                  icon: '🚨',
                  sub: 'at limit',
                },
                {
                  label: "Tomorrow's Forecast",
                  value: prediction?.predictedInflow ?? '—',
                  icon: '🤖',
                  sub: prediction?.predictedStatus ?? '…',
                },
              ].map((kpi, i) => (
                <motion.div
                  key={kpi.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="glass rounded-2xl p-4 border border-teal-500/15"
                >
                  <div className="text-xl mb-2">{kpi.icon}</div>
                  <p className="text-2xl font-bold text-blue-100">{kpi.value}</p>
                  <p className="text-xs text-blue-200/40 mt-0.5">{kpi.label}</p>
                  <p className="text-xs text-blue-200/25 capitalize">{kpi.sub}</p>
                </motion.div>
              ))}
            </div>

            {/* Tab bar + Export */}
            <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
              <div className="flex gap-1 p-1 glass rounded-xl border border-teal-500/10 w-fit">
                {(['overview', 'analytics', 'forecast', 'quotas'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 capitalize ${
                      tab === t
                        ? 'bg-teal-600/25 border border-teal-500/30 text-teal-300'
                        : 'text-blue-200/40 hover:text-blue-200/60'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl glass border border-teal-500/20 text-teal-300 text-xs font-semibold hover:border-teal-500/40 transition-all"
              >
                📄 Export Report
              </button>
            </div>

            <AnimatePresence mode="wait">
              {/* ── Overview tab ─────────────────────────────────────────── */}
              {tab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {summaries.map((s, i) => (
                    <motion.button
                      key={s.location.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => setSelectedLocId(s.location.id === selectedLocId ? null : s.location.id)}
                      className={`glass rounded-2xl p-4 border text-left transition-all duration-150 group ${
                        s.location.id === selectedLocId
                          ? 'border-teal-500/50 bg-teal-500/5'
                          : 'border-teal-500/15 hover:border-teal-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-sm text-blue-100 group-hover:text-teal-300 transition-colors">
                          {s.location.name}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${STATUS_BADGE[s.status]}`}>
                          {s.status}
                        </span>
                      </div>
                      {/* Capacity bar */}
                      <div className="mb-2">
                        <div className="h-1.5 rounded-full bg-navy-800/80 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              s.status === 'critical'
                                ? 'bg-red-400'
                                : s.status === 'high'
                                  ? 'bg-amber-400'
                                  : 'bg-emerald-400'
                            }`}
                            style={{ width: `${s.capacityPercent}%` }}
                          />
                        </div>
                        <p className="text-xs text-blue-200/30 mt-1 text-right">{s.capacityPercent}% capacity</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div>
                          <p className="font-bold text-blue-100">{s.activeVehicles}</p>
                          <p className="text-blue-200/30">Active</p>
                        </div>
                        <div>
                          <p className="font-bold text-blue-100">{s.todayEntries}</p>
                          <p className="text-blue-200/30">Entries</p>
                        </div>
                        <div>
                          <p className="font-bold text-blue-100">{s.todayExits}</p>
                          <p className="text-blue-200/30">Exits</p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              )}

              {/* ── Analytics tab ─────────────────────────────────────────── */}
              {tab === 'analytics' && (
                <motion.div
                  key="analytics"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-5"
                >
                  <div className="glass rounded-2xl p-5 border border-teal-500/15">
                    <h3 className="font-semibold text-blue-100 text-sm mb-4">
                      Daily Traffic — Last 14 Days
                      {selectedSummary && (
                        <span className="ml-2 text-blue-200/40 font-normal">({selectedSummary.location.name})</span>
                      )}
                    </h3>
                    <div className="h-64">
                      {lineData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-blue-200/30 text-sm">
                          No data yet. Log some vehicle entries to see analytics.
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={lineData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,148,136,0.1)" />
                            <XAxis dataKey="name" stroke="#475569" fontSize={11} />
                            <YAxis stroke="#475569" fontSize={11} />
                            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                            <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
                            <Line type="monotone" dataKey="Entries" stroke="#14b8a6" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="Exits" stroke="#6366f1" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  <div className="glass rounded-2xl p-5 border border-teal-500/15">
                    <h3 className="font-semibold text-blue-100 text-sm mb-4">Peak Hours Distribution (6am–10pm)</h3>
                    <div className="h-56">
                      {barData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-blue-200/30 text-sm">
                          No hourly data yet.
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={barData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,148,136,0.1)" />
                            <XAxis dataKey="name" stroke="#475569" fontSize={10} />
                            <YAxis stroke="#475569" fontSize={10} />
                            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                            <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
                            <Bar dataKey="Entries" fill="#14b8a6" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="Exits" fill="#6366f1" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── Forecast tab ──────────────────────────────────────────── */}
              {tab === 'forecast' && (
                <motion.div
                  key="forecast"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="glass rounded-2xl p-6 border border-teal-500/20">
                    <div className="flex items-start justify-between mb-5">
                      <div>
                        <p className="text-xs text-blue-200/40 font-medium uppercase tracking-widest mb-1">
                          Tomorrow&apos;s Forecast
                        </p>
                        <p className="text-4xl font-extrabold text-teal-300">
                          {prediction?.predictedInflow ?? '—'}
                        </p>
                        <p className="text-sm text-blue-200/40 mt-1">estimated vehicle entries</p>
                      </div>
                      <span
                        className={`mt-1 px-3 py-1 rounded-full text-sm font-semibold border ${STATUS_BADGE[prediction?.predictedStatus ?? 'normal']}`}
                      >
                        {(prediction?.predictedStatus ?? 'normal').toUpperCase()}
                      </span>
                    </div>

                    {prediction?.components && (
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {[
                          { label: 'Level (L)', value: Math.round(prediction.components.level), desc: 'Baseline' },
                          { label: 'Trend (T)', value: prediction.components.trend.toFixed(1), desc: 'Rate of change' },
                          { label: 'Seasonality (S)', value: prediction.components.seasonality.toFixed(1), desc: 'Day-of-week factor' },
                        ].map((c) => (
                          <div key={c.label} className="glass rounded-xl p-3 border border-teal-500/10 text-center">
                            <p className="text-lg font-bold text-blue-100">{c.value}</p>
                            <p className="text-xs text-teal-400/70 font-medium">{c.label}</p>
                            <p className="text-xs text-blue-200/25">{c.desc}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="p-3 rounded-xl bg-navy-800/40 border border-teal-500/10 space-y-1 text-xs text-blue-200/40">
                      <p>
                        <span className="text-teal-400/70 font-medium">Model:</span>{' '}
                        {prediction?.modelName ?? 'Holt-Winters Triple Exponential Smoothing'}
                      </p>
                      <p>
                        <span className="text-teal-400/70 font-medium">RMSE²:</span>{' '}
                        {typeof prediction?.mse === 'number' ? prediction.mse.toFixed(2) : '—'} (lower is better)
                      </p>
                      <p>
                        <span className="text-teal-400/70 font-medium">Period:</span> 7-day weekly seasonality
                      </p>
                    </div>
                  </div>

                  {/* How it works */}
                  <div className="glass rounded-2xl p-5 border border-teal-500/10 space-y-2">
                    <p className="text-xs font-semibold text-blue-200/50 uppercase tracking-widest mb-3">
                      How Holt-Winters Works
                    </p>
                    {[
                      { icon: 'L', label: 'Level', desc: 'Running average of the series — adapts smoothly via α=0.3' },
                      { icon: 'T', label: 'Trend', desc: 'Rate of growth or decline — captures week-over-week change via β=0.1' },
                      { icon: 'S', label: 'Seasonality', desc: 'Day-of-week multiplier — captures Sat/Sun peaks via γ=0.3, period=7' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-start gap-3 text-xs">
                        <div className="w-6 h-6 rounded-lg bg-teal-600/20 border border-teal-500/20 flex items-center justify-center font-mono font-bold text-teal-400 shrink-0 mt-0.5">
                          {item.icon}
                        </div>
                        <div>
                          <span className="text-blue-200/60 font-semibold">{item.label}: </span>
                          <span className="text-blue-200/35">{item.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ── Quotas tab ────────────────────────────────────────────── */}
              {tab === 'quotas' && (
                <motion.div
                  key="quotas"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  <p className="text-xs text-blue-200/40 mb-4">
                    Daily quota limits entry after a set number of vehicles. Leave blank for unlimited. Changes take effect immediately.
                  </p>
                  {summaries.map((s) => {
                    const editVal = quotaEdits[s.location.id];
                    const displayVal = editVal !== undefined ? editVal : (s.location as { daily_quota?: number | null }).daily_quota ?? '';
                    const isDirty = editVal !== undefined;
                    return (
                      <div
                        key={s.location.id}
                        className="glass rounded-2xl p-4 border border-teal-500/15 flex flex-col sm:flex-row sm:items-center gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-blue-100 text-sm">{s.location.name}</p>
                          <p className="text-xs text-blue-200/30">{s.location.district} · Cap {s.location.max_capacity.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            placeholder="No limit"
                            value={displayVal}
                            onChange={(e) => setQuotaEdits((prev) => ({ ...prev, [s.location.id]: e.target.value }))}
                            className="w-28 px-3 py-2 rounded-xl bg-navy-800/60 border border-teal-500/20 focus:border-teal-500 focus:outline-none text-blue-100 text-sm text-center"
                          />
                          <span className="text-xs text-blue-200/30">/ day</span>
                          {isDirty && (
                            <button
                              onClick={() => handleSaveQuota(s.location.id)}
                              disabled={quotaSaving === s.location.id}
                              className="px-3 py-2 rounded-xl bg-teal-600/20 border border-teal-500/30 text-teal-300 text-xs font-semibold hover:bg-teal-600/30 disabled:opacity-50"
                            >
                              {quotaSaving === s.location.id ? '…' : 'Save'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
