/**
 * AddCompetitorDrawer
 *
 * Right-side drawer form for creating or editing a competitor profile.
 * All fields map to the `competitor_profiles` table columns.
 * The "auto-monitor" toggle is a UI-only flag stored in the profile's
 * config (alliance_map field is reused for now, or ignored).
 */

import { useState, useEffect } from 'react';
import { LBDDrawer, LBDDrawerSection } from '@/components/ui/lbd';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Save, X } from 'lucide-react';
import type { CompetitorProfile } from '@/hooks/useCompetitors';

interface AddCompetitorDrawerProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, any>) => void;
  editData?: CompetitorProfile | null;
  isSaving?: boolean;
}

/** Default empty form state */
const emptyForm = {
  name: '',
  role_position: '',
  party_affiliation: '',
  constituency: '',
  biography: '',
  twitter_handle: '',
  twitter_followers: 0,
  facebook_page: '',
  facebook_likes: 0,
  instagram_handle: '',
  instagram_followers: 0,
  youtube_channel: '',
  youtube_subscribers: 0,
  monthly_media_mentions: 0,
  threat_score: 5,
  influence_score: 5,
  auto_monitor: false,
};

export default function AddCompetitorDrawer({
  open,
  onClose,
  onSave,
  editData,
  isSaving,
}: AddCompetitorDrawerProps) {
  const [form, setForm] = useState(emptyForm);

  /* Pre-fill form when editing */
  useEffect(() => {
    if (editData) {
      setForm({
        name: editData.name ?? '',
        role_position: editData.role_position ?? '',
        party_affiliation: editData.party_affiliation ?? '',
        constituency: editData.constituency ?? '',
        biography: editData.biography ?? '',
        twitter_handle: editData.twitter_handle ?? '',
        twitter_followers: editData.twitter_followers ?? 0,
        facebook_page: editData.facebook_page ?? '',
        facebook_likes: editData.facebook_likes ?? 0,
        instagram_handle: editData.instagram_handle ?? '',
        instagram_followers: editData.instagram_followers ?? 0,
        youtube_channel: editData.youtube_channel ?? '',
        youtube_subscribers: editData.youtube_subscribers ?? 0,
        monthly_media_mentions: editData.monthly_media_mentions ?? 0,
        threat_score: editData.threat_score ?? 5,
        influence_score: editData.influence_score ?? 5,
        auto_monitor: false,
      });
    } else {
      setForm(emptyForm);
    }
  }, [editData, open]);

  const set = (key: string, value: any) => setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    const { auto_monitor, ...rest } = form;
    onSave(rest);
  };

  return (
    <LBDDrawer
      open={open}
      onClose={onClose}
      title={editData ? 'Edit Competitor' : 'Add Competitor'}
      description="Enter competitor profile details for monitoring and analysis."
      width={520}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            <X className="w-3.5 h-3.5 mr-1" /> Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSaving || !form.name.trim()}>
            <Save className="w-3.5 h-3.5 mr-1" /> {editData ? 'Update' : 'Save'}
          </Button>
        </>
      }
    >
      {/* Identity */}
      <LBDDrawerSection label="Identity">
        <div className="space-y-3">
          <div>
            <Label htmlFor="comp-name" className="text-xs">Name *</Label>
            <Input id="comp-name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Full name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="comp-role" className="text-xs">Role / Position</Label>
              <Input id="comp-role" value={form.role_position} onChange={(e) => set('role_position', e.target.value)} placeholder="e.g. MP, Governor" />
            </div>
            <div>
              <Label htmlFor="comp-party" className="text-xs">Party / Affiliation</Label>
              <Input id="comp-party" value={form.party_affiliation} onChange={(e) => set('party_affiliation', e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="comp-const" className="text-xs">Constituency</Label>
            <Input id="comp-const" value={form.constituency} onChange={(e) => set('constituency', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="comp-bio" className="text-xs">Biography</Label>
            <Textarea id="comp-bio" value={form.biography} onChange={(e) => set('biography', e.target.value)} rows={3} />
          </div>
        </div>
      </LBDDrawerSection>

      {/* Scores */}
      <LBDDrawerSection label="Scores">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="comp-threat" className="text-xs">Threat Score (0–10)</Label>
            <Input id="comp-threat" type="number" min={0} max={10} value={form.threat_score} onChange={(e) => set('threat_score', Number(e.target.value))} />
          </div>
          <div>
            <Label htmlFor="comp-inf" className="text-xs">Influence Score (0–10)</Label>
            <Input id="comp-inf" type="number" min={0} max={10} value={form.influence_score} onChange={(e) => set('influence_score', Number(e.target.value))} />
          </div>
        </div>
      </LBDDrawerSection>

      {/* Social handles */}
      <LBDDrawerSection label="Digital Presence">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Twitter/X Handle</Label>
              <Input value={form.twitter_handle} onChange={(e) => set('twitter_handle', e.target.value)} placeholder="@handle" />
            </div>
            <div>
              <Label className="text-xs">Twitter Followers</Label>
              <Input type="number" value={form.twitter_followers} onChange={(e) => set('twitter_followers', Number(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Facebook Page</Label>
              <Input value={form.facebook_page} onChange={(e) => set('facebook_page', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Facebook Likes</Label>
              <Input type="number" value={form.facebook_likes} onChange={(e) => set('facebook_likes', Number(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Instagram Handle</Label>
              <Input value={form.instagram_handle} onChange={(e) => set('instagram_handle', e.target.value)} placeholder="@handle" />
            </div>
            <div>
              <Label className="text-xs">Instagram Followers</Label>
              <Input type="number" value={form.instagram_followers} onChange={(e) => set('instagram_followers', Number(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">YouTube Channel</Label>
              <Input value={form.youtube_channel} onChange={(e) => set('youtube_channel', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">YouTube Subscribers</Label>
              <Input type="number" value={form.youtube_subscribers} onChange={(e) => set('youtube_subscribers', Number(e.target.value))} />
            </div>
          </div>
        </div>
      </LBDDrawerSection>

      {/* Media */}
      <LBDDrawerSection label="Media">
        <div>
          <Label className="text-xs">Monthly Media Mentions</Label>
          <Input type="number" value={form.monthly_media_mentions} onChange={(e) => set('monthly_media_mentions', Number(e.target.value))} />
        </div>
      </LBDDrawerSection>

      {/* Auto-monitor toggle */}
      <LBDDrawerSection label="Monitoring">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground">Auto-Monitor</p>
            <p className="text-xs text-muted-foreground">Automatically track media mentions for this competitor</p>
          </div>
          <Switch checked={form.auto_monitor} onCheckedChange={(v) => set('auto_monitor', v)} />
        </div>
      </LBDDrawerSection>
    </LBDDrawer>
  );
}
