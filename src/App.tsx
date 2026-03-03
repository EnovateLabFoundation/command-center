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
 *     /close-out              → CloseOutPage
 *   /notifications            → NotificationsPage
 *   ADMIN SUBROUTES (super_admin only, nested ProtectedRoute)
 *     /admin                  → AdminPanelPage
 *     /admin/dashboard        → AdminDashboard (command centre)
 *     /admin/users            → UserManagementPage
 *     /admin/portal-access    → PortalAccessPage
 *     /admin/integrations     → IntegrationsPage
 *     /admin/audit            → AuditLogPage
 *
 * CLIENT PORTAL  (client_principal, MFA optional)
 *   Layout: ProtectedRoute[client_principal] → PortalShell
 *   /portal                   → ClientDashboard
 *   /portal/reports           → ClientReports
 *   /portal/insights          → ClientInsights
 *
 * FALLBACK
 *   /unauthorized             → Unauthorized
 *   *                         → NotFound
 */

import { lazy, Suspense } from 'react';
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

// ── Loading skeleton for lazy pages ───────────────────────────────────────────
import { LBDLoadingSkeleton } from '@/components/ui/lbd';

function PageFallback() {
  return (
    <div className="p-6">
      <LBDLoadingSkeleton />
    </div>
  );
}

// ── Auth pages (small, keep eager) ────────────────────────────────────────────
import LoginPage from '@/pages/auth/LoginPage';
import MFASetupPage from '@/pages/auth/MFASetupPage';
import MFAVerifyPage from '@/pages/auth/MFAVerifyPage';
import PasswordResetPage from '@/pages/auth/PasswordResetPage';

// ── Shell layouts (eager — needed before any content renders) ─────────────────
import DashboardRouter from '@/pages/dashboard/DashboardRouter';
import EngagementList from '@/pages/engagements/EngagementList';
import EngagementWorkspace from '@/pages/engagements/EngagementWorkspace';
import PortalShell from '@/layouts/PortalShell';

// ── Fallback pages (eager — lightweight) ──────────────────────────────────────
import Unauthorized from '@/pages/Unauthorized';
import NotFound from '@/pages/NotFound';

// ── Module pages (lazy — heavy, code-split per route) ─────────────────────────
const OnboardingPage       = lazy(() => import('@/pages/engagements/modules/OnboardingPage'));
const DiscoverySession     = lazy(() => import('@/pages/engagements/discovery/DiscoverySession'));
const PowerMapPage         = lazy(() => import('@/pages/engagements/modules/PowerMapPage'));
const IntelTrackerPage     = lazy(() => import('@/pages/engagements/modules/IntelTrackerPage'));
const CompetitorsPage      = lazy(() => import('@/pages/engagements/modules/CompetitorsPage'));
const GeospatialPage       = lazy(() => import('@/pages/engagements/modules/GeospatialPage'));
const NarrativePage        = lazy(() => import('@/pages/engagements/modules/NarrativePage'));
const ScenariosPage        = lazy(() => import('@/pages/engagements/modules/ScenariosPage'));
const BrandAuditPage       = lazy(() => import('@/pages/engagements/modules/BrandAuditPage'));
const CommsPlannerPage     = lazy(() => import('@/pages/engagements/modules/CommsPlannerPage'));
const ContentCalendarPage  = lazy(() => import('@/pages/engagements/modules/ContentCalendarPage'));
const CrisisPage           = lazy(() => import('@/pages/engagements/modules/CrisisPage'));
const CadencePage          = lazy(() => import('@/pages/engagements/modules/CadencePage'));
const ReportsPage          = lazy(() => import('@/pages/engagements/modules/ReportsPage'));
const CloseOutPage         = lazy(() => import('@/pages/engagements/modules/CloseOutPage'));
const KnowledgeBasePage    = lazy(() => import('@/pages/KnowledgeBasePage'));
const NotificationsPage    = lazy(() => import('@/pages/NotificationsPage'));

// ── Admin pages (lazy) ────────────────────────────────────────────────────────
const AdminPanelPage       = lazy(() => import('@/pages/admin/AdminPanelPage'));
const AdminDashboard       = lazy(() => import('@/pages/admin/AdminDashboard'));
const UserManagementPage   = lazy(() => import('@/pages/admin/UserManagementPage'));
const PortalAccessPage     = lazy(() => import('@/pages/admin/PortalAccessPage'));
const IntegrationsPage     = lazy(() => import('@/pages/admin/IntegrationsPage'));
const AuditLogPage         = lazy(() => import('@/pages/admin/AuditLogPage'));

// ── Client management (lazy) ──────────────────────────────────────────────────
const ClientList           = lazy(() => import('@/pages/clients/ClientList'));
const NewClientWizard      = lazy(() => import('@/pages/clients/NewClientWizard'));

// ── Client portal pages (lazy) ────────────────────────────────────────────────
const ClientDashboard      = lazy(() => import('@/pages/portal/ClientDashboard'));
const ClientReports        = lazy(() => import('@/pages/portal/ClientReports'));
const ClientInsights       = lazy(() => import('@/pages/portal/ClientInsights'));
const PortalSentiment      = lazy(() => import('@/pages/portal/PortalSentiment'));
const PortalMedia          = lazy(() => import('@/pages/portal/PortalMedia'));
const PortalBrandScorecard = lazy(() => import('@/pages/portal/PortalBrandScorecard'));
const PortalBriefings      = lazy(() => import('@/pages/portal/PortalBriefings'));

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
   Query client — tuned stale times per data type
───────────────────────────────────────────── */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry:     1,
      staleTime: 2 * 60 * 1000, // 2 min default (intel_items cadence)
    },
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
          <AuthProvider>
            <Routes>

              {/* ── Public auth routes ──────────────────────────────────── */}
              <Route path="/login"               element={<LoginPage />} />
              <Route path="/auth/login"          element={<Navigate to="/login" replace />} />
              <Route path="/auth/mfa-setup"      element={<MFASetupPage />} />
              <Route path="/auth/mfa-verify"     element={<MFAVerifyPage />} />
              <Route path="/auth/reset-password" element={<PasswordResetPage />} />

              {/* ── Root → login ────────────────────────────────────────── */}
              <Route path="/" element={<Navigate to="/login" replace />} />

              {/* ── Legacy role-prefixed redirect aliases ────────────────── */}
              <Route path="/advisor/*"        element={<Navigate to="/dashboard" replace />} />
              <Route path="/senior/*"         element={<Navigate to="/dashboard" replace />} />
              <Route path="/comms/*"          element={<Navigate to="/dashboard" replace />} />
              <Route path="/intel/*"          element={<Navigate to="/dashboard" replace />} />
              <Route path="/digital/*"        element={<Navigate to="/dashboard" replace />} />
              <Route path="/portal/dashboard" element={<Navigate to="/portal" replace />} />

              {/* ── Internal portal ─────────────────────────────────────── */}
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

                {/* Client management */}
                <Route path="/clients"     element={<Suspense fallback={<PageFallback />}><ClientList /></Suspense>} />
                <Route path="/clients/new" element={<Suspense fallback={<PageFallback />}><NewClientWizard /></Suspense>} />

                {/* Engagement list */}
                <Route path="/engagements" element={<EngagementList />} />

                {/* Notifications */}
                <Route path="/notifications" element={<Suspense fallback={<PageFallback />}><NotificationsPage /></Suspense>} />

                {/* Discovery session — full-page, outside the workspace tab strip */}
                <Route
                  path="/engagements/:id/discovery"
                  element={<Suspense fallback={<PageFallback />}><DiscoverySession /></Suspense>}
                />

                {/* Engagement workspace — sets active engagement on mount */}
                <Route path="/engagements/:id" element={<EngagementWorkspace />}>
                  <Route index element={<Navigate to="onboarding" replace />} />

                  <Route path="onboarding"        element={<Suspense fallback={<PageFallback />}><OnboardingPage /></Suspense>} />
                  <Route path="power-map"         element={<Suspense fallback={<PageFallback />}><PowerMapPage /></Suspense>} />
                  <Route path="intel-tracker"     element={<Suspense fallback={<PageFallback />}><IntelTrackerPage /></Suspense>} />
                  <Route path="competitors"       element={<Suspense fallback={<PageFallback />}><CompetitorsPage /></Suspense>} />
                  <Route path="geospatial"        element={<Suspense fallback={<PageFallback />}><GeospatialPage /></Suspense>} />
                  <Route path="narrative"         element={<Suspense fallback={<PageFallback />}><NarrativePage /></Suspense>} />
                  <Route path="scenarios"         element={<Suspense fallback={<PageFallback />}><ScenariosPage /></Suspense>} />
                  <Route path="brand-audit"       element={<Suspense fallback={<PageFallback />}><BrandAuditPage /></Suspense>} />
                  <Route path="comms-planner"     element={<Suspense fallback={<PageFallback />}><CommsPlannerPage /></Suspense>} />
                  <Route path="content-calendar"  element={<Suspense fallback={<PageFallback />}><ContentCalendarPage /></Suspense>} />
                  <Route path="crisis"            element={<Suspense fallback={<PageFallback />}><CrisisPage /></Suspense>} />
                  <Route path="cadence"           element={<Suspense fallback={<PageFallback />}><CadencePage /></Suspense>} />
                  <Route path="reports"           element={<Suspense fallback={<PageFallback />}><ReportsPage /></Suspense>} />
                  <Route path="close-out"         element={<Suspense fallback={<PageFallback />}><CloseOutPage /></Suspense>} />
                </Route>

                {/* Knowledge Base — all internal roles */}
                <Route path="/knowledge-base" element={<Suspense fallback={<PageFallback />}><KnowledgeBasePage /></Suspense>} />

                {/* Admin section — nested ProtectedRoute for super_admin only */}
                <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
                  <Route path="/admin"                element={<Suspense fallback={<PageFallback />}><AdminPanelPage /></Suspense>} />
                  <Route path="/admin/dashboard"      element={<Suspense fallback={<PageFallback />}><AdminDashboard /></Suspense>} />
                  <Route path="/admin/users"          element={<Suspense fallback={<PageFallback />}><UserManagementPage /></Suspense>} />
                  <Route path="/admin/portal-access"  element={<Suspense fallback={<PageFallback />}><PortalAccessPage /></Suspense>} />
                  <Route path="/admin/integrations"   element={<Suspense fallback={<PageFallback />}><IntegrationsPage /></Suspense>} />
                  <Route path="/admin/audit"          element={<Suspense fallback={<PageFallback />}><AuditLogPage /></Suspense>} />
                </Route>
              </Route>

              {/* ── Client portal ──────────────────────────────────────── */}
              <Route
                element={
                  <ProtectedRoute allowedRoles={['client_principal']} requireMfa={false}>
                    <PortalShell />
                  </ProtectedRoute>
                }
              >
                <Route path="/portal"                    element={<Suspense fallback={<PageFallback />}><ClientDashboard /></Suspense>} />
                <Route path="/portal/reports"            element={<Suspense fallback={<PageFallback />}><ClientReports /></Suspense>} />
                <Route path="/portal/reports/briefings"  element={<Suspense fallback={<PageFallback />}><PortalBriefings /></Suspense>} />
                <Route path="/portal/insights"           element={<Suspense fallback={<PageFallback />}><ClientInsights /></Suspense>} />
                <Route path="/portal/insights/sentiment" element={<Suspense fallback={<PageFallback />}><PortalSentiment /></Suspense>} />
                <Route path="/portal/insights/media"     element={<Suspense fallback={<PageFallback />}><PortalMedia /></Suspense>} />
                <Route path="/portal/insights/brand"     element={<Suspense fallback={<PageFallback />}><PortalBrandScorecard /></Suspense>} />
              </Route>

              {/* ── Fallback ────────────────────────────────────────────── */}
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="*"             element={<NotFound />} />

            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
