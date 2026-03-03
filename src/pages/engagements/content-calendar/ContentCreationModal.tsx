/**
 * ContentCreationModal
 *
 * Multi-step modal for creating new content items.
 * Step 1: Brief (title, platform, date, audience)
 * Step 2: Content body with character counter
 * Step 3: Review before submission
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { PLATFORM_LIMITS } from '@/hooks/useContentCalendar';

const PLATFORMS = ['Twitter/X', 'Facebook', 'Instagram', 'LinkedIn', 'WhatsApp', 'TikTok', 'YouTube'];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (data: {
    title: string;
    platform: string;
    content_brief: string;
    content_body: string;
    scheduled_date: string | null;
    status: string;
  }) => Promise<unknown>;
}

export default function ContentCreationModal({ open, onClose, onCreate }: Props) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    platforms: [] as string[],
    scheduled_date: '',
    content_brief: '',
    content_body: '',
    target_audience: '',
  });

  const resetForm = () => {
    setForm({ title: '', platforms: [], scheduled_date: '', content_brief: '', content_body: '', target_audience: '' });
    setStep(1);
  };

  const handleClose = () => { resetForm(); onClose(); };

  const togglePlatform = (p: string) => {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(p) ? f.platforms.filter((x) => x !== p) : [...f.platforms, p],
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    // Create one item per platform (cross-posting)
    for (const platform of form.platforms) {
      await onCreate({
        title: form.title,
        platform,
        content_brief: form.content_brief,
        content_body: form.content_body,
        scheduled_date: form.scheduled_date ? new Date(form.scheduled_date).toISOString() : null,
        status: 'draft',
      });
    }
    setSaving(false);
    handleClose();
  };

  /** Get the most restrictive character limit */
  const activeLimit = form.platforms.reduce<number | null>((min, p) => {
    const lim = PLATFORM_LIMITS[p];
    if (lim === null || lim === undefined) return min;
    return min === null ? lim : Math.min(min, lim);
  }, null);

  const bodyLen = form.content_body.length;
  const overLimit = activeLimit !== null && bodyLen > activeLimit;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Content — Step {step} of 3</DialogTitle>
          <DialogDescription>
            {step === 1 ? 'Set the brief for your content item.' : step === 2 ? 'Write the content body.' : 'Review before submitting.'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="flex gap-1 mb-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className={cn('h-1 flex-1 rounded-full', s <= step ? 'bg-accent' : 'bg-muted')} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Q1 Policy Update" />
            </div>
            <div>
              <Label>Platforms (select multiple for cross-posting)</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {PLATFORMS.map((p) => (
                  <label key={p} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={form.platforms.includes(p)} onCheckedChange={() => togglePlatform(p)} />
                    <span className="text-sm">{p}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Scheduled Date</Label>
              <Input type="datetime-local" value={form.scheduled_date} onChange={(e) => setForm((f) => ({ ...f, scheduled_date: e.target.value }))} />
            </div>
            <div>
              <Label>Content Brief</Label>
              <Textarea value={form.content_brief} onChange={(e) => setForm((f) => ({ ...f, content_brief: e.target.value }))} rows={3} placeholder="Describe the objective and key points" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label>Content Body</Label>
              <Textarea
                value={form.content_body}
                onChange={(e) => setForm((f) => ({ ...f, content_body: e.target.value }))}
                rows={8}
                placeholder="Write your content here..."
              />
              <div className="flex justify-between mt-1">
                <span className={cn('text-xs', overLimit ? 'text-destructive' : 'text-muted-foreground')}>
                  {bodyLen} characters
                </span>
                {activeLimit !== null && (
                  <span className={cn('text-xs', overLimit ? 'text-destructive' : 'text-muted-foreground')}>
                    Limit: {activeLimit}
                  </span>
                )}
              </div>
              {/* Per-platform counts */}
              <div className="flex gap-2 mt-2 flex-wrap">
                {form.platforms.map((p) => {
                  const lim = PLATFORM_LIMITS[p];
                  const over = lim !== null && lim !== undefined && bodyLen > lim;
                  return (
                    <Badge key={p} variant="outline" className={cn('text-[10px]', over && 'border-destructive text-destructive')}>
                      {p}: {bodyLen}{lim ? `/${lim}` : ''}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border p-4 bg-muted/20 space-y-3">
              <div><span className="text-xs text-muted-foreground">Title</span><p className="text-sm font-medium">{form.title}</p></div>
              <div><span className="text-xs text-muted-foreground">Platforms</span><div className="flex gap-1 flex-wrap">{form.platforms.map((p) => <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>)}</div></div>
              <div><span className="text-xs text-muted-foreground">Scheduled</span><p className="text-sm">{form.scheduled_date ? format(new Date(form.scheduled_date), 'dd MMM yyyy HH:mm') : 'Not scheduled'}</p></div>
              <div><span className="text-xs text-muted-foreground">Brief</span><p className="text-sm text-foreground/80">{form.content_brief || '—'}</p></div>
              <div><span className="text-xs text-muted-foreground">Content Preview</span><p className="text-sm text-foreground/80 whitespace-pre-wrap line-clamp-6">{form.content_body || '—'}</p></div>
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <div>
            {step > 1 && <Button variant="outline" onClick={() => setStep((s) => s - 1)}>Back</Button>}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
            {step < 3 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={step === 1 && (!form.title || form.platforms.length === 0)}>
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? 'Creating…' : 'Submit as Draft'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
