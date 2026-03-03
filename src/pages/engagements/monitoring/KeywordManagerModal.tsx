/**
 * KeywordManagerModal
 *
 * LBDModal for managing monitoring keywords for an engagement.
 * Keywords are stored in integration_configs with platform_name='keyword_monitor'.
 */

import { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { LBDModal, LBDModalButton, LBDBadge, toast } from '@/components/ui/lbd';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useMonitoringKeywords } from '@/hooks/useMediaMonitoring';

interface KeywordManagerModalProps {
  open: boolean;
  onClose: () => void;
  engagementId: string;
}

const PLATFORMS = ['Twitter/X', 'Facebook', 'Instagram', 'YouTube', 'Print Media', 'Online News'];

export default function KeywordManagerModal({ open, onClose, engagementId }: KeywordManagerModalProps) {
  const { keywords, isLoading, addKeyword, deleteKeyword } = useMonitoringKeywords(engagementId);
  const [newKeyword, setNewKeyword] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const handleAdd = async () => {
    if (!newKeyword.trim()) {
      toast('Enter a keyword', { type: 'warning' });
      return;
    }
    try {
      await addKeyword.mutateAsync({
        keyword: newKeyword.trim(),
        platforms: selectedPlatforms.length > 0 ? selectedPlatforms : PLATFORMS,
      });
      toast('Keyword added', { type: 'success' });
      setNewKeyword('');
      setSelectedPlatforms([]);
    } catch (err: any) {
      toast('Failed to add keyword', { type: 'error', message: err.message });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteKeyword.mutateAsync(id);
      toast('Keyword removed', { type: 'success' });
    } catch (err: any) {
      toast('Failed to remove', { type: 'error', message: err.message });
    }
  };

  return (
    <LBDModal
      open={open}
      onClose={onClose}
      title="Keyword Monitoring"
      description="Manage keywords monitored across media platforms for this engagement."
      size="lg"
      footer={
        <LBDModalButton variant="ghost" onClick={onClose}>Close</LBDModalButton>
      }
    >
      <div className="space-y-6">
        {/* Add keyword form */}
        <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border/40">
          <Label className="text-xs font-semibold">Add Keyword</Label>
          <div className="flex gap-2">
            <Input
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="Enter keyword or phrase…"
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Button size="sm" onClick={handleAdd} disabled={addKeyword.isPending} className="gap-1">
              <Plus className="w-3.5 h-3.5" />
              Add
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground">Platforms to monitor:</Label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <label
                  key={p}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border text-xs cursor-pointer hover:border-accent/40 transition-colors"
                >
                  <Checkbox
                    checked={selectedPlatforms.includes(p)}
                    onCheckedChange={() => togglePlatform(p)}
                  />
                  <span className="text-foreground">{p}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Active keywords list */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Active Keywords ({keywords.length})</Label>
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : keywords.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No monitoring keywords configured.</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {keywords.map((kw) => (
                <div
                  key={kw.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{kw.keyword}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {kw.platforms.map((p) => (
                        <LBDBadge key={p} variant="outline" size="sm">{p}</LBDBadge>
                      ))}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive flex-none"
                    onClick={() => handleDelete(kw.id)}
                    disabled={deleteKeyword.isPending}
                    aria-label={`Delete keyword: ${kw.keyword}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </LBDModal>
  );
}
