'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { loadSession, clearSession } from '@/utils/device';
import { Geofencer, DEFAULT_GEOFENCE_CONFIG, type GeofenceEvent } from '@/utils/geofence';
import type { Location } from '@/types';

// How often (ms) we push a heartbeat even if GPS position hasn't changed
const HEARTBEAT_INTERVAL_MS = 30_000;
// How often watchPosition fires at minimum
const GPS_INTERVAL_MS = 5_000;

type TrackStatus =
  | 'loading'
  | 'no-session'
  | 'expired'
  | 'gps-denied'
  | 'gps-unavailable'
  | 'watching'
  | 'error';

const TRACK_DEBUG = true;
function dbg(...args: unknown[]) {
  if (TRACK_DEBUG) console.log('[track]', ...args);
}

interface ZoneState {
  id: string | null;
  name: string | null;
  enteredAt: number | null;
}

interface EventLog {
  kind: 'entered' | 'exited' | 'heartbeat' | 'error';
  label: string;
  at: number;
}

export default function TrackPage() {
  const [status, setStatus] = useState<TrackStatus>('loading');
  const [zone, setZone] = useState<ZoneState>({ id: null, name: null, enteredAt: null });
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [nearestKm, setNearestKm] = useState<{ name: string; km: number } | null>(null);
  const [log, setLog] = useState<EventLog[]>([]);
  const [reg, setReg] = useState('');
  const [locationsLoaded, setLocationsLoaded] = useState(false);
  const [debugMsg, setDebugMsg] = useState<string>('Initializing…');
  const [candidate, setCandidate] = useState<{ name: string | null; remainingSec: number } | null>(null);

  const geofencerRef = useRef<Geofencer | null>(null);
  const lastHeartbeatRef = useRef<number>(0);
  const lastPosRef = useRef<{ lat: number; lon: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const hbTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pushLog = useCallback((entry: EventLog) => {
    setLog((prev) => [entry, ...prev].slice(0, 30));
  }, []);

  // ─── Fire geofence event to server ───────────────────────────────────────
  const fireEvent = useCallback(
    async (kind: 'entered' | 'exited', lat: number, lon: number, acc: number | null) => {
      const token = sessionTokenRef.current;
      if (!token) return;
      try {
        const res = await fetch('/api/geofence/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_token: token, kind, lat, lon, accuracy: acc }),
        });
        const data = await res.json();
        if (!res.ok) {
          pushLog({ kind: 'error', label: `Server rejected ${kind}: ${data.error ?? res.status}`, at: Date.now() });
        }
      } catch {
        pushLog({ kind: 'error', label: `Network error on ${kind}`, at: Date.now() });
      }
    },
    [pushLog],
  );

  // ─── Fire heartbeat to server ─────────────────────────────────────────────
  const fireHeartbeat = useCallback(
    async (lat: number, lon: number, acc: number | null) => {
      const token = sessionTokenRef.current;
      if (!token) return;
      lastHeartbeatRef.current = Date.now();
      try {
        await fetch('/api/geofence/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_token: token, lat, lon, accuracy: acc }),
        });
      } catch {
        // Heartbeat failure is non-fatal
      }
    },
    [],
  );

  // ─── Process a GPS reading through the geofencer state machine ───────────
  const processReading = useCallback(
    (lat: number, lon: number, acc: number | null, now: number) => {
      const gf = geofencerRef.current;
      if (!gf) return;

      setAccuracy(acc);
      lastPosRef.current = { lat, lon };

      const nearest = gf.getDistanceKmToNearest(lat, lon);
      setNearestKm(nearest);

      const events: GeofenceEvent[] = gf.process(lat, lon, acc, now);

      // Update candidate countdown for UI feedback
      const cand = gf.getCandidate();
      if (cand.id && gf.getCurrentZoneId() !== cand.id) {
        const dwellMs = gf.getDwellMs();
        const elapsedMs = now - cand.since;
        const remainingSec = Math.max(0, Math.ceil((dwellMs - elapsedMs) / 1000));
        // Find candidate name from locations passed to geofencer
        const allLocs = (gf as unknown as { locations: Array<{ id: string; name: string }> }).locations;
        const candName = allLocs?.find((l) => l.id === cand.id)?.name ?? null;
        setCandidate({ name: candName, remainingSec });
      } else {
        setCandidate(null);
      }

      for (const ev of events) {
        if (ev.kind === 'entered') {
          setZone({ id: ev.locationId, name: ev.locationName, enteredAt: now });
          pushLog({ kind: 'entered', label: `Entered ${ev.locationName ?? ev.locationId}`, at: now });
          fireEvent('entered', lat, lon, acc);
        } else if (ev.kind === 'exited') {
          pushLog({ kind: 'exited', label: `Exited ${ev.locationName ?? ev.locationId}`, at: now });
          setZone({ id: null, name: null, enteredAt: null });
          fireEvent('exited', lat, lon, acc);
        }
        // heartbeat events handled by timer below
      }

      // Send heartbeat if due
      if (now - lastHeartbeatRef.current >= HEARTBEAT_INTERVAL_MS) {
        fireHeartbeat(lat, lon, acc);
      }
    },
    [fireEvent, fireHeartbeat, pushLog],
  );

  // ─── Bootstrap ───────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    dbg('useEffect: bootstrap start');
    setDebugMsg('Reading session…');

    const session = loadSession();
    dbg('session:', session);

    if (!session) {
      setStatus('no-session');
      return;
    }
    if (new Date(session.expires_at).getTime() < Date.now()) {
      setStatus('expired');
      return;
    }

    sessionTokenRef.current = session.token;
    setReg(session.vehicle_registration_number);

    setDebugMsg('Fetching /api/locations…');
    dbg('fetch /api/locations');

    // Abort if API hangs > 10s
    const fetchAbort = new AbortController();
    const fetchTimeout = setTimeout(() => fetchAbort.abort(), 10_000);

    fetch('/api/locations', { signal: fetchAbort.signal, cache: 'no-store' })
      .then((r) => {
        dbg('fetch responded', r.status);
        clearTimeout(fetchTimeout);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: Location[]) => {
        if (cancelled) return;
        dbg('locations parsed, count:', Array.isArray(data) ? data.length : 'NOT ARRAY', data);

        if (!Array.isArray(data)) {
          throw new Error('Locations API did not return an array');
        }
        if (data.length === 0) {
          throw new Error('No active locations in database');
        }

        // Defensive: ensure each row has center_lat/center_lon (new schema)
        const valid = data.filter(
          (l) => typeof l.center_lat === 'number' && typeof l.center_lon === 'number',
        );
        dbg('valid locations after filter:', valid.length);
        if (valid.length === 0) {
          throw new Error('Locations missing center_lat/center_lon — schema mismatch');
        }

        geofencerRef.current = new Geofencer(valid, DEFAULT_GEOFENCE_CONFIG);
        setLocationsLoaded(true);
        setDebugMsg('Requesting GPS permission…');

        if (!navigator.geolocation) {
          setStatus('gps-unavailable');
          return;
        }

        // Start continuous watching
        const id = navigator.geolocation.watchPosition(
          (pos) => {
            dbg('watchPosition fired', pos.coords.latitude, pos.coords.longitude);
            setStatus('watching');
            processReading(
              pos.coords.latitude,
              pos.coords.longitude,
              pos.coords.accuracy ?? null,
              Date.now(),
            );
          },
          (err) => {
            dbg('watchPosition error', err.code, err.message);
            if (err.code === err.PERMISSION_DENIED) setStatus('gps-denied');
            else if (err.code === err.POSITION_UNAVAILABLE) setStatus('gps-unavailable');
            else setStatus('error');
            setDebugMsg(`GPS error: ${err.message}`);
          },
          {
            enableHighAccuracy: true,
            maximumAge: GPS_INTERVAL_MS,
            timeout: 30_000,
          },
        );
        watchIdRef.current = id;

        // Fallback heartbeat timer (in case GPS fires slowly)
        hbTimerRef.current = setInterval(() => {
          const pos = lastPosRef.current;
          if (!pos) return;
          if (Date.now() - lastHeartbeatRef.current >= HEARTBEAT_INTERVAL_MS) {
            fireHeartbeat(pos.lat, pos.lon, null);
          }
        }, HEARTBEAT_INTERVAL_MS);
      })
      .catch((err) => {
        clearTimeout(fetchTimeout);
        const msg = err instanceof Error ? err.message : String(err);
        dbg('bootstrap failed:', msg);
        setDebugMsg(`Failed: ${msg}`);
        setStatus('error');
      });

    return () => {
      cancelled = true;
      clearTimeout(fetchTimeout);
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (hbTimerRef.current) clearInterval(hbTimerRef.current);
    };
  }, [processReading, fireHeartbeat]);

  // ─── Derived ─────────────────────────────────────────────────────────────
  const insideZone = !!zone.id;
  const dwellMinutes = zone.enteredAt ? Math.floor((Date.now() - zone.enteredAt) / 60000) : 0;

  // ─── Render states ────────────────────────────────────────────────────────
  // Specific states first — loading is the catch-all
  if (status === 'no-session' || status === 'expired') {
    // handled below
  }

  if (status === 'loading') {
    const phase = !locationsLoaded ? 'Loading locations…' : 'Waiting for GPS fix…';
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <div className="w-12 h-12 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
          <p className="text-blue-200/70 text-sm font-medium">{phase}</p>
          <p className="text-xs text-teal-300/70 font-mono">{debugMsg}</p>
          {locationsLoaded && (
            <>
              <p className="text-xs text-blue-200/40 leading-relaxed">
                Allow location access in Safari (look for the prompt or check Settings → Websites
                → Location). On desktop this can take 10–30 seconds.
              </p>
              <Link
                href="/entry"
                className="text-xs text-teal-300 hover:text-teal-200 underline underline-offset-4 mt-2"
              >
                Use manual entry instead →
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  if (status === 'no-session' || status === 'expired') {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center p-6">
        <div className="glass rounded-3xl p-10 max-w-sm w-full text-center border border-teal-500/20 teal-glow">
          <div className="text-5xl mb-5">{status === 'expired' ? '⏱️' : '🚗'}</div>
          <h2 className="text-xl font-bold text-blue-100 mb-2">
            {status === 'expired' ? 'Session Expired' : 'Not Registered'}
          </h2>
          <p className="text-blue-200/50 text-sm mb-6">
            {status === 'expired'
              ? 'Your 24-hour session has ended. Register again to resume tracking.'
              : 'You need to register your vehicle before we can track your trip.'}
          </p>
          <Link
            href="/register"
            className="block w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold text-sm"
          >
            Register Now
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'gps-denied') {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center p-6">
        <div className="glass rounded-3xl p-10 max-w-sm w-full text-center border border-amber-500/20">
          <div className="text-5xl mb-5">📍</div>
          <h2 className="text-xl font-bold text-blue-100 mb-2">Location Access Denied</h2>
          <p className="text-blue-200/50 text-sm mb-6">
            SmartTour needs GPS to auto-detect when you enter or leave a tracked zone. Enable
            location permission for this site in your browser settings, then reload.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="block w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (status === 'gps-unavailable' || status === 'error') {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center p-6">
        <div className="glass rounded-3xl p-10 max-w-sm w-full text-center border border-red-500/20">
          <div className="text-5xl mb-5">⚠️</div>
          <h2 className="text-xl font-bold text-blue-100 mb-2">
            {status === 'gps-unavailable' ? 'GPS Unavailable' : 'Tracker Error'}
          </h2>
          <p className="text-blue-200/50 text-sm mb-3">
            {status === 'gps-unavailable'
              ? 'Your device does not support geolocation or GPS failed to start.'
              : 'Something went wrong starting the tracker.'}
          </p>
          <p className="text-xs text-red-300/80 font-mono mb-6 break-all">{debugMsg}</p>
          <Link
            href="/entry"
            className="block w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold text-sm mb-2"
          >
            Manual Entry
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="block w-full py-2 rounded-xl glass border border-teal-500/20 text-teal-300 text-xs font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ─── Main tracker UI (status === 'watching') ──────────────────────────────
  return (
    <div className="min-h-screen bg-navy-900 flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-navy-900/80 backdrop-blur-xl border-b border-teal-500/15 px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-blue-200/60 hover:text-teal-300 text-sm">
          ← Home
        </Link>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          <span className="text-xs font-medium text-teal-300">GPS Active</span>
        </div>
        <button
          onClick={() => { clearSession(); window.location.href = '/register'; }}
          className="text-xs text-blue-200/40 hover:text-red-400 transition-colors"
        >
          Sign Out
        </button>
      </nav>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-5">
        {/* Vehicle badge */}
        <div className="glass rounded-2xl p-4 border border-teal-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-xl">
              🚗
            </div>
            <div>
              <p className="text-xs text-blue-200/40 font-medium uppercase tracking-wider">Vehicle</p>
              <p className="font-mono font-bold text-blue-100">{reg}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-blue-200/40 font-medium uppercase tracking-wider">Accuracy</p>
            <p className="text-sm font-semibold text-blue-100">
              {accuracy !== null ? `±${Math.round(accuracy)}m` : '—'}
            </p>
          </div>
        </div>

        {/* Zone status card */}
        <AnimatePresence mode="wait">
          {insideZone ? (
            <motion.div
              key="inside"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass rounded-2xl p-6 border border-teal-500/40 teal-glow text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-16 h-16 mx-auto rounded-full bg-teal-500/20 border-2 border-teal-400/50 flex items-center justify-center text-3xl mb-4"
              >
                📍
              </motion.div>
              <p className="text-xs text-teal-400/70 font-semibold uppercase tracking-widest mb-1">
                Currently Inside
              </p>
              <h2 className="text-2xl font-extrabold text-teal-300 mb-1">{zone.name}</h2>
              {dwellMinutes > 0 && (
                <p className="text-sm text-blue-200/50">
                  Dwell time: <span className="text-blue-100 font-semibold">{dwellMinutes}m</span>
                </p>
              )}
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-600/15 border border-teal-500/30 text-teal-300 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                Auto-logged on entry
              </div>
            </motion.div>
          ) : candidate && candidate.name ? (
            <motion.div
              key="confirming"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass rounded-2xl p-6 border border-amber-500/40 text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-16 h-16 mx-auto rounded-full bg-amber-500/15 border-2 border-amber-400/50 flex items-center justify-center text-3xl mb-4"
              >
                ⏳
              </motion.div>
              <p className="text-xs text-amber-400/80 font-semibold uppercase tracking-widest mb-1">
                Detecting entry
              </p>
              <h2 className="text-2xl font-extrabold text-amber-300 mb-1">{candidate.name}</h2>
              <p className="text-sm text-blue-200/50">
                Confirming in <span className="text-amber-300 font-bold">{candidate.remainingSec}s</span>
              </p>
              <p className="text-xs text-blue-200/30 mt-2">
                Stay inside the zone to auto-log your entry.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="outside"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass rounded-2xl p-6 border border-teal-500/15 text-center"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-navy-800/60 border border-teal-500/20 flex items-center justify-center text-3xl mb-4">
                🗺️
              </div>
              <p className="text-xs text-blue-200/40 font-semibold uppercase tracking-widest mb-1">
                Not Inside Any Zone
              </p>
              <h2 className="text-lg font-bold text-blue-200/70 mb-1">Monitoring…</h2>
              {nearestKm && (
                <p className="text-sm text-blue-200/40">
                  Nearest: <span className="text-blue-200/70 font-medium">{nearestKm.name}</span>{' '}
                  <span className="text-teal-400">{nearestKm.km.toFixed(1)} km away</span>
                </p>
              )}
              {accuracy !== null && accuracy > 200 && (
                <p className="text-xs text-amber-400/70 mt-2">
                  ⚠ GPS accuracy is poor (±{Math.round(accuracy)}m). Move outside or to a window for better signal.
                </p>
              )}
              <p className="text-xs text-blue-200/30 mt-2">
                Entry will be auto-logged when you arrive at a tracked destination.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* How it works */}
        <div className="glass rounded-2xl p-4 border border-teal-500/10 space-y-2">
          <p className="text-xs font-semibold text-blue-200/50 uppercase tracking-widest mb-2">
            How Tracking Works
          </p>
          {[
            { icon: '⏳', text: 'Stay inside a zone for 60 sec to confirm entry' },
            { icon: '📡', text: 'Heartbeat sent every 30 seconds while inside' },
            { icon: '🚪', text: 'Exit logged automatically when you leave the zone' },
            { icon: '📶', text: 'Keep this tab open — background tracking is off by default' },
          ].map((item) => (
            <div key={item.text} className="flex items-start gap-2 text-xs text-blue-200/40">
              <span className="mt-0.5">{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        {/* Event log */}
        {log.length > 0 && (
          <div className="glass rounded-2xl p-4 border border-teal-500/10">
            <p className="text-xs font-semibold text-blue-200/50 uppercase tracking-widest mb-3">
              Event Log
            </p>
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              <AnimatePresence initial={false}>
                {log.map((entry, i) => (
                  <motion.div
                    key={`${entry.at}-${i}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start gap-2 text-xs"
                  >
                    <span className="mt-0.5 shrink-0">
                      {entry.kind === 'entered'
                        ? '✅'
                        : entry.kind === 'exited'
                          ? '🚪'
                          : entry.kind === 'error'
                            ? '⚠️'
                            : '💓'}
                    </span>
                    <span
                      className={
                        entry.kind === 'entered'
                          ? 'text-teal-300'
                          : entry.kind === 'exited'
                            ? 'text-amber-300'
                            : entry.kind === 'error'
                              ? 'text-red-400'
                              : 'text-blue-200/30'
                      }
                    >
                      {entry.label}
                    </span>
                    <span className="ml-auto text-blue-200/20 shrink-0">
                      {new Date(entry.at).toLocaleTimeString()}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Manual fallback */}
        <div className="text-center pb-6">
          <p className="text-xs text-blue-200/30 mb-2">GPS not working or out of range?</p>
          <Link
            href="/entry"
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl glass border border-teal-500/20 text-teal-300 text-sm font-medium hover:border-teal-500/40"
          >
            Manual Entry ↗
          </Link>
        </div>
      </div>
    </div>
  );
}
