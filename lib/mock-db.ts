/**
 * In-memory development database used when Supabase is not configured.
 * Multi-location aware (Phase 1.1+).
 */

import { SEED_LOCATIONS } from '@/utils/locations';

export interface LocationRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  district: string | null;
  center_lat: number;
  center_lon: number;
  radius_km: number;
  max_capacity: number;
  normal_limit: number;
  high_limit: number;
  critical_limit: number;
  daily_quota: number | null;
  featured_image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface VehicleLogRow {
  id: string;
  type: 'entry' | 'exit';
  location_id: string | null;
  vehicle_type: string;
  vehicle_registration_number: string;
  phone_number: string;
  email: string | null;
  passenger_count: number;
  latitude: number;
  longitude: number;
  source: string;
  session_id: string | null;
  created_at: string;
}

export interface ActiveVehicleRow {
  id: string;
  location_id: string | null;
  vehicle_registration_number: string;
  phone_number: string;
  email: string | null;
  vehicle_type: string;
  passenger_count: number;
  latitude: number;
  longitude: number;
  session_id: string | null;
  last_heartbeat_at: string;
  created_at: string;
}

export interface VehicleSessionRow {
  id: string;
  vehicle_registration_number: string;
  vehicle_type: string;
  passenger_count: number;
  email: string | null;
  phone_number: string | null;
  device_id: string | null;
  session_token: string;
  status: 'pending' | 'verified' | 'active' | 'completed' | 'expired';
  verified_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface OtpRow {
  id: string;
  email: string;
  code: string;
  purpose: 'vehicle_bind' | 'admin_login';
  used: boolean;
  expires_at: string;
  created_at: string;
}

export interface AdminUserRow {
  id: string;
  email: string;
  display_name: string | null;
  role: 'super_admin' | 'district_admin' | 'zone_officer';
  assigned_location_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface FestivalRow {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  impact_multiplier: number;
  applies_to_location_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AlertRow {
  id: string;
  location_id: string | null;
  type: 'threshold_high' | 'threshold_critical' | 'broadcast' | 'emergency' | 'quota_full';
  message: string;
  metadata: Record<string, unknown> | null;
  acknowledged_at: string | null;
  created_at: string;
}

export interface ThresholdRow {
  id: string;
  normal_limit: number;
  high_limit: number;
  critical_limit: number;
}

export interface TouristPlaceRow {
  id: string;
  name: string;
  category: string;
  area: string;
  description: string | null;
  crowd_level: 'low' | 'medium' | 'high';
}

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

// -----------------------------------------------------------------------
// Locations (10 seeded Uttarakhand spots)
// -----------------------------------------------------------------------
const locations: LocationRow[] = SEED_LOCATIONS.map((l) => ({
  ...l,
  created_at: new Date().toISOString(),
}));

// -----------------------------------------------------------------------
// Vehicle logs + active vehicles - seed with 14 days of multi-location data
// -----------------------------------------------------------------------
const activeVehicles: ActiveVehicleRow[] = [];
const vehicleLogs: VehicleLogRow[] = (() => {
  const seed: VehicleLogRow[] = [];
  const activeSeed: ActiveVehicleRow[] = [];
  const types = ['Car', 'Motorcycle', 'Bus', 'Bicycle'] as const;

  for (const loc of locations) {
    for (let d = 0; d < 14; d++) {
      const date = daysAgo(d);
      // Bigger spots get more traffic
      const factor = Math.max(0.5, loc.max_capacity / 5000);
      const isWeekend = (new Date(date).getDay() % 6) === 0;
      const weekendFactor = isWeekend ? 1.6 : 1;

      const entries = Math.round((3 + Math.random() * 8) * factor * weekendFactor);
      const exits = Math.round((2 + Math.random() * 6) * factor * weekendFactor);

      for (let i = 0; i < entries; i++) {
        const registration = `UK${(7 + Math.floor(Math.random() * 12)).toString().padStart(2, '0')}-${1000 + Math.floor(Math.random() * 8999)}`;
        const phone = `98${Math.floor(10000000 + Math.random() * 89999999)}`;
        const vehicleType = types[Math.floor(Math.random() * types.length)];

        seed.push({
          id: genId(),
          type: 'entry',
          location_id: loc.id,
          vehicle_type: vehicleType,
          vehicle_registration_number: registration,
          phone_number: phone,
          email: null,
          passenger_count: 1 + Math.floor(Math.random() * 4),
          latitude: loc.center_lat + (Math.random() - 0.5) * 0.02,
          longitude: loc.center_lon + (Math.random() - 0.5) * 0.02,
          source: 'manual',
          session_id: null,
          created_at: date.slice(0, 10) + `T${(9 + Math.floor(Math.random() * 10)).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}:00.000Z`,
        });

        activeSeed.push({
          id: genId(),
          location_id: loc.id,
          vehicle_registration_number: registration,
          phone_number: phone,
          email: null,
          vehicle_type: vehicleType,
          passenger_count: 1 + Math.floor(Math.random() * 4),
          latitude: loc.center_lat + (Math.random() - 0.5) * 0.02,
          longitude: loc.center_lon + (Math.random() - 0.5) * 0.02,
          session_id: null,
          last_heartbeat_at: new Date().toISOString(),
          created_at: date.slice(0, 10) + `T${(9 + Math.floor(Math.random() * 10)).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}:00.000Z`,
        });
      }

      for (let i = 0; i < exits; i++) {
        const idx = activeSeed.findIndex((a) => a.location_id === loc.id);
        if (idx < 0) break;
        const active = activeSeed.splice(idx, 1)[0];
        seed.push({
          id: genId(),
          type: 'exit',
          location_id: loc.id,
          vehicle_type: active.vehicle_type,
          vehicle_registration_number: active.vehicle_registration_number,
          phone_number: active.phone_number,
          email: active.email,
          passenger_count: active.passenger_count,
          latitude: active.latitude,
          longitude: active.longitude,
          source: 'manual',
          session_id: null,
          created_at: date.slice(0, 10) + `T${(14 + Math.floor(Math.random() * 8)).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}:00.000Z`,
        });
      }
    }
  }
  activeVehicles.push(...activeSeed);
  return seed;
})();

// -----------------------------------------------------------------------
// Other tables
// -----------------------------------------------------------------------
const vehicleSessions: VehicleSessionRow[] = [];
const otpCodes: OtpRow[] = [];
const adminUsers: AdminUserRow[] = [];
const festivals: FestivalRow[] = [
  {
    id: 'fest-1',
    name: 'Char Dham Yatra Opening',
    start_date: '2026-04-30',
    end_date: '2026-05-31',
    impact_multiplier: 2.5,
    applies_to_location_id: null,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'fest-2',
    name: 'Summer Peak Season',
    start_date: '2026-05-01',
    end_date: '2026-06-30',
    impact_multiplier: 1.5,
    applies_to_location_id: null,
    is_active: true,
    created_at: new Date().toISOString(),
  },
];
const alerts: AlertRow[] = [];

let threshold: ThresholdRow = {
  id: 'mock-threshold',
  normal_limit: 2000,
  high_limit: 5000,
  critical_limit: 8000,
};

const touristPlaces: TouristPlaceRow[] = [
  { id: '1', name: 'Forest Research Institute', category: 'Historical', area: 'Dehradun', description: 'Colonial-era architecture and museum', crowd_level: 'high' },
  { id: '2', name: "Robber's Cave", category: 'Nature', area: 'Dehradun', description: 'Natural cave formation with stream', crowd_level: 'high' },
  { id: '3', name: 'Tapkeshwar Temple', category: 'Religious', area: 'Dehradun', description: 'Ancient Shiva temple by the river', crowd_level: 'medium' },
  { id: '4', name: 'Sahastradhara', category: 'Nature', area: 'Dehradun', description: 'Sulphur springs and waterfalls', crowd_level: 'medium' },
  { id: '5', name: 'Mindrolling Monastery', category: 'Religious', area: 'Dehradun', description: 'Tibetan Buddhist monastery', crowd_level: 'low' },
  { id: '6', name: 'Rajaji National Park', category: 'Wildlife', area: 'Dehradun', description: 'Wildlife sanctuary and tiger reserve', crowd_level: 'low' },
  { id: '7', name: 'Gun Hill', category: 'Viewpoint', area: 'Mussoorie', description: 'Cable car ride and panoramic views', crowd_level: 'high' },
  { id: '8', name: 'Kempty Falls', category: 'Nature', area: 'Mussoorie', description: 'Popular waterfall and picnic spot', crowd_level: 'high' },
  { id: '9', name: 'Mall Road', category: 'Shopping', area: 'Mussoorie', description: 'Colonial-era promenade with shops', crowd_level: 'high' },
  { id: '10', name: 'Lal Tibba', category: 'Viewpoint', area: 'Mussoorie', description: 'Highest point in Mussoorie', crowd_level: 'medium' },
  { id: '11', name: 'Company Garden', category: 'Park', area: 'Mussoorie', description: 'Manicured gardens and boating', crowd_level: 'medium' },
  { id: '12', name: 'Mussoorie Lake', category: 'Nature', area: 'Mussoorie', description: 'Artificial lake with activities', crowd_level: 'low' },
];

// -----------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------
export const mockDb = {
  locations: {
    selectAll: (): LocationRow[] => [...locations].filter((l) => l.is_active),
    selectAllIncludingInactive: (): LocationRow[] => [...locations],
    findBySlug: (slug: string): LocationRow | null =>
      locations.find((l) => l.slug === slug) ?? null,
    findById: (id: string): LocationRow | null =>
      locations.find((l) => l.id === id) ?? null,
    update: (id: string, updates: Partial<Omit<LocationRow, 'id' | 'created_at'>>): LocationRow | null => {
      const idx = locations.findIndex((l) => l.id === id);
      if (idx < 0) return null;
      locations[idx] = { ...locations[idx], ...updates };
      return locations[idx];
    },
  },

  vehicleLogs: {
    insert: (row: Omit<VehicleLogRow, 'id' | 'created_at'>): VehicleLogRow => {
      const log: VehicleLogRow = {
        ...row,
        id: genId(),
        created_at: new Date().toISOString(),
      };
      vehicleLogs.push(log);
      return log;
    },
    selectAll: (locationId?: string): VehicleLogRow[] =>
      locationId ? vehicleLogs.filter((l) => l.location_id === locationId) : [...vehicleLogs],
    selectByType: (type: 'entry' | 'exit', locationId?: string): VehicleLogRow[] =>
      vehicleLogs.filter((l) => l.type === type && (!locationId || l.location_id === locationId)),
    selectSince: (isoDate: string, locationId?: string): VehicleLogRow[] =>
      vehicleLogs.filter((l) => l.created_at >= isoDate && (!locationId || l.location_id === locationId)),
  },

  activeVehicles: {
    upsert: (row: Omit<ActiveVehicleRow, 'id' | 'created_at' | 'last_heartbeat_at'>): ActiveVehicleRow => {
      const existingIndex = activeVehicles.findIndex(
        (v) =>
          v.vehicle_registration_number === row.vehicle_registration_number &&
          v.location_id === row.location_id,
      );
      const item: ActiveVehicleRow = {
        ...row,
        id: genId(),
        created_at: new Date().toISOString(),
        last_heartbeat_at: new Date().toISOString(),
      };
      if (existingIndex >= 0) {
        activeVehicles.splice(existingIndex, 1, item);
      } else {
        activeVehicles.push(item);
      }
      return item;
    },
    removeByVehicleAndLocation: (registration: string, locationId: string | null): boolean => {
      const idx = activeVehicles.findIndex(
        (v) => v.vehicle_registration_number === registration && v.location_id === locationId,
      );
      if (idx < 0) return false;
      activeVehicles.splice(idx, 1);
      return true;
    },
    removeByVehicleAndPhone: (registration: string, phone: string): boolean => {
      const idx = activeVehicles.findIndex(
        (v) =>
          v.vehicle_registration_number === registration && v.phone_number === phone,
      );
      if (idx < 0) return false;
      activeVehicles.splice(idx, 1);
      return true;
    },
    count: (locationId?: string): number =>
      locationId
        ? activeVehicles.filter((v) => v.location_id === locationId).length
        : activeVehicles.length,
    selectAll: (locationId?: string): ActiveVehicleRow[] =>
      locationId ? activeVehicles.filter((v) => v.location_id === locationId) : [...activeVehicles],
    updateHeartbeat: (registration: string, locationId: string | null, lat: number, lon: number): boolean => {
      const v = activeVehicles.find(
        (x) => x.vehicle_registration_number === registration && x.location_id === locationId,
      );
      if (!v) return false;
      v.latitude = lat;
      v.longitude = lon;
      v.last_heartbeat_at = new Date().toISOString();
      return true;
    },
  },

  vehicleSessions: {
    insert: (row: Omit<VehicleSessionRow, 'id' | 'created_at'>): VehicleSessionRow => {
      const item: VehicleSessionRow = { ...row, id: genId(), created_at: new Date().toISOString() };
      vehicleSessions.push(item);
      return item;
    },
    findByToken: (token: string): VehicleSessionRow | null =>
      vehicleSessions.find((s) => s.session_token === token) ?? null,
    findById: (id: string): VehicleSessionRow | null =>
      vehicleSessions.find((s) => s.id === id) ?? null,
    findActiveByEmail: (email: string): VehicleSessionRow | null =>
      vehicleSessions.find((s) => s.email === email && (s.status === 'verified' || s.status === 'active')) ?? null,
    update: (id: string, updates: Partial<VehicleSessionRow>): VehicleSessionRow | null => {
      const idx = vehicleSessions.findIndex((s) => s.id === id);
      if (idx < 0) return null;
      vehicleSessions[idx] = { ...vehicleSessions[idx], ...updates };
      return vehicleSessions[idx];
    },
  },

  otpCodes: {
    insert: (row: Omit<OtpRow, 'id' | 'created_at'>): OtpRow => {
      const item: OtpRow = { ...row, id: genId(), created_at: new Date().toISOString() };
      otpCodes.push(item);
      return item;
    },
    findValid: (email: string, code: string, purpose: OtpRow['purpose']): OtpRow | null => {
      const now = new Date().toISOString();
      return (
        otpCodes.find(
          (o) =>
            o.email === email &&
            o.code === code &&
            o.purpose === purpose &&
            !o.used &&
            o.expires_at > now,
        ) ?? null
      );
    },
    markUsed: (id: string): void => {
      const o = otpCodes.find((x) => x.id === id);
      if (o) o.used = true;
    },
  },

  adminUsers: {
    findByEmail: (email: string): AdminUserRow | null =>
      adminUsers.find((a) => a.email === email && a.is_active) ?? null,
    insert: (row: Omit<AdminUserRow, 'id' | 'created_at'>): AdminUserRow => {
      const item: AdminUserRow = { ...row, id: genId(), created_at: new Date().toISOString() };
      adminUsers.push(item);
      return item;
    },
  },

  festivals: {
    selectActive: (): FestivalRow[] => festivals.filter((f) => f.is_active),
    findActiveOnDate: (date: string, locationId?: string): FestivalRow[] => {
      return festivals.filter(
        (f) =>
          f.is_active &&
          f.start_date <= date &&
          f.end_date >= date &&
          (!f.applies_to_location_id || f.applies_to_location_id === locationId),
      );
    },
  },

  alerts: {
    insert: (row: Omit<AlertRow, 'id' | 'created_at'>): AlertRow => {
      const item: AlertRow = { ...row, id: genId(), created_at: new Date().toISOString() };
      alerts.push(item);
      return item;
    },
    selectRecent: (limit = 50): AlertRow[] =>
      [...alerts].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit),
  },

  threshold: {
    get: (): ThresholdRow => ({ ...threshold }),
    update: (updates: Partial<Omit<ThresholdRow, 'id'>>): ThresholdRow => {
      threshold = { ...threshold, ...updates };
      return threshold;
    },
  },

  touristPlaces: {
    selectAll: (): TouristPlaceRow[] => [...touristPlaces],
  },
};
