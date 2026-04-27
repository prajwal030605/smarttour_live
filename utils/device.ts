/**
 * Lightweight device fingerprint for binding a vehicle session to one browser.
 * Avoids any external library - uses a stable token persisted to localStorage,
 * salted with user agent + screen.
 */

const KEY = 'smarttour_device_id';

export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    const seed = `${navigator.userAgent}|${screen.width}x${screen.height}|${navigator.language}|${Date.now()}|${Math.random()}`;
    // Cheap hash (FNV-1a 32-bit) - good enough for non-security fingerprinting.
    let h = 0x811c9dc5;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    id = `dev_${(h >>> 0).toString(16)}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(KEY, id);
  }
  return id;
}

export interface SmartTourSession {
  id: string;
  token: string;
  vehicle_registration_number: string;
  vehicle_type: string;
  passenger_count: number;
  email: string;
  status: string;
  verified_at: string | null;
  expires_at: string;
}

const SESSION_KEY = 'smarttour_session';

export function saveSession(session: SmartTourSession): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession(): SmartTourSession | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SmartTourSession;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SESSION_KEY);
}
