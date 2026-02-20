/**
 * Geolocation utilities for GPS validation
 */

import { CHECKPOINT_COORDS } from '@/types';

const EARTH_RADIUS_KM = 6371;

/**
 * Haversine formula - calculates distance between two coordinates in km
 */
export function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

const VALID_RADIUS_KM = 5;

/**
 * Validates if user is within 5km of checkpoint
 */
export function isWithinCheckpointRadius(
  lat: number,
  lon: number
): { valid: boolean; distanceKm: number } {
  const distanceKm = getDistanceKm(
    lat,
    lon,
    CHECKPOINT_COORDS.latitude,
    CHECKPOINT_COORDS.longitude
  );
  return {
    valid: distanceKm <= VALID_RADIUS_KM,
    distanceKm,
  };
}
