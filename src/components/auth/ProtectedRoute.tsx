/**
 * ProtectedRoute
 *
 * Guards a route (or layout route) behind authentication + optional role
 * and MFA checks.
 *
 * Supports two usage patterns:
 *
 * 1. **Wrapper pattern** (classic, wraps children directly):
 *    ```tsx
 *    <Route path="/admin" element={
 *      <ProtectedRoute allowedRoles={['super_admin']}>
 *        <AdminPage />
 *      </ProtectedRoute>
 *    } />
 *    ```
 *
 * 2. **Layout route pattern** (no children — renders <Outlet /> instead):
 *    ```tsx
 *    <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
 *      <Route path="/admin" element={<AdminPage />} />
 *      <Route path="/admin/users" element={<UsersPage />} />
 *    </Route>
 *    ```
 *
 * @param children      - Child elements to render. If omitted, renders <Outlet />.
 * @param allowedRoles  - Roles permitted to access this route. If omitted, any
 *                        authenticated user is allowed.
 * @param requireMfa    - If true (default), route also requires MFA verification
 *                        (aal2 level). Set to false for client_principal routes.
 */

import { type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { useAuthStore, type AppRole } from '@/stores/authStore';

interface ProtectedRouteProps {
  children?: ReactNode;
  /** If provided, user's role must be in this list — else 403 screen */
  allowedRoles?: AppRole[];
  /** If true, route also requires MFA to be verified (aal2) — default: true */
  requireMfa?: boolean;
}

/* ─────────────────────────────────────────────
   Inner screens
───────────────────────────────────────────── */

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-2 border-border" />
          <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-2 border-transparent border-t-accent" />
        </div>
        <div className="text-center">
          <p className="font-mono text-xs tracking-[0.3em] text-accent animate-pulse-gold">
            AUTHENTICATING
          </p>
          <p className="text-xs text-muted-foreground mt-1">Verifying credentials...</p>
        </div>
      </div>
    </div>
  );
}

function ForbiddenScreen({ role }: { role: AppRole | null }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-card border border-destructive/30 mb-6">
          <ShieldX className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
        <p className="text-sm text-muted-foreground mb-1">
          Your role{' '}
          {role && (
            <span className="font-mono text-accent px-1.5 py-0.5 bg-card rounded text-xs">
              {role}
            </span>
          )}{' '}
          does not have permission to access this section.
        </p>
        <p className="text-xs text-muted-foreground mt-4">
          Contact your administrator if you believe this is an error.
        </p>
        <a
          href="/dashboard"
          className="inline-block mt-6 px-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground hover:border-accent transition-colors"
        >
          Return to Dashboard
        </a>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */

export default function ProtectedRoute({
  children,
  allowedRoles,
  requireMfa = true,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, role, mfaVerified, mfaRequired } = useAuthStore();
  const location = useLocation();

  // Still initialising auth state
  if (isLoading) return <LoadingScreen />;

  // Not logged in → redirect to login, preserve intended destination
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in but MFA not yet verified and route requires it
  if (requireMfa && mfaRequired && !mfaVerified) {
    return <Navigate to="/auth/mfa-verify" replace />;
  }

  // Role check
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <ForbiddenScreen role={role} />;
  }

  // Layout route pattern: no children → render nested routes via Outlet
  if (children === undefined) {
    return <Outlet />;
  }

  return <>{children}</>;
}
