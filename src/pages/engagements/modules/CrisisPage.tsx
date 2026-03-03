/**
 * CrisisPage — Crisis Protocol Command Centre
 *
 * Three-mode page: PRE-CRISIS SETUP | ACTIVE CRISIS WAR ROOM | POST-CRISIS REVIEW
 * Mode is auto-determined by the presence of an active or resolved crisis_event.
 *
 * @module pages/engagements/modules/CrisisPage
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCrisis } from '@/hooks/useCrisis';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LBDLoadingSkeleton } from '@/components/ui/lbd';
import PreCrisisSetup from '@/pages/engagements/crisis/PreCrisisSetup';
import ActiveWarRoom from '@/pages/engagements/crisis/ActiveWarRoom';
import PostCrisisReview from '@/pages/engagements/crisis/PostCrisisReview';

export default function CrisisPage() {
  const { id } = useParams<{ id: string }>();
  const hook = useCrisis(id);

  /** Allow user to manually toggle to review mode for past events */
  const [forceReview, setForceReview] = useState(false);

  if (hook.typesLoading || hook.eventsLoading) {
    return (
      <div className="p-6">
        <LBDLoadingSkeleton variant="table" />
      </div>
    );
  }

  // Active crisis takes priority
  if (hook.activeEvent && !forceReview) {
    return <ActiveWarRoom hook={hook} />;
  }

  // Show review tab if resolved events exist
  const hasResolvedEvents = hook.events.some((e) => e.status === 'resolved');

  return (
    <div className="flex flex-col h-full">
      {hasResolvedEvents && (
        <div className="px-6 pt-4">
          <Tabs value={forceReview ? 'review' : 'setup'} onValueChange={(v) => setForceReview(v === 'review')}>
            <TabsList>
              <TabsTrigger value="setup">Pre-Crisis Setup</TabsTrigger>
              <TabsTrigger value="review">Post-Crisis Review</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {forceReview && hook.latestResolved ? (
        <PostCrisisReview hook={hook} event={hook.latestResolved as any} />
      ) : (
        <div className="p-6 overflow-y-auto flex-1">
          <PreCrisisSetup hook={hook} />
        </div>
      )}
    </div>
  );
}
