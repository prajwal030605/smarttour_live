'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '@/components/layout/Sidebar';
import QRCodeDisplay from '@/components/ui/QRCodeDisplay';

export default function QRPage() {
  const [baseUrl, setBaseUrl] = useState('');
  const [networkUrl, setNetworkUrl] = useState('');
  const LIVE_BASE_URL = 'https://smarttour-live.vercel.app';

  useEffect(() => {
    const origin = window.location.origin;
    // Prefer live deployment URL for production QR reliability.
    if (origin.includes('smarttour-live.vercel.app')) {
      setBaseUrl(LIVE_BASE_URL);
      return;
    }
    setBaseUrl(origin);
  }, []);

  const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
  const urlForQR = networkUrl.trim() || baseUrl || LIVE_BASE_URL;

  return (
    <div className="min-h-screen flex bg-[#0f0f12]">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold mb-6"
        >
          QR Codes
        </motion.h1>

        {isLocalhost && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200"
          >
            <p className="font-medium mb-2">📱 To scan from your phone:</p>
            <ol className="text-sm space-y-1 list-decimal list-inside text-zinc-300">
              <li>Run <code className="bg-white/10 px-1 rounded">npm run dev:network</code> instead of <code className="bg-white/10 px-1 rounded">npm run dev</code></li>
              <li>Find your computer&apos;s IP (e.g. 192.168.1.5) — run <code className="bg-white/10 px-1 rounded">ipconfig</code> (Windows) or <code className="bg-white/10 px-1 rounded">ifconfig</code> (Mac/Linux)</li>
              <li>Enter it below (e.g. <code className="bg-white/10 px-1 rounded">http://192.168.1.5:3000</code>)</li>
              <li>Open that URL on your computer, then scan the QR codes with your phone</li>
            </ol>
            <div className="mt-4">
              <label className="block text-sm text-zinc-400 mb-2">Network URL for mobile:</label>
              <input
                type="text"
                placeholder="http://192.168.1.5:3000"
                value={networkUrl}
                onChange={(e) => setNetworkUrl(e.target.value)}
                className="w-full max-w-md px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-indigo-500 focus:outline-none text-sm"
              />
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-xl p-8 border border-white/10 text-center"
          >
            <h2 className="text-lg font-semibold mb-2">Entry</h2>
            <p className="text-sm text-zinc-500 mb-4">
              Scan to log vehicle entry
            </p>
            <QRCodeDisplay url={urlForQR ? `${urlForQR}/entry` : 'https://example.com/entry'} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-xl p-8 border border-white/10 text-center"
          >
            <h2 className="text-lg font-semibold mb-2">Exit</h2>
            <p className="text-sm text-zinc-500 mb-4">
              Scan to log vehicle exit
            </p>
            <QRCodeDisplay url={urlForQR ? `${urlForQR}/exit` : 'https://example.com/exit'} />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
