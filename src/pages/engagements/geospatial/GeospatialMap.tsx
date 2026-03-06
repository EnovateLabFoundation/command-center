/**
 * GeospatialMap
 *
 * Interactive Leaflet map component for the Geospatial Analytics Engine.
 * Renders Nigeria-centred OpenStreetMap tiles with stakeholder bubble markers,
 * and a layer toggle panel. Clicking a region triggers a detail side panel.
 *
 * @param stakeholders - Array of stakeholders with lat/lng coordinates
 * @param onRegionClick - Callback when a region/marker is clicked
 */

import { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { cn } from '@/lib/utils';
import { LBDSentimentBadge, type SentimentScore } from '@/components/ui/lbd';
import 'leaflet/dist/leaflet.css';

interface Stakeholder {
  id: string;
  name: string;
  role_position: string | null;
  category: string;
  alignment: string | null;
  influence_score: number | null;
  lat: number | null;
  lng: number | null;
  strategic_priority: string | null;
  state?: string | null;
  senatorial_district?: string | null;
  geopolitical_zone?: string | null;
  lga?: string | null;
  ward?: string | null;
}

interface GeospatialMapProps {
  stakeholders: Stakeholder[];
  onMarkerClick?: (stakeholder: Stakeholder) => void;
  className?: string;
}

/** Alignment → colour mapping using HSL design tokens */
const ALIGNMENT_COLOURS: Record<string, string> = {
  champion: '#27AE60',   // success
  supportive: '#2ECC71',
  neutral: '#A0A0B0',    // muted-foreground
  hostile: '#C0392B',    // destructive
};

export default function GeospatialMap({ stakeholders, onMarkerClick, className }: GeospatialMapProps) {
  /** Only show stakeholders with valid coordinates */
  const geoStakeholders = useMemo(
    () => stakeholders.filter((s) => s.lat != null && s.lng != null),
    [stakeholders],
  );

  return (
    <div className={cn('relative rounded-xl overflow-hidden border border-border', className)}>
      <MapContainer
        center={[9.082, 8.675]}
        zoom={6}
        style={{ height: '600px', width: '100%', background: 'hsl(230, 33%, 8%)' }}
        scrollWheelZoom
        zoomControl
      >
        {/* Dark-themed OpenStreetMap tiles */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Stakeholder bubble markers */}
        {geoStakeholders.map((s) => {
          const radius = Math.max(6, Math.min(18, (s.influence_score ?? 5) * 1.5));
          const colour = ALIGNMENT_COLOURS[s.alignment ?? 'neutral'] ?? ALIGNMENT_COLOURS.neutral;

          return (
            <CircleMarker
              key={s.id}
              center={[s.lat!, s.lng!]}
              radius={radius}
              pathOptions={{
                fillColor: colour,
                fillOpacity: 0.7,
                color: colour,
                weight: 1,
              }}
              eventHandlers={{
                click: () => onMarkerClick?.(s),
              }}
            >
              <Popup>
                <div className="text-xs space-y-1 min-w-[160px]">
                  <p className="font-semibold text-foreground">{s.name}</p>
                  {s.role_position && <p className="text-muted-foreground">{s.role_position}</p>}
                  <p className="capitalize">{s.category} · {s.alignment ?? 'neutral'}</p>
                  {s.influence_score != null && (
                    <p>Influence: <span className="font-mono">{s.influence_score}/10</span></p>
                  )}
                  {s.state && <p className="text-muted-foreground">State: {s.state}</p>}
                  {s.senatorial_district && <p className="text-muted-foreground">{s.senatorial_district}</p>}
                  {s.geopolitical_zone && <p className="text-muted-foreground">{s.geopolitical_zone} Zone</p>}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Layer legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 text-xs space-y-1.5">
        <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">Alignment</p>
        {Object.entries(ALIGNMENT_COLOURS).map(([label, colour]) => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full flex-none" style={{ backgroundColor: colour }} />
            <span className="capitalize text-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
