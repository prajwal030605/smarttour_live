'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const navItems = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/entry', label: 'Entry', icon: '📥' },
  { href: '/exit', label: 'Exit', icon: '📤' },
  { href: '/admin', label: 'Admin', icon: '📊' },
  { href: '/advisory', label: 'Advisory', icon: '🗺️' },
  { href: '/qr', label: 'QR Codes', icon: '📱' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden md:flex w-64 min-h-screen glass border-r border-white/10 p-4 flex-col">
        <Link href="/" className="mb-8">
          <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            SmartTour
          </h2>
        </Link>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  whileHover={{ x: 4 }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </motion.div>
              </Link>
            );
          })}
        </nav>
      </aside>

      <header className="md:hidden sticky top-0 z-20 glass border-b border-white/10 px-3 py-2">
        <div className="flex items-center justify-between mb-2">
          <Link href="/">
            <h2 className="text-base font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              SmartTour
            </h2>
          </Link>
        </div>
        <nav className="flex gap-2 overflow-x-auto pb-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className="shrink-0">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border ${
                    isActive
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                      : 'text-zinc-400 border-white/10'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </span>
              </Link>
            );
          })}
        </nav>
      </header>
    </>
  );
}
