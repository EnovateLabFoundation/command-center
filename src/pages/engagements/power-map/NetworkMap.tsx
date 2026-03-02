/**
 * NetworkMap
 *
 * Network Visualisation tab for the Power Map module.
 *
 * Sections:
 *  1. React-Leaflet map — circle markers at stakeholder lat/lng
 *     Colour = alignment, Size = influence score
 *     Click → popup with name, role, alignment badge
 *
 *  2. Force-directed relationship graph (CSS-simulated layout)
 *     Nodes positioned via a simple deterministic circular / tiered layout
 *     since D3 is not installed. Nodes sized by influence, coloured by alignment.
 *     Hover → tooltip card.
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '@/lib/utils';
import type { StakeholderRow, StakeholderAlignment } from '@/hooks/usePowerMap';
import { ALIGNMENT_LABELS, CATEGORY_LABELS } from '@/hooks/usePowerMap';

/* ─────────────────────────────────────────────
   Alignment colours for map & graph
───────────────────────────────────────────── */

const ALIGNMENT_HEX: Record<StakeholderAlignment, string> = {
  champion:   '#d4af37',
  supportive: '#34d399',
  neutral:    '#6b7280',
  hostile:    '#f87171',
};

const ALIGNMENT_CSS: Record<StakeholderAlignment, string> = {
  champion:   'bg-[#d4af37]/20 border-[#d4af37]/50 text-[#d4af37]',
  supportive: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400',
  neutral:    'bg-muted/20 border-border text-muted-foreground',
  hostile:    'bg-red-500/20 border-red-500/50 text-red-400',
};

/* ─────────────────────────────────────────────
   Section header
───────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-[10px] font-mono tracking-widest text-muted-foreground/50 uppercase">
        {children}
      </span>
      <div className="flex-1 h-px bg-border/30" />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Map legend
───────────────────────────────────────────── */

function MapLegend() {
  return (
    <div className="absolute bottom-4 left-4 z-[1000] rounded-xl border border-border/60 bg-[#0e0e10]/90 backdrop-blur px-3 py-2.5 space-y-1.5">
      <p className="text-[9px] font-mono tracking-widest text-muted-foreground/50 uppercase">Legend</p>
      {(Object.keys(ALIGNMENT_HEX) as StakeholderAlignment[]).map((a) => (
        <div key={a} className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full flex-none"
            style={{ backgroundColor: ALIGNMENT_HEX[a] }}
          />
          <span className="text-[10px] font-mono text-muted-foreground/70 capitalize">{ALIGNMENT_LABELS[a]}</span>
        </div>
      ))}
      <div className="border-t border-border/30 pt-1.5 mt-1">
        <p className="text-[9px] text-muted-foreground/40 font-mono">Circle size = influence score</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Geographic map
───────────────────────────────────────────── */

function GeoMap({ stakeholders }: { stakeholders: StakeholderRow[] }) {
  const mapped = stakeholders.filter((s) => s.lat !== null && s.lng !== null);

  // Compute map centre from stakeholders, default to Lagos
  const centre = useMemo<[number, number]>(() => {
    if (mapped.length === 0) return [6.5244, 3.3792];
    const avgLat = mapped.reduce((s, r) => s + (r.lat ?? 0), 0) / mapped.length;
    const avgLng = mapped.reduce((s, r) => s + (r.lng ?? 0), 0) / mapped.length;
    return [avgLat, avgLng];
  }, [mapped]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-border/60" style={{ height: 380 }}>
      <MapContainer
        center={centre}
        zoom={mapped.length > 0 ? 7 : 6}
        style={{ height: '100%', width: '100%', background: '#0a0a0c' }}
        className="rounded-xl"
        zoomControl
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        {mapped.map((s) => {
          const alignment = (s.alignment ?? 'neutral') as StakeholderAlignment;
          const colour    = ALIGNMENT_HEX[alignment];
          const radius    = 6 + (s.influence_score ?? 5);
          return (
            <CircleMarker
              key={s.id}
              center={[s.lat!, s.lng!]}
              radius={radius}
              pathOptions={{
                color:       colour,
                fillColor:   colour,
                fillOpacity: 0.7,
                weight:      1.5,
              }}
            >
              <Popup
                className="stakeholder-popup"
              >
                <div className="bg-[#0e0e10] rounded-lg p-3 min-w-[200px] border border-border text-foreground">
                  <p className="text-sm font-bold text-foreground">{s.name}</p>
                  {s.role_position && (
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">{s.role_position}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={cn(
                        'inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border',
                        ALIGNMENT_CSS[alignment],
                      )}
                    >
                      {ALIGNMENT_LABELS[alignment]}
                    </span>
                    {s.influence_score !== null && (
                      <span className="text-[10px] font-mono text-muted-foreground/60">
                        Influence: {s.influence_score}/10
                      </span>
                    )}
                  </div>
                  {s.strategic_priority && (
                    <p className="text-[10px] font-mono text-muted-foreground/50 mt-1 capitalize">
                      Priority: {s.strategic_priority}
                    </p>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
      <MapLegend />
      {mapped.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-sm text-muted-foreground/50">No stakeholders with map coordinates</p>
            <p className="text-[10px] font-mono text-muted-foreground/30 mt-1">Add lat/lng to stakeholders to plot them on the map</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Force-directed node graph (CSS layout)
   Nodes laid out in alignment tiers:
   Champion (top) → Supportive → Neutral → Hostile (bottom)
   Within each tier, distributed horizontally.
───────────────────────────────────────────── */

interface NodePosition {
  x: number;
  y: number;
  stakeholder: StakeholderRow;
}

function computeLayout(stakeholders: StakeholderRow[], width: number, height: number): NodePosition[] {
  const tiers: StakeholderAlignment[] = ['champion', 'supportive', 'neutral', 'hostile'];
  const tierY: Record<StakeholderAlignment, number> = {
    champion:   height * 0.15,
    supportive: height * 0.38,
    neutral:    height * 0.62,
    hostile:    height * 0.85,
  };

  const positions: NodePosition[] = [];

  tiers.forEach((tier) => {
    const group = stakeholders.filter((s) => (s.alignment ?? 'neutral') === tier);
    if (group.length === 0) return;
    const spacing = width / (group.length + 1);
    group.forEach((s, i) => {
      positions.push({
        x: spacing * (i + 1),
        y: tierY[tier],
        stakeholder: s,
      });
    });
  });

  // Unaligned stakeholders (null) → neutral tier
  const unaligned = stakeholders.filter((s) => s.alignment === null);
  if (unaligned.length > 0) {
    const spacing = width / (unaligned.length + 1);
    unaligned.forEach((s, i) => {
      positions.push({
        x: spacing * (i + 1),
        y: height * 0.62,
        stakeholder: s,
      });
    });
  }

  return positions;
}

interface NodeGraphProps {
  stakeholders: StakeholderRow[];
  graphRef?: React.RefObject<HTMLDivElement>;
}

function NodeGraph({ stakeholders, graphRef }: NodeGraphProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims]   = useState({ width: 800, height: 420 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setDims({ width: rect.width, height: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const positions = useMemo(
    () => computeLayout(stakeholders, dims.width, dims.height),
    [stakeholders, dims],
  );

  const TIERS: { label: string; alignment: StakeholderAlignment; y: number }[] = [
    { label: 'Champion',   alignment: 'champion',   y: dims.height * 0.15 },
    { label: 'Supportive', alignment: 'supportive', y: dims.height * 0.38 },
    { label: 'Neutral',    alignment: 'neutral',    y: dims.height * 0.62 },
    { label: 'Hostile',    alignment: 'hostile',    y: dims.height * 0.85 },
  ];

  const hovered = positions.find((p) => p.stakeholder.id === hoveredId);

  return (
    <div
      ref={(el) => {
        // Assign to both refs
        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        if (graphRef) (graphRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }}
      className="relative w-full rounded-xl border border-border/60 bg-[#0a0a0c] overflow-hidden"
      style={{ height: 420 }}
    >
      {/* Tier separator lines */}
      {TIERS.map((t) => (
        <div
          key={t.alignment}
          className="absolute left-0 right-0 flex items-center gap-3 pointer-events-none"
          style={{ top: t.y - 12 }}
        >
          <div className="w-2" />
          <span
            className={cn(
              'text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded',
              ALIGNMENT_CSS[t.alignment],
            )}
          >
            {t.label}
          </span>
          <div className="flex-1 h-px opacity-20" style={{ background: ALIGNMENT_HEX[t.alignment] }} />
        </div>
      ))}

      {/* SVG for edge lines (connect all nodes to a virtual centre) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 0.12 }}
      >
        {positions.map((p) => (
          <line
            key={p.stakeholder.id}
            x1={dims.width / 2}
            y1={dims.height / 2}
            x2={p.x}
            y2={p.y}
            stroke={ALIGNMENT_HEX[(p.stakeholder.alignment ?? 'neutral') as StakeholderAlignment]}
            strokeWidth={1}
          />
        ))}
      </svg>

      {/* Central hub node */}
      <div
        className="absolute w-10 h-10 rounded-full border-2 border-accent/40 bg-accent/10 flex items-center justify-center z-10"
        style={{
          left: dims.width / 2 - 20,
          top:  dims.height / 2 - 20,
        }}
      >
        <span className="text-[8px] font-mono text-accent/70 text-center leading-tight">CLIENT</span>
      </div>

      {/* Nodes */}
      {positions.map((p) => {
        const alignment = (p.stakeholder.alignment ?? 'neutral') as StakeholderAlignment;
        const hex    = ALIGNMENT_HEX[alignment];
        const radius = 12 + Math.min((p.stakeholder.influence_score ?? 5) * 1.5, 16);
        const isHov  = hoveredId === p.stakeholder.id;

        return (
          <div
            key={p.stakeholder.id}
            className={cn(
              'absolute rounded-full border-2 flex items-center justify-center cursor-pointer',
              'transition-all duration-200 hover:scale-110 z-20',
            )}
            style={{
              left:            p.x - radius,
              top:             p.y - radius,
              width:           radius * 2,
              height:          radius * 2,
              borderColor:     hex,
              backgroundColor: `${hex}22`,
              boxShadow:       isHov ? `0 0 16px ${hex}55` : undefined,
            }}
            onMouseEnter={() => setHoveredId(p.stakeholder.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <span
              className="text-[8px] font-bold leading-tight text-center px-0.5 truncate max-w-full"
              style={{ color: hex }}
            >
              {p.stakeholder.name.split(' ')[0]}
            </span>
          </div>
        );
      })}

      {/* Hover tooltip */}
      {hovered && (
        <div
          className={cn(
            'absolute z-30 pointer-events-none',
            'rounded-xl border border-border/80 bg-[#0e0e10]/95 backdrop-blur p-3 shadow-2xl',
            'min-w-[200px] max-w-[260px]',
          )}
          style={{
            left: Math.min(hovered.x + 20, dims.width - 280),
            top:  Math.max(hovered.y - 80, 8),
          }}
        >
          <p className="text-sm font-bold text-foreground">{hovered.stakeholder.name}</p>
          {hovered.stakeholder.role_position && (
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">{hovered.stakeholder.role_position}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span
              className={cn('text-[10px] font-semibold px-2 py-0.5 rounded border', ALIGNMENT_CSS[
                (hovered.stakeholder.alignment ?? 'neutral') as StakeholderAlignment
              ])}
            >
              {ALIGNMENT_LABELS[(hovered.stakeholder.alignment ?? 'neutral') as StakeholderAlignment]}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/50 px-2 py-0.5 rounded border border-border/40">
              {CATEGORY_LABELS[hovered.stakeholder.category]}
            </span>
          </div>
          {hovered.stakeholder.influence_score !== null && (
            <p className="text-[10px] font-mono text-muted-foreground/50 mt-1.5">
              Influence: <span className="text-foreground">{hovered.stakeholder.influence_score}/10</span>
            </p>
          )}
          {hovered.stakeholder.engagement_strategy && (
            <p className="text-[10px] font-mono text-muted-foreground/50 mt-0.5">
              Strategy: <span className="text-foreground">{hovered.stakeholder.engagement_strategy}</span>
            </p>
          )}
        </div>
      )}

      {stakeholders.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-muted-foreground/40">No stakeholders to visualise</p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main export
───────────────────────────────────────────── */

interface NetworkMapProps {
  stakeholders: StakeholderRow[];
  mapRef?:      React.RefObject<HTMLDivElement>;
  graphRef?:    React.RefObject<HTMLDivElement>;
}

export default function NetworkMap({ stakeholders, mapRef, graphRef }: NetworkMapProps) {
  return (
    <div className="space-y-6">
      <SectionLabel>Geographic Distribution</SectionLabel>
      <div ref={mapRef}>
        <GeoMap stakeholders={stakeholders} />
      </div>

      <SectionLabel>Stakeholder Relationship Graph</SectionLabel>
      <div className="text-[10px] font-mono text-muted-foreground/40 -mt-3 mb-2">
        Nodes grouped by alignment tier · Sized by influence score · Hover for detail
      </div>
      <NodeGraph stakeholders={stakeholders} graphRef={graphRef} />
    </div>
  );
}
