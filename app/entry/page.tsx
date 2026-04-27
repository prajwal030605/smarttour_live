'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Toast, type ToastType } from '@/components/ui/Toast';
import { VEHICLE_TYPES } from '@/utils/constants';
import { CHECKPOINT_COORDS, type Location } from '@/types';

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';
type ScanStatus = 'idle' | 'scanning' | 'detected';

export default function EntryPage() {
  const [vehicleType, setVehicleType] = useState('');
  const [passengerCount, setPassengerCount] = useState(1);
  const [vehicleRegistrationNumber, setVehicleRegistrationNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [location, setLocation] = useState<{
    lat: number; lon: number; loading: boolean; error: string | null;
  }>({ lat: 0, lon: 0, loading: true, error: null });
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');

  const captureLocation = useCallback(() => {
    setLocation((prev) => ({ ...prev, loading: true, error: null }));
    if (!navigator.geolocation) {
      setLocation((prev) => ({ ...prev, loading: false, error: 'Geolocation not supported' }));
      return;
    }
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            loading: false,
            error: null,
          });
        },
        (err) => {
          setLocation((prev) => ({ ...prev, loading: false, error: err.message || 'Failed to get location' }));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } catch (err) {
      setLocation((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'GPS permission may be blocked.',
      }));
    }
  }, []);

  useEffect(() => { captureLocation(); }, [captureLocation]);

  // Fetch active locations on mount
  useEffect(() => {
    fetch('/api/locations')
      .then((r) => r.json())
      .then((rows: Location[]) => {
        setLocations(rows);
        if (rows.length > 0) setSelectedLocationId(rows[0].id);
      })
      .catch(() => {
        /* fallback handled by selectedLocationId staying empty */
      });
  }, []);

  const selectedLocationName =
    locations.find((l) => l.id === selectedLocationId)?.name ?? 'Selected destination';

  const handleAIScan = () => {
    setScanStatus('scanning');
    const samplePlates = ['UK07AB1234', 'UK08CD5678', 'UK01EF9012', 'UK06GH3456', 'UK05IJ7890'];
    setTimeout(() => {
      const plate = samplePlates[Math.floor(Math.random() * samplePlates.length)];
      setVehicleRegistrationNumber(plate);
      setScanStatus('detected');
      setToast({ message: `Plate detected: ${plate}`, type: 'success' });
    }, 1800);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (location.loading || location.error || !vehicleType) return;

    setSubmitStatus('loading');
    try {
      const res = await fetch('/api/vehicle-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'entry',
          vehicle_type: vehicleType,
          vehicle_registration_number: vehicleRegistrationNumber.trim().toUpperCase(),
          phone_number: phoneNumber.trim(),
          passenger_count: passengerCount,
          latitude: location.lat,
          longitude: location.lon,
          location_id: selectedLocationId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setSubmitStatus('success');
    } catch (err) {
      setSubmitStatus('error');
      setToast({ message: err instanceof Error ? err.message : 'Failed to log entry', type: 'error' });
    }
  };

  const canSubmit =
    !location.loading &&
    !location.error &&
    vehicleType &&
    passengerCount >= 0 &&
    vehicleRegistrationNumber.trim().length > 0 &&
    phoneNumber.trim().length > 0;

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center p-4 sm:p-6">
      <Toast message={toast?.message ?? ''} type={toast?.type ?? 'info'} visible={!!toast} onClose={() => setToast(null)} />

      {/* Back link */}
      <div className="w-full max-w-2xl mb-4">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-blue-200/50 hover:text-teal-300 transition-colors">
          ← Back to Home
        </Link>
      </div>

      <AnimatePresence mode="wait">
        {submitStatus === 'success' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="glass rounded-3xl p-10 max-w-md w-full text-center border border-teal-500/20 teal-glow"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-20 h-20 mx-auto rounded-full bg-teal-500/20 border-2 border-teal-400/40 flex items-center justify-center text-4xl mb-5"
            >
              ✓
            </motion.div>
            <h2 className="text-2xl font-bold text-teal-300 mb-2">Welcome!</h2>
            <p className="text-blue-200/60 mb-1">Entry logged for <strong className="text-blue-100">{selectedLocationName}</strong></p>
            <p className="text-blue-200/40 text-sm mb-6">Your vehicle has been registered. Have a great trip!</p>
            <div className="flex gap-3 justify-center">
              <Link href="/" className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium transition-colors text-sm">
                Home
              </Link>
              <button
                onClick={() => { setSubmitStatus('idle'); setVehicleRegistrationNumber(''); setScanStatus('idle'); }}
                className="px-6 py-2.5 rounded-xl glass border border-teal-500/25 text-teal-300 font-medium text-sm"
              >
                New Entry
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-2xl space-y-4"
          >
            {/* Header */}
            <div className="glass rounded-2xl p-5 border border-teal-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-xl">
                  📥
                </div>
                <div>
                  <h1 className="text-xl font-bold text-blue-100">Vehicle Entry Log</h1>
                  <p className="text-xs text-blue-200/40">Smart LPR Checkpoint System</p>
                </div>
              </div>
            </div>

            {/* LPR Camera Feed */}
            <div className="glass rounded-2xl border border-teal-500/20 overflow-hidden">
              <div className="px-5 pt-4 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-400 pulse-green" />
                  <span className="text-sm font-semibold text-blue-100">Smart Camera Feed — License Plate Detection</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/15 border border-teal-500/25 text-teal-400 font-medium">
                  {scanStatus === 'scanning' ? '⚡ SCANNING...' : scanStatus === 'detected' ? '✓ DETECTED' : '● LIVE'}
                </span>
              </div>

              {/* Camera preview box */}
              <div className="relative mx-5 mb-4 h-36 rounded-xl overflow-hidden bg-navy-950/80 border border-teal-500/15">
                {/* Grid overlay */}
                <div className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: 'linear-gradient(rgba(13,148,136,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(13,148,136,0.5) 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                />
                {/* Corner markers */}
                {['top-2 left-2', 'top-2 right-2', 'bottom-2 left-2', 'bottom-2 right-2'].map((pos, i) => (
                  <div key={i} className={`absolute ${pos} w-4 h-4 border-teal-400`}
                    style={{
                      borderTop: i < 2 ? '2px solid' : 'none',
                      borderBottom: i >= 2 ? '2px solid' : 'none',
                      borderLeft: i % 2 === 0 ? '2px solid' : 'none',
                      borderRight: i % 2 !== 0 ? '2px solid' : 'none',
                    }}
                  />
                ))}

                {/* Scan line */}
                {scanStatus === 'scanning' && (
                  <div className="absolute left-0 right-0 h-0.5 bg-teal-400 shadow-[0_0_8px_rgba(13,148,136,0.8)] scan-line" />
                )}

                {/* Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  {scanStatus === 'idle' && (
                    <>
                      <span className="text-3xl opacity-30">🎥</span>
                      <span className="text-xs text-blue-200/30 font-medium">Waiting for vehicle...</span>
                    </>
                  )}
                  {scanStatus === 'scanning' && (
                    <>
                      <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-teal-300 font-medium">Analyzing plate...</span>
                    </>
                  )}
                  {scanStatus === 'detected' && (
                    <>
                      <span className="text-3xl">✅</span>
                      <span className="text-sm font-bold text-teal-300">{vehicleRegistrationNumber}</span>
                      <span className="text-xs text-blue-200/40">Plate detected successfully</span>
                    </>
                  )}
                </div>
              </div>

              {/* AI Scan button */}
              <div className="px-5 pb-5">
                <button
                  type="button"
                  onClick={handleAIScan}
                  disabled={scanStatus === 'scanning'}
                  className="w-full py-2.5 rounded-xl bg-teal-600/20 border border-teal-500/30 text-teal-300 font-semibold text-sm hover:bg-teal-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {scanStatus === 'scanning' ? (
                    <><div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" /> Scanning plate...</>
                  ) : (
                    <><span>🤖</span> AI Scan Plate</>
                  )}
                </button>
              </div>
            </div>

            {/* Info card */}
            <div className="glass rounded-xl px-4 py-3 border border-blue-400/10 flex gap-3">
              <span className="text-blue-400 text-lg shrink-0">ℹ️</span>
              <p className="text-xs text-blue-200/50 leading-relaxed">
                In production, this uses <strong className="text-blue-200/70">OpenCV + Tesseract OCR</strong> to
                automatically read plates from the camera feed. The backend logic remains identical.
              </p>
            </div>

            {/* Main form */}
            <div className="glass rounded-2xl p-5 border border-teal-500/20">
              {/* GPS Status */}
              <div className="mb-5 p-3.5 rounded-xl bg-navy-800/60 border border-teal-500/10">
                {location.loading ? (
                  <p className="text-amber-400 flex items-center gap-2 text-sm">
                    <span className="animate-pulse">●</span> Capturing GPS location...
                  </p>
                ) : location.error ? (
                  <div>
                    <p className="text-red-400 text-sm">{location.error}</p>
                    <div className="mt-2 flex gap-2 flex-wrap">
                      <button type="button" onClick={captureLocation} className="text-xs text-teal-400 hover:underline">
                        Retry GPS
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocation({ lat: CHECKPOINT_COORDS.latitude, lon: CHECKPOINT_COORDS.longitude, loading: false, error: null })}
                        className="text-xs px-2.5 py-1 rounded-lg bg-teal-500/15 text-teal-400 border border-teal-500/25"
                      >
                        Use Demo Location
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-teal-400 flex items-center gap-2 text-sm">
                    <span>✓</span> GPS location captured
                  </p>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Location selector */}
                <div>
                  <label className="block text-sm font-medium text-blue-200/70 mb-1.5">
                    📍 Destination / Location
                  </label>
                  <select
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-navy-800/60 border border-teal-500/20 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/30 text-blue-100 text-sm"
                    required
                  >
                    {locations.length === 0 && <option value="">Loading locations…</option>}
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} — {loc.district ?? loc.category}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Detected Plate */}
                <div>
                  <label className="block text-sm font-medium text-blue-200/70 mb-1.5">
                    🚘 Detected Plate Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={vehicleRegistrationNumber}
                      onChange={(e) => setVehicleRegistrationNumber(e.target.value.toUpperCase())}
                      placeholder="e.g. UK07AB1234 (or use AI Scan)"
                      className={`w-full px-4 py-2.5 rounded-xl bg-navy-800/60 border focus:outline-none focus:ring-1 text-blue-100 text-sm font-mono tracking-wider ${
                        scanStatus === 'detected'
                          ? 'border-teal-500/50 focus:border-teal-500 focus:ring-teal-500/30 text-teal-300'
                          : 'border-teal-500/20 focus:border-teal-500 focus:ring-teal-500/30'
                      }`}
                      required
                    />
                    {scanStatus === 'detected' && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-teal-400 bg-teal-500/15 px-2 py-0.5 rounded-full border border-teal-500/25">
                        AI Detected
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Vehicle Type */}
                  <div>
                    <label className="block text-sm font-medium text-blue-200/70 mb-1.5">
                      🚗 Vehicle Type
                    </label>
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-navy-800/60 border border-teal-500/20 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/30 text-blue-100 text-sm"
                      required
                    >
                      <option value="">Select</option>
                      {VEHICLE_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>

                  {/* Passengers */}
                  <div>
                    <label className="block text-sm font-medium text-blue-200/70 mb-1.5">
                      👥 Passengers
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={passengerCount}
                      onChange={(e) => setPassengerCount(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-4 py-2.5 rounded-xl bg-navy-800/60 border border-teal-500/20 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/30 text-blue-100 text-sm"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-blue-200/70 mb-1.5">
                    📞 Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full px-4 py-2.5 rounded-xl bg-navy-800/60 border border-teal-500/20 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/30 text-blue-100 text-sm"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit || submitStatus === 'loading'}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-white transition-all duration-200 shadow-teal flex items-center justify-center gap-2"
                >
                  {submitStatus === 'loading' ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Logging Entry...</>
                  ) : (
                    <><span>📥</span> Confirm Entry Log</>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
