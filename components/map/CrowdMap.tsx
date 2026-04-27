'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, ZoomControl } from 'react-leaflet';
import type { LocationCrowdSummary } from '@/types';

interface Props {
  summaries: LocationCrowdSummary[];
}

const STATUS_COLOR = {
  normal: '#10b981',
  high: '#f59e0b',
  critical: '#ef4444',
};

export default function CrowdMap({ summaries }: Props) {
  // Fix Leaflet's default icon path (broken in Next.js)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require('leaflet');
    delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }, []);

  // Centre on Uttarakhand
  const center: [number, number] = [30.2, 79.1];

  return (
    <MapContainer
      center={center}
      zoom={7}
      zoomControl={false}
      style={{ height: '100%', width: '100%', background: '#071422' }}
      className="rounded-2xl overflow-hidden"
    >
      <ZoomControl position="bottomright" />
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        maxZoom={18}
      />

      {summaries.map((s) => {
        const color = STATUS_COLOR[s.status];
        const radius = 10 + (s.capacityPercent / 100) * 20; // 10–30px
        return (
          <CircleMarker
            key={s.location.id}
            center={[s.location.center_lat, s.location.center_lon]}
            radius={radius}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.55,
              weight: 2,
            }}
          >
            <Popup className="smarttour-popup">
              <div style={{ fontFamily: 'Poppins, sans-serif', minWidth: 160, color: '#e2f0ff', background: '#0a1628', padding: '4px 0' }}>
                <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: '#5eead4' }}>
                  {s.location.name}
                </p>
                <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>
                  {s.location.district} · {s.location.category}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 11 }}>
                  <span style={{ color: '#94a3b8' }}>Active</span>
                  <span style={{ color: '#e2f0ff', fontWeight: 600 }}>{s.activeVehicles}</span>
                  <span style={{ color: '#94a3b8' }}>Entries today</span>
                  <span style={{ color: '#e2f0ff', fontWeight: 600 }}>{s.todayEntries}</span>
                  <span style={{ color: '#94a3b8' }}>Capacity</span>
                  <span style={{ color, fontWeight: 600 }}>{s.capacityPercent}%</span>
                  <span style={{ color: '#94a3b8' }}>Status</span>
                  <span style={{ color, fontWeight: 700, textTransform: 'capitalize' }}>{s.status}</span>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
