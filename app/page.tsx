'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#0f0f12] via-[#16161a] to-[#0f0f12]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-2xl"
      >
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent mb-4">
          SmartTour
        </h1>
        <p className="text-zinc-400 text-lg mb-8">
          AI-Based Tourist Crowd Monitoring & Forecasting System
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/entry">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="glass rounded-xl p-6 hover:border-indigo-500/50 transition-colors"
            >
              <span className="text-2xl">📥</span>
              <h3 className="font-semibold mt-2">Entry</h3>
              <p className="text-sm text-zinc-500">Log vehicle entry</p>
            </motion.div>
          </Link>
          <Link href="/exit">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="glass rounded-xl p-6 hover:border-indigo-500/50 transition-colors"
            >
              <span className="text-2xl">📤</span>
              <h3 className="font-semibold mt-2">Exit</h3>
              <p className="text-sm text-zinc-500">Log vehicle exit</p>
            </motion.div>
          </Link>
          <Link href="/admin">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="glass rounded-xl p-6 hover:border-indigo-500/50 transition-colors"
            >
              <span className="text-2xl">📊</span>
              <h3 className="font-semibold mt-2">Admin</h3>
              <p className="text-sm text-zinc-500">Dashboard & analytics</p>
            </motion.div>
          </Link>
          <Link href="/advisory">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="glass rounded-xl p-6 hover:border-indigo-500/50 transition-colors"
            >
              <span className="text-2xl">🗺️</span>
              <h3 className="font-semibold mt-2">Advisory</h3>
              <p className="text-sm text-zinc-500">Smart recommendations</p>
            </motion.div>
          </Link>
        </div>

        <div className="mt-12 flex gap-4 justify-center flex-wrap">
          <Link
            href="/entry"
            className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
          >
            Quick Entry
          </Link>
          <Link
            href="/advisory"
            className="px-6 py-3 rounded-lg glass hover:border-indigo-500/50 font-medium transition-colors"
          >
            View Advisory
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
