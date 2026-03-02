/**
 * PortalAccessPage
 *
 * Manage client principal portal access — grant, revoke, and audit
 * client_principal access grants per engagement. Only accessible to super_admin.
 */

import { Key } from 'lucide-react';
import { LBDPageHeader, LBDEmptyState } from '@/components/ui/lbd';

export default function PortalAccessPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <LBDPageHeader
        eyebrow="PLATFORM · ADMIN"
        title="Portal Access"
        description="Grant and revoke client principal access to the client portal per engagement."
      />
      <LBDEmptyState
        icon={<Key className="w-8 h-8" />}
        title="Portal Access Management Coming Soon"
        description="Manage which clients have portal access, set expiry dates, and review access audit logs."
      />
    </div>
  );
}
