/**
 * NarrativePage
 *
 * Entry point for the Narrative Architecture Matrix module.
 * Three tabs: Core Platform | Audience Matrix | Message Discipline.
 */

import { useParams } from 'react-router-dom';
import { LBDPageHeader } from '@/components/ui/lbd';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import CorePlatformTab from '@/pages/engagements/narrative/CorePlatformTab';
import AudienceMatrixTab from '@/pages/engagements/narrative/AudienceMatrixTab';
import MessageDisciplineTab from '@/pages/engagements/narrative/MessageDisciplineTab';

export default function NarrativePage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="p-6 space-y-6">
      <LBDPageHeader
        eyebrow="STRATEGY"
        title="Narrative Architecture"
        description="Master narrative, audience messaging matrix, and message discipline rules."
      />

      <Tabs defaultValue="core" className="w-full">
        <TabsList>
          <TabsTrigger value="core">Core Platform</TabsTrigger>
          <TabsTrigger value="audience">Audience Matrix</TabsTrigger>
          <TabsTrigger value="discipline">Message Discipline</TabsTrigger>
        </TabsList>

        <TabsContent value="core">
          <CorePlatformTab />
        </TabsContent>

        <TabsContent value="audience">
          <AudienceMatrixTab />
        </TabsContent>

        <TabsContent value="discipline">
          <MessageDisciplineTab engagementId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
