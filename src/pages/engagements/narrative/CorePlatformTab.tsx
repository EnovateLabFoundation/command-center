/**
 * CorePlatformTab
 *
 * Strategic document editor for the narrative platform.
 * Renders labelled cards for each narrative field with approval workflow,
 * version history, and read-only locking when approved.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Shield, AlertTriangle, Anchor, CheckCircle, FilePlus, Lock, Save, Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { LBDCard } from '@/components/ui/lbd/LBDCard';
import { LBDEmptyState, LBDLoadingSkeleton } from '@/components/ui/lbd';
import { useAuthStore } from '@/stores/authStore';
import {
  useNarrativePlatforms,
  useCreateNarrative,
  useUpdateNarrative,
  useApproveNarrative,
  useNewVersion,
  type NarrativePlatform,
} from '@/hooks/useNarrative';

/* ── Field definitions ──────────────────────── */

interface FieldDef {
  key: keyof NarrativePlatform;
  label: string;
  description: string;
  icon: React.ElementType;
  variant?: 'danger' | 'anchor';
}

const FIELDS: FieldDef[] = [
  {
    key: 'master_narrative',
    label: 'MASTER NARRATIVE',
    description: 'The single overarching story — what this leader/institution stands for.',
    icon: Shield,
  },
  {
    key: 'defining_purpose',
    label: 'DEFINING PURPOSE',
    description: 'Why this leader/institution exists beyond self-interest.',
    icon: Shield,
  },
  {
    key: 'leadership_promise',
    label: 'LEADERSHIP PROMISE',
    description: 'The core promise to constituents/stakeholders.',
    icon: Shield,
  },
  {
    key: 'core_values_in_action',
    label: 'CORE VALUES IN ACTION',
    description: 'How values manifest in specific behaviours and decisions.',
    icon: Shield,
  },
  {
    key: 'voice_tone_guide',
    label: 'VOICE & TONE GUIDE',
    description: 'Formal/informal balance, language register, what to avoid.',
    icon: Shield,
  },
  {
    key: 'what_we_never_say',
    label: 'WHAT WE NEVER SAY',
    description: 'Prohibited phrases, narratives, and positions.',
    icon: AlertTriangle,
    variant: 'danger',
  },
  {
    key: 'crisis_anchor_message',
    label: 'CRISIS ANCHOR MESSAGE',
    description: 'The one message to return to in any crisis.',
    icon: Anchor,
    variant: 'anchor',
  },
];

/* ── Component ──────────────────────────────── */

export default function CorePlatformTab() {
  const { id: engagementId } = useParams<{ id: string }>();
  const role = useAuthStore((s) => s.role);
  const { data: platforms, isLoading } = useNarrativePlatforms(engagementId);

  const createNarrative = useCreateNarrative(engagementId ?? '');
  const updateNarrative = useUpdateNarrative(engagementId ?? '');
  const approveNarrative = useApproveNarrative(engagementId ?? '');
  const newVersion = useNewVersion(engagementId ?? '');

  // Selected version (default = latest)
  const [selectedVersionIdx, setSelectedVersionIdx] = useState(0);
  const current = platforms?.[selectedVersionIdx];
  const isLatest = selectedVersionIdx === 0;
  const isApproved = !!current?.is_approved;
  const isReadOnly = isApproved || !isLatest;
  const canApprove = role === 'lead_advisor' || role === 'super_admin';

  // Local draft state (mirrors DB fields)
  const [draft, setDraft] = useState<Record<string, string>>({});

  // Sync draft from selected version
  useEffect(() => {
    if (!current) return;
    const d: Record<string, string> = {};
    FIELDS.forEach((f) => {
      d[f.key] = (current[f.key] as string) ?? '';
    });
    setDraft(d);
  }, [current]);

  const handleChange = useCallback((key: string, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  /* ── Actions ──────────────────────────────── */

  const handleSave = async () => {
    if (!current) return;
    try {
      await updateNarrative.mutateAsync({ id: current.id, ...draft } as any);
      toast.success('Draft saved');
    } catch {
      toast.error('Failed to save');
    }
  };

  const handleRequestApproval = async () => {
    if (!current) return;
    try {
      await updateNarrative.mutateAsync({ id: current.id, ...draft } as any);
      toast.success('Approval requested — Lead Advisor notified');
    } catch {
      toast.error('Failed to save');
    }
  };

  const handleApprove = async () => {
    if (!current) return;
    try {
      await approveNarrative.mutateAsync(current.id);
      toast.success('Narrative Platform approved and locked');
    } catch {
      toast.error('Failed to approve');
    }
  };

  const handleNewVersion = async () => {
    if (!current) return;
    try {
      await newVersion.mutateAsync(current);
      setSelectedVersionIdx(0);
      toast.success(`Version ${current.version + 1} created`);
    } catch {
      toast.error('Failed to create new version');
    }
  };

  const handleCreate = async () => {
    try {
      await createNarrative.mutateAsync({});
      toast.success('Narrative Platform initialised');
    } catch {
      toast.error('Failed to create');
    }
  };

  /* ── Loading / empty ──────────────────────── */

  if (isLoading) return <LBDLoadingSkeleton variant="card" />;

  if (!platforms || platforms.length === 0) {
    return (
      <div className="p-6">
        <LBDEmptyState
          icon={<Shield className="w-8 h-8" />}
          title="No Narrative Platform"
          description="Initialise the narrative platform to begin defining the master narrative."
        />
        <div className="mt-4 flex justify-center">
          <Button onClick={handleCreate} disabled={createNarrative.isPending}>
            <FilePlus className="w-4 h-4 mr-2" /> Initialise Platform
          </Button>
        </div>
      </div>
    );
  }

  /* ── Render ────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* Status banner */}
      {isApproved && isLatest && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[hsl(var(--success)/0.15)] border border-[hsl(var(--success)/0.3)]">
          <CheckCircle className="w-5 h-5 text-[hsl(var(--success))]" />
          <span className="text-sm font-medium text-[hsl(var(--success))]">
            Narrative Platform Approved
            {current?.approved_at && ` — ${format(new Date(current.approved_at), 'dd MMM yyyy')}`}
          </span>
        </div>
      )}
      {!isApproved && isLatest && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[hsl(var(--warning)/0.15)] border border-[hsl(var(--warning)/0.3)]">
          <AlertTriangle className="w-5 h-5 text-[hsl(var(--warning))]" />
          <span className="text-sm font-medium text-[hsl(var(--warning))]">
            Draft — Awaiting Approval
          </span>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {!isReadOnly && (
          <>
            <Button size="sm" variant="outline" onClick={handleSave} disabled={updateNarrative.isPending}>
              <Save className="w-4 h-4 mr-1" /> Save Draft
            </Button>
            <Button size="sm" variant="outline" onClick={handleRequestApproval} disabled={updateNarrative.isPending}>
              <Send className="w-4 h-4 mr-1" /> Request Approval
            </Button>
          </>
        )}
        {isLatest && !isApproved && canApprove && (
          <Button size="sm" onClick={handleApprove} disabled={approveNarrative.isPending}>
            <Lock className="w-4 h-4 mr-1" /> Approve & Lock
          </Button>
        )}
        {isApproved && isLatest && (
          <Button size="sm" variant="outline" onClick={handleNewVersion} disabled={newVersion.isPending}>
            <FilePlus className="w-4 h-4 mr-1" /> Edit (New Version)
          </Button>
        )}
      </div>

      {/* Version history strip */}
      {platforms.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs text-muted-foreground font-mono mr-1">VERSIONS:</span>
          {platforms.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setSelectedVersionIdx(i)}
              className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                i === selectedVersionIdx
                  ? 'bg-accent text-accent-foreground border-accent'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              v{p.version}
              {p.is_approved && ' ✓'}
            </button>
          ))}
        </div>
      )}

      {/* Field cards */}
      {FIELDS.map((f) => {
        const borderClass =
          f.variant === 'danger'
            ? 'border-destructive/50'
            : f.variant === 'anchor'
            ? 'border-accent/60'
            : '';
        return (
          <LBDCard
            key={f.key}
            title={f.label}
            subtitle={f.description}
            className={borderClass}
            action={
              f.variant === 'danger' ? (
                <AlertTriangle className="w-4 h-4 text-destructive" />
              ) : f.variant === 'anchor' ? (
                <Anchor className="w-4 h-4 text-accent" />
              ) : null
            }
          >
            <Textarea
              value={draft[f.key] ?? ''}
              onChange={(e) => handleChange(f.key, e.target.value)}
              disabled={isReadOnly}
              rows={f.key === 'master_narrative' ? 8 : 5}
              placeholder={isReadOnly ? '—' : `Enter ${f.label.toLowerCase()}…`}
              className="resize-y bg-background/50 border-border/40 font-sans text-sm leading-relaxed"
            />
          </LBDCard>
        );
      })}
    </div>
  );
}
