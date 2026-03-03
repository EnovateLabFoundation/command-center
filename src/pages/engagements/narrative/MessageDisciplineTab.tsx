/**
 * MessageDisciplineTab
 *
 * Rules editor for approved and prohibited phrases.
 * Stored locally (in component state) since there's no dedicated DB table —
 * phrases could be persisted in a JSON column in future.
 * Includes a "Message Compliance Check" modal for content scanning.
 */

import { useState, useCallback } from 'react';
import { Plus, Trash2, ShieldCheck, AlertTriangle, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { LBDCard } from '@/components/ui/lbd/LBDCard';
import { LBDModal, LBDModalButton } from '@/components/ui/lbd/LBDModal';

/* ── Types ──────────────────────────────────── */

interface Phrase {
  id: string;
  text: string;
  context: string;
}

/* ── Component ──────────────────────────────── */

export default function MessageDisciplineTab() {
  const [approved, setApproved] = useState<Phrase[]>([]);
  const [prohibited, setProhibited] = useState<Phrase[]>([]);

  // Add form state
  const [newApprovedText, setNewApprovedText] = useState('');
  const [newApprovedCtx, setNewApprovedCtx] = useState('');
  const [newProhibitedText, setNewProhibitedText] = useState('');
  const [newProhibitedCtx, setNewProhibitedCtx] = useState('');

  // Compliance check
  const [complianceOpen, setComplianceOpen] = useState(false);
  const [contentToCheck, setContentToCheck] = useState('');
  const [matches, setMatches] = useState<string[]>([]);

  /* ── Helpers ──────────────────────────────── */

  const addApproved = () => {
    if (!newApprovedText.trim()) return;
    setApproved((prev) => [...prev, { id: crypto.randomUUID(), text: newApprovedText.trim(), context: newApprovedCtx.trim() }]);
    setNewApprovedText('');
    setNewApprovedCtx('');
  };

  const addProhibited = () => {
    if (!newProhibitedText.trim()) return;
    setProhibited((prev) => [...prev, { id: crypto.randomUUID(), text: newProhibitedText.trim(), context: newProhibitedCtx.trim() }]);
    setNewProhibitedText('');
    setNewProhibitedCtx('');
  };

  const removePhrase = (list: 'approved' | 'prohibited', id: string) => {
    if (list === 'approved') setApproved((p) => p.filter((x) => x.id !== id));
    else setProhibited((p) => p.filter((x) => x.id !== id));
  };

  const runComplianceCheck = useCallback(() => {
    const lower = contentToCheck.toLowerCase();
    const found = prohibited
      .filter((p) => lower.includes(p.text.toLowerCase()))
      .map((p) => p.text);
    setMatches(found);
  }, [contentToCheck, prohibited]);

  /* ── Highlighted content renderer ─────────── */

  const renderHighlighted = () => {
    if (matches.length === 0) return contentToCheck;
    let result = contentToCheck;
    // Build a regex from matched phrases
    const pattern = matches.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const parts = result.split(new RegExp(`(${pattern})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => {
          const isMatch = matches.some((m) => m.toLowerCase() === part.toLowerCase());
          return isMatch ? (
            <mark key={i} className="bg-destructive/30 text-destructive rounded px-0.5">{part}</mark>
          ) : (
            <span key={i}>{part}</span>
          );
        })}
      </span>
    );
  };

  /* ── Render ────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* Compliance check button */}
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => { setComplianceOpen(true); setContentToCheck(''); setMatches([]); }}>
          <Search className="w-4 h-4 mr-1" /> Message Compliance Check
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
            <LBDCard key={p.id} className="border-[hsl(var(--success)/0.3)]" noBorderAccent padding="sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{p.text}</p>
                  {p.context && <p className="text-xs text-muted-foreground mt-1">{p.context}</p>}
                </div>
                <Button size="icon" variant="ghost" onClick={() => removePhrase('approved', p.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </LBDCard>
          ))}

          {/* Add form */}
          <div className="space-y-2 p-4 rounded-lg border border-border/50 bg-background/30">
            <Input placeholder="Approved phrase" value={newApprovedText} onChange={(e) => setNewApprovedText(e.target.value)} />
            <Input placeholder="Context / rationale (optional)" value={newApprovedCtx} onChange={(e) => setNewApprovedCtx(e.target.value)} />
            <Button size="sm" variant="outline" onClick={addApproved} disabled={!newApprovedText.trim()}>
              <Plus className="w-3 h-3 mr-1" /> Add Approved Phrase
            </Button>
          </div>
        </div>

        {/* ── Prohibited phrases ────────────── */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            Prohibited Phrases
          </h3>

          {prohibited.map((p) => (
            <LBDCard key={p.id} className="border-destructive/30" noBorderAccent padding="sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{p.text}</p>
                  {p.context && <p className="text-xs text-muted-foreground mt-1">{p.context}</p>}
                </div>
                <Button size="icon" variant="ghost" onClick={() => removePhrase('prohibited', p.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </LBDCard>
          ))}

          {/* Add form */}
          <div className="space-y-2 p-4 rounded-lg border border-border/50 bg-background/30">
            <Input placeholder="Prohibited phrase" value={newProhibitedText} onChange={(e) => setNewProhibitedText(e.target.value)} />
            <Input placeholder="Context / rationale (optional)" value={newProhibitedCtx} onChange={(e) => setNewProhibitedCtx(e.target.value)} />
            <Button size="sm" variant="destructive" onClick={addProhibited} disabled={!newProhibitedText.trim()}>
              <Plus className="w-3 h-3 mr-1" /> Add Prohibited Phrase
            </Button>
          </div>
        </div>
      </div>

      {/* ── Compliance check modal ──────────── */}
      <LBDModal
        open={complianceOpen}
        onClose={() => setComplianceOpen(false)}
        title="Message Compliance Check"
        description="Paste content to check against prohibited phrases."
        size="lg"
        footer={
          <>
            <LBDModalButton onClick={() => setComplianceOpen(false)}>Close</LBDModalButton>
            <LBDModalButton variant="primary" onClick={runComplianceCheck}>
              <Search className="w-4 h-4 mr-1" /> Check Content
            </LBDModalButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>Content to check</Label>
            <Textarea
              value={contentToCheck}
              onChange={(e) => { setContentToCheck(e.target.value); setMatches([]); }}
              rows={6}
              placeholder="Paste speech draft, press release, social media post…"
            />
          </div>

          {matches.length > 0 && (
            <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
              <p className="text-sm font-semibold text-destructive mb-2">
                ⚠ {matches.length} prohibited phrase{matches.length > 1 ? 's' : ''} found:
              </p>
              <div className="text-sm leading-relaxed text-foreground">
                {renderHighlighted()}
              </div>
            </div>
          )}

          {contentToCheck && matches.length === 0 && (
            <div className="p-4 rounded-lg border border-[hsl(var(--success)/0.3)] bg-[hsl(var(--success)/0.05)]">
              <p className="text-sm font-medium text-[hsl(var(--success))]">
                ✓ No prohibited phrases detected
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
