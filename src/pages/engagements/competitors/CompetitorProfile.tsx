/**
 * CompetitorProfile
 *
 * Rich, data-dense profile view for a single competitor. Contains 7 sections:
 * 1. Identity Header — name, role, party, constituency, threat gauge
 * 2. Digital Presence — 4 social platform stat cards
 * 3. Media Presence — mentions count, sentiment, trend chart
 * 4. Key Messages — expandable documented positions
 * 5. Vulnerabilities — restricted to lead_advisor / super_admin
 * 6. Alliance Map — card grid of known allies/opponents
 * 7. Recent Activity Log — timeline from intel items
 */

import { useMemo } from 'react';
import {
  Twitter,
  Facebook,
  Instagram,
  Youtube,
  Edit2,
  Lock,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Shield,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LBDCard, LBDStatCard, LBDBadge, LBDSentimentBadge } from '@/components/ui/lbd';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { useCompetitorActivity } from '@/hooks/useCompetitors';
import type { CompetitorProfile as CompetitorProfileType } from '@/hooks/useCompetitors';
import type { SentimentScore } from '@/components/ui/lbd';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useState } from 'react';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { format } from 'date-fns';

interface CompetitorProfileProps {
  competitor: CompetitorProfileType;
  engagementId: string;
  onEdit: () => void;
}

/* ── Threat Score Gauge ───────────────────────────────────────── */

function ThreatGauge({ score }: { score: number }) {
  const normalised = Math.min(10, Math.max(0, score));
  const angle = (normalised / 10) * 180 - 90; // -90 to 90
  const isHigh = normalised > 7;
  const isMed = normalised > 4;

  return (
    <div className="flex flex-col items-center" title={`Threat score: ${normalised}/10`}>
      <div className="relative w-24 h-14 overflow-hidden">
        {/* Background arc */}
        <svg viewBox="0 0 100 55" className="w-full h-full">
          <path
            d="M 5 50 A 45 45 0 0 1 95 50"
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M 5 50 A 45 45 0 0 1 95 50"
            fill="none"
            stroke={isHigh ? 'hsl(var(--destructive))' : isMed ? 'hsl(var(--warning))' : 'hsl(var(--success))'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(normalised / 10) * 141} 141`}
          />
          {/* Needle */}
          <line
            x1="50"
            y1="50"
            x2={50 + 35 * Math.cos((angle * Math.PI) / 180)}
            y2={50 - 35 * Math.sin((-angle * Math.PI) / 180)}
            stroke="hsl(var(--foreground))"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="50" cy="50" r="3" fill="hsl(var(--foreground))" />
        </svg>
      </div>
      <span className={cn(
        'text-2xl font-bold font-mono-data mt-1',
        isHigh ? 'text-destructive' : isMed ? 'text-warning' : 'text-success',
      )}>
        {normalised}
      </span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Threat</span>
    </div>
  );
}

/* ── Social Stat Card ─────────────────────────────────────────── */

function SocialCard({
  icon: Icon,
  label,
  value,
  handle,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  handle?: string | null;
}) {
  const formatted = value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(1)}M`
    : value >= 1_000
      ? `${(value / 1_000).toFixed(1)}K`
      : String(value);

  return (
    <LBDCard className="flex-1 min-w-[140px]">
      <div className="flex items-start justify-between">
        <Icon className="w-4 h-4 text-muted-foreground" />
        {handle && <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{handle}</span>}
      </div>
      <p className="text-2xl font-bold font-mono-data text-foreground mt-2">{formatted}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
    </LBDCard>
  );
}

/* ── Main Component ──────────────────────────────────────────── */

export default function CompetitorProfileView({
  competitor,
  engagementId,
  onEdit,
}: CompetitorProfileProps) {
  const role = useAuthStore((s) => s.role);
  const canViewVulnerabilities = role === 'super_admin' || role === 'lead_advisor';

  const { data: activityItems = [] } = useCompetitorActivity(competitor.name, engagementId);

  /* Parse JSONB fields safely */
  const keyMessages = useMemo(() => {
    const raw = competitor.key_messages;
    if (Array.isArray(raw)) return raw as Array<{ text?: string; source?: string; date?: string; annotation?: string }>;
    return [];
  }, [competitor.key_messages]);

  const vulnerabilities = useMemo(() => {
    const raw = competitor.vulnerabilities;
    if (Array.isArray(raw)) return raw as Array<{ text?: string; severity?: string; implication?: string }>;
    return [];
  }, [competitor.vulnerabilities]);

  const allianceMap = useMemo(() => {
    const raw = competitor.alliance_map;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const allies = ((raw as any).allies ?? []) as Array<{ name: string; role?: string; type?: string }>;
      const neutral = ((raw as any).neutral ?? []) as Array<{ name: string; role?: string; type?: string }>;
      const opponents = ((raw as any).opponents ?? []) as Array<{ name: string; role?: string; type?: string }>;
      return { allies, neutral, opponents };
    }
    return { allies: [], neutral: [], opponents: [] };
  }, [competitor.alliance_map]);

  /* Fake 90-day sentiment data from avg_sentiment_score for demo chart */
  const sentimentData = useMemo(() => {
    const base = competitor.avg_sentiment_score ?? 0;
    return Array.from({ length: 12 }, (_, i) => ({
      week: `W${i + 1}`,
      score: +(base + (Math.random() - 0.5) * 1.5).toFixed(2),
    }));
  }, [competitor.avg_sentiment_score]);

  return (
    <div className="space-y-6">
      {/* ── SECTION 1: Identity Header ──────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-6">
          {/* Avatar placeholder */}
          <div className="w-16 h-16 rounded-full bg-card border-2 border-accent/30 flex items-center justify-center flex-none">
            <span className="text-xl font-bold text-accent">
              {competitor.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">{competitor.name}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {competitor.role_position && (
                <LBDBadge variant="outline" size="sm">{competitor.role_position}</LBDBadge>
              )}
              {competitor.party_affiliation && (
                <LBDBadge variant="outline" size="sm">{competitor.party_affiliation}</LBDBadge>
              )}
              {competitor.constituency && (
                <span className="text-xs text-muted-foreground">{competitor.constituency}</span>
              )}
            </div>
            {competitor.last_updated && (
              <p className="text-[10px] text-muted-foreground mt-2">
                Last updated: {format(new Date(competitor.last_updated), 'dd MMM yyyy HH:mm')}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <ThreatGauge score={competitor.threat_score ?? 0} />
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
          </Button>
        </div>
      </div>

      {/* ── SECTION 2: Digital Presence ─────────────────────────── */}
      <div>
        <h3 className="font-mono text-[10px] tracking-[0.3em] text-accent uppercase mb-3">Digital Presence</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SocialCard icon={Twitter} label="X / Twitter Followers" value={competitor.twitter_followers ?? 0} handle={competitor.twitter_handle} />
          <SocialCard icon={Facebook} label="Facebook Likes" value={competitor.facebook_likes ?? 0} handle={competitor.facebook_page} />
          <SocialCard icon={Instagram} label="Instagram Followers" value={competitor.instagram_followers ?? 0} handle={competitor.instagram_handle} />
          <SocialCard icon={Youtube} label="YouTube Subscribers" value={competitor.youtube_subscribers ?? 0} handle={competitor.youtube_channel} />
        </div>
      </div>

      {/* ── SECTION 3: Media Presence ──────────────────────────── */}
      <div>
        <h3 className="font-mono text-[10px] tracking-[0.3em] text-accent uppercase mb-3">Media Presence</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LBDCard>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Monthly Media Mentions</span>
                <span className="text-2xl font-bold font-mono-data text-foreground">
                  {competitor.monthly_media_mentions ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Avg Sentiment</span>
                <LBDSentimentBadge score={Math.round(competitor.avg_sentiment_score ?? 0) as SentimentScore} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Influence Score</span>
                <span className="text-lg font-bold font-mono-data text-foreground">{competitor.influence_score ?? '—'}/10</span>
              </div>
            </div>
          </LBDCard>

          <LBDCard title="Sentiment Trend (90 days)">
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sentimentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis domain={[-2, 2]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--accent))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </LBDCard>
        </div>
      </div>

      {/* ── SECTION 4: Key Messages ────────────────────────────── */}
      <div>
        <h3 className="font-mono text-[10px] tracking-[0.3em] text-accent uppercase mb-3">Key Messages &amp; Positions</h3>
        {keyMessages.length === 0 ? (
          <LBDCard>
            <p className="text-sm text-muted-foreground text-center py-4">No documented messages yet.</p>
          </LBDCard>
        ) : (
          <div className="space-y-2">
            {keyMessages.map((msg, i) => (
              <MessageItem key={i} msg={msg} />
            ))}
          </div>
        )}
      </div>

      {/* ── SECTION 5: Vulnerabilities (Restricted) ────────────── */}
      <div>
        <h3 className="font-mono text-[10px] tracking-[0.3em] text-accent uppercase mb-3">Vulnerabilities</h3>
        {canViewVulnerabilities ? (
          vulnerabilities.length === 0 ? (
            <LBDCard>
              <p className="text-sm text-muted-foreground text-center py-4">No documented vulnerabilities.</p>
            </LBDCard>
          ) : (
            <div className="space-y-2">
              {vulnerabilities.map((v, i) => (
                <LBDCard key={i} className="border-l-2 border-l-destructive">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-destructive flex-none mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">{v.text}</p>
                      {v.severity && (
                        <LBDBadge variant={v.severity === 'high' ? 'red' : v.severity === 'medium' ? 'amber' : 'outline'} size="sm" className="mt-1.5">
                          {v.severity}
                        </LBDBadge>
                      )}
                      {v.implication && (
                        <p className="text-xs text-muted-foreground mt-1">{v.implication}</p>
                      )}
                    </div>
                  </div>
                </LBDCard>
              ))}
            </div>
          )
        ) : (
          <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-6 flex items-center gap-3">
            <Lock className="w-5 h-5 text-destructive flex-none" />
            <div>
              <p className="text-sm font-medium text-destructive">Access Restricted — Lead Advisor Only</p>
              <p className="text-xs text-muted-foreground mt-0.5">Vulnerability data is classified. Contact a lead advisor for access.</p>
            </div>
          </div>
        )}
      </div>

      {/* ── SECTION 6: Alliance Map ───────────────────────────── */}
      <div>
        <h3 className="font-mono text-[10px] tracking-[0.3em] text-accent uppercase mb-3">Alliance Map</h3>
        {allianceMap.allies.length === 0 && allianceMap.neutral.length === 0 && allianceMap.opponents.length === 0 ? (
          <LBDCard>
            <p className="text-sm text-muted-foreground text-center py-4">No alliance data documented.</p>
          </LBDCard>
        ) : (
          <div className="space-y-4">
            {[
              { label: 'Allies', items: allianceMap.allies, variant: 'green' as const },
              { label: 'Neutral', items: allianceMap.neutral, variant: 'outline' as const },
              { label: 'Opponents', items: allianceMap.opponents, variant: 'red' as const },
            ].filter(g => g.items.length > 0).map((group) => (
              <div key={group.label}>
                <p className="text-xs text-muted-foreground mb-2">{group.label}</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {group.items.map((person, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2.5 rounded-lg bg-card border border-border"
                    >
                      <User className="w-3.5 h-3.5 text-muted-foreground flex-none" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{person.name}</p>
                        {person.role && <p className="text-[10px] text-muted-foreground truncate">{person.role}</p>}
                      </div>
                      <LBDBadge variant={group.variant} size="sm" className="ml-auto flex-none">
                        {person.type ?? group.label}
                      </LBDBadge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SECTION 7: Recent Activity Log ────────────────────── */}
      <div>
        <h3 className="font-mono text-[10px] tracking-[0.3em] text-accent uppercase mb-3">Recent Activity (30 days)</h3>
        {activityItems.length === 0 ? (
          <LBDCard>
            <p className="text-sm text-muted-foreground text-center py-4">No recent intel mentioning this competitor.</p>
          </LBDCard>
        ) : (
          <div className="space-y-1">
            {activityItems.slice(0, 20).map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 px-4 py-3 rounded-lg hover:bg-card/50 transition-colors border border-transparent hover:border-border"
              >
                <span className="text-[10px] font-mono text-muted-foreground w-16 flex-none pt-0.5">
                  {format(new Date(item.date_logged), 'dd MMM')}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground truncate">{item.headline}</p>
                  {item.source_name && (
                    <p className="text-[10px] text-muted-foreground">{item.source_name}</p>
                  )}
                </div>
                {item.sentiment_score != null && (
                  <LBDSentimentBadge
                    score={Math.round(item.sentiment_score) as SentimentScore}
                    size="sm"
                    showLabel={false}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Message Item (collapsible) ───────────────────────────────── */

function MessageItem({ msg }: { msg: { text?: string; source?: string; date?: string; annotation?: string } }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border border-border rounded-lg overflow-hidden">
        <CollapsibleTrigger className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-card/50 transition-colors">
          {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
          <span className="text-sm text-foreground flex-1 truncate">{msg.text ?? 'Undocumented position'}</span>
          {msg.date && <span className="text-[10px] text-muted-foreground flex-none">{msg.date}</span>}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-3 pt-0 space-y-1 border-t border-border/50">
            {msg.source && (
              <p className="text-xs text-muted-foreground"><span className="font-medium">Source:</span> {msg.source}</p>
            )}
            {msg.annotation && (
              <p className="text-xs text-accent"><span className="font-medium">LBD Note:</span> {msg.annotation}</p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
