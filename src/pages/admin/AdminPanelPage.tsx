/**
 * AdminPanelPage
 *
 * Super admin overview — platform health, key metrics, and quick links
 * to all administrative sections. Only accessible to super_admin role.
 */

import { useNavigate } from 'react-router-dom';
import { Settings, Users, Key, PlugZap, ShieldCheck, BarChart3 } from 'lucide-react';
import { LBDPageHeader, LBDCard, LBDEmptyState } from '@/components/ui/lbd';

const adminSections = [
  {
    label: 'User Management',
    description: 'Create, edit, and manage user accounts and role assignments.',
    href: '/admin/users',
    Icon: Users,
  },
  {
    label: 'Portal Access',
    description: 'Grant and revoke client principal access to the portal.',
    href: '/admin/portal-access',
    Icon: Key,
  },
  {
    label: 'Integrations',
    description: 'Configure API keys and third-party platform connections.',
    href: '/admin/integrations',
    Icon: PlugZap,
  },
];

export default function AdminPanelPage() {
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <LBDPageHeader
        eyebrow="PLATFORM"
        title="Admin Panel"
        description="Platform administration — user management, access control, and system configuration."
        actions={
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-400/10 border border-green-400/20">
            <ShieldCheck className="w-3 h-3 text-green-400" aria-hidden="true" />
            <span className="text-[10px] font-mono text-green-400 tracking-widest">PLATFORM HEALTHY</span>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {adminSections.map((section) => (
          <LBDCard
            key={section.href}
            className="p-5 cursor-pointer hover:border-accent/30 transition-colors group"
            onClick={() => navigate(section.href)}
            role="button"
            tabIndex={0}
            onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && navigate(section.href)}
          >
            <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-3 group-hover:border-accent/40 transition-colors">
              <section.Icon className="w-4.5 h-4.5 text-accent" aria-hidden="true" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">{section.label}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{section.description}</p>
          </LBDCard>
        ))}
      </div>

      <LBDEmptyState
        icon={<BarChart3 className="w-8 h-8" />}
        title="Platform Analytics Coming Soon"
        description="Usage metrics, audit summaries, and platform health dashboards will appear here."
      />
    </div>
  );
}
