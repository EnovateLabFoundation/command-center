/**
 * ChartExportButton
 *
 * A small camera icon button that can be placed on any chart component.
 * On click, opens a modal with export options: JPEG, PDF, Copy to Clipboard.
 *
 * Usage:
 *   <div ref={chartRef} className="relative">
 *     <ChartExportButton elementRef={chartRef} title="Sentiment Trend" />
 *     <ResponsiveContainer>...</ResponsiveContainer>
 *   </div>
 */

import { useState, type RefObject } from 'react';
import { Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LBDModal, LBDModalButton } from '@/components/ui/lbd/LBDModal';
import {
  exportChartAsJpeg,
  exportChartAsPdf,
  copyChartToClipboard,
} from '@/lib/reportEngine';
import { toast } from '@/hooks/use-toast';

interface ChartExportButtonProps {
  /** Ref to the chart container element to capture */
  elementRef: RefObject<HTMLElement>;
  /** Title used in PDF header and filenames */
  title?: string;
  className?: string;
}

export function ChartExportButton({
  elementRef,
  title = 'Chart',
  className,
}: ChartExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const safeFilename = title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_');

  async function handleExport(type: 'jpeg' | 'pdf' | 'clipboard') {
    if (!elementRef.current) return;
    setExporting(true);
    try {
      switch (type) {
        case 'jpeg':
          await exportChartAsJpeg(elementRef.current, safeFilename);
          toast({ title: 'Chart exported as JPEG' });
          break;
        case 'pdf':
          await exportChartAsPdf(elementRef.current, safeFilename, title);
          toast({ title: 'Chart exported as PDF' });
          break;
        case 'clipboard': {
          const ok = await copyChartToClipboard(elementRef.current);
          toast({
            title: ok ? 'Copied to clipboard' : 'Failed to copy',
            variant: ok ? 'default' : 'destructive',
          });
          break;
        }
      }
      setOpen(false);
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'absolute top-2 right-2 z-10 p-1.5 rounded-lg border border-border bg-card/90',
          'text-muted-foreground hover:text-foreground hover:border-accent/30 transition-colors',
          className,
        )}
        aria-label="Export chart"
        title="Export chart"
      >
        <Camera className="w-3.5 h-3.5" />
      </button>

      <LBDModal
        open={open}
        onClose={() => setOpen(false)}
        title="Export Chart"
        description={`Export "${title}" in your preferred format.`}
        size="sm"
      >
        <div className="space-y-2">
          <button
            onClick={() => handleExport('jpeg')}
            disabled={exporting}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:border-accent/30 hover:bg-muted/30 transition-colors text-left"
          >
            <span className="text-sm font-medium text-foreground">Export as JPEG</span>
            <span className="text-xs text-muted-foreground ml-auto">High quality image</span>
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:border-accent/30 hover:bg-muted/30 transition-colors text-left"
          >
            <span className="text-sm font-medium text-foreground">Export as PDF (A4)</span>
            <span className="text-xs text-muted-foreground ml-auto">With LBD branding</span>
          </button>
          <button
            onClick={() => handleExport('clipboard')}
            disabled={exporting}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:border-accent/30 hover:bg-muted/30 transition-colors text-left"
          >
            <span className="text-sm font-medium text-foreground">Copy to Clipboard</span>
            <span className="text-xs text-muted-foreground ml-auto">PNG format</span>
          </button>
        </div>
      </LBDModal>
    </>
  );
}
