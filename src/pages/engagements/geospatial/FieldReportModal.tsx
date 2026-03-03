/**
 * FieldReportModal
 *
 * Modal form for submitting field intelligence reports.
 * Saves as an intel_item with geographic metadata in narrative_theme.
 */

import { useState } from 'react';
import { LBDModal, LBDModalButton, toast } from '@/components/ui/lbd';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { NIGERIA_STATES, FIELD_REPORT_TAGS, useSubmitFieldReport, type FieldReportInput } from '@/hooks/useGeospatial';

interface FieldReportModalProps {
  open: boolean;
  onClose: () => void;
  engagementId: string;
}

/** Sentiment labels for slider */
const SENTIMENT_LABELS: Record<number, string> = {
  '-2': 'Very Negative',
  '-1': 'Negative',
  '0': 'Neutral',
  '1': 'Positive',
  '2': 'Very Positive',
};

export default function FieldReportModal({ open, onClose, engagementId }: FieldReportModalProps) {
  const [state, setState] = useState('');
  const [lga, setLga] = useState('');
  const [ward, setWard] = useState('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [source, setSource] = useState('');
  const [summary, setSummary] = useState('');
  const [sentiment, setSentiment] = useState(0);
  const [tags, setTags] = useState<string[]>([]);

  const submitMutation = useSubmitFieldReport(engagementId);

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleSubmit = async () => {
    if (!state || !source || !summary) {
      toast('Missing fields', { type: 'error', message: 'State, source, and summary are required.' });
      return;
    }

    try {
      await submitMutation.mutateAsync({
        area_state: state,
        area_lga: lga || undefined,
        area_ward: ward || undefined,
        report_date: reportDate,
        report_source: source,
        summary,
        sentiment,
        tags,
      });
      toast('Field report submitted', { type: 'success' });
      onClose();
      // Reset form
      setState(''); setLga(''); setWard(''); setSource(''); setSummary(''); setSentiment(0); setTags([]);
    } catch (err: any) {
      toast('Error', { type: 'error', message: err.message });
    }
  };

  return (
    <LBDModal
      open={open}
      onClose={onClose}
      title="Add Field Report"
      description="Submit geographic intelligence from the field. Saved as an intel item with location data."
      size="lg"
      footer={
        <>
          <LBDModalButton variant="ghost" onClick={onClose}>Cancel</LBDModalButton>
          <LBDModalButton
            variant="primary"
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
          >
            {submitMutation.isPending ? 'Submitting…' : 'Submit Report'}
          </LBDModalButton>
        </>
      }
    >
      <div className="space-y-5">
        {/* State selector */}
        <div className="space-y-1.5">
          <Label>State *</Label>
          <Select value={state} onValueChange={setState}>
            <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
            <SelectContent>
              {NIGERIA_STATES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* LGA + Ward */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>LGA</Label>
            <Input value={lga} onChange={(e) => setLga(e.target.value)} placeholder="e.g. Ikeja" />
          </div>
          <div className="space-y-1.5">
            <Label>Ward</Label>
            <Input value={ward} onChange={(e) => setWard(e.target.value)} placeholder="e.g. Ward 3" />
          </div>
        </div>

        {/* Date + Source */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Report Date *</Label>
            <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Source *</Label>
            <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Who submitted" />
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-1.5">
          <Label>Intelligence Summary *</Label>
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Describe the field intelligence gathered…"
            rows={4}
          />
        </div>

        {/* Sentiment slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Sentiment Assessment</Label>
            <span className="text-xs font-mono text-accent">{SENTIMENT_LABELS[sentiment]}</span>
          </div>
          <Slider
            min={-2}
            max={2}
            step={1}
            value={[sentiment]}
            onValueChange={([v]) => setSentiment(v)}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Very Negative</span>
            <span>Very Positive</span>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-2">
            {FIELD_REPORT_TAGS.map((tag) => (
              <label
                key={tag}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border text-xs cursor-pointer hover:border-accent/40 transition-colors"
              >
                <Checkbox
                  checked={tags.includes(tag)}
                  onCheckedChange={() => toggleTag(tag)}
                />
                <span className="capitalize text-foreground">{tag.replace(/_/g, ' ')}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </LBDModal>
  );
}
