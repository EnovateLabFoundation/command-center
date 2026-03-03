/**
 * PortalBriefings (/portal/reports/briefings)
 *
 * Shows approved intelligence briefing summaries. These are manually
 * curated by the Lead Advisor before appearing here.
 */

import { BookOpen } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { usePortalAccess, usePortalBriefs } from '@/hooks/usePortalData';
import { LBDCard, LBDEmptyState } from '@/components/ui/lbd';

export default function PortalBriefings() {
  const { data: access } = usePortalAccess();
  const { data: briefs, isLoading } = usePortalBriefs(access?.engagement_id);

  // Filter to intel-type briefs only
  const intelBriefs = briefs?.filter((b) => b.type === 'intel') ?? [];

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
        <p className="text-[10px] font-mono tracking-[0.3em] text-accent mb-1">BRIEFINGS</p>
        <h1 className="text-xl font-bold text-foreground">Intelligence Briefings</h1>
        <p className="text-sm text-muted-foreground">Curated intelligence summaries from your advisory team.</p>
      </div>

      {intelBriefs.length > 0 ? (
        <div className="space-y-4">
          {intelBriefs.map((brief) => {
            const content = brief.content as Record<string, unknown> | null;
            const headline = content?.headline_intel as string | undefined;
            const sentiment = content?.sentiment_assessment as string | undefined;
            const threats = content?.key_threats as string | undefined;
            const actions = content?.recommended_actions as string | undefined;

            return (
              <LBDCard key={brief.id} className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-accent" />
                    <span className="text-xs font-mono tracking-wider text-muted-foreground">
                      INTELLIGENCE BRIEFING
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {format(parseISO(brief.generated_at), 'dd MMM yyyy')}
                  </span>
                </div>

                {brief.date_from && brief.date_to && (
                  <p className="text-[10px] text-muted-foreground">
                    Period: {format(parseISO(brief.date_from), 'dd MMM yyyy')} – {format(parseISO(brief.date_to), 'dd MMM yyyy')}
                  </p>
                )}

                {/* Sections */}
                {headline && (
                  <div>
                    <p className="text-[10px] font-mono tracking-wider text-accent mb-1">HEADLINE INTELLIGENCE</p>
                    <p className="text-xs text-foreground whitespace-pre-line">{headline}</p>
                  </div>
                )}

                {sentiment && (
                  <div>
                    <p className="text-[10px] font-mono tracking-wider text-accent mb-1">SENTIMENT ASSESSMENT</p>
                    <p className="text-xs text-foreground whitespace-pre-line">{sentiment}</p>
                  </div>
                )}

                {threats && (
                  <div>
                    <p className="text-[10px] font-mono tracking-wider text-accent mb-1">KEY THREATS</p>
                    <p className="text-xs text-foreground whitespace-pre-line">{threats}</p>
                  </div>
                )}

                {actions && (
                  <div>
                    <p className="text-[10px] font-mono tracking-wider text-accent mb-1">RECOMMENDED ACTIONS</p>
                    <p className="text-xs text-foreground whitespace-pre-line">{actions}</p>
                  </div>
                )}
              </LBDCard>
            );
          })}
        </div>
      ) : (
        <LBDEmptyState
          icon={<BookOpen className="w-8 h-8" />}
          title="No Briefings Yet"
          description="Your advisory team will publish intelligence briefings here as they are approved."
        />
      )}
    </div>
  );
}
