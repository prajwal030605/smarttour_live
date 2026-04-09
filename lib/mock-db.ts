/**
 * In-memory development database used when Supabase is not configured.
 * Enables full app functionality for local testing without cloud setup.
 */

export interface VehicleLogRow {
  id: string;
  type: 'entry' | 'exit';
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

const vehicleLogs: VehicleLogRow[] = (() => {
  const seed: VehicleLogRow[] = [];
  const types = ['Car', 'Motorcycle', 'Bus', 'Bicycle'] as const;
  for (let d = 0; d < 14; d++) {
    const date = daysAgo(d);
    const entries = 3 + Math.floor(Math.random() * 8);
    const exits = 2 + Math.floor(Math.random() * 6);
    for (let i = 0; i < entries; i++) {
      seed.push({
        id: genId(),
        type: 'entry',
        vehicle_type: types[Math.floor(Math.random() * types.length)],
        passenger_count: 1 + Math.floor(Math.random() * 4),
        latitude: 30.3 + Math.random() * 0.1,
        longitude: 78 + Math.random() * 0.1,
        created_at: date.slice(0, 10) + `T${9 + Math.floor(Math.random() * 10)}:${Math.floor(Math.random() * 60)}:00.000Z`,
      });
    }
    for (let i = 0; i < exits; i++) {
      seed.push({
        id: genId(),
        type: 'exit',
        vehicle_type: types[Math.floor(Math.random() * types.length)],
        passenger_count: 1 + Math.floor(Math.random() * 3),
        latitude: 30.3 + Math.random() * 0.1,
        longitude: 78 + Math.random() * 0.1,
        created_at: date.slice(0, 10) + `T${14 + Math.floor(Math.random() * 8)}:${Math.floor(Math.random() * 60)}:00.000Z`,
      });
    }
  }
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
