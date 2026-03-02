/**
 * UserManagementPage
 *
 * User account management — view, create, edit, and deactivate users.
 * Only accessible to super_admin role.
 */

import { Users } from 'lucide-react';
import { LBDPageHeader, LBDEmptyState } from '@/components/ui/lbd';

export default function UserManagementPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <LBDPageHeader
        eyebrow="PLATFORM · ADMIN"
        title="User Management"
        description="Create and manage user accounts, assign roles, and control platform access."
      />
      <LBDEmptyState
        icon={<Users className="w-8 h-8" />}
        title="User Management Coming Soon"
        description="Full user account management with role assignment, MFA status, and activity logs will appear here."
      />
    </div>
  );
}
