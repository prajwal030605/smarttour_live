/**
 * SmartTour - Type definitions
 */

export type VehicleLogType = 'entry' | 'exit';

export type CrowdStatus = 'normal' | 'high' | 'critical';

export type CrowdLevel = 'low' | 'medium' | 'high';

export type EntrySource = 'manual' | 'geofence' | 'anpr' | 'checkpoint';

export type SessionStatus = 'pending' | 'verified' | 'active' | 'completed' | 'expired';

export type AdminRole = 'super_admin' | 'district_admin' | 'zone_officer';

export type AlertType = 'threshold_high' | 'threshold_critical' | 'broadcast' | 'emergency' | 'quota_full';

export interface Location {
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

export interface VehicleLog {
  id: string;
  type: VehicleLogType;
  location_id: string | null;
  vehicle_type: string;
  vehicle_registration_number: string;
  phone_number: string;
  email: string | null;
  passenger_count: number;
  latitude: number;
  longitude: number;
  source: EntrySource;
  session_id: string | null;
  created_at: string;
}

export interface ActiveVehicle {
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

export interface VehicleSession {
  id: string;
  vehicle_registration_number: string;
  vehicle_type: string;
  passenger_count: number;
  email: string | null;
  phone_number: string | null;
  device_id: string | null;
  session_token: string;
  status: SessionStatus;
  verified_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  display_name: string | null;
  role: AdminRole;
  assigned_location_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Festival {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  impact_multiplier: number;
  applies_to_location_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Alert {
  id: string;
  location_id: string | null;
  type: AlertType;
  message: string;
  metadata: Record<string, unknown> | null;
  acknowledged_at: string | null;
  created_at: string;
}

export interface ThresholdConfig {
  id: string;
  normal_limit: number;
  high_limit: number;
  critical_limit: number;
}

export interface TouristPlace {
  id: string;
  name: string;
  category: string;
  area: string;
  description: string;
  crowd_level: CrowdLevel;
}

export interface CurrentCrowdResponse {
  activeVehicles: number;
  totalEntries: number;
  totalExits: number;
  status: CrowdStatus;
  thresholds: {
    normal: number;
    high: number;
    critical: number;
  };
  location?: {
    id: string;
    slug: string;
    name: string;
  };
}

export interface LocationCrowdSummary {
  location: Pick<Location, 'id' | 'slug' | 'name' | 'category' | 'district' | 'center_lat' | 'center_lon' | 'max_capacity'>;
  activeVehicles: number;
  todayEntries: number;
  todayExits: number;
  status: CrowdStatus;
  capacityPercent: number;
}

export interface AnalyticsResponse {
  byDate: { date: string; entries: number; exits: number }[];
  byHour: { hour: number; entries: number; exits: number }[];
}

export interface PredictionResponse {
  predictedInflow: number;
  predictedStatus: CrowdStatus;
  mse: number;
  /** Holt-Winters component breakdown */
  components?: {
    level: number;
    trend: number;
    seasonality: number;
    festivalMultiplier: number;
  };
  modelName?: string;
}

/**
 * Default checkpoint coords (kept for legacy entry/exit screens until removed
 * in Phase 2). Multi-location workflows should use the location's own
 * `center_lat` / `center_lon` instead.
 */
export const CHECKPOINT_COORDS = {
  latitude: 30.3165, // Dehradun gateway
  longitude: 78.0322,
} as const;
