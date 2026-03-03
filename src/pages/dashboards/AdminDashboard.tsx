/**
 * AdminDashboard
 *
 * Super Admin dashboard with module cards and AI Usage panel.
 */

import DashboardShell from './_DashboardShell';
import AIUsagePanel from '@/pages/admin/AIUsagePanel';

export default function AdminDashboard() {
  return (
    <>
      <DashboardShell
        role="super_admin"
        label="SUPER ADMIN"
        subtitle="Platform Administration & Oversight"
        accentColor="text-accent"
        modules={[
          { name: 'User Management', desc: 'Manage roles, permissions, and team access', icon: '👤' },
          { name: 'All Engagements', desc: 'Full visibility across all client engagements', icon: '📊' },
          { name: 'Audit Logs', desc: 'Complete platform activity trail', icon: '📋' },
          { name: 'Integration Config', desc: 'API keys and third-party platform settings', icon: '⚙️' },
          { name: 'Security Advisors', desc: 'RLS policy checks and security alerts', icon: '🛡️' },
          { name: 'Portal Access', desc: 'Manage client principal portal grants', icon: '🔑' },
        ]}
      />
      {/* AI Usage section rendered below the DashboardShell */}
      <div className="max-w-7xl mx-auto px-6 pb-10">
        <AIUsagePanel />
      </div>
    </>
  );
}
