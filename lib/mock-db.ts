/**
 * In-memory development database used when Supabase is not configured.
 * Enables full app functionality for local testing without cloud setup.
 */

export interface VehicleLogRow {
  id: string;
  type: 'entry' | 'exit';
  vehicle_type: string;
  vehicle_registration_number: string;
  phone_number: string;
  passenger_count: number;
  latitude: number;
  longitude: number;
  created_at: string;
}

export interface ActiveVehicleRow {
  id: string;
  vehicle_registration_number: string;
  phone_number: string;
  vehicle_type: string;
  passenger_count: number;
  latitude: number;
  longitude: number;
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

const activeVehicles: ActiveVehicleRow[] = [];
const vehicleLogs: VehicleLogRow[] = (() => {
  const seed: VehicleLogRow[] = [];
  const activeSeed: ActiveVehicleRow[] = [];
  const types = ['Car', 'Motorcycle', 'Bus', 'Bicycle'] as const;
  for (let d = 0; d < 14; d++) {
    const date = daysAgo(d);
    const entries = 3 + Math.floor(Math.random() * 8);
    const exits = 2 + Math.floor(Math.random() * 6);
    for (let i = 0; i < entries; i++) {
      const registration = `UK07-${1000 + Math.floor(Math.random() * 8999)}`;
      const phone = `98${Math.floor(10000000 + Math.random() * 89999999)}`;
      const vehicleType = types[Math.floor(Math.random() * types.length)];
      seed.push({
        id: genId(),
        type: 'entry',
        vehicle_type: vehicleType,
        vehicle_registration_number: registration,
        phone_number: phone,
        passenger_count: 1 + Math.floor(Math.random() * 4),
        latitude: 30.3 + Math.random() * 0.1,
        longitude: 78 + Math.random() * 0.1,
        created_at: date.slice(0, 10) + `T${9 + Math.floor(Math.random() * 10)}:${Math.floor(Math.random() * 60)}:00.000Z`,
      });

      activeSeed.push({
        id: genId(),
        vehicle_registration_number: registration,
        phone_number: phone,
        vehicle_type: vehicleType,
        passenger_count: 1 + Math.floor(Math.random() * 4),
        latitude: 30.3 + Math.random() * 0.1,
        longitude: 78 + Math.random() * 0.1,
        created_at: date.slice(0, 10) + `T${9 + Math.floor(Math.random() * 10)}:${Math.floor(Math.random() * 60)}:00.000Z`,
      });
    }
    for (let i = 0; i < exits; i++) {
      const active = activeSeed.pop();
      if (!active) break;
      seed.push({
        id: genId(),
        type: 'exit',
        vehicle_type: active.vehicle_type,
        vehicle_registration_number: active.vehicle_registration_number,
        phone_number: active.phone_number,
        passenger_count: active.passenger_count,
        latitude: active.latitude,
        longitude: active.longitude,
        created_at: date.slice(0, 10) + `T${14 + Math.floor(Math.random() * 8)}:${Math.floor(Math.random() * 60)}:00.000Z`,
      });
    }
  }
  activeVehicles.push(...activeSeed);
  return seed;
})();
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

export const mockDb = {
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
    selectAll: (): VehicleLogRow[] => [...vehicleLogs],
    selectByType: (type: 'entry' | 'exit'): VehicleLogRow[] =>
      vehicleLogs.filter((l) => l.type === type),
    selectSince: (isoDate: string): VehicleLogRow[] =>
      vehicleLogs.filter((l) => l.created_at >= isoDate),
  },
  activeVehicles: {
    upsert: (row: Omit<ActiveVehicleRow, 'id' | 'created_at'>): ActiveVehicleRow => {
      const existingIndex = activeVehicles.findIndex(
        (v) =>
          v.vehicle_registration_number === row.vehicle_registration_number &&
          v.phone_number === row.phone_number
      );
      const item: ActiveVehicleRow = {
        ...row,
        id: genId(),
        created_at: new Date().toISOString(),
      };
      if (existingIndex >= 0) {
        activeVehicles.splice(existingIndex, 1, item);
      } else {
        activeVehicles.push(item);
      }
      return item;
    },
    removeByVehicleAndPhone: (registration: string, phone: string): boolean => {
      const idx = activeVehicles.findIndex(
        (v) =>
          v.vehicle_registration_number === registration &&
          v.phone_number === phone
      );
      if (idx < 0) return false;
      activeVehicles.splice(idx, 1);
      return true;
    },
    count: (): number => activeVehicles.length,
    selectAll: (): ActiveVehicleRow[] => [...activeVehicles],
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
