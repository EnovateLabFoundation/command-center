/**
 * ClientReports (/portal/reports)
 *
 * Lists all published reports/briefs for the client's engagement.
 * Each report shows title, type, date, and a download button.
 */

import { FileText, Download } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { usePortalAccess, usePortalBriefs } from '@/hooks/usePortalData';
import { LBDCard, LBDEmptyState, LBDBadge } from '@/components/ui/lbd';

export default function ClientReports() {
  const { data: access } = usePortalAccess();
  const { data: briefs, isLoading } = usePortalBriefs(access?.engagement_id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-transparent border-t-accent" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <p className="text-[10px] font-mono tracking-[0.3em] text-accent mb-1">REPORTS</p>
        <h1 className="text-xl font-bold text-foreground">Reports Hub</h1>
        <p className="text-sm text-muted-foreground">Published reports and deliverables for your engagement.</p>
      </div>

      {briefs && briefs.length > 0 ? (
        <div className="space-y-3">
          {briefs.map((brief) => {
            const content = brief.content as Record<string, unknown> | null;
            const title = (content?.title as string) ?? `${brief.type} Brief`;

            return (
              <LBDCard key={brief.id} className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-none">
                  <FileText className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <LBDBadge variant="outline" className="text-[10px]">
                      {brief.type}
                    </LBDBadge>
                    <span className="text-[10px] text-muted-foreground">
                      {format(parseISO(brief.generated_at), 'dd MMM yyyy')}
                    </span>
                    {brief.date_from && brief.date_to && (
                      <span className="text-[10px] text-muted-foreground">
                        · {format(parseISO(brief.date_from), 'dd MMM')} – {format(parseISO(brief.date_to), 'dd MMM')}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs text-muted-foreground hover:text-foreground hover:border-accent/30 transition-colors"
                  title="Download PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
              </LBDCard>
            );
          })}
        </div>
      ) : (
        <LBDEmptyState
          icon={<FileText className="w-8 h-8" />}
          title="No Reports Published"
          description="Your advisory team will publish reports here as they become available."
        />
      )}
    </div>
  );
}
