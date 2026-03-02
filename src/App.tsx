import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from '@/providers/AuthProvider';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

// Auth pages
import LoginPage from '@/pages/auth/LoginPage';
import MFASetupPage from '@/pages/auth/MFASetupPage';
import MFAVerifyPage from '@/pages/auth/MFAVerifyPage';
import PasswordResetPage from '@/pages/auth/PasswordResetPage';

// Role dashboards
import AdminDashboard from '@/pages/dashboards/AdminDashboard';
import AdvisorDashboard from '@/pages/dashboards/AdvisorDashboard';
import SeniorDashboard from '@/pages/dashboards/SeniorDashboard';
import CommsDashboard from '@/pages/dashboards/CommsDashboard';
import IntelDashboard from '@/pages/dashboards/IntelDashboard';
import DigitalDashboard from '@/pages/dashboards/DigitalDashboard';
import PortalDashboard from '@/pages/dashboards/PortalDashboard';

// Legacy / fallback
import Unauthorized from '@/pages/Unauthorized';
import NotFound from '@/pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

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
              {/* ── Public auth routes ──────────────────────────────── */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/auth/login" element={<Navigate to="/login" replace />} />
              <Route path="/auth/mfa-setup" element={<MFASetupPage />} />
              <Route path="/auth/mfa-verify" element={<MFAVerifyPage />} />
              <Route path="/auth/reset-password" element={<PasswordResetPage />} />

              {/* ── Root redirect ───────────────────────────────────── */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    {/* Redirect based on role is handled by AuthProvider post-login */}
                    <Navigate to="/login" replace />
                  </ProtectedRoute>
                }
              />

              {/* ── Role-gated dashboards ───────────────────────────── */}
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/advisor/*"
                element={
                  <ProtectedRoute allowedRoles={['lead_advisor']}>
                    <AdvisorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/senior/*"
                element={
                  <ProtectedRoute allowedRoles={['senior_advisor']}>
                    <SeniorDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/comms/*"
                element={
                  <ProtectedRoute allowedRoles={['comms_director']}>
                    <CommsDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/intel/*"
                element={
                  <ProtectedRoute allowedRoles={['intel_analyst']}>
                    <IntelDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/digital/*"
                element={
                  <ProtectedRoute allowedRoles={['digital_strategist']}>
                    <DigitalDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/portal/*"
                element={
                  <ProtectedRoute
                    allowedRoles={['client_principal']}
                    requireMfa={false}  // MFA optional for client_principal
                  >
                    <PortalDashboard />
                  </ProtectedRoute>
                }
              />

              {/* ── Fallback ────────────────────────────────────────── */}
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
