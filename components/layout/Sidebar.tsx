'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useState } from 'react';

const navItems = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/entry', label: 'Entry', icon: '📥' },
  { href: '/exit', label: 'Exit', icon: '📤' },
  { href: '/admin', label: 'Admin', icon: '📊' },
  { href: '/advisory', label: 'Advisory', icon: '🗺️' },
  { href: '/explore', label: 'Explore', icon: '🌄' },
  { href: '/how-it-works', label: 'How It Works', icon: '⚙️' },
  { href: '/qr', label: 'QR Codes', icon: '📱' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 min-h-screen bg-navy-800/90 border-r border-teal-500/15 p-5 flex-col backdrop-blur-xl sticky top-0 h-screen">
        {/* Logo */}
        <Link href="/" className="mb-8 block group">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-600 to-teal-500 flex items-center justify-center text-white font-bold text-sm shadow-teal">
              ST
            </div>
            <div>
              <h2 className="text-lg font-bold text-gradient leading-tight">SmartTour</h2>
              <p className="text-[10px] text-teal-400/70 font-medium tracking-wide">CROWD INTELLIGENCE</p>
            </div>
          </div>
        </Link>

        {/* Nav */}
        <nav className="space-y-1 flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  whileHover={{ x: 4 }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
                    isActive
                      ? 'bg-teal-600/20 text-teal-300 border border-teal-500/30 shadow-teal'
                      : 'text-blue-200/70 hover:text-blue-100 hover:bg-deep-blue/60'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="font-medium text-sm">{item.label}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-400" />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Footer badge */}
        <div className="mt-6 p-3 rounded-xl bg-teal-600/10 border border-teal-500/20">
          <p className="text-xs text-teal-400 font-medium">🤖 AI-Powered System</p>
          <p className="text-xs text-blue-200/50 mt-0.5">Uttarakhand Tourism</p>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-30 bg-navy-800/95 border-b border-teal-500/15 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-600 to-teal-500 flex items-center justify-center text-white font-bold text-xs">
              ST
            </div>
            <span className="font-bold text-gradient text-base">SmartTour</span>
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded-lg bg-deep-blue/60 border border-teal-500/20 text-blue-200"
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile dropdown nav */}
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t border-teal-500/10 px-4 py-2 grid grid-cols-2 gap-1"
          >
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                >
                  <span
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border ${
                      isActive
                        ? 'bg-teal-600/20 text-teal-300 border-teal-500/30'
                        : 'text-blue-200/70 border-teal-500/10 hover:bg-deep-blue/40'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </span>
                </Link>
              );
            })}
          </motion.div>
        )}
      </header>
    </>
  );
}
