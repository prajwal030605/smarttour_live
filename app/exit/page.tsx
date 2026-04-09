'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Toast, type ToastType } from '@/components/ui/Toast';
import { VEHICLE_TYPES } from '@/utils/constants';
import Confetti from '@/components/ui/Confetti';
import { CHECKPOINT_COORDS } from '@/types';

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

export default function ExitPage() {
  const [vehicleType, setVehicleType] = useState('');
  const [passengerCount, setPassengerCount] = useState(1);
  const [vehicleRegistrationNumber, setVehicleRegistrationNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [location, setLocation] = useState<{
    lat: number;
    lon: number;
    loading: boolean;
    error: string | null;
  }>({ lat: 0, lon: 0, loading: true, error: null });
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const captureLocation = useCallback(() => {
    setLocation((prev) => ({ ...prev, loading: true, error: null }));
    if (!navigator.geolocation) {
      setLocation((prev) => ({
        ...prev,
        loading: false,
        error: 'Geolocation is not supported',
      }));
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
          setLocation((prev) => ({
            ...prev,
            loading: false,
            error: err.message || 'Failed to get location',
          }));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } catch (err) {
      // Some mobile browsers (e.g., iOS Safari) can throw synchronously for blocked/insecure GPS.
      setLocation((prev) => ({
        ...prev,
        loading: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to get location (GPS permission may be blocked).',
      }));
    }
  }, []);

  useEffect(() => {
    captureLocation();
  }, [captureLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (location.loading || location.error || !vehicleType) return;

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
          latitude: location.lat,
          longitude: location.lon,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');

      setSubmitStatus('success');
      setShowConfetti(true);
      setToast({ message: 'Exit recorded. Safe travels!', type: 'success' });
    } catch (err) {
      setSubmitStatus('error');
      setToast({
        message: err instanceof Error ? err.message : 'Failed to log exit',
        type: 'error',
      });
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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#0f0f12] via-[#16161a] to-[#0f0f12]">
      {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}
      <Toast
        message={toast?.message ?? ''}
        type={toast?.type ?? 'info'}
        visible={!!toast}
        onClose={() => setToast(null)}
      />

      <AnimatePresence mode="wait">
        {submitStatus === 'success' ? (
          <motion.div
            key="goodbye"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="glass rounded-2xl p-8 max-w-md w-full text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-20 h-20 mx-auto rounded-full bg-violet-500/20 flex items-center justify-center text-4xl mb-4"
            >
              👋
            </motion.div>
            <h2 className="text-2xl font-bold text-violet-400">Goodbye!</h2>
            <p className="text-zinc-400 mt-2">Thanks for visiting. Safe travels!</p>
            <Link
              href="/"
              className="mt-6 inline-block px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors"
            >
              Back to Home
            </Link>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass rounded-2xl p-8 max-w-md w-full border border-white/10"
          >
            <h1 className="text-2xl font-bold mb-6">Vehicle Exit</h1>

            <div className="mb-6 p-4 rounded-lg bg-white/5 border border-white/10">
              {location.loading ? (
                <p className="text-amber-400 flex items-center gap-2">
                  <span className="animate-pulse">●</span> Capturing GPS...
                </p>
              ) : location.error ? (
                <div>
                  <p className="text-red-400 text-sm">{location.error}</p>
                  <p className="text-zinc-500 text-xs mt-2">
                    On mobile over HTTP, GPS may be blocked. Use demo location to continue.
                  </p>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={captureLocation}
                      className="text-sm text-indigo-400 hover:underline"
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocation({
                        lat: CHECKPOINT_COORDS.latitude,
                        lon: CHECKPOINT_COORDS.longitude,
                        loading: false,
                        error: null,
                      })}
                      className="text-sm px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    >
                      Use demo location (Dehradun)
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-emerald-400 flex items-center gap-2">
                  <span>✓</span> Location captured
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Vehicle Type
                </label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-indigo-500 focus:outline-none"
                  required
                >
                  <option value="">Select</option>
                  {VEHICLE_TYPES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Passenger Count
                </label>
                <input
                  type="number"
                  min={0}
                  value={passengerCount}
                  onChange={(e) => setPassengerCount(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Vehicle Registration Number
                </label>
                <input
                  type="text"
                  value={vehicleRegistrationNumber}
                  onChange={(e) => setVehicleRegistrationNumber(e.target.value.toUpperCase())}
                  placeholder="Use the same as Entry"
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Use the same as Entry"
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!canSubmit || submitStatus === 'loading'}
                className="w-full py-3 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {submitStatus === 'loading' ? 'Submitting...' : 'Submit Exit'}
              </button>
            </form>

            <Link
              href="/"
              className="block mt-4 text-center text-zinc-500 hover:text-zinc-300 text-sm"
            >
              ← Back to Home
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
