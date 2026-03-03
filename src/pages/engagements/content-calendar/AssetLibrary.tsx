/**
 * AssetLibrary
 *
 * Grid view of uploaded media assets for the engagement.
 * Supports drag-and-drop upload, filtering, and preview.
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import { format } from 'date-fns';
import { Upload, Image, FileVideo, FileText, File, Trash2, Copy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { StorageAsset } from '@/hooks/useContentCalendar';

type FilterType = 'all' | 'images' | 'videos' | 'documents';

/** Categorise by MIME type */
function assetCategory(mime: string): FilterType {
  if (mime.startsWith('image/')) return 'images';
  if (mime.startsWith('video/')) return 'videos';
  return 'documents';
}

function AssetIcon({ mime }: { mime: string }) {
  if (mime.startsWith('image/')) return <Image className="w-5 h-5 text-accent" />;
  if (mime.startsWith('video/')) return <FileVideo className="w-5 h-5 text-primary" />;
  if (mime.includes('pdf') || mime.includes('document')) return <FileText className="w-5 h-5 text-orange-400" />;
  return <File className="w-5 h-5 text-muted-foreground" />;
}

interface Props {
  assets: StorageAsset[];
  isLoading: boolean;
  onUpload: (file: File) => Promise<string | null>;
  onDelete: (name: string) => Promise<boolean>;
  onFetch: () => void;
}

export default function AssetLibrary({ assets, isLoading, onUpload, onDelete, onFetch }: Props) {
  const { toast } = useToast();
  const [filter, setFilter] = useState<FilterType>('all');
  const [dragging, setDragging] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<StorageAsset | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { onFetch(); }, [onFetch]);

  const filtered = filter === 'all' ? assets : assets.filter((a) => assetCategory(a.mimeType) === filter);

  /** Handle file drop */
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      await onUpload(file);
    }
  }, [onUpload]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      await onUpload(file);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: 'URL copied to clipboard' });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1">
          {(['all', 'images', 'videos', 'documents'] as FilterType[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize text-xs"
            >
              {f}
            </Button>
          ))}
        </div>
        <Button size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload
        </Button>
        <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
      </div>

      {/* Drop zone */}
      <div
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
          dragging ? 'border-accent bg-accent/5' : 'border-border',
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Drag and drop files here, or click Upload</p>
      </div>

      {/* Asset grid */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading assets…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No assets found.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((asset) => (
            <button
              key={asset.id}
              onClick={() => setSelectedAsset(asset)}
              className="group rounded-lg border border-border bg-card p-3 hover:border-accent/40 transition-colors text-left"
            >
              {/* Preview thumbnail */}
              <div className="aspect-square rounded-md bg-muted/30 flex items-center justify-center mb-2 overflow-hidden">
                {asset.mimeType.startsWith('image/') ? (
                  <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <AssetIcon mime={asset.mimeType} />
                )}
              </div>
              <p className="text-xs font-medium text-foreground truncate">{asset.name}</p>
              <p className="text-[10px] text-muted-foreground">{formatSize(asset.size)}</p>
            </button>
          ))}
        </div>
      )}

      {/* Preview modal */}
      <Dialog open={!!selectedAsset} onOpenChange={(o) => !o && setSelectedAsset(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="truncate">{selectedAsset?.name}</DialogTitle>
            <DialogDescription>Asset details and preview</DialogDescription>
          </DialogHeader>
          {selectedAsset && (
            <div className="space-y-4">
              {selectedAsset.mimeType.startsWith('image/') ? (
                <img src={selectedAsset.url} alt={selectedAsset.name} className="w-full rounded-lg" />
              ) : (
                <div className="aspect-video bg-muted/30 rounded-lg flex items-center justify-center">
                  <AssetIcon mime={selectedAsset.mimeType} />
                </div>
              )}
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Size:</span> {formatSize(selectedAsset.size)}</p>
                <p><span className="text-muted-foreground">Type:</span> {selectedAsset.mimeType}</p>
                {selectedAsset.createdAt && (
                  <p><span className="text-muted-foreground">Uploaded:</span> {format(new Date(selectedAsset.createdAt), 'dd MMM yyyy')}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => copyUrl(selectedAsset.url)}>
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copy URL
                </Button>
                <Button variant="destructive" size="sm" onClick={async () => { await onDelete(selectedAsset.name); setSelectedAsset(null); }}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
