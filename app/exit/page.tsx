'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Toast, type ToastType } from '@/components/ui/Toast';
import Confetti from '@/components/ui/Confetti';
import { VEHICLE_TYPES } from '@/utils/constants';
import { CHECKPOINT_COORDS, type Location } from '@/types';

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

export default function ExitPage() {
  const [vehicleType, setVehicleType] = useState('');
  const [passengerCount, setPassengerCount] = useState(1);
  const [vehicleRegistrationNumber, setVehicleRegistrationNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [gps, setGps] = useState<{ lat: number; lon: number; loading: boolean; error: string | null }>({
    lat: 0, lon: 0, loading: true, error: null,
  });
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const captureLocation = useCallback(() => {
    setGps((prev) => ({ ...prev, loading: true, error: null }));
    if (!navigator.geolocation) {
      setGps((prev) => ({ ...prev, loading: false, error: 'Geolocation not supported' }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setGps({ lat: pos.coords.latitude, lon: pos.coords.longitude, loading: false, error: null }),
      (err) => setGps((prev) => ({ ...prev, loading: false, error: err.message || 'GPS failed' })),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, []);

  useEffect(() => { captureLocation(); }, [captureLocation]);

  useEffect(() => {
    fetch('/api/locations')
      .then((r) => r.json())
      .then((rows: Location[]) => {
        setLocations(rows);
        if (rows.length > 0) setSelectedLocationId(rows[0].id);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (gps.loading || gps.error || !vehicleType) return;
    setSubmitStatus('loading');
    try {
      const res = await fetch('/api/vehicle-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'exit',
          vehicle_type: vehicleType,
          vehicle_registration_number: vehicleRegistrationNumber.trim().toUpperCase(),
          phone_number: phoneNumber.trim(),
          passenger_count: passengerCount,
          latitude: gps.lat,
          longitude: gps.lon,
          location_id: selectedLocationId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setSubmitStatus('success');
      setShowConfetti(true);
      setToast({ message: 'Exit recorded. Safe travels!', type: 'success' });
    } catch (err) {
      setSubmitStatus('error');
      setToast({ message: err instanceof Error ? err.message : 'Failed to log exit', type: 'error' });
    }
  };

  const canSubmit = !gps.loading && !gps.error && vehicleType && vehicleRegistrationNumber.trim() && phoneNumber.trim();

  const selectedName = locations.find((l) => l.id === selectedLocationId)?.name ?? 'selected location';

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center p-4 sm:p-6">
      {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}
      <Toast message={toast?.message ?? ''} type={toast?.type ?? 'info'} visible={!!toast} onClose={() => setToast(null)} />

      <div className="w-full max-w-md mb-4">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-blue-200/50 hover:text-teal-300">
          ← Back to Home
        </Link>
      </div>

      <AnimatePresence mode="wait">
        {submitStatus === 'success' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-3xl p-10 max-w-md w-full text-center border border-teal-500/20 teal-glow"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-20 h-20 mx-auto rounded-full bg-teal-500/20 border-2 border-teal-400/40 flex items-center justify-center text-4xl mb-5"
            >
              👋
            </motion.div>
            <h2 className="text-2xl font-bold text-teal-300 mb-2">Goodbye!</h2>
            <p className="text-blue-200/60 mb-1">Exit from <strong className="text-blue-100">{selectedName}</strong> recorded.</p>
            <p className="text-blue-200/40 text-sm mb-6">Thanks for visiting. Safe travels!</p>
            <div className="flex gap-3 justify-center">
              <Link href="/" className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium text-sm">
                Home
              </Link>
              <button
                onClick={() => { setSubmitStatus('idle'); setVehicleRegistrationNumber(''); }}
                className="px-6 py-2.5 rounded-xl glass border border-teal-500/25 text-teal-300 font-medium text-sm"
              >
                New Exit
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md glass rounded-3xl p-7 border border-teal-500/20 space-y-4 teal-glow"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-2xl">
                📤
              </div>
              <div>
                <h1 className="text-xl font-bold text-blue-100">Vehicle Exit</h1>
                <p className="text-xs text-blue-200/50">Manual checkpoint — geofencing handles this automatically</p>
              </div>
            </div>

            {/* GPS */}
            <div className="p-3.5 rounded-xl bg-navy-800/60 border border-teal-500/10">
              {gps.loading ? (
                <p className="text-amber-400 flex items-center gap-2 text-sm">
                  <span className="animate-pulse">●</span> Capturing GPS…
                </p>
              ) : gps.error ? (
                <div>
                  <p className="text-red-400 text-sm">{gps.error}</p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={captureLocation} className="text-xs text-teal-400 hover:underline">Retry GPS</button>
                    <button
                      type="button"
                      onClick={() => setGps({ lat: CHECKPOINT_COORDS.latitude, lon: CHECKPOINT_COORDS.longitude, loading: false, error: null })}
                      className="text-xs px-2.5 py-1 rounded-lg bg-teal-500/15 text-teal-400 border border-teal-500/25"
                    >
                      Demo location
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-teal-400 flex items-center gap-2 text-sm"><span>✓</span> GPS location captured</p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-blue-200/70 mb-1.5">📍 Location (departing from)</label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-navy-800/60 border border-teal-500/20 focus:border-teal-500 focus:outline-none text-blue-100 text-sm"
                  required
                >
                  {locations.length === 0 && <option value="">Loading…</option>}
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name} — {loc.district ?? loc.category}</option>
                  ))}
                </select>
              </div>

              {/* Plate */}
              <div>
                <label className="block text-sm font-medium text-blue-200/70 mb-1.5">🚘 Vehicle Registration</label>
                <input
                  type="text"
                  value={vehicleRegistrationNumber}
                  onChange={(e) => setVehicleRegistrationNumber(e.target.value.toUpperCase())}
                  placeholder="UK07AB1234"
                  className="w-full px-4 py-2.5 rounded-xl bg-navy-800/60 border border-teal-500/20 focus:border-teal-500 focus:outline-none text-blue-100 text-sm font-mono tracking-wider"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-blue-200/70 mb-1.5">🚗 Vehicle Type</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-navy-800/60 border border-teal-500/20 focus:border-teal-500 focus:outline-none text-blue-100 text-sm"
                    required
                  >
                    <option value="">Select</option>
                    {VEHICLE_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-200/70 mb-1.5">👥 Passengers</label>
                  <input
                    type="number"
                    min={0}
                    value={passengerCount}
                    onChange={(e) => setPassengerCount(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-4 py-2.5 rounded-xl bg-navy-800/60 border border-teal-500/20 text-blue-100 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-blue-200/70 mb-1.5">📞 Phone Number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="9876543210"
                  className="w-full px-4 py-2.5 rounded-xl bg-navy-800/60 border border-teal-500/20 focus:border-teal-500 focus:outline-none text-blue-100 text-sm"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!canSubmit || submitStatus === 'loading'}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 disabled:opacity-50 font-semibold text-white shadow-teal flex items-center justify-center gap-2 text-sm"
              >
                {submitStatus === 'loading'
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Logging Exit…</>
                  : <><span>📤</span> Confirm Exit Log</>}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
