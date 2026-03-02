/**
 * IntegrationsPage
 *
 * Third-party platform integration management — API keys, webhooks,
 * and external service configuration. Only accessible to super_admin.
 */

import { PlugZap } from 'lucide-react';
import { LBDPageHeader, LBDEmptyState } from '@/components/ui/lbd';

export default function IntegrationsPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <LBDPageHeader
        eyebrow="PLATFORM · ADMIN"
        title="Integrations"
        description="Configure API keys, webhooks, and third-party platform connections."
      />
      <LBDEmptyState
        icon={<PlugZap className="w-8 h-8" />}
        title="Integrations Coming Soon"
        description="Connect external intelligence feeds, CRM platforms, and communication channels here."
      />
    </div>
  );
}
