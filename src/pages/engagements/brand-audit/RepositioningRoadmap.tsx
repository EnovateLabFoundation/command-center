/**
 * RepositioningRoadmap
 *
 * Inline-editable table for brand repositioning objectives.
 * Data stored in brand_audit.repositioning_roadmap JSONB.
 * Supports add/edit/delete rows and PDF export via jspdf.
 */

import { useState, useCallback } from 'react';
import { Plus, Trash2, Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { BRAND_DIMENSIONS, type RoadmapItem } from '@/hooks/useBrandAudit';

/* ─────────────────────────────────────────────
   Props
───────────────────────────────────────────── */

interface RepositioningRoadmapProps {
  items: RoadmapItem[];
  onChange: (items: RoadmapItem[]) => void;
  readOnly?: boolean;
}

/* ─────────────────────────────────────────────
   Status config
───────────────────────────────────────────── */

const STATUS_OPTIONS: { value: RoadmapItem['status']; label: string; color: string }[] = [
  { value: 'not_started', label: 'Not Started', color: 'text-muted-foreground' },
  { value: 'in_progress', label: 'In Progress', color: 'text-amber-400' },
  { value: 'complete',    label: 'Complete',    color: 'text-emerald-400' },
];

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function RepositioningRoadmap({ items, onChange, readOnly = false }: RepositioningRoadmapProps) {
  /** Add a blank row */
  const addRow = useCallback(() => {
    onChange([
      ...items,
      {
        id: crypto.randomUUID(),
        objective: '',
        target_dimensions: [],
        action_plan: '',
        responsible: '',
        timeline: '',
        success_metric: '',
        status: 'not_started',
      },
    ]);
  }, [items, onChange]);

  /** Update a field in a row */
  const updateRow = useCallback(
    (id: string, field: keyof RoadmapItem, value: any) => {
      onChange(items.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    },
    [items, onChange],
  );

  /** Delete a row */
  const deleteRow = useCallback(
    (id: string) => onChange(items.filter((r) => r.id !== id)),
    [items, onChange],
  );

  /** Generate PDF */
  const generatePdf = useCallback(() => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(18);
    doc.setTextColor(30, 30, 30);
    doc.text('Repositioning Roadmap', 14, 18);

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated ${new Date().toLocaleDateString('en-GB')}`, 14, 24);

    // Table header
    const cols = ['Objective', 'Dimensions', 'Action Plan', 'Responsible', 'Timeline', 'Success Metric', 'Status'];
    const colWidths = [40, 35, 55, 30, 25, 45, 22];
    let y = 32;

    doc.setFillColor(240, 240, 240);
    doc.rect(14, y - 4, pageW - 28, 8, 'F');
    doc.setFontSize(7);
    doc.setTextColor(60, 60, 60);
    let x = 14;
    cols.forEach((col, i) => {
      doc.text(col.toUpperCase(), x + 1, y);
      x += colWidths[i];
    });

    y += 8;
    doc.setTextColor(30, 30, 30);

    for (const row of items) {
      if (y > 190) {
        doc.addPage();
        y = 18;
      }
      x = 14;
      const values = [
        row.objective,
        row.target_dimensions.join(', '),
        row.action_plan,
        row.responsible,
        row.timeline,
        row.success_metric,
        STATUS_OPTIONS.find((s) => s.value === row.status)?.label ?? row.status,
      ];
      values.forEach((val, i) => {
        const lines = doc.splitTextToSize(val || '—', colWidths[i] - 2);
        doc.text(lines, x + 1, y);
        x += colWidths[i];
      });
      y += 10;
    }

    doc.save('repositioning-roadmap.pdf');
  }, [items]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono tracking-widest text-muted-foreground uppercase flex items-center gap-2">
          <FileText className="w-3.5 h-3.5" />
          REPOSITIONING ROADMAP
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={generatePdf}
            disabled={items.length === 0}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium rounded-md',
              'border border-border text-muted-foreground hover:text-foreground transition-colors',
              items.length === 0 && 'opacity-30 pointer-events-none',
            )}
          >
            <Download className="w-3 h-3" />
            Generate PDF
          </button>
          {!readOnly && (
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-semibold rounded-md bg-accent text-black hover:bg-accent/90 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add Row
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No roadmap items yet. Add an objective to begin planning.
        </p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-card/80 border-b border-border">
                <tr>
                  {['OBJECTIVE', 'DIMENSIONS', 'ACTION PLAN', 'RESPONSIBLE', 'TIMELINE', 'SUCCESS METRIC', 'STATUS', ''].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-[10px] font-mono tracking-widest text-muted-foreground text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-border/40 bg-card">
                    <td className="px-3 py-2">
                      <Input
                        value={row.objective}
                        onChange={(e) => updateRow(row.id, 'objective', e.target.value)}
                        disabled={readOnly}
                        className="text-xs h-7"
                        placeholder="Objective…"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        multiple
                        value={row.target_dimensions}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions, (o) => o.value);
                          updateRow(row.id, 'target_dimensions', selected);
                        }}
                        disabled={readOnly}
                        className="w-full text-[10px] bg-background border border-input rounded px-1 py-0.5 text-foreground min-h-[28px] max-h-[56px]"
                      >
                        {BRAND_DIMENSIONS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={row.action_plan}
                        onChange={(e) => updateRow(row.id, 'action_plan', e.target.value)}
                        disabled={readOnly}
                        className="text-xs h-7"
                        placeholder="Action…"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={row.responsible}
                        onChange={(e) => updateRow(row.id, 'responsible', e.target.value)}
                        disabled={readOnly}
                        className="text-xs h-7"
                        placeholder="Who…"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={row.timeline}
                        onChange={(e) => updateRow(row.id, 'timeline', e.target.value)}
                        disabled={readOnly}
                        className="text-xs h-7"
                        placeholder="When…"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={row.success_metric}
                        onChange={(e) => updateRow(row.id, 'success_metric', e.target.value)}
                        disabled={readOnly}
                        className="text-xs h-7"
                        placeholder="KPI…"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={row.status}
                        onChange={(e) => updateRow(row.id, 'status', e.target.value)}
                        disabled={readOnly}
                        className="w-full text-xs bg-background border border-input rounded px-2 py-1 text-foreground h-7"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => deleteRow(row.id)}
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
