'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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
} from 'recharts';
import Sidebar from '@/components/layout/Sidebar';
import type { CrowdStatus } from '@/types';

interface CrowdData {
  activeVehicles: number;
  totalEntries: number;
  totalExits: number;
  status: CrowdStatus;
  thresholds: { normal: number; high: number; critical: number };
}

interface AnalyticsData {
  byDate: { date: string; entries: number; exits: number }[];
  byHour: { hour: number; entries: number; exits: number }[];
}

interface PredictionData {
  predictedInflow: number;
  predictedStatus: CrowdStatus;
  mse: number;
}

interface ThresholdData {
  id?: string;
  normal_limit: number;
  high_limit: number;
  critical_limit: number;
}

const statusColors: Record<CrowdStatus, string> = {
  normal: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  high: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function AdminPage() {
  const [crowd, setCrowd] = useState<CrowdData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [, setThreshold] = useState<ThresholdData | null>(null);
  const [loading, setLoading] = useState(true);
  const [thresholdForm, setThresholdForm] = useState({
    normal_limit: 2000,
    high_limit: 5000,
    critical_limit: 8000,
  });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [crowdRes, analyticsRes, predictRes, thresholdRes] = await Promise.all([
        fetch('/api/current-crowd', { cache: 'no-store' }),
        fetch('/api/analytics', { cache: 'no-store' }),
        fetch('/api/predict', { cache: 'no-store' }),
        fetch('/api/threshold', { cache: 'no-store' }),
      ]);

      if (crowdRes.ok) setCrowd(await crowdRes.json());
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      if (predictRes.ok) setPrediction(await predictRes.json());
      if (thresholdRes.ok) {
        const t = await thresholdRes.json();
        setThreshold(t);
        if (t?.normal_limit != null)
          setThresholdForm({
            normal_limit: t.normal_limit,
            high_limit: t.high_limit,
            critical_limit: t.critical_limit,
          });
      }
    } catch {
      // Silently handle fetch errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveThreshold = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/threshold', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(thresholdForm),
      });
      if (res.ok) {
        const t = await res.json();
        setThreshold(t);
      }
    } finally {
      setSaving(false);
    }
  };

  const lineData = analytics?.byDate?.map((d) => ({
    name: d.date.slice(5),
    entries: d.entries,
    exits: d.exits,
  })) ?? [];

  const barData = analytics?.byHour?.map((d) => ({
    name: `${d.hour}:00`,
    entries: d.entries,
    exits: d.exits,
  })) ?? [];

  const formattedMse =
    typeof prediction?.mse === 'number' ? prediction.mse.toFixed(2) : '--';

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0f0f12]">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold mb-2"
        >
          Admin Dashboard
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="text-zinc-500 mb-6 flex items-center gap-4"
        >
          Monitor crowd status, analytics, and configure thresholds. Data refreshes every 30 seconds.
          <button
            type="button"
            onClick={() => { setLoading(true); fetchData(); }}
            className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
          >
            Refresh now
          </button>
        </motion.p>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass rounded-xl p-6 border border-white/10"
              >
                <p className="text-zinc-500 text-sm">Active Vehicles</p>
                <p className="text-3xl font-bold mt-1">
                  {crowd?.activeVehicles ?? 0}
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="glass rounded-xl p-6 border border-white/10"
              >
                <p className="text-zinc-500 text-sm">Current Status</p>
                <span
                  className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium border ${
                    statusColors[crowd?.status ?? 'normal']
                  }`}
                >
                  {(crowd?.status ?? 'normal').toUpperCase()}
                </span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass rounded-xl p-6 border border-white/10"
              >
                <p className="text-zinc-500 text-sm">Predicted Inflow (Tomorrow)</p>
                <p className="text-3xl font-bold mt-1 text-indigo-400">
                  {prediction?.predictedInflow ?? 0}
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="glass rounded-xl p-6 border border-white/10"
              >
                <p className="text-zinc-500 text-sm">Predicted Status</p>
                <span
                  className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium border ${
                    statusColors[prediction?.predictedStatus ?? 'normal']
                  }`}
                >
                  {(prediction?.predictedStatus ?? 'normal').toUpperCase()}
                </span>
                <p className="text-zinc-500 text-sm mt-3">Model MSE: {formattedMse}</p>
                <p className="text-zinc-600 text-xs mt-1">Lower is better</p>
              </motion.div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass rounded-xl p-6 border border-white/10"
              >
                <h3 className="font-semibold mb-4">Daily Entries (Last 30 Days)</h3>
                <div className="h-64">
                  {lineData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
                      No entry/exit data yet. Log vehicle entries and exits to see analytics.
                    </div>
                  ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="name" stroke="#888" fontSize={12} />
                      <YAxis stroke="#888" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          background: '#1a1a1f',
                          border: '1px solid #333',
                          borderRadius: '8px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="entries"
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={false}
                        name="Entries"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  )}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="glass rounded-xl p-6 border border-white/10"
              >
                <h3 className="font-semibold mb-4">Hourly Distribution</h3>
                <div className="h-64">
                  {barData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
                      No hourly data yet. Entries and exits will appear here.
                    </div>
                  ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="name" stroke="#888" fontSize={10} />
                      <YAxis stroke="#888" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          background: '#1a1a1f',
                          border: '1px solid #333',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="entries" fill="#6366f1" name="Entries" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="exits" fill="#8b5cf6" name="Exits" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Threshold Editor */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass rounded-xl p-6 border border-white/10"
            >
              <h3 className="font-semibold mb-4">Threshold Configuration</h3>
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-sm text-zinc-500 mb-1">Normal Limit</label>
                  <input
                    type="number"
                    value={thresholdForm.normal_limit}
                    onChange={(e) =>
                      setThresholdForm((prev) => ({
                        ...prev,
                        normal_limit: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-indigo-500 focus:outline-none w-32"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-500 mb-1">High Limit</label>
                  <input
                    type="number"
                    value={thresholdForm.high_limit}
                    onChange={(e) =>
                      setThresholdForm((prev) => ({
                        ...prev,
                        high_limit: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-indigo-500 focus:outline-none w-32"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-500 mb-1">Critical Limit</label>
                  <input
                    type="number"
                    value={thresholdForm.critical_limit}
                    onChange={(e) =>
                      setThresholdForm((prev) => ({
                        ...prev,
                        critical_limit: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-indigo-500 focus:outline-none w-32"
                  />
                </div>
                <button
                  onClick={handleSaveThreshold}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-medium"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
