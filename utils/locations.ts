/**
 * Location helpers - distance, geofence, and seed data for the 10 Uttarakhand
 * destinations the platform tracks.
 */

import type { CrowdStatus, Location } from '@/types';

/** Pre-seeded Uttarakhand locations (mirrors supabase/schema.sql seed). */
export const SEED_LOCATIONS: Omit<Location, 'created_at'>[] = [
  {
    id: 'loc-mussoorie',
    slug: 'mussoorie',
    name: 'Mussoorie',
    description: "Queen of the Hills - colonial-era hill station with cable cars and viewpoints",
    category: 'Hill Station',
    district: 'Dehradun',
    center_lat: 30.4598,
    center_lon: 78.0644,
    radius_km: 5,
    max_capacity: 5000,
    normal_limit: 2000,
    high_limit: 4000,
    critical_limit: 5000,
    daily_quota: null,
    featured_image_url: null,
    is_active: true,
  },
  {
    id: 'loc-rishikesh',
    slug: 'rishikesh',
    name: 'Rishikesh',
    description: 'Yoga capital of the world - Ganges adventure and spirituality',
    category: 'Religious + Adventure',
    district: 'Tehri Garhwal',
    center_lat: 30.0869,
    center_lon: 78.2676,
    radius_km: 4,
    max_capacity: 8000,
    normal_limit: 3000,
    high_limit: 6000,
    critical_limit: 8000,
    daily_quota: null,
    featured_image_url: null,
    is_active: true,
  },
  {
    id: 'loc-haridwar',
    slug: 'haridwar',
    name: 'Haridwar',
    description: 'Gateway to the gods - Har Ki Pauri and Ganga Aarti',
    category: 'Religious',
    district: 'Haridwar',
    center_lat: 29.9457,
    center_lon: 78.1642,
    radius_km: 4,
    max_capacity: 15000,
    normal_limit: 5000,
    high_limit: 10000,
    critical_limit: 15000,
    daily_quota: null,
    featured_image_url: null,
    is_active: true,
  },
  {
    id: 'loc-nainital',
    slug: 'nainital',
    name: 'Nainital',
    description: 'Lake district of India - serene Naini Lake surrounded by hills',
    category: 'Hill Station',
    district: 'Nainital',
    center_lat: 29.3919,
    center_lon: 79.4542,
    radius_km: 4,
    max_capacity: 4000,
    normal_limit: 1500,
    high_limit: 3000,
    critical_limit: 4000,
    daily_quota: null,
    featured_image_url: null,
    is_active: true,
  },
  {
    id: 'loc-auli',
    slug: 'auli',
    name: 'Auli',
    description: 'Skiing paradise with Himalayan panoramas',
    category: 'Adventure',
    district: 'Chamoli',
    center_lat: 30.5266,
    center_lon: 79.5709,
    radius_km: 3,
    max_capacity: 2000,
    normal_limit: 800,
    high_limit: 1500,
    critical_limit: 2000,
    daily_quota: null,
    featured_image_url: null,
    is_active: true,
  },
  {
    id: 'loc-jim-corbett',
    slug: 'jim-corbett',
    name: 'Jim Corbett',
    description: "India's oldest national park - tiger reserve",
    category: 'Wildlife',
    district: 'Nainital',
    center_lat: 29.5300,
    center_lon: 78.7747,
    radius_km: 5,
    max_capacity: 1500,
    normal_limit: 600,
    high_limit: 1200,
    critical_limit: 1500,
    daily_quota: null,
    featured_image_url: null,
    is_active: true,
  },
  {
    id: 'loc-kedarnath',
    slug: 'kedarnath',
    name: 'Kedarnath',
    description: 'Sacred Char Dham temple at 3,583m - one of twelve Jyotirlingas',
    category: 'Religious',
    district: 'Rudraprayag',
    center_lat: 30.7346,
    center_lon: 79.0669,
    radius_km: 2,
    max_capacity: 3000,
    normal_limit: 1000,
    high_limit: 2500,
    critical_limit: 3000,
    daily_quota: 2500,
    featured_image_url: null,
    is_active: true,
  },
  {
    id: 'loc-badrinath',
    slug: 'badrinath',
    name: 'Badrinath',
    description: 'Char Dham shrine of Lord Vishnu beside Alaknanda river',
    category: 'Religious',
    district: 'Chamoli',
    center_lat: 30.7433,
    center_lon: 79.4938,
    radius_km: 2,
    max_capacity: 5000,
    normal_limit: 2000,
    high_limit: 4000,
    critical_limit: 5000,
    daily_quota: 4000,
    featured_image_url: null,
    is_active: true,
  },
  {
    id: 'loc-valley-of-flowers',
    slug: 'valley-of-flowers',
    name: 'Valley of Flowers',
    description: 'UNESCO World Heritage Site - alpine wildflower meadow',
    category: 'Trekking',
    district: 'Chamoli',
    center_lat: 30.7287,
    center_lon: 79.6058,
    radius_km: 3,
    max_capacity: 1000,
    normal_limit: 400,
    high_limit: 800,
    critical_limit: 1000,
    daily_quota: 800,
    featured_image_url: null,
    is_active: true,
  },
  {
    id: 'loc-lansdowne',
    slug: 'lansdowne',
    name: 'Lansdowne',
    description: 'Untouched cantonment hill town with pine forests',
    category: 'Hill Station',
    district: 'Pauri Garhwal',
    center_lat: 29.8377,
    center_lon: 78.6868,
    radius_km: 3,
    max_capacity: 1500,
    normal_limit: 600,
    high_limit: 1200,
    critical_limit: 1500,
    daily_quota: null,
    featured_image_url: null,
    is_active: true,
  },
];

/**
 * Haversine distance in km between two GPS points.
 */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export interface GeofenceMatch {
  location: Pick<
    Location,
    'id' | 'slug' | 'name' | 'center_lat' | 'center_lon' | 'radius_km'
  >;
  distanceKm: number;
}

/**
 * Find which (if any) location a coordinate falls inside. If multiple zones
 * overlap, returns the one with the smallest radius - matches the
 * "inner zone wins" rule for nested polygons.
 */
export function findContainingLocation<
  L extends Pick<Location, 'id' | 'slug' | 'name' | 'center_lat' | 'center_lon' | 'radius_km'>,
>(lat: number, lon: number, locations: L[]): GeofenceMatch | null {
  let best: GeofenceMatch | null = null;
  for (const loc of locations) {
    const d = haversineKm(lat, lon, loc.center_lat, loc.center_lon);
    if (d <= loc.radius_km) {
      if (!best || loc.radius_km < best.location.radius_km) {
        best = { location: loc, distanceKm: d };
      }
    }
  }
  return best;
}

/**
 * Classify a numeric crowd value against a location's threshold limits.
 */
export function classifyCrowd(
  active: number,
  thresholds: { normal_limit: number; high_limit: number; critical_limit: number },
): CrowdStatus {
  if (active >= thresholds.critical_limit) return 'critical';
  if (active >= thresholds.high_limit) return 'high';
  return 'normal';
}

/**
 * Calculate fill ratio (0-100) given current count + capacity.
 */
export function capacityPercent(active: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.min(100, Math.round((active / capacity) * 100));
}
