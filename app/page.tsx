'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

const locations = [
  { name: 'Mussoorie', emoji: '🏔️', desc: 'Queen of Hills' },
  { name: 'Rishikesh', emoji: '🕉️', desc: 'Yoga Capital' },
  { name: 'Haridwar', emoji: '🪔', desc: 'Gateway to Gods' },
  { name: 'Nainital', emoji: '🏞️', desc: 'Lake District' },
  { name: 'Jim Corbett', emoji: '🐯', desc: 'Tiger Reserve' },
  { name: 'Auli', emoji: '⛷️', desc: 'Ski Paradise' },
  { name: 'Kedarnath', emoji: '🛕', desc: 'Char Dham' },
  { name: 'Badrinath', emoji: '⛩️', desc: 'Char Dham Shrine' },
  { name: 'Valley of Flowers', emoji: '🌸', desc: 'UNESCO Heritage' },
  { name: 'Lansdowne', emoji: '🌲', desc: 'Hill Cantonment' },
];

const features = [
  {
    icon: '📡',
    title: 'GPS Geofencing',
    desc: 'Automatic entry & exit detection — no QR scanning, no forms. Arrive and your vehicle is logged instantly.',
  },
  {
    icon: '📊',
    title: 'Real-Time Dashboard',
    desc: 'Live crowd analytics with hourly trends, weekly forecasts, and location-wise comparisons',
  },
  {
    icon: '🤖',
    title: 'AI Forecasting',
    desc: 'Holt-Winters exponential smoothing predicts tomorrow\'s inflow with seasonal adjustment',
  },
  {
    icon: '🗺️',
    title: 'Interactive Maps',
    desc: 'Color-coded maps showing live crowd density across 10 Uttarakhand destinations',
  },
  {
    icon: '🔐',
    title: 'OTP Registration',
    desc: 'One-time vehicle bind via email OTP — your device is linked securely for 24 hours',
  },
  {
    icon: '🔔',
    title: 'Smart Alerts',
    desc: 'Instant alerts when any location exceeds capacity with alternate destination suggestions',
  },
];

const navLinks = [
  { href: '/register', label: 'Register' },
  { href: '/track', label: 'Track' },
  { href: '/advisory', label: 'Advisory' },
  { href: '/map', label: 'Map' },
  { href: '/festivals', label: 'Festivals' },
  { href: '/admin', label: 'Admin' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-navy-900 text-foreground">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-40 bg-navy-900/80 backdrop-blur-xl border-b border-teal-500/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-600 to-teal-500 flex items-center justify-center font-bold text-white text-sm shadow-teal">
              ST
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-lg text-gradient">SmartTour</span>
              <span className="ml-2 text-xs text-teal-400/60 font-medium hidden lg:inline">CROWD INTELLIGENCE</span>
            </div>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-blue-200/70 hover:text-teal-300 hover:bg-deep-blue/50 transition-all duration-150"
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-2">
            <Link
              href="/track"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600/15 border border-teal-500/30 text-teal-300 text-sm font-semibold hover:bg-teal-600/25 transition-all duration-150"
            >
              📡 Track
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 text-white text-sm font-semibold hover:from-teal-500 hover:to-teal-400 transition-all duration-150 shadow-teal"
            >
              🚗 Register
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden">
        {/* Background gradient blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-600/10 rounded-full blur-[120px]" />
          <div className="absolute top-20 right-1/4 w-80 h-80 bg-deep-blue/60 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-teal-500/5 rounded-full blur-[80px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-600/15 border border-teal-500/30 text-teal-300 text-sm font-medium mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            AI-Powered Crowd Intelligence System
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-5"
          >
            <span className="text-gradient">Smart Crowd Intelligence</span>
            <br />
            <span className="text-blue-100">for Smarter Travel</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-blue-200/60 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Real-time crowd monitoring and AI forecasting for Uttarakhand&apos;s
            top 6 tourist destinations — powered by LPR technology and machine learning.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold text-base hover:from-teal-500 hover:to-teal-400 transition-all duration-200 shadow-teal-lg"
            >
              🚗 Register Your Vehicle
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            <Link
              href="/advisory"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl glass border border-teal-500/25 text-teal-200 font-semibold text-base hover:border-teal-500/50 transition-all duration-200"
            >
              📊 Live Advisory
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-deep-blue/60 border border-teal-500/20 text-blue-200 font-semibold text-base hover:bg-deep-blue transition-all duration-200"
            >
              🔒 Admin Dashboard
            </Link>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap justify-center gap-8 text-center"
          >
            {[
              { value: '10', label: 'Destinations' },
              { value: 'AI', label: 'Forecasting' },
              { value: 'GPS', label: 'Geofencing' },
              { value: '24/7', label: 'Monitoring' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold text-teal-400">{stat.value}</div>
                <div className="text-xs text-blue-200/50 font-medium mt-0.5">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── 6 Locations Grid ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-blue-100 mb-2">
            Monitoring <span className="text-gradient">10 Destinations</span>
          </h2>
          <p className="text-blue-200/50 text-sm">Live crowd intelligence across Uttarakhand</p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {locations.map((loc, i) => (
            <motion.div
              key={loc.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ y: -4, scale: 1.02 }}
            >
              <Link href="/advisory">
                <div className="glass rounded-2xl p-4 text-center card-hover group cursor-pointer">
                  <div className="text-3xl mb-2">{loc.emoji}</div>
                  <div className="font-semibold text-sm text-blue-100 group-hover:text-teal-300 transition-colors">
                    {loc.name}
                  </div>
                  <div className="text-xs text-blue-200/40 mt-0.5">{loc.desc}</div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Quick Action Cards ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              href: '/register',
              icon: '🚗',
              title: 'Register',
              desc: 'Bind your vehicle with email OTP — one-time setup',
              color: 'hover:border-teal-500/50 hover:shadow-teal',
            },
            {
              href: '/track',
              icon: '📡',
              title: 'GPS Tracker',
              desc: 'Auto entry & exit — keep tab open while traveling',
              color: 'hover:border-teal-500/50',
            },
            {
              href: '/advisory',
              icon: '🗺️',
              title: 'Advisory',
              desc: 'Real-time crowd status + forecasts',
              color: 'hover:border-teal-500/50',
            },
            {
              href: '/admin',
              icon: '📊',
              title: 'Dashboard',
              desc: 'Analytics, alerts, and log exports',
              color: 'hover:border-teal-500/50',
            },
          ].map((card, i) => (
            <motion.div
              key={card.href}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link href={card.href}>
                <div
                  className={`glass rounded-2xl p-6 border border-teal-500/15 transition-all duration-200 group cursor-pointer ${card.color}`}
                >
                  <span className="text-3xl">{card.icon}</span>
                  <h3 className="font-bold text-blue-100 mt-3 mb-1 group-hover:text-teal-300 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-sm text-blue-200/50">{card.desc}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-blue-100 mb-3">
            Everything You Need for{' '}
            <span className="text-gradient">Smart Tourism</span>
          </h2>
          <p className="text-blue-200/50 max-w-xl mx-auto text-sm">
            A complete ecosystem for tourist crowd management — from automatic
            plate detection to AI-powered forecasting.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-2xl p-6 border border-teal-500/10 hover:border-teal-500/30 transition-all duration-200 hover:shadow-[0_4px_24px_rgba(13,148,136,0.12)] group"
            >
              <div className="w-12 h-12 rounded-xl bg-teal-600/15 border border-teal-500/20 flex items-center justify-center text-2xl mb-4">
                {f.icon}
              </div>
              <h3 className="font-bold text-blue-100 mb-2 group-hover:text-teal-300 transition-colors">
                {f.title}
              </h3>
              <p className="text-sm text-blue-200/50 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── How it works CTA ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass rounded-3xl p-10 border border-teal-500/20 text-center teal-glow"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-600/15 border border-teal-500/25 text-teal-300 text-sm font-medium mb-5">
            📡 GPS Geofencing
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-blue-100 mb-3">
            Start <span className="text-gradient">Tracking Your Trip</span>
          </h2>
          <p className="text-blue-200/50 mb-8 max-w-lg mx-auto text-sm">
            Register once, keep the tab open, and your vehicle is automatically
            logged when you enter or leave a tracked destination.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold hover:from-teal-500 hover:to-teal-400 transition-all duration-200 shadow-teal"
          >
            🚗 Register Your Vehicle →
          </Link>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-teal-500/10 bg-navy-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-600 to-teal-500 flex items-center justify-center font-bold text-white text-xs">
                  ST
                </div>
                <span className="font-bold text-gradient">SmartTour</span>
              </div>
              <p className="text-blue-200/40 text-sm leading-relaxed">
                AI-Based Tourist Crowd Monitoring & Forecasting System for
                Uttarakhand destinations.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-blue-100 mb-3 text-sm">Tech Stack</h4>
              <div className="flex flex-wrap gap-2">
                {['Next.js 14', 'Supabase', 'Leaflet.js', 'Recharts', 'Framer Motion', 'Tailwind CSS'].map((t) => (
                  <span
                    key={t}
                    className="text-xs px-2 py-1 rounded-md bg-deep-blue/60 border border-teal-500/15 text-blue-200/60"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-blue-100 mb-3 text-sm">Quick Links</h4>
              <div className="grid grid-cols-2 gap-1">
                {navLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="text-sm text-blue-200/40 hover:text-teal-300 transition-colors"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-teal-500/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-blue-200/30">
              © 2024 SmartTour · Built for Uttarakhand Tourism Management
            </p>
            <p className="text-xs text-blue-200/30">
              Team SmartTour · 6th Semester Web Dev Project
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
