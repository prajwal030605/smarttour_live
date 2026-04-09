'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '@/components/layout/Sidebar';
import type { CrowdStatus } from '@/types';
import type { TouristPlace } from '@/types';

interface CrowdData {
  status: CrowdStatus;
  activeVehicles: number;
}

interface PredictionData {
  predictedStatus: CrowdStatus;
  predictedInflow: number;
  mse: number;
}

const statusStyles: Record<CrowdStatus, string> = {
  normal: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
  high: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
  critical: 'from-red-500/20 to-red-600/10 border-red-500/30',
};

export default function AdvisoryPage() {
  const [crowd, setCrowd] = useState<CrowdData | null>(null);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [places, setPlaces] = useState<TouristPlace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [crowdRes, predictRes, placesRes] = await Promise.all([
          fetch('/api/current-crowd', { cache: 'no-store' }),
          fetch('/api/predict', { cache: 'no-store' }),
          fetch('/api/places', { cache: 'no-store' }),
        ]);
        if (crowdRes.ok) setCrowd(await crowdRes.json());
        if (predictRes.ok) setPrediction(await predictRes.json());
        if (placesRes.ok) setPlaces(await placesRes.json());
      } catch {
        // Silently handle
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const status = crowd?.status ?? 'normal';
  const predStatus = prediction?.predictedStatus ?? 'normal';
  const formattedMse =
    typeof prediction?.mse === 'number' ? prediction.mse.toFixed(2) : '--';

  // If crowd high/critical → show low crowd places; if normal → show popular (high/medium)
  const isCrowded = status === 'high' || status === 'critical';
  const recommendedPlaces = places.filter((p) =>
    isCrowded ? p.crowd_level === 'low' : ['medium', 'high'].includes(p.crowd_level)
  );
  const otherPlaces = places.filter((p) => !recommendedPlaces.includes(p));

  const recommendationTitle = isCrowded
    ? 'Low Crowd Destinations'
    : 'Popular Destinations';
  const recommendationSubtitle = isCrowded
    ? 'Consider these less crowded spots'
    : 'Great places to visit right now';

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0f0f12]">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold mb-2"
        >
          Tourist Advisory
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-zinc-500 mb-6 max-w-2xl"
        >
          Real-time crowd status for Dehradun & Mussoorie. When crowd levels are high, we recommend less crowded destinations. When normal, popular spots are great to visit.
        </motion.p>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`glass rounded-xl p-6 border bg-gradient-to-br ${statusStyles[status]}`}
              >
                <p className="text-zinc-400 text-sm">Current Status</p>
                <p className="text-2xl font-bold mt-1 capitalize">{status}</p>
                <p className="text-zinc-500 text-sm mt-2">
                  Active vehicles: {crowd?.activeVehicles ?? 0}
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`glass rounded-xl p-6 border bg-gradient-to-br ${statusStyles[predStatus]}`}
              >
                <p className="text-zinc-400 text-sm">Predicted Status (Tomorrow)</p>
                <p className="text-2xl font-bold mt-1 capitalize">{predStatus}</p>
                <p className="text-zinc-500 text-sm mt-2">
                  Predicted inflow: {prediction?.predictedInflow ?? 0}
                </p>
                <p className="text-zinc-500 text-sm mt-1">
                  Model MSE: {formattedMse} (lower is better)
                </p>
              </motion.div>
            </div>

            {/* Recommendations */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass rounded-xl p-6 border border-white/10"
            >
              <h2 className="text-lg font-semibold mb-2">{recommendationTitle}</h2>
              <p className="text-zinc-500 text-sm mb-4">{recommendationSubtitle}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendedPlaces.map((place, i) => (
                  <motion.div
                    key={place.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * i }}
                    className="p-4 rounded-lg bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-colors"
                  >
                    <h3 className="font-semibold">{place.name}</h3>
                    <p className="text-xs text-indigo-400 mt-0.5">{place.category}</p>
                    <p className="text-sm text-zinc-500 mt-2">{place.description}</p>
                    <span
                      className={`inline-block mt-2 px-2 py-0.5 rounded text-xs ${
                        place.crowd_level === 'low'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : place.crowd_level === 'medium'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {place.crowd_level} crowd
                    </span>
                  </motion.div>
                ))}
              </div>
              {recommendedPlaces.length === 0 && (
                <p className="text-zinc-500">
                  No destinations match the current recommendation criteria. Check back later or explore Other Destinations below.
                </p>
              )}
            </motion.div>

            {/* Other Places */}
            {otherPlaces.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass rounded-xl p-6 border border-white/10"
              >
                <h2 className="text-lg font-semibold mb-4">Other Destinations</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {otherPlaces.map((place, i) => (
                    <motion.div
                      key={place.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * i }}
                      className="p-4 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
                    >
                      <h3 className="font-semibold">{place.name}</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">{place.category}</p>
                      <span
                        className={`inline-block mt-2 px-2 py-0.5 rounded text-xs ${
                          place.crowd_level === 'low'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : place.crowd_level === 'medium'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {place.crowd_level}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
