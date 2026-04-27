'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Toast, type ToastType } from '@/components/ui/Toast';
import { VEHICLE_TYPES } from '@/utils/constants';
import { getDeviceId, saveSession, loadSession } from '@/utils/device';

type Step = 'form' | 'verify' | 'success';

export default function RegisterPage() {
  const [step, setStep] = useState<Step>('form');
  const [reg, setReg] = useState('');
  const [vehicleType, setVehicleType] = useState('Car');
  const [passengers, setPassengers] = useState(1);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  // If user already has an active session, jump straight to success view
  useEffect(() => {
    const existing = loadSession();
    if (existing && (existing.status === 'verified' || existing.status === 'active')) {
      const expiresMs = new Date(existing.expires_at).getTime();
      if (expiresMs > Date.now()) {
        setReg(existing.vehicle_registration_number);
        setEmail(existing.email);
        setStep('success');
      }
    }
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!reg.trim() || !vehicleType || !email.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_registration_number: reg.trim().toUpperCase(),
          vehicle_type: vehicleType,
          passenger_count: passengers,
          email: email.trim().toLowerCase(),
          phone_number: phone.trim() || null,
          device_id: getDeviceId(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register');
      setSessionToken(data.session_token);
      setSessionId(data.session_id);
      if (data.devCode) setDevCode(data.devCode);
      setStep('verify');
      setToast({
        message: data.via === 'console' ? 'Dev mode: code shown below' : 'Verification code sent to your email',
        type: 'success',
      });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Failed', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionToken || !code.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/session/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_token: sessionToken, code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.verified) throw new Error(data.error || 'Verification failed');

      saveSession({
        id: sessionId!,
        token: sessionToken,
        vehicle_registration_number: reg.trim().toUpperCase(),
        vehicle_type: vehicleType,
        passenger_count: passengers,
        email: email.trim().toLowerCase(),
        status: 'verified',
        verified_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      setStep('success');
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Failed', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center p-4 sm:p-6">
      <Toast
        message={toast?.message ?? ''}
        type={toast?.type ?? 'info'}
        visible={!!toast}
        onClose={() => setToast(null)}
      />

      <div className="w-full max-w-md mb-4">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-blue-200/50 hover:text-teal-300">
          ← Back to Home
        </Link>
      </div>

      <AnimatePresence mode="wait">
        {step === 'form' && (
          <motion.form
            key="form"
            onSubmit={handleCreate}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-md glass rounded-3xl p-7 border border-teal-500/20 space-y-4 teal-glow"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-2xl">
                🚗
              </div>
              <div>
                <h1 className="text-xl font-bold text-blue-100">Register Your Trip</h1>
                <p className="text-xs text-blue-200/50">One-time bind. Geofencing handles the rest.</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-200/70 mb-1.5">Vehicle Registration</label>
              <input
                type="text"
                value={reg}
                onChange={(e) => setReg(e.target.value.toUpperCase())}
                placeholder="UK07AB1234"
                className="w-full px-4 py-2.5 rounded-xl bg-navy-800/60 border border-teal-500/20 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/30 text-blue-100 text-sm font-mono tracking-wider"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-blue-200/70 mb-1.5">Vehicle Type</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-navy-800/60 border border-teal-500/20 text-blue-100 text-sm"
                >
                  {VEHICLE_TYPES.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-200/70 mb-1.5">Passengers</label>
                <input
                  type="number"
                  min={1}
                  value={passengers}
                  onChange={(e) => setPassengers(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-4 py-2.5 rounded-xl bg-navy-800/60 border border-teal-500/20 text-blue-100 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-200/70 mb-1.5">Email (for verification)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-xl bg-navy-800/60 border border-teal-500/20 focus:border-teal-500 focus:outline-none text-blue-100 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-200/70 mb-1.5">
                Phone <span className="text-blue-200/40 font-normal">(optional)</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                className="w-full px-4 py-2.5 rounded-xl bg-navy-800/60 border border-teal-500/20 text-blue-100 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 disabled:opacity-50 font-semibold text-white transition-all shadow-teal flex items-center justify-center gap-2"
            >
              {submitting ? 'Sending OTP…' : 'Continue'}
            </button>

            <p className="text-xs text-blue-200/40 text-center pt-1">
              We&apos;ll email you a 6-digit code to verify ownership.
            </p>
          </motion.form>
        )}

        {step === 'verify' && (
          <motion.form
            key="verify"
            onSubmit={handleVerify}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-md glass rounded-3xl p-7 border border-teal-500/20 space-y-4 teal-glow"
          >
            <div>
              <h1 className="text-xl font-bold text-blue-100">Enter Verification Code</h1>
              <p className="text-xs text-blue-200/50 mt-1">We sent a 6-digit code to {email}</p>
            </div>

            {devCode && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm">
                <strong>Dev mode:</strong> Code is <code className="font-mono">{devCode}</code>
                <p className="text-xs text-amber-300/70 mt-1">
                  (No email provider configured. Set RESEND_API_KEY to send real emails.)
                </p>
              </div>
            )}

            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full px-4 py-3 rounded-xl bg-navy-800/60 border border-teal-500/20 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500/30 text-blue-100 text-center text-2xl font-mono tracking-[0.5em]"
              required
              autoFocus
            />

            <button
              type="submit"
              disabled={submitting || code.length !== 6}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 disabled:opacity-50 font-semibold text-white shadow-teal"
            >
              {submitting ? 'Verifying…' : 'Verify & Activate'}
            </button>

            <button
              type="button"
              onClick={() => setStep('form')}
              className="block w-full text-xs text-blue-200/50 hover:text-teal-300"
            >
              ← Use a different email
            </button>
          </motion.form>
        )}

        {step === 'success' && (
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
              ✓
            </motion.div>
            <h2 className="text-2xl font-bold text-teal-300 mb-2">You&apos;re all set!</h2>
            <p className="text-blue-200/70">Vehicle <strong className="text-blue-100 font-mono">{reg}</strong> registered.</p>
            <p className="text-blue-200/40 text-sm mt-2 mb-6">
              GPS will automatically log entry &amp; exit when you reach a tracked location.
            </p>

            <div className="rounded-xl bg-navy-800/40 border border-teal-500/15 p-4 text-left text-xs text-blue-200/60 space-y-1.5 mb-6">
              <div>• Keep this tab open while traveling</div>
              <div>• Allow location access when prompted</div>
              <div>• Your session expires in 24 hours</div>
            </div>

            <div className="flex gap-3 justify-center">
              <Link
                href="/track"
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium text-sm"
              >
                Open Tracker
              </Link>
              <Link
                href="/"
                className="px-6 py-2.5 rounded-xl glass border border-teal-500/25 text-teal-300 font-medium text-sm"
              >
                Home
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
