# LBD-SIP Command Centre

> **Strategic Intelligence Platform** — Secure, role-gated advisory workspace for managing complex client engagements across intelligence, strategy, and communications.

---

## Overview

LBD-SIP is a dark-mode enterprise React application used by advisory teams to:

- **Monitor intelligence** — stakeholder power maps, competitor tracking, geospatial data, scenario modelling
- **Execute strategy** — narrative frameworks, comms planning, content calendars, crisis protocols
- **Manage engagements** — client onboarding, cadence tracking, reporting and deliverables
- **Client portal** — curated read-only view for client principals with reports and insights

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Routing | React Router v6 (nested layout routes) |
| State | Zustand (auth store) + React Context (engagement) |
| Backend | Supabase (PostgreSQL, Auth, RLS, Edge Functions) |
| UI | Tailwind CSS + shadcn/ui + LBD Design System |
| Data fetching | TanStack Query v5 |
| Auth | Supabase Auth — PKCE flow, TOTP MFA, recovery codes |
| Icons | Lucide React |

---

## Architecture

### Routing Structure

```
/                           → redirect to /login
/login                      → LoginPage (public)
/auth/mfa-setup             → MFASetupPage (post-login, public)
/auth/mfa-verify            → MFAVerifyPage (post-login, public)
/auth/reset-password        → PasswordResetPage (public)

── Internal Portal ─────────────────────────────────────────────
[ProtectedRoute: INTERNAL_ROLES, MFA required]
  [EngagementProvider]
    [AppShell: sidebar + header + outlet]
      /dashboard                  → DashboardRouter (role-specific)
      /engagements                → EngagementList
      /engagements/:id            → EngagementWorkspace
        /onboarding               → OnboardingPage
        /power-map                → PowerMapPage
        /intel-tracker            → IntelTrackerPage
        /competitors              → CompetitorsPage
        /geospatial               → GeospatialPage
        /narrative                → NarrativePage
        /scenarios                → ScenariosPage
        /brand-audit              → BrandAuditPage
        /comms-planner            → CommsPlannerPage
        /content-calendar         → ContentCalendarPage
        /crisis                   → CrisisPage
        /cadence                  → CadencePage
        /reports                  → ReportsPage
      [ProtectedRoute: super_admin only]
        /admin                    → AdminPanelPage
        /admin/users              → UserManagementPage
        /admin/portal-access      → PortalAccessPage
        /admin/integrations       → IntegrationsPage

── Client Portal ───────────────────────────────────────────────
[ProtectedRoute: client_principal, MFA optional]
  [AppShell]
    /portal                       → ClientDashboard
    /portal/reports               → ClientReports
    /portal/insights              → ClientInsights

── Fallback ─────────────────────────────────────────────────────
/unauthorized                     → Unauthorized
*                                 → NotFound
```

### AppShell Layout

```
┌─────────────────────────────────────────────────────┐
│  LBDSidebar (60px collapsed / 220px expanded)       │
│  ┌───────────────────────────────────────────────┐  │
│  │ Header (64px) — Selector | Bell | User Avatar │  │
│  ├───────────────────────────────────────────────┤  │
│  │                                               │  │
│  │  <Outlet /> — main scrollable content         │  │
│  │                                               │  │
│  └───────────────────────────────────────────────┘  │
│                                    [NotifPanel]     │
└─────────────────────────────────────────────────────┘
```

### Auth Flow

```
Login (email + password)
  → Supabase Auth (PKCE)
  → Role fetched from profiles table
  → If MFA enrolled → /auth/mfa-verify
  → If MFA not enrolled (internal role) → /auth/mfa-setup
  → Success → /dashboard or /portal
```

---

## Role Reference

| Role | Access Level | Modules |
|------|-------------|---------|
| `super_admin` | Full platform | All modules + Admin panel |
| `lead_advisor` | Full engagement | All modules except Admin |
| `senior_advisor` | Engagement-scoped | Intel, Strategy, Brand, Reports |
| `comms_director` | Comms-focused | Narrative, Comms, Content Calendar, Crisis |
| `intel_analyst` | Intel-focused | Power Map, Intel Tracker, Competitors, Geospatial, Scenarios |
| `digital_strategist` | Digital execution | Content Calendar, Comms Planner, Intel Feed |
| `client_principal` | Portal only | Dashboard, Reports, Insights |

---

## Environment Variables

Create a `.env` file in the project root (never commit this file):

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon/publishable key |
| `VITE_SUPABASE_PROJECT_ID` | Yes | Supabase project ID |

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_SUPABASE_PROJECT_ID=your-project-id
```

---

## Setup

### Prerequisites

- Node.js 20+
- npm 10+
- Access to the Supabase project

### Installation

```bash
# Clone the repo
git clone <repo-url>
cd command-center-main

# Install dependencies
npm install

# Copy environment template and fill in credentials
cp .env.example .env

# Start development server
npm run dev
# App runs at http://localhost:8080
```

### Supabase Setup

The database schema is managed via migrations in `supabase/migrations/`:

| Migration | Description |
|-----------|-------------|
| `20260301222609_*.sql` | Initial schema — 20 tables, ENUMs, triggers, 7 roles seeded |
| `20260302000000_rls_policies.sql` | Comprehensive RLS policies, 3 security views, audit triggers |
| `20260302010000_mfa_recovery_codes.sql` | `recovery_codes` JSONB column on `profiles` |

Apply migrations:
```bash
supabase db push
```

---

## Development Guide

### File Structure

```
src/
├── App.tsx                         # Root router — all route definitions
├── contexts/
│   └── EngagementContext.tsx       # Active engagement state + provider
├── layouts/
│   └── AppShell.tsx                # Persistent shell (sidebar + header + outlet)
├── components/
│   ├── auth/
│   │   └── ProtectedRoute.tsx      # Auth + role guard (wrapper & layout patterns)
│   ├── shell/
│   │   ├── EngagementSelector.tsx  # Header engagement dropdown
│   │   └── NotificationPanel.tsx  # Right slide-in notification panel
│   └── ui/lbd/                     # LBD Design System components
│       ├── LBDSidebar.tsx          # Role-aware nav sidebar with engagement links
│       ├── LBDCard.tsx
│       ├── LBDBadge.tsx
│       ├── LBDPageHeader.tsx
│       └── ...
├── pages/
│   ├── auth/                       # Login, MFA setup/verify, reset
│   ├── dashboard/
│   │   └── DashboardRouter.tsx     # Role-specific dashboard content
│   ├── engagements/
│   │   ├── EngagementList.tsx
│   │   ├── EngagementWorkspace.tsx # Sets active engagement, renders module tabs
│   │   └── modules/               # 13 module pages (stubs, ready for implementation)
│   ├── admin/                      # 4 admin pages (super_admin only)
│   └── portal/                     # 3 client portal pages
├── hooks/
│   └── useAuth.ts                  # Login, logout, MFA enroll/verify, recovery codes
├── stores/
│   └── authStore.ts                # Zustand: user, role, MFA state, session
├── lib/
│   └── supabase.ts                 # Supabase re-export, ROLE_DASHBOARDS, constants
└── integrations/supabase/          # Auto-generated client + TypeScript types
```

### Adding a New Module

1. Create `src/pages/engagements/modules/YourModulePage.tsx`:

```tsx
import { useParams } from 'react-router-dom';
import { YourIcon } from 'lucide-react';
import { LBDPageHeader, LBDEmptyState } from '@/components/ui/lbd';

export default function YourModulePage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="p-6">
      <LBDPageHeader eyebrow="SECTION" title="Module Name" description="..." />
      <LBDEmptyState icon={<YourIcon className="w-8 h-8" />} title="..." description="..." />
    </div>
  );
}
```

2. Add the route to `App.tsx` inside the `<Route path="/engagements/:id">` block
3. Add the tab to `EngagementWorkspace.tsx` in the `moduleTabs` array with allowed roles
4. Add nav items to `LBDSidebar.tsx` in the `roleNav` map using `modulePath: 'your-path'`

### Design System

All design components exported from `@/components/ui/lbd`:

```tsx
import {
  LBDCard,            // Base card container with border
  LBDBadge,           // Status badges: red | amber | green | outline
  LBDStatCard,        // Metric cards with trend indicators
  LBDPageHeader,      // Section header: eyebrow + title + description + actions
  LBDDataTable,       // Sortable, filterable data table
  LBDEmptyState,      // Empty state: icon + title + description
  LBDLoadingSkeleton, // Shimmer loading placeholder
  LBDAlert,           // Info / warning / error alert banners
  LBDModal,           // Modal dialog
  LBDDrawer,          // Slide-in drawer panel
  toast,              // Toast notifications
} from '@/components/ui/lbd';
```

**Design tokens (dark-only theme):**

| Token | Value | Usage |
|-------|-------|-------|
| `bg-background` | `#0A0A0F` | Page background |
| `bg-card` | `#111118` | Card / sidebar background |
| `text-accent` / `bg-accent` | `#C9A84C` | Gold accent (brand colour) |
| `text-muted-foreground` | — | Secondary text |
| `border-border` | — | Dividers and card borders |
| `text-destructive` | — | Error / urgent states |
| Font (UI) | Inter | Body and labels |
| Font (mono) | Source Code Pro | Eyebrows, labels, codes |

---

## Security

### Row-Level Security (RLS)

All 20 database tables have RLS enabled. Policies enforce:

- **Internal staff** access only their assigned engagements via `get_user_engagement_ids()`
- **super_admin** has full unrestricted access
- **client_principal** sees sanitised views only:
  - `intel_items_portal` — redacts source and confidence fields
  - `competitor_profiles_safe` — redacts raw intelligence data
  - `narrative_platform_safe` — approved content read-only

### MFA Requirements

- All internal staff roles require TOTP MFA before accessing the platform
- `client_principal` — MFA optional
- Recovery codes: SHA-256 hashed, stored as JSONB in `profiles.recovery_codes`

### Session Management

- Session duration: 8 hours
- Inactivity timeout: 30 minutes
- Login rate limiting: 5 attempts then 15-minute lockout
- All auth events written to `audit_logs` table

### Audit Logging

The `audit_sensitive_tables()` trigger fires on INSERT/UPDATE/DELETE on 12 sensitive tables, capturing `user_id`, `action`, `table_name`, `record_id`, old/new data snapshots, and request metadata.

---

## Deployment

```bash
# Build for production
npm run build

# Preview production bundle locally
npm run preview
```

Ensure the following in your hosting environment:

1. All `VITE_*` environment variables are set
2. Supabase Auth redirect URLs include your production domain
3. PKCE flow is enabled in Supabase Auth settings
4. TOTP MFA is enabled in Supabase Auth → MFA settings
5. Site URL is configured in Supabase Auth → URL Configuration

---

## Licence

Proprietary — LBD Strategic Advisory. All rights reserved.
