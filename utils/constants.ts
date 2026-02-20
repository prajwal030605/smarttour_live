/**
 * Application constants
 */

export const VEHICLE_TYPES = [
  'Car',
  'Bus',
  'Mini Van',
  'Motorcycle',
  'Bicycle',
  'Walking',
  'Other',
] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];
