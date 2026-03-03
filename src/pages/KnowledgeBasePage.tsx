/**
 * KnowledgeBasePage
 *
 * Firm-level searchable knowledge repository. Accessible from the sidebar
 * to all internal roles. Contains four sections:
 *   1. Lessons Learned — from engagement close-outs
 *   2. Approved Templates — proposal, brief, content brief templates
 *   3. LBD Frameworks Reference — read-only reference cards
 *   4. SOP Documentation — internal SOPs
 *
 * Supports full-text search via Supabase tsvector.
 */

import { useState } from 'react';
import {
  Search, BookOpen, FileText, Lightbulb, Shield,
  Plus, Pencil, Trash2, X, Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useAuthStore } from '@/stores/authStore';
import {
  useKnowledgeBaseEntries,
  useCreateKBEntry,
  useDeleteKBEntry,
  type KBCategory,
} from '@/hooks/useKnowledgeBase';
import { LBDPageHeader, LBDCard } from '@/components/ui/lbd';
import { LBDConfirmDialog } from '@/components/ui/lbd/LBDConfirmDialog';
import { useToast } from '@/hooks/use-toast';

/* ─────────────────────────────────────────────
   Category definitions
───────────────────────────────────────────── */

const CATEGORIES: { key: KBCategory; label: string; Icon: React.ElementType; description: string }[] = [
  { key: 'lesson', label: 'Lessons Learned', Icon: Lightbulb, description: 'Insights from engagement close-outs' },
  { key: 'template', label: 'Approved Templates', Icon: FileText, description: 'Proposal, brief, and content templates' },
  { key: 'framework', label: 'LBD Frameworks', Icon: BookOpen, description: 'Read-only reference cards for all 7 toolkit frameworks' },
  { key: 'sop', label: 'SOP Documentation', Icon: Shield, description: 'Internal standard operating procedures' },
];

/** Static framework reference cards */
const FRAMEWORK_CARDS = [
  { title: 'Power Mapping Framework', content: 'Systematic identification and influence analysis of political stakeholders. Maps relationships, alignment, influence scores, and strategic priorities across engagement constituencies.' },
  { title: 'Intelligence Collection Framework', content: 'Multi-source intelligence gathering combining OSINT, HUMINT, and social media monitoring. Categorises by source type, sentiment, reach tier, and narrative theme.' },
  { title: 'Competitive Analysis Framework', content: 'Comprehensive competitor profiling across social platforms, media presence, alliance mapping, and vulnerability assessment. Tracks metrics history over time.' },
  { title: 'Scenario Planning Framework', content: 'Structured scenario development with probability assessment, impact scoring, trigger events, and strategic response planning. Includes automated trigger monitoring.' },
  { title: 'Narrative Architecture Framework', content: 'Master narrative development with audience matrix, message discipline tracking, and tone calibration. Includes crisis anchor messages and "what we never say" guardrails.' },
  { title: 'Crisis Communications Framework', content: 'Pre-crisis type definition, severity scoring, holding statement drafts, and active war room management. Post-crisis debrief with sentiment recovery tracking.' },
  { title: 'Brand Audit Framework', content: 'Multi-dimensional brand assessment with radar scoring, repositioning roadmaps, and priority action tracking. Compares current vs target scores across brand dimensions.' },
];

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function KnowledgeBasePage() {
  const { role } = useAuthStore();
  const { toast } = useToast();
  const canManage = role === 'super_admin' || role === 'lead_advisor';

  /* Filters */
  const [activeCategory, setActiveCategory] = useState<KBCategory>('lesson');
  const [searchQuery, setSearchQuery] = useState('');

  /* Modal state */
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('');

  /* Data */
  const { data: entries = [], isLoading } = useKnowledgeBaseEntries({
    category: activeCategory === 'framework' ? undefined : activeCategory,
    searchQuery: searchQuery.trim() || undefined,
  });

  const createEntry = useCreateKBEntry();
  const deleteEntry = useDeleteKBEntry();

  /** Handle create submission */
  async function handleCreate() {
    if (!newTitle.trim()) return;
    await createEntry.mutateAsync({
      category: activeCategory,
      title: newTitle.trim(),
      content: newContent.trim() || undefined,
      tags: newTags.split(',').map((t) => t.trim()).filter(Boolean),
    });
    setShowCreate(false);
    setNewTitle('');
    setNewContent('');
    setNewTags('');
    toast({ title: 'Entry created', description: 'Knowledge base updated.' });
  }

  /** Handle delete */
  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteEntry.mutateAsync(deleteTarget);
    setDeleteTarget(null);
    toast({ title: 'Entry deleted' });
  }

  /* Filter entries for the active category */
  const filteredEntries = activeCategory === 'framework'
    ? [] // frameworks are static
    : entries.filter((e) => e.category === activeCategory);

  return (
    <div className="p-6 space-y-6">
      <LBDPageHeader
        title="Knowledge Base"
        subtitle="Firm-level repository of lessons, templates, frameworks, and SOPs"
      />

      {/* ── Search bar ── */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search knowledge base…"
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* ── Category tabs ── */}
      <div className="flex items-center gap-2 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border',
              activeCategory === cat.key
                ? 'bg-accent/10 text-accent border-accent/30'
                : 'text-muted-foreground hover:text-foreground border-transparent hover:border-border',
            )}
          >
            <cat.Icon className="w-3.5 h-3.5" />
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Content area ── */}
      {activeCategory === 'framework' ? (
        /* Static framework reference cards */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FRAMEWORK_CARDS.map((fw) => (
            <LBDCard key={fw.title} className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-accent" />
                {fw.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{fw.content}</p>
            </LBDCard>
          ))}
        </div>
      ) : (
        <>
          {/* Add button */}
          {canManage && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-accent/10 text-accent border border-accent/30 rounded-lg text-xs font-medium hover:bg-accent/20"
            >
              <Plus className="w-3.5 h-3.5" />
              Add {CATEGORIES.find((c) => c.key === activeCategory)?.label}
            </button>
          )}

          {/* Entries list */}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : filteredEntries.length === 0 ? (
            <LBDCard className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No entries found.</p>
            </LBDCard>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map((entry) => (
                <LBDCard key={entry.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-foreground">{entry.title}</h3>
                      {entry.content && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">{entry.content}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(entry.created_at), 'dd MMM yyyy')}
                        </span>
                        {entry.tags?.length > 0 && entry.tags.map((tag) => (
                          <span key={tag} className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded">{tag}</span>
                        ))}
                      </div>
                    </div>
                    {canManage && (
                      <button
                        onClick={() => setDeleteTarget(entry.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Delete entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </LBDCard>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Create modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">New Entry</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Title</label>
                <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Content</label>
                <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} rows={6} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Tags (comma-separated)</label>
                <input value={newTags} onChange={(e) => setNewTags(e.target.value)} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground" placeholder="e.g. political, strategy" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:text-foreground">Cancel</button>
              <button onClick={handleCreate} disabled={!newTitle.trim() || createEntry.isPending} className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-40">
                {createEntry.isPending ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      <LBDConfirmDialog
        open={!!deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        title="Delete Entry"
        description="This knowledge base entry will be permanently removed."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteEntry.isPending}
      />
    </div>
  );
}
