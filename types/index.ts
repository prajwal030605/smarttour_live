/**
 * SmartTour - Type definitions
 */

export type VehicleLogType = 'entry' | 'exit';

export type CrowdStatus = 'normal' | 'high' | 'critical';

export type CrowdLevel = 'low' | 'medium' | 'high';

export interface VehicleLog {
  id: string;
  type: VehicleLogType;
  vehicle_type: string;
  passenger_count: number;
  latitude: number;
  longitude: number;
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
}

export interface AnalyticsResponse {
  byDate: { date: string; entries: number; exits: number }[];
  byHour: { hour: number; entries: number; exits: number }[];
}

export interface PredictionResponse {
  predictedInflow: number;
  predictedStatus: CrowdStatus;
}

/** Checkpoint coordinates for GPS validation (within 5km) */
export const CHECKPOINT_COORDS = {
  latitude: 28.6139, // Delhi default - can be configured per deployment
  longitude: 77.209,
} as const;
