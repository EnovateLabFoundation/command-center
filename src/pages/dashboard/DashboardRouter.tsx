/**
 * DashboardRouter
 *
 * Renders the role-appropriate dashboard inside AppShell.
 * AppShell provides the sidebar, header, and engagement context — this
 * component simply maps the authenticated user's role to the correct
 * dashboard component.
 *
 * Internal roles (lead_advisor → digital_strategist) each get a full
 * data-rich dashboard. super_admin is redirected to /admin/dashboard.
 * client_principal gets the portal welcome stub.
 */

import { Navigate } from 'react-router-dom';
import { useAuthStore, type AppRole } from '@/stores/authStore';

// Role-specific dashboards
import LeadAdvisorDashboard     from '@/pages/dashboard/roles/LeadAdvisorDashboard';
import SeniorAdvisorDashboard   from '@/pages/dashboard/roles/SeniorAdvisorDashboard';
import CommsDashboard           from '@/pages/dashboard/roles/CommsDashboard';
import IntelDashboard           from '@/pages/dashboard/roles/IntelDashboard';
import DigitalStrategistDashboard from '@/pages/dashboard/roles/DigitalStrategistDashboard';

// Portal fallback
import ClientPortalDashboard from '@/pages/portal/ClientDashboard';

/* ─────────────────────────────────────────────
   Role → component map
───────────────────────────────────────────── */

type InternalRole = Exclude<AppRole, 'super_admin' | 'client_principal'>;

const ROLE_COMPONENTS: Record<InternalRole, React.ComponentType> = {
  lead_advisor:      LeadAdvisorDashboard,
  senior_advisor:    SeniorAdvisorDashboard,
  comms_director:    CommsDashboard,
  intel_analyst:     IntelDashboard,
  digital_strategist: DigitalStrategistDashboard,
};

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function DashboardRouter() {
  const { role } = useAuthStore();

  if (!role) return null;

  // Super admin → dedicated command dashboard
  if (role === 'super_admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Client portal
  if (role === 'client_principal') {
    return <ClientPortalDashboard />;
  }

  // Internal roles
  const DashboardComponent = ROLE_COMPONENTS[role as InternalRole];
  if (!DashboardComponent) return null;

  return <DashboardComponent />;
}
