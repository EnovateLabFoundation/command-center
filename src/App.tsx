/**
 * App.tsx — Root application router
 *
 * Route architecture:
 *
 * PUBLIC
 *   /login                    → LoginPage
 *   /auth/mfa-setup           → MFASetupPage
 *   /auth/mfa-verify          → MFAVerifyPage
 *   /auth/reset-password      → PasswordResetPage
 *
 * LEGACY REDIRECTS (backwards compat for bookmarks)
 *   /admin/*  /advisor/*  /senior/*  /comms/*  /intel/*  /digital/*
 *   → all redirect to /dashboard
 *   /portal/dashboard  → /portal
 *
 * INTERNAL PORTAL  (all staff roles, MFA required)
 *   Layout: ProtectedRoute[INTERNAL_ROLES] → EngagementProvider → AppShell
 *   /dashboard                → DashboardRouter (role-specific content)
 *   /engagements              → EngagementList
 *   /engagements/:id          → EngagementWorkspace (sets active engagement)
 *     /onboarding             → OnboardingPage
 *     /power-map              → PowerMapPage
 *     /intel-tracker          → IntelTrackerPage
 *     /competitors            → CompetitorsPage
 *     /geospatial             → GeospatialPage
 *     /narrative              → NarrativePage
 *     /scenarios              → ScenariosPage
 *     /brand-audit            → BrandAuditPage
 *     /comms-planner          → CommsPlannerPage
 *     /content-calendar       → ContentCalendarPage
 *     /crisis                 → CrisisPage
 *     /cadence                → CadencePage
 *     /reports                → ReportsPage
 *   ADMIN SUBROUTES (super_admin only, nested ProtectedRoute)
 *     /admin                  → AdminPanelPage
 *     /admin/dashboard        → AdminDashboard (command centre)
 *     /admin/users            → UserManagementPage
 *     /admin/portal-access    → PortalAccessPage
 *     /admin/integrations     → IntegrationsPage
 *
 * CLIENT PORTAL  (client_principal, MFA optional)
 *   Layout: ProtectedRoute[client_principal] → AppShell (no EngagementProvider)
 *   /portal                   → ClientDashboard
 *   /portal/reports           → ClientReports
 *   /portal/insights          → ClientInsights
 *
 * FALLBACK
 *   /unauthorized             → Unauthorized
 *   *                         → NotFound
 */

import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from '@/providers/AuthProvider';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { EngagementProvider } from '@/contexts/EngagementContext';
import AppShell from '@/layouts/AppShell';
import type { AppRole } from '@/stores/authStore';

// ── Auth pages ────────────────────────────────────────────────────────────────
import LoginPage from '@/pages/auth/LoginPage';
import MFASetupPage from '@/pages/auth/MFASetupPage';
import MFAVerifyPage from '@/pages/auth/MFAVerifyPage';
import PasswordResetPage from '@/pages/auth/PasswordResetPage';

// ── Internal shell ────────────────────────────────────────────────────────────
import DashboardRouter from '@/pages/dashboard/DashboardRouter';

// ── Engagement pages ──────────────────────────────────────────────────────────
import EngagementList from '@/pages/engagements/EngagementList';
import EngagementWorkspace from '@/pages/engagements/EngagementWorkspace';

// ── Module pages ──────────────────────────────────────────────────────────────
import OnboardingPage from '@/pages/engagements/modules/OnboardingPage';
import PowerMapPage from '@/pages/engagements/modules/PowerMapPage';
import IntelTrackerPage from '@/pages/engagements/modules/IntelTrackerPage';
import CompetitorsPage from '@/pages/engagements/modules/CompetitorsPage';
import GeospatialPage from '@/pages/engagements/modules/GeospatialPage';
import NarrativePage from '@/pages/engagements/modules/NarrativePage';
import ScenariosPage from '@/pages/engagements/modules/ScenariosPage';
import BrandAuditPage from '@/pages/engagements/modules/BrandAuditPage';
import CommsPlannerPage from '@/pages/engagements/modules/CommsPlannerPage';
import ContentCalendarPage from '@/pages/engagements/modules/ContentCalendarPage';
import CrisisPage from '@/pages/engagements/modules/CrisisPage';
import CadencePage from '@/pages/engagements/modules/CadencePage';
import ReportsPage from '@/pages/engagements/modules/ReportsPage';

// ── Admin pages ───────────────────────────────────────────────────────────────
import AdminPanelPage from '@/pages/admin/AdminPanelPage';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import UserManagementPage from '@/pages/admin/UserManagementPage';
import PortalAccessPage from '@/pages/admin/PortalAccessPage';
import IntegrationsPage from '@/pages/admin/IntegrationsPage';

// ── Client portal pages ───────────────────────────────────────────────────────
import ClientDashboard from '@/pages/portal/ClientDashboard';
import ClientReports from '@/pages/portal/ClientReports';
import ClientInsights from '@/pages/portal/ClientInsights';

// ── Fallback pages ────────────────────────────────────────────────────────────
import Unauthorized from '@/pages/Unauthorized';
import NotFound from '@/pages/NotFound';

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */

/** All staff roles that access the internal portal */
const INTERNAL_ROLES: AppRole[] = [
  'super_admin',
  'lead_advisor',
  'senior_advisor',
  'comms_director',
  'intel_analyst',
  'digital_strategist',
];

/* ─────────────────────────────────────────────
   Query client
───────────────────────────────────────────── */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

/* ─────────────────────────────────────────────
   App
───────────────────────────────────────────── */

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          {/* AuthProvider must be inside BrowserRouter (uses useNavigate) */}
          <AuthProvider>
            <Routes>

              {/* ── Public auth routes ──────────────────────────────────── */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/login" element={<Navigate to="/login" replace />} />
              <Route path="/auth/mfa-setup" element={<MFASetupPage />} />
              <Route path="/auth/mfa-verify" element={<MFAVerifyPage />} />
              <Route path="/auth/reset-password" element={<PasswordResetPage />} />

              {/* ── Root → login ────────────────────────────────────────── */}
              <Route path="/" element={<Navigate to="/login" replace />} />

              {/* ── Legacy role-prefixed redirect aliases ────────────────── */}
              <Route path="/advisor/*" element={<Navigate to="/dashboard" replace />} />
              <Route path="/senior/*" element={<Navigate to="/dashboard" replace />} />
              <Route path="/comms/*" element={<Navigate to="/dashboard" replace />} />
              <Route path="/intel/*" element={<Navigate to="/dashboard" replace />} />
              <Route path="/digital/*" element={<Navigate to="/dashboard" replace />} />
              <Route path="/portal/dashboard" element={<Navigate to="/portal" replace />} />

              {/* ── Internal portal ─────────────────────────────────────── */}
              {/*
               * Outer ProtectedRoute guards the entire internal portal.
               * EngagementProvider wraps all internal routes so context is available.
               * AppShell is the layout — renders sidebar + header + <Outlet />.
               */}
              <Route
                element={
                  <ProtectedRoute allowedRoles={INTERNAL_ROLES} requireMfa>
                    <EngagementProvider>
                      <AppShell />
                    </EngagementProvider>
                  </ProtectedRoute>
                }
              >
                {/* Dashboard */}
                <Route path="/dashboard" element={<DashboardRouter />} />

                {/* Engagement list */}
                <Route path="/engagements" element={<EngagementList />} />

                {/* Engagement workspace — sets active engagement on mount */}
                <Route path="/engagements/:id" element={<EngagementWorkspace />}>
                  {/* Default → onboarding */}
                  <Route index element={<Navigate to="onboarding" replace />} />

                  {/* Module routes */}
                  <Route path="onboarding"       element={<OnboardingPage />} />
                  <Route path="power-map"        element={<PowerMapPage />} />
                  <Route path="intel-tracker"    element={<IntelTrackerPage />} />
                  <Route path="competitors"      element={<CompetitorsPage />} />
                  <Route path="geospatial"       element={<GeospatialPage />} />
                  <Route path="narrative"        element={<NarrativePage />} />
                  <Route path="scenarios"        element={<ScenariosPage />} />
                  <Route path="brand-audit"      element={<BrandAuditPage />} />
                  <Route path="comms-planner"    element={<CommsPlannerPage />} />
                  <Route path="content-calendar" element={<ContentCalendarPage />} />
                  <Route path="crisis"           element={<CrisisPage />} />
                  <Route path="cadence"          element={<CadencePage />} />
                  <Route path="reports"          element={<ReportsPage />} />
                </Route>

                {/* Admin section — nested ProtectedRoute for super_admin only */}
                <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
                  <Route path="/admin"                   element={<AdminPanelPage />} />
                  <Route path="/admin/dashboard"         element={<AdminDashboard />} />
                  <Route path="/admin/users"             element={<UserManagementPage />} />
                  <Route path="/admin/portal-access"     element={<PortalAccessPage />} />
                  <Route path="/admin/integrations"      element={<IntegrationsPage />} />
                </Route>
              </Route>

              {/* ── Client portal ──────────────────────────────────────── */}
              {/*
               * Separate AppShell instance for client_principal.
               * No EngagementProvider (clients access a curated view, not the
               * full engagement workspace). MFA is optional.
               */}
              <Route
                element={
                  <ProtectedRoute
                    allowedRoles={['client_principal']}
                    requireMfa={false}
                  >
                    <AppShell />
                  </ProtectedRoute>
                }
              >
                <Route path="/portal"          element={<ClientDashboard />} />
                <Route path="/portal/reports"  element={<ClientReports />} />
                <Route path="/portal/insights" element={<ClientInsights />} />
              </Route>

              {/* ── Fallback ────────────────────────────────────────────── */}
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="*" element={<NotFound />} />

            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
