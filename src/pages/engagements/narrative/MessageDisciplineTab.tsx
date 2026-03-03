/**
 * MessageDisciplineTab
 *
 * Rules editor for approved and prohibited phrases.
 * Includes AI-powered "Message Compliance Check" modal that uses
 * the check-narrative-compliance Edge Function for deep analysis.
 */

import { useState, useCallback } from 'react';
import { Plus, Trash2, ShieldCheck, AlertTriangle, Search, Sparkles, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { LBDCard } from '@/components/ui/lbd/LBDCard';
import { LBDModal, LBDModalButton } from '@/components/ui/lbd/LBDModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/lbd';

/* ── Types ──────────────────────────────────── */

interface Phrase {
  id: string;
  text: string;
  context: string;
}

interface FlaggedPhrase {
  phrase: string;
  reason: string;
  severity: string;
}

interface ComplianceResult {
  compliance_score: number;
  flagged_phrases: FlaggedPhrase[];
  risk_assessment: string;
  suggested_edits: string;
}

/* ── Sub-components ─────────────────────────── */

/** Phrase list card */
function PhraseCard({ phrase, variant, onRemove }: {
  phrase: Phrase;
  variant: 'approved' | 'prohibited';
  onRemove: () => void;
}) {
  return (
    <LBDCard
      className={variant === 'approved' ? 'border-[hsl(var(--success)/0.3)]' : 'border-destructive/30'}
      noBorderAccent
      padding="sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{phrase.text}</p>
          {phrase.context && <p className="text-xs text-muted-foreground mt-1">{phrase.context}</p>}
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </LBDCard>
  );
}

/** Add phrase form */
function AddPhraseForm({ variant, onAdd }: {
  variant: 'approved' | 'prohibited';
  onAdd: (text: string, context: string) => void;
}) {
  const [text, setText] = useState('');
  const [ctx, setCtx] = useState('');

  const handleAdd = () => {
    if (!text.trim()) return;
    onAdd(text.trim(), ctx.trim());
    setText('');
    setCtx('');
  };

  return (
    <div className="space-y-2 p-4 rounded-lg border border-border/50 bg-background/30">
      <Input
        placeholder={`${variant === 'approved' ? 'Approved' : 'Prohibited'} phrase`}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Input
        placeholder="Context / rationale (optional)"
        value={ctx}
        onChange={(e) => setCtx(e.target.value)}
      />
      <Button
        size="sm"
        variant={variant === 'approved' ? 'outline' : 'destructive'}
        onClick={handleAdd}
        disabled={!text.trim()}
      >
        <Plus className="w-3 h-3 mr-1" /> Add {variant === 'approved' ? 'Approved' : 'Prohibited'} Phrase
      </Button>
    </div>
  );
}

/* ── Main Component ─────────────────────────── */

export default function MessageDisciplineTab() {
  const [approved, setApproved] = useState<Phrase[]>([]);
  const [prohibited, setProhibited] = useState<Phrase[]>([]);

  // Compliance check state
  const [complianceOpen, setComplianceOpen] = useState(false);
  const [contentToCheck, setContentToCheck] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null);
  // Simple string match fallback
  const [simpleMatches, setSimpleMatches] = useState<string[]>([]);

  /* ── Phrase CRUD ─────────────────────────── */

  const addPhrase = (list: 'approved' | 'prohibited', text: string, context: string) => {
    const phrase: Phrase = { id: crypto.randomUUID(), text, context };
    if (list === 'approved') setApproved((p) => [...p, phrase]);
    else setProhibited((p) => [...p, phrase]);
  };

  const removePhrase = (list: 'approved' | 'prohibited', id: string) => {
    if (list === 'approved') setApproved((p) => p.filter((x) => x.id !== id));
    else setProhibited((p) => p.filter((x) => x.id !== id));
  };

  /* ── AI Compliance Check ─────────────────── */

  const runComplianceCheck = useCallback(async () => {
    if (!contentToCheck.trim()) return;

    // Simple string match (instant)
    const lower = contentToCheck.toLowerCase();
    const found = prohibited
      .filter((p) => lower.includes(p.text.toLowerCase()))
      .map((p) => p.text);
    setSimpleMatches(found);

    // AI-powered deep check
    if (prohibited.length > 0) {
      setIsChecking(true);
      setComplianceResult(null);
      try {
        const { data, error } = await supabase.functions.invoke('check-narrative-compliance', {
          body: {
            content: contentToCheck,
            prohibited_phrases: prohibited.map((p) => p.text),
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setComplianceResult(data as ComplianceResult);
      } catch (err: unknown) {
        toast.error('AI compliance check failed', (err as Error).message);
      } finally {
        setIsChecking(false);
      }
    }
  }, [contentToCheck, prohibited]);

  /* ── Score colour helper ─────────────────── */
  const scoreColour = (score: number) => {
    if (score >= 80) return 'text-[hsl(var(--success))]';
    if (score >= 50) return 'text-amber-400';
    return 'text-destructive';
  };

  /* ── Render ────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* Compliance check button */}
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setComplianceOpen(true);
            setContentToCheck('');
            setSimpleMatches([]);
            setComplianceResult(null);
          }}
        >
          <Sparkles className="w-4 h-4 mr-1" /> AI Compliance Check
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Approved phrases ──────────────── */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[hsl(var(--success))]" />
            Approved Phrases
          </h3>
          {approved.map((p) => (
            <PhraseCard key={p.id} phrase={p} variant="approved" onRemove={() => removePhrase('approved', p.id)} />
          ))}
          <AddPhraseForm variant="approved" onAdd={(t, c) => addPhrase('approved', t, c)} />
        </div>

        {/* ── Prohibited phrases ────────────── */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            Prohibited Phrases
          </h3>
          {prohibited.map((p) => (
            <PhraseCard key={p.id} phrase={p} variant="prohibited" onRemove={() => removePhrase('prohibited', p.id)} />
          ))}
          <AddPhraseForm variant="prohibited" onAdd={(t, c) => addPhrase('prohibited', t, c)} />
        </div>
      </div>

      {/* ── Compliance check modal ──────────── */}
      <LBDModal
        open={complianceOpen}
        onClose={() => setComplianceOpen(false)}
        title="AI Narrative Compliance Check"
        description="Paste content to check against prohibited phrases using AI analysis."
        size="lg"
        footer={
          <>
            <LBDModalButton onClick={() => setComplianceOpen(false)}>Close</LBDModalButton>
            <LBDModalButton variant="primary" onClick={runComplianceCheck} disabled={isChecking || !contentToCheck.trim()}>
              {isChecking
                ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Analysing…</>
                : <><Sparkles className="w-4 h-4 mr-1" /> Check Content</>
              }
            </LBDModalButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>Content to check</Label>
            <Textarea
              value={contentToCheck}
              onChange={(e) => {
                setContentToCheck(e.target.value);
                setSimpleMatches([]);
                setComplianceResult(null);
              }}
              rows={6}
              placeholder="Paste speech draft, press release, social media post…"
            />
          </div>

          {/* AI result */}
          {complianceResult && (
            <div className="space-y-4">
              {/* Score */}
              <div className="flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-card/50">
                <div className="text-center">
                  <p className={`text-3xl font-bold font-mono ${scoreColour(complianceResult.compliance_score)}`}>
                    {complianceResult.compliance_score}%
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono">COMPLIANCE</p>
                </div>
                <div className="flex-1 text-sm text-muted-foreground leading-relaxed">
                  {complianceResult.risk_assessment}
                </div>
              </div>

              {/* Flagged phrases */}
              {complianceResult.flagged_phrases.length > 0 && (
                <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 space-y-3">
                  <p className="text-sm font-semibold text-destructive">
                    ⚠ {complianceResult.flagged_phrases.length} issue{complianceResult.flagged_phrases.length > 1 ? 's' : ''} found
                  </p>
                  {complianceResult.flagged_phrases.map((fp, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        fp.severity === 'high' ? 'bg-destructive/20 text-destructive' :
                        fp.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {fp.severity.toUpperCase()}
                      </span>
                      <div>
                        <p className="font-medium text-foreground">"{fp.phrase}"</p>
                        <p className="text-xs text-muted-foreground">{fp.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Suggested edits */}
              {complianceResult.suggested_edits && (
                <div className="p-4 rounded-lg border border-accent/20 bg-accent/5">
                  <p className="text-sm font-semibold text-accent mb-2">✏️ Suggested Edits</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {complianceResult.suggested_edits}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Simple matches fallback (shown before AI finishes) */}
          {simpleMatches.length > 0 && !complianceResult && !isChecking && (
            <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
              <p className="text-sm font-semibold text-destructive mb-2">
                ⚠ {simpleMatches.length} exact match{simpleMatches.length > 1 ? 'es' : ''} found
              </p>
              <ul className="text-sm text-foreground space-y-1">
                {simpleMatches.map((m, i) => (
                  <li key={i} className="font-mono text-xs">• "{m}"</li>
                ))}
              </ul>
            </div>
          )}

          {contentToCheck && simpleMatches.length === 0 && !complianceResult && !isChecking && (
            <div className="p-4 rounded-lg border border-[hsl(var(--success)/0.3)] bg-[hsl(var(--success)/0.05)]">
              <p className="text-sm font-medium text-[hsl(var(--success))]">
                ✓ No exact prohibited phrases detected
              </p>
            </div>
          )}

          {prohibited.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Add prohibited phrases in the Message Discipline tab to enable compliance checking.
            </p>
          )}
        </div>
      </LBDModal>
    </div>
  );
}
