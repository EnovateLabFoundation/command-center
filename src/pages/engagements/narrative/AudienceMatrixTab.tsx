/**
 * AudienceMatrixTab
 *
 * Data table of narrative_audience_matrix rows linked to the current
 * narrative_platform. Supports add/edit via LBDDrawer and PDF brief export.
 */

import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, FileText, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { LBDDataTable, type ColumnDef } from '@/components/ui/lbd/LBDDataTable';
import { LBDDrawer, LBDDrawerSection } from '@/components/ui/lbd/LBDDrawer';
import { LBDEmptyState, LBDLoadingSkeleton } from '@/components/ui/lbd';
import {
  useNarrativePlatforms,
  useAudienceMatrix,
  useCreateAudience,
  useUpdateAudience,
  useDeleteAudience,
  type AudienceRow,
  type NarrativePlatform,
} from '@/hooks/useNarrative';

/* ── Proof points dynamic list ──────────────── */

function ProofPointsList({
  points,
  onChange,
  disabled,
}: {
  points: string[];
  onChange: (p: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      {points.map((p, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={p}
            onChange={(e) => {
              const next = [...points];
              next[i] = e.target.value;
              onChange(next);
            }}
            disabled={disabled}
            placeholder={`Proof point ${i + 1}`}
            className="flex-1"
          />
          {!disabled && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onChange(points.filter((_, j) => j !== i))}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      ))}
      {!disabled && (
        <Button size="sm" variant="outline" onClick={() => onChange([...points, ''])}>
          <Plus className="w-3 h-3 mr-1" /> Add Proof Point
        </Button>
      )}
    </div>
  );
}

/* ── Component ──────────────────────────────── */

export default function AudienceMatrixTab() {
  const { id: engagementId } = useParams<{ id: string }>();
  const { data: platforms, isLoading: loadingPlatforms } = useNarrativePlatforms(engagementId);
  const currentPlatform = platforms?.[0];

  const { data: audiences, isLoading: loadingAudiences } = useAudienceMatrix(currentPlatform?.id);
  const createAudience = useCreateAudience(currentPlatform?.id ?? '');
  const updateAudience = useUpdateAudience(currentPlatform?.id ?? '');
  const deleteAudience = useDeleteAudience(currentPlatform?.id ?? '');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<AudienceRow | null>(null);

  // Form state
  const [segment, setSegment] = useState('');
  const [keyMessage, setKeyMessage] = useState('');
  const [tone, setTone] = useState('');
  const [cta, setCta] = useState('');
  const [proofPoints, setProofPoints] = useState<string[]>([]);

  const openAdd = () => {
    setEditing(null);
    setSegment('');
    setKeyMessage('');
    setTone('');
    setCta('');
    setProofPoints([]);
    setDrawerOpen(true);
  };

  const openEdit = (row: AudienceRow) => {
    setEditing(row);
    setSegment(row.audience_segment);
    setKeyMessage(row.key_message ?? '');
    setTone(row.tone_calibration ?? '');
    setCta(row.call_to_action ?? '');
    setProofPoints(Array.isArray(row.proof_points) ? (row.proof_points as string[]) : []);
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    if (!segment.trim()) {
      toast.error('Audience segment is required');
      return;
    }
    const payload = {
      audience_segment: segment.trim(),
      key_message: keyMessage || null,
      tone_calibration: tone || null,
      call_to_action: cta || null,
      proof_points: proofPoints.filter(Boolean),
    };
    try {
      if (editing) {
        await updateAudience.mutateAsync({ id: editing.id, ...payload } as any);
        toast.success('Audience updated');
      } else {
        await createAudience.mutateAsync(payload as any);
        toast.success('Audience added');
      }
      setDrawerOpen(false);
    } catch {
      toast.error('Failed to save audience');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAudience.mutateAsync(id);
      toast.success('Audience deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  /* ── PDF brief generation ─────────────────── */

  const generateBrief = (rows: AudienceRow[], platform: NarrativePlatform) => {
    const doc = new jsPDF();
    const margin = 20;
    let y = margin;

    doc.setFontSize(18);
    doc.text('Content Brief — Narrative Architecture', margin, y);
    y += 12;

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, y);
    y += 10;

    // Master narrative excerpt
    if (platform.master_narrative) {
      doc.setFontSize(12);
      doc.text('Master Narrative', margin, y);
      y += 6;
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(platform.master_narrative, 170);
      doc.text(lines, margin, y);
      y += lines.length * 4 + 8;
    }

    for (const row of rows) {
      if (y > 260) { doc.addPage(); y = margin; }
      doc.setFontSize(12);
      doc.text(`Audience: ${row.audience_segment}`, margin, y);
      y += 7;

      const details = [
        ['Key Message', row.key_message],
        ['Tone Calibration', row.tone_calibration],
        ['Call to Action', row.call_to_action],
      ];
      doc.setFontSize(9);
      for (const [label, val] of details) {
        if (!val) continue;
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}:`, margin, y);
        doc.setFont('helvetica', 'normal');
        const valLines = doc.splitTextToSize(String(val), 140);
        doc.text(valLines, margin + 30, y);
        y += valLines.length * 4 + 4;
      }

      const points = Array.isArray(row.proof_points) ? (row.proof_points as string[]) : [];
      if (points.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('Proof Points:', margin, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        points.forEach((p) => {
          doc.text(`• ${p}`, margin + 4, y);
          y += 4;
        });
      }
      y += 6;
    }

    doc.save('narrative-content-brief.pdf');
    toast.success('Content brief exported');
  };

  /* ── Columns ──────────────────────────────── */

  const columns: ColumnDef<Record<string, unknown>>[] = useMemo(() => [
    { key: 'audience_segment', label: 'Audience Segment', sortable: true },
    {
      key: 'key_message',
      label: 'Key Message',
      sortable: false,
      render: (v) => {
        const s = String(v ?? '');
        return s.length > 80 ? `${s.slice(0, 80)}…` : s || '—';
      },
    },
    { key: 'tone_calibration', label: 'Tone Calibration' },
    { key: 'call_to_action', label: 'Call to Action' },
    {
      key: 'id',
      label: 'Actions',
      noExport: true,
      render: (_v, row) => (
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={() => openEdit(row as unknown as AudienceRow)}>
            <Pencil className="w-3 h-3" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => handleDelete(row.id as string)}>
            <Trash2 className="w-3 h-3 text-destructive" />
          </Button>
        </div>
      ),
    },
  ], []);

  /* ── Loading / empty ──────────────────────── */

  if (loadingPlatforms || loadingAudiences) return <LBDLoadingSkeleton variant="card" />;

  if (!currentPlatform) {
    return (
      <LBDEmptyState
        icon={<FileText className="w-8 h-8" />}
        title="No Narrative Platform"
        description="Create a narrative platform in the Core Platform tab first."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Button size="sm" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1" /> Add Audience
        </Button>
        {(audiences?.length ?? 0) > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => generateBrief(audiences!, currentPlatform)}
          >
            <FileText className="w-4 h-4 mr-1" /> Generate Content Brief
          </Button>
        )}
      </div>

      <LBDDataTable
        columns={columns}
        data={(audiences ?? []) as unknown as Record<string, unknown>[]}
        isLoading={loadingAudiences}
        emptyTitle="No audience segments"
        emptyDescription="Add audience segments to build the messaging matrix."
        enableSearch
        enablePagination
      />

      {/* Add/Edit drawer */}
      <LBDDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? 'Edit Audience Segment' : 'Add Audience Segment'}
        description="Define audience-specific messaging aligned to the core narrative."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createAudience.isPending || updateAudience.isPending}>
              {editing ? 'Update' : 'Add'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <LBDDrawerSection label="Audience">
            <Label>Audience Segment *</Label>
            <Input value={segment} onChange={(e) => setSegment(e.target.value)} placeholder="e.g. Youth voters 18-25" />
          </LBDDrawerSection>

          <LBDDrawerSection label="Messaging">
            <Label>Key Message</Label>
            <Textarea value={keyMessage} onChange={(e) => setKeyMessage(e.target.value)} rows={3} placeholder="The primary message for this audience" />
          </LBDDrawerSection>

          <LBDDrawerSection label="Tone & CTA">
            <Label>Tone Calibration</Label>
            <Input value={tone} onChange={(e) => setTone(e.target.value)} placeholder="e.g. Informal, aspirational, empathetic" />
            <Label className="mt-3">Call to Action</Label>
            <Input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="e.g. Register to vote" />
          </LBDDrawerSection>

          <LBDDrawerSection label="Proof Points">
            <ProofPointsList points={proofPoints} onChange={setProofPoints} />
          </LBDDrawerSection>
        </div>
      </LBDDrawer>
    </div>
  );
}
