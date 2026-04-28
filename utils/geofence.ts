/**
 * Client-side geofencing state machine.
 *
 * Edge cases handled:
 *  - Boundary flicker  → 60-second debounce on event firing
 *  - Drive-through      → 3-minute minimum dwell before logging entry
 *  - Bad GPS accuracy   → readings with accuracy > 50m are ignored
 *  - Multiple zones     → smallest containing radius wins
 */

import { haversineKm, findContainingLocation } from '@/utils/locations';
import type { Location } from '@/types';

export interface GeofenceConfig {
  /** Minimum time (ms) inside a zone before "entered" fires. */
  dwellMs: number;
  /** Cooldown (ms) before another state change is allowed. */
  debounceMs: number;
  /** Maximum acceptable position accuracy in metres. */
  maxAccuracyM: number;
}

export const DEFAULT_GEOFENCE_CONFIG: GeofenceConfig = {
  // Reduced from 3min → 60s. Demo + real-world testing need fast confirmation.
  // 60s is still enough to ignore drive-throughs at >60 km/h.
  dwellMs: 60 * 1000,
  debounceMs: 30 * 1000,
  // Increased from 50m → 200m. Mobile GPS in hilly terrain (Mussoorie,
  // Kedarnath, etc.) routinely reports 80-300m accuracy. 50m was rejecting
  // most readings → geofencer never saw the user as "inside".
  maxAccuracyM: 200,
};

export type GeofenceEventKind = 'entered' | 'exited' | 'heartbeat';

export interface GeofenceEvent {
  kind: GeofenceEventKind;
  locationId: string | null;
  locationName: string | null;
  lat: number;
  lon: number;
  accuracy: number | null;
  at: number;
}

interface InternalState {
  currentZoneId: string | null;
  /** When we first detected being inside the current candidate zone. */
  candidateZoneId: string | null;
  candidateSince: number;
  /** Last time we fired any state-change event. */
  lastChangeAt: number;
  /** Last reported zone (for change detection). */
  lastReportedZoneId: string | null;
}

export class Geofencer {
  private state: InternalState = {
    currentZoneId: null,
    candidateZoneId: null,
    candidateSince: 0,
    lastChangeAt: 0,
    lastReportedZoneId: null,
  };

  constructor(
    private locations: Pick<Location, 'id' | 'slug' | 'name' | 'center_lat' | 'center_lon' | 'radius_km'>[],
    private cfg: GeofenceConfig = DEFAULT_GEOFENCE_CONFIG,
  ) {}

  setLocations(locations: typeof this.locations) {
    this.locations = locations;
  }

  /** Process a new GPS reading. Returns the events that should be fired. */
  process(lat: number, lon: number, accuracy: number | null, now: number = Date.now()): GeofenceEvent[] {
    if (accuracy !== null && accuracy > this.cfg.maxAccuracyM) {
      // Reading too noisy - skip but report a heartbeat anyway
      return [{ kind: 'heartbeat', locationId: this.state.currentZoneId, locationName: this.zoneName(this.state.currentZoneId), lat, lon, accuracy, at: now }];
    }

    const match = findContainingLocation(lat, lon, this.locations);
    const matchId = match?.location.id ?? null;
    const events: GeofenceEvent[] = [];

    // Always emit a heartbeat for active sessions so server can refresh last_heartbeat_at
    events.push({
      kind: 'heartbeat',
      locationId: this.state.currentZoneId,
      locationName: this.zoneName(this.state.currentZoneId),
      lat,
      lon,
      accuracy,
      at: now,
    });

    const sinceLastChange = now - this.state.lastChangeAt;

    if (matchId === this.state.currentZoneId) {
      // No zone change, but reset candidate timer if needed
      this.state.candidateZoneId = matchId;
      this.state.candidateSince = matchId ? this.state.candidateSince : now;
      return events;
    }

    // Inside a *different* zone (or none) than what we currently consider "in"
    if (matchId !== this.state.candidateZoneId) {
      this.state.candidateZoneId = matchId;
      this.state.candidateSince = now;
      return events;
    }

    const candidateAge = now - this.state.candidateSince;

    // Exit (was inside, now outside any zone)
    if (matchId === null && this.state.currentZoneId !== null && sinceLastChange >= this.cfg.debounceMs) {
      events.push({
        kind: 'exited',
        locationId: this.state.currentZoneId,
        locationName: this.zoneName(this.state.currentZoneId),
        lat,
        lon,
        accuracy,
        at: now,
      });
      this.state.currentZoneId = null;
      this.state.lastChangeAt = now;
      this.state.lastReportedZoneId = null;
      return events;
    }

    // Entry: was outside (or in different zone), candidate has been stable for dwellMs
    if (matchId !== null && candidateAge >= this.cfg.dwellMs && sinceLastChange >= this.cfg.debounceMs) {
      // If we were inside another zone, fire exit first
      if (this.state.currentZoneId !== null) {
        events.push({
          kind: 'exited',
          locationId: this.state.currentZoneId,
          locationName: this.zoneName(this.state.currentZoneId),
          lat,
          lon,
          accuracy,
          at: now,
        });
      }
      events.push({
        kind: 'entered',
        locationId: matchId,
        locationName: match!.location.name,
        lat,
        lon,
        accuracy,
        at: now,
      });
      this.state.currentZoneId = matchId;
      this.state.lastChangeAt = now;
      this.state.lastReportedZoneId = matchId;
    }

    return events;
  }

  private zoneName(id: string | null): string | null {
    if (!id) return null;
    return this.locations.find((l) => l.id === id)?.name ?? null;
  }

  getCurrentZoneId(): string | null {
    return this.state.currentZoneId;
  }

  getDistanceKmToNearest(lat: number, lon: number): { name: string; km: number } | null {
    let best: { name: string; km: number } | null = null;
    for (const loc of this.locations) {
      const d = haversineKm(lat, lon, loc.center_lat, loc.center_lon);
      if (!best || d < best.km) {
        best = { name: loc.name, km: d };
      }
    }
    return best;
  }

  /** Expose candidate state so UI can show "Confirming entry in N seconds…" */
  getCandidate(): { id: string | null; since: number } {
    return {
      id: this.state.candidateZoneId,
      since: this.state.candidateSince,
    };
  }

  getDwellMs(): number {
    return this.cfg.dwellMs;
  }
}
