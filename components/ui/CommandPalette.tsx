'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface Command {
  id: string;
  label: string;
  description: string;
  icon: string;
  action: () => void;
  keywords: string[];
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const go = useCallback((path: string) => {
    setOpen(false);
    setQuery('');
    router.push(path);
  }, [router]);

  const commands: Command[] = [
    { id: 'home', label: 'Home', description: 'SmartTour homepage', icon: '🏠', action: () => go('/'), keywords: ['home', 'start', 'main'] },
    { id: 'register', label: 'Register Vehicle', description: 'Bind your vehicle with email OTP', icon: '🚗', action: () => go('/register'), keywords: ['register', 'vehicle', 'otp', 'session'] },
    { id: 'track', label: 'GPS Tracker', description: 'Auto entry/exit geofencing', icon: '📡', action: () => go('/track'), keywords: ['track', 'gps', 'geofence', 'location'] },
    { id: 'advisory', label: 'Live Advisory', description: 'Current crowd levels across all locations', icon: '📊', action: () => go('/advisory'), keywords: ['advisory', 'crowd', 'status', 'live'] },
    { id: 'map', label: 'Crowd Map', description: 'Interactive map with crowd density', icon: '🗺️', action: () => go('/map'), keywords: ['map', 'leaflet', 'density', 'visual'] },
    { id: 'festivals', label: 'Festival Calendar', description: 'Seasonal events and traffic multipliers', icon: '🎉', action: () => go('/festivals'), keywords: ['festival', 'calendar', 'events', 'season'] },
    { id: 'entry', label: 'Manual Entry', description: 'Log vehicle entry at checkpoint', icon: '📥', action: () => go('/entry'), keywords: ['entry', 'manual', 'log', 'checkpoint'] },
    { id: 'exit', label: 'Manual Exit', description: 'Log vehicle exit at checkpoint', icon: '📤', action: () => go('/exit'), keywords: ['exit', 'manual', 'log', 'departure'] },
    { id: 'admin', label: 'Admin Dashboard', description: 'Operations, analytics, and forecasts', icon: '🔒', action: () => go('/admin'), keywords: ['admin', 'dashboard', 'analytics', 'operations'] },
  ];

  const filtered = query.trim()
    ? commands.filter((c) => {
        const q = query.toLowerCase();
        return c.label.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.keywords.some((k) => k.includes(q));
      })
    : commands;

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [open]);

  // Arrow key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === 'Enter' && filtered[active]) { filtered[active].action(); }
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg glass border border-teal-500/15 text-blue-200/30 hover:text-blue-200/60 hover:border-teal-500/25 transition-all text-xs"
        title="Open command palette (⌘K)"
      >
        <span>⌘</span>
        <span>K</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
            />

            {/* Palette */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.15 }}
              className="fixed top-[15vh] left-1/2 -translate-x-1/2 z-[201] w-full max-w-xl px-4"
            >
              <div className="glass rounded-2xl border border-teal-500/25 overflow-hidden shadow-2xl shadow-black/60" onKeyDown={handleKeyDown}>
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-teal-500/10">
                  <span className="text-blue-200/30 text-lg">🔍</span>
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search pages, actions…"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                    className="flex-1 bg-transparent text-blue-100 placeholder-blue-200/25 focus:outline-none text-sm"
                  />
                  <kbd className="hidden sm:block text-xs text-blue-200/25 px-1.5 py-0.5 rounded border border-blue-200/10 font-mono">ESC</kbd>
                </div>

                {/* Results */}
                <div className="max-h-72 overflow-y-auto py-1">
                  {filtered.length === 0 ? (
                    <div className="px-4 py-8 text-center text-blue-200/30 text-sm">No results for &quot;{query}&quot;</div>
                  ) : (
                    filtered.map((cmd, i) => (
                      <button
                        key={cmd.id}
                        onClick={() => cmd.action()}
                        onMouseEnter={() => setActive(i)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          i === active ? 'bg-teal-500/10' : 'hover:bg-teal-500/5'
                        }`}
                      >
                        <span className="w-8 h-8 rounded-lg bg-navy-800/60 border border-teal-500/10 flex items-center justify-center text-base shrink-0">
                          {cmd.icon}
                        </span>
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold truncate ${i === active ? 'text-teal-300' : 'text-blue-100'}`}>
                            {cmd.label}
                          </p>
                          <p className="text-xs text-blue-200/35 truncate">{cmd.description}</p>
                        </div>
                        {i === active && (
                          <kbd className="ml-auto text-xs text-blue-200/25 px-1.5 py-0.5 rounded border border-blue-200/10 font-mono shrink-0">↵</kbd>
                        )}
                      </button>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-teal-500/10 flex items-center gap-4 text-xs text-blue-200/25">
                  <span><kbd className="font-mono">↑↓</kbd> navigate</span>
                  <span><kbd className="font-mono">↵</kbd> select</span>
                  <span><kbd className="font-mono">ESC</kbd> close</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
