-- ============================================================
-- LBD-SIP Schema Reference (schema.sql)
-- CONFIDENTIAL — Lead by Darth Strategic Intelligence Platform
-- This file is a REFERENCE for Supabase migrations.
-- Apply via Supabase migrations once Cloud is enabled.
-- ============================================================

-- 1. ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'analyst', 'client', 'viewer');
CREATE TYPE public.engagement_status AS ENUM ('draft', 'active', 'paused', 'completed', 'archived');
CREATE TYPE public.audit_action AS ENUM ('create', 'read', 'update', 'delete', 'login', 'logout', 'export');

-- 2. PROFILES (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 3. USER ROLES (separate table — CRITICAL for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'viewer',
  granted_at TIMESTAMPTZ DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- 4. CLIENTS
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  organization TEXT,
  sector TEXT,
  state TEXT,
  lga TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 5. ENGAGEMENTS
CREATE TABLE public.engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  status engagement_status DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  budget NUMERIC(15,2),
  objectives JSONB DEFAULT '[]'::jsonb,
  key_contacts JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}',
  is_confidential BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 6. AUDIT LOGS (immutable)
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action audit_action NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. INDEXES
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_clients_created_by ON public.clients(created_by);
CREATE INDEX idx_engagements_client_id ON public.engagements(client_id);
CREATE INDEX idx_engagements_status ON public.engagements(status);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_table ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- 8. UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_engagements_updated_at
  BEFORE UPDATE ON public.engagements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
