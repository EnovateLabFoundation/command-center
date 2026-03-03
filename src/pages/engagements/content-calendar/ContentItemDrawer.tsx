/**
 * ContentItemDrawer
 *
 * Detail / edit drawer for a single content item.
 * Shows full details, engagement metrics entry for published items,
 * and approval workflow controls.
 */

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LBDDrawer, LBDDrawerSection, LBDDrawerField } from '@/components/ui/lbd/LBDDrawer';
import { cn } from '@/lib/utils';
import type { ContentItem } from '@/hooks/useContentCalendar';

interface Props {
  item: ContentItem | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Record<string, unknown>) => Promise<boolean>;
  mode?: 'view' | 'edit';
}

const STATUS_OPTIONS = ['draft', 'approved', 'scheduled', 'published', 'archived'];
const APPROVAL_STAGES = ['pending_review', 'comms_approved', 'lead_approved', 'final'];

export default function ContentItemDrawer({ item, open, onClose, onSave, mode = 'view' }: Props) {
  const [editMode, setEditMode] = useState(mode === 'edit');
  const [form, setForm] = useState({
    title: '',
    platform: '',
    content_brief: '',
    content_body: '',
    status: 'draft',
    approval_stage: '',
    scheduled_date: '',
    engagement_metrics: {} as Record<string, number>,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        title: item.title ?? '',
        platform: item.platform ?? '',
        content_brief: item.content_brief ?? '',
        content_body: item.content_body ?? '',
        status: item.status ?? 'draft',
        approval_stage: item.approval_stage ?? '',
        scheduled_date: item.scheduled_date ? format(new Date(item.scheduled_date), "yyyy-MM-dd'T'HH:mm") : '',
        engagement_metrics: (item.engagement_metrics as Record<string, number>) ?? {},
      });
      setEditMode(mode === 'edit');
    }
  }, [item, mode]);

  const handleSave = async () => {
    if (!item) return;
    setSaving(true);
    await onSave(item.id, {
      title: form.title,
      platform: form.platform,
      content_brief: form.content_brief,
      content_body: form.content_body,
      status: form.status,
      approval_stage: form.approval_stage || null,
      scheduled_date: form.scheduled_date ? new Date(form.scheduled_date).toISOString() : null,
      engagement_metrics: form.engagement_metrics,
    });
    setSaving(false);
    onClose();
  };

  const updateMetric = (key: string, value: string) => {
    setForm((f) => ({
      ...f,
      engagement_metrics: { ...f.engagement_metrics, [key]: parseInt(value) || 0 },
    }));
  };

  if (!item) return null;

  return (
    <LBDDrawer
      open={open}
      onClose={onClose}
      title={editMode ? 'Edit Content Item' : item.title}
      description={editMode ? 'Update content details and metrics' : undefined}
      width={560}
      footer={
        editMode ? (
          <>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={() => setEditMode(true)}>Edit</Button>
        )
      }
    >
      {editMode ? (
        <div className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <Label>Platform</Label>
            <Select value={form.platform} onValueChange={(v) => setForm((f) => ({ ...f, platform: v }))}>
              <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
              <SelectContent>
                {['Twitter/X', 'Facebook', 'Instagram', 'LinkedIn', 'WhatsApp', 'TikTok', 'YouTube'].map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Content Brief</Label>
            <Textarea value={form.content_brief} onChange={(e) => setForm((f) => ({ ...f, content_brief: e.target.value }))} rows={3} />
          </div>
          <div>
            <Label>Content Body</Label>
            <Textarea value={form.content_body} onChange={(e) => setForm((f) => ({ ...f, content_body: e.target.value }))} rows={6} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Approval Stage</Label>
            <Select value={form.approval_stage} onValueChange={(v) => setForm((f) => ({ ...f, approval_stage: v }))}>
              <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
              <SelectContent>
                {APPROVAL_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Scheduled Date</Label>
            <Input type="datetime-local" value={form.scheduled_date} onChange={(e) => setForm((f) => ({ ...f, scheduled_date: e.target.value }))} />
          </div>

          {/* Engagement metrics for published items */}
          {form.status === 'published' && (
            <LBDDrawerSection label="Engagement Metrics">
              <div className="grid grid-cols-3 gap-3">
                {['reach', 'impressions', 'likes', 'comments', 'shares', 'clicks'].map((metric) => (
                  <div key={metric}>
                    <Label className="text-xs capitalize">{metric}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.engagement_metrics[metric] ?? 0}
                      onChange={(e) => updateMetric(metric, e.target.value)}
                      className="h-8"
                    />
                  </div>
                ))}
              </div>
            </LBDDrawerSection>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          <LBDDrawerField label="Platform" value={item.platform ? <Badge variant="outline">{item.platform}</Badge> : '—'} />
          <LBDDrawerField label="Status" value={<Badge className={cn('text-xs')}>{item.status}</Badge>} />
          <LBDDrawerField label="Approval Stage" value={item.approval_stage} />
          <LBDDrawerField label="Scheduled Date" value={item.scheduled_date ? format(new Date(item.scheduled_date), 'dd MMM yyyy HH:mm') : '—'} />
          <LBDDrawerField label="Published" value={item.published_date ? format(new Date(item.published_date), 'dd MMM yyyy HH:mm') : '—'} />

          <LBDDrawerSection label="Content Brief">
            <p className="text-sm text-foreground/80 whitespace-pre-wrap">{item.content_brief || '—'}</p>
          </LBDDrawerSection>

          <LBDDrawerSection label="Content Body">
            <p className="text-sm text-foreground/80 whitespace-pre-wrap">{item.content_body || '—'}</p>
          </LBDDrawerSection>

          {item.status === 'published' && item.engagement_metrics && (
            <LBDDrawerSection label="Performance Metrics">
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(item.engagement_metrics as Record<string, number>).map(([k, v]) => (
                  <div key={k} className="bg-muted/30 rounded-lg p-2 text-center">
                    <p className="text-xs text-muted-foreground capitalize">{k}</p>
                    <p className="text-lg font-bold text-foreground">{v?.toLocaleString() ?? 0}</p>
                  </div>
                ))}
              </div>
            </LBDDrawerSection>
          )}
        </div>
      )}
    </LBDDrawer>
  );
}
