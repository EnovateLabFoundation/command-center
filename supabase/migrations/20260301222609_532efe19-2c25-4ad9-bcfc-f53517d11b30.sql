
-- ============================================================
-- LBD-SIP Complete Schema
-- CONFIDENTIAL — Lead by Darth Strategic Intelligence Platform
-- ============================================================

-- 1. ENUMS
CREATE TYPE public.app_role AS ENUM (
  'super_admin', 'lead_advisor', 'senior_advisor', 'comms_director',
  'intel_analyst', 'digital_strategist', 'client_principal'
);

CREATE TYPE public.engagement_status AS ENUM ('active', 'paused', 'closed');
CREATE TYPE public.engagement_phase AS ENUM ('1', '2', '3', '4');
CREATE TYPE public.health_rag AS ENUM ('red', 'amber', 'green');
CREATE TYPE public.client_type AS ENUM ('legislator', 'governor', 'ministry', 'civic', 'party');
CREATE TYPE public.stakeholder_category AS ENUM ('government', 'media', 'civil_society', 'business', 'traditional', 'international');
CREATE TYPE public.stakeholder_alignment AS ENUM ('hostile', 'neutral', 'supportive', 'champion');
CREATE TYPE public.strategic_priority AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE public.source_type AS ENUM ('print', 'digital', 'broadcast', 'social');
CREATE TYPE public.action_status AS ENUM ('pending', 'in_progress', 'done', 'monitor_only');
CREATE TYPE public.scenario_probability AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.scenario_status AS ENUM ('active', 'watching', 'triggered', 'resolved');
CREATE TYPE public.initiative_status AS ENUM ('not_started', 'in_progress', 'complete', 'overdue');
CREATE TYPE public.content_status AS ENUM ('draft', 'approved', 'scheduled', 'published', 'archived');
CREATE TYPE public.touchpoint_type AS ENUM ('intel_briefing', 'strategic_checkin', 'monthly_assessment', 'quarterly_review', 'emergency_advisory');
CREATE TYPE public.touchpoint_status AS ENUM ('scheduled', 'completed', 'cancelled', 'rescheduled');
CREATE TYPE public.crisis_event_status AS ENUM ('active', 'resolved', 'monitoring');
CREATE TYPE public.audit_action AS ENUM ('create', 'read', 'update', 'delete', 'login', 'logout', 'export');

-- 2. HELPER: updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================
-- CORE TABLES
-- ============================================================

-- ROLES
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name app_role NOT NULL UNIQUE,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- PROFILES (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role_id UUID REFERENCES public.roles(id),
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login TIMESTAMPTZ,
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- USER_ROLES (security-critical separate table)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'client_principal',
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- SECURITY DEFINER: role check (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- CLIENTS
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type client_type NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  phone TEXT,
  brief_description TEXT,
  nda_signed BOOLEAN NOT NULL DEFAULT false,
  nda_document_url TEXT,
  conflict_check_passed BOOLEAN NOT NULL DEFAULT false,
  qualification_status TEXT DEFAULT 'pending',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_clients_type ON public.clients(type);
CREATE INDEX idx_clients_created_by ON public.clients(created_by);
CREATE TRIGGER set_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ENGAGEMENTS
CREATE TABLE public.engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  status engagement_status NOT NULL DEFAULT 'active',
  phase engagement_phase NOT NULL DEFAULT '1',
  lead_advisor_id UUID REFERENCES auth.users(id),
  start_date DATE,
  end_date DATE,
  fee_amount NUMERIC(15,2),
  billing_status TEXT DEFAULT 'pending',
  health_rag health_rag DEFAULT 'green',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.engagements ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_engagements_client_id ON public.engagements(client_id);
CREATE INDEX idx_engagements_status ON public.engagements(status);
CREATE INDEX idx_engagements_lead_advisor ON public.engagements(lead_advisor_id);
CREATE TRIGGER set_engagements_updated_at BEFORE UPDATE ON public.engagements FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- INTELLIGENCE TABLES
-- ============================================================

-- STAKEHOLDERS
CREATE TABLE public.stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role_position TEXT,
  category stakeholder_category NOT NULL,
  influence_score INTEGER CHECK (influence_score >= 1 AND influence_score <= 10),
  alignment stakeholder_alignment DEFAULT 'neutral',
  strategic_priority strategic_priority DEFAULT 'medium',
  relationship_owner_id UUID REFERENCES auth.users(id),
  last_contact_date DATE,
  contact_frequency TEXT,
  risk_level TEXT,
  strategic_notes TEXT,
  engagement_strategy TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.stakeholders ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_stakeholders_engagement ON public.stakeholders(engagement_id);
CREATE INDEX idx_stakeholders_category ON public.stakeholders(category);
CREATE INDEX idx_stakeholders_alignment ON public.stakeholders(alignment);
CREATE TRIGGER set_stakeholders_updated_at BEFORE UPDATE ON public.stakeholders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- INTEL ITEMS
CREATE TABLE public.intel_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  date_logged DATE NOT NULL DEFAULT CURRENT_DATE,
  source_name TEXT,
  source_type source_type,
  headline TEXT NOT NULL,
  summary TEXT,
  sentiment_score NUMERIC(3,1) CHECK (sentiment_score >= -2 AND sentiment_score <= 2),
  reach_tier INTEGER CHECK (reach_tier >= 1 AND reach_tier <= 3),
  narrative_theme TEXT,
  action_required BOOLEAN NOT NULL DEFAULT false,
  action_status action_status DEFAULT 'monitor_only',
  is_urgent BOOLEAN NOT NULL DEFAULT false,
  is_escalated BOOLEAN NOT NULL DEFAULT false,
  platform TEXT,
  url TEXT,
  raw_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.intel_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_intel_items_engagement ON public.intel_items(engagement_id);
CREATE INDEX idx_intel_items_date ON public.intel_items(date_logged DESC);
CREATE INDEX idx_intel_items_urgent ON public.intel_items(is_urgent) WHERE is_urgent = true;
CREATE INDEX idx_intel_items_sentiment ON public.intel_items(sentiment_score);
CREATE TRIGGER set_intel_items_updated_at BEFORE UPDATE ON public.intel_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- COMPETITOR PROFILES
CREATE TABLE public.competitor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role_position TEXT,
  party_affiliation TEXT,
  constituency TEXT,
  biography TEXT,
  influence_score INTEGER CHECK (influence_score >= 1 AND influence_score <= 10),
  threat_score INTEGER CHECK (threat_score >= 1 AND threat_score <= 10),
  twitter_handle TEXT,
  facebook_page TEXT,
  instagram_handle TEXT,
  youtube_channel TEXT,
  twitter_followers INTEGER DEFAULT 0,
  facebook_likes INTEGER DEFAULT 0,
  instagram_followers INTEGER DEFAULT 0,
  youtube_subscribers INTEGER DEFAULT 0,
  monthly_media_mentions INTEGER DEFAULT 0,
  avg_sentiment_score NUMERIC(3,1),
  key_messages JSONB DEFAULT '[]'::jsonb,
  vulnerabilities JSONB DEFAULT '[]'::jsonb,
  alliance_map JSONB DEFAULT '{}'::jsonb,
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.competitor_profiles ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_competitor_profiles_engagement ON public.competitor_profiles(engagement_id);
CREATE TRIGGER set_competitor_profiles_updated_at BEFORE UPDATE ON public.competitor_profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- STRATEGY TABLES
-- ============================================================

-- SCENARIOS
CREATE TABLE public.scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_driver TEXT,
  probability scenario_probability DEFAULT 'medium',
  impact_score INTEGER CHECK (impact_score >= 1 AND impact_score <= 10),
  time_horizon_months INTEGER,
  trigger_events JSONB DEFAULT '[]'::jsonb,
  strategic_response TEXT,
  key_risks TEXT,
  key_opportunities TEXT,
  status scenario_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_scenarios_engagement ON public.scenarios(engagement_id);
CREATE INDEX idx_scenarios_status ON public.scenarios(status);
CREATE TRIGGER set_scenarios_updated_at BEFORE UPDATE ON public.scenarios FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- NARRATIVE PLATFORM
CREATE TABLE public.narrative_platform (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  master_narrative TEXT,
  defining_purpose TEXT,
  leadership_promise TEXT,
  core_values_in_action TEXT,
  voice_tone_guide TEXT,
  what_we_never_say TEXT,
  crisis_anchor_message TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.narrative_platform ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_narrative_platform_engagement ON public.narrative_platform(engagement_id);
CREATE TRIGGER set_narrative_platform_updated_at BEFORE UPDATE ON public.narrative_platform FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- NARRATIVE AUDIENCE MATRIX
CREATE TABLE public.narrative_audience_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  narrative_platform_id UUID NOT NULL REFERENCES public.narrative_platform(id) ON DELETE CASCADE,
  audience_segment TEXT NOT NULL,
  key_message TEXT,
  proof_points JSONB DEFAULT '[]'::jsonb,
  tone_calibration TEXT,
  call_to_action TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.narrative_audience_matrix ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_narrative_audience_platform ON public.narrative_audience_matrix(narrative_platform_id);
CREATE TRIGGER set_narrative_audience_matrix_updated_at BEFORE UPDATE ON public.narrative_audience_matrix FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- BRAND AUDIT
CREATE TABLE public.brand_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  audit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  overall_score NUMERIC(4,1),
  target_score NUMERIC(4,1),
  scores JSONB DEFAULT '{}'::jsonb,
  repositioning_roadmap JSONB DEFAULT '[]'::jsonb,
  priority_actions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.brand_audit ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_brand_audit_engagement ON public.brand_audit(engagement_id);
CREATE TRIGGER set_brand_audit_updated_at BEFORE UPDATE ON public.brand_audit FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- EXECUTION TABLES
-- ============================================================

-- COMMS INITIATIVES
CREATE TABLE public.comms_initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  policy_area TEXT,
  communication_phase TEXT,
  target_audience TEXT,
  key_message TEXT,
  primary_channel TEXT,
  responsible_id UUID REFERENCES auth.users(id),
  launch_date DATE,
  status initiative_status NOT NULL DEFAULT 'not_started',
  success_metric TEXT,
  actual_result TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.comms_initiatives ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_comms_initiatives_engagement ON public.comms_initiatives(engagement_id);
CREATE INDEX idx_comms_initiatives_status ON public.comms_initiatives(status);
CREATE TRIGGER set_comms_initiatives_updated_at BEFORE UPDATE ON public.comms_initiatives FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- CONTENT ITEMS
CREATE TABLE public.content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_brief TEXT,
  content_body TEXT,
  platform TEXT,
  scheduled_date TIMESTAMPTZ,
  published_date TIMESTAMPTZ,
  status content_status NOT NULL DEFAULT 'draft',
  approval_stage TEXT,
  approved_by UUID REFERENCES auth.users(id),
  engagement_metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_content_items_engagement ON public.content_items(engagement_id);
CREATE INDEX idx_content_items_status ON public.content_items(status);
CREATE INDEX idx_content_items_scheduled ON public.content_items(scheduled_date);
CREATE TRIGGER set_content_items_updated_at BEFORE UPDATE ON public.content_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- CADENCE TOUCHPOINTS
CREATE TABLE public.cadence_touchpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  touchpoint_type touchpoint_type NOT NULL,
  scheduled_date TIMESTAMPTZ NOT NULL,
  completed_date TIMESTAMPTZ,
  led_by_id UUID REFERENCES auth.users(id),
  notes TEXT,
  action_items JSONB DEFAULT '[]'::jsonb,
  status touchpoint_status NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.cadence_touchpoints ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_cadence_touchpoints_engagement ON public.cadence_touchpoints(engagement_id);
CREATE INDEX idx_cadence_touchpoints_scheduled ON public.cadence_touchpoints(scheduled_date);
CREATE INDEX idx_cadence_touchpoints_type ON public.cadence_touchpoints(touchpoint_type);
CREATE TRIGGER set_cadence_touchpoints_updated_at BEFORE UPDATE ON public.cadence_touchpoints FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- CRISIS TABLES
-- ============================================================

-- CRISIS TYPES
CREATE TABLE public.crisis_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  crisis_type_name TEXT NOT NULL,
  severity INTEGER CHECK (severity >= 1 AND severity <= 10),
  velocity_hours INTEGER,
  public_visibility TEXT,
  political_risk TEXT,
  first_response_command TEXT,
  immediate_actions JSONB DEFAULT '[]'::jsonb,
  short_term_actions JSONB DEFAULT '[]'::jsonb,
  narrative_control_objective TEXT,
  recovery_timeline TEXT,
  holding_statement_draft TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.crisis_types ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_crisis_types_engagement ON public.crisis_types(engagement_id);
CREATE TRIGGER set_crisis_types_updated_at BEFORE UPDATE ON public.crisis_types FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- CRISIS EVENTS
CREATE TABLE public.crisis_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  crisis_type_id UUID NOT NULL REFERENCES public.crisis_types(id) ON DELETE RESTRICT,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  status crisis_event_status NOT NULL DEFAULT 'active',
  activation_notes TEXT,
  checklist_items JSONB DEFAULT '[]'::jsonb,
  communications_log JSONB DEFAULT '[]'::jsonb,
  debrief_notes TEXT,
  sentiment_before NUMERIC(3,1),
  sentiment_after NUMERIC(3,1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.crisis_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_crisis_events_engagement ON public.crisis_events(engagement_id);
CREATE INDEX idx_crisis_events_type ON public.crisis_events(crisis_type_id);
CREATE INDEX idx_crisis_events_status ON public.crisis_events(status);
CREATE TRIGGER set_crisis_events_updated_at BEFORE UPDATE ON public.crisis_events FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- ADMIN TABLES
-- ============================================================

-- AUDIT LOGS (immutable)
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action audit_action NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_table ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

-- INTEGRATION CONFIGS
CREATE TABLE public.integration_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_name TEXT NOT NULL,
  api_key_encrypted TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'never',
  error_log TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.integration_configs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_integration_configs_updated_at BEFORE UPDATE ON public.integration_configs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- CLIENT PORTAL ACCESS
CREATE TABLE public.client_portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  allowed_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.client_portal_access ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_portal_access_user ON public.client_portal_access(user_id);
CREATE INDEX idx_portal_access_engagement ON public.client_portal_access(engagement_id);
CREATE TRIGGER set_client_portal_access_updated_at BEFORE UPDATE ON public.client_portal_access FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- ROLES: readable by all authenticated
CREATE POLICY "Authenticated can read roles" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage roles" ON public.roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- USER_ROLES
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can manage user roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- PROFILES
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- CLIENTS: staff can read, admin/lead can write
CREATE POLICY "Staff can view clients" ON public.clients FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'lead_advisor') OR public.has_role(auth.uid(), 'senior_advisor') OR public.has_role(auth.uid(), 'intel_analyst') OR public.has_role(auth.uid(), 'comms_director') OR public.has_role(auth.uid(), 'digital_strategist'));
CREATE POLICY "Leads can create clients" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'lead_advisor'));
CREATE POLICY "Leads can update clients" ON public.clients FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'lead_advisor'));

-- ENGAGEMENTS: staff can read, admin/lead can write
CREATE POLICY "Staff can view engagements" ON public.engagements FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'lead_advisor') OR public.has_role(auth.uid(), 'senior_advisor') OR public.has_role(auth.uid(), 'intel_analyst') OR public.has_role(auth.uid(), 'comms_director') OR public.has_role(auth.uid(), 'digital_strategist'));
CREATE POLICY "Leads can create engagements" ON public.engagements FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'lead_advisor'));
CREATE POLICY "Leads can update engagements" ON public.engagements FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'lead_advisor'));

-- INTELLIGENCE TABLES: staff read/write, restricted by role
CREATE POLICY "Staff can view stakeholders" ON public.stakeholders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'lead_advisor') OR public.has_role(auth.uid(), 'senior_advisor') OR public.has_role(auth.uid(), 'intel_analyst'));
CREATE POLICY "Analysts can manage stakeholders" ON public.stakeholders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'lead_advisor') OR public.has_role(auth.uid(), 'intel_analyst'));

CREATE POLICY "Staff can view intel items" ON public.intel_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'lead_advisor') OR public.has_role(auth.uid(), 'senior_advisor') OR public.has_role(auth.uid(), 'intel_analyst') OR public.has_role(auth.uid(), 'comms_director'));
CREATE POLICY "Analysts can manage intel items" ON public.intel_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'intel_analyst'));

CREATE POLICY "Staff can view competitors" ON public.competitor_profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'lead_advisor') OR public.has_role(auth.uid(), 'senior_advisor') OR public.has_role(auth.uid(), 'intel_analyst'));
CREATE POLICY "Analysts can manage competitors" ON public.competitor_profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'intel_analyst'));

-- STRATEGY TABLES
CREATE POLICY "Staff can view scenarios" ON public.scenarios FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'lead_advisor') OR public.has_role(auth.uid(), 'senior_advisor'));
CREATE POLICY "Advisors can manage scenarios" ON public.scenarios FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'lead_advisor') OR public.has_role(auth.uid(), 'senior_advisor'));

CREATE POLICY "Staff can view narrative platform" ON public.narrative_platform FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'lead_advisor') OR public.has_role(auth.uid(), 'senior_advisor') OR public.has_role(auth.uid(), 'comms_director'));
CREATE POLICY "Comms can manage narrative" ON public.narrative_platform FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'lead_advisor') OR public.has_role(auth.uid(), 'comms_director'));

CREATE POLICY "Staff can view audience matrix" ON public.narrative_audience_matrix FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'lead_advisor') OR public.has_role(auth.uid(), 'comms_director'));
CREATE POLICY "Comms can manage audience matrix" ON public.narrative_audience_matrix FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'comms_director'));

CREATE POLICY "Staff can view brand audit" ON public.brand_audit FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'lead_advisor') OR public.has_role(auth.uid(), 'senior_advisor') OR public.has_role(auth.uid(), 'comms_director'));
CREATE POLICY "Advisors can manage brand audit" ON public.brand_audit FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'lead_advisor'));

-- EXECUTION TABLES
CREATE POLICY "Staff can view comms initiatives" ON public.comms_initiatives FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'lead_advisor') OR public.has_role(auth.uid(), 'comms_director') OR public.has_role(auth.uid(), 'digital_strategist'));
CREATE POLICY "Comms can manage initiatives" ON public.comms_initiatives FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'comms_director'));

CREATE POLICY "Staff can view content items" ON public.content_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'lead_advisor') OR public.has_role(auth.uid(), 'comms_director') OR public.has_role(auth.uid(), 'digital_strategist'));
CREATE POLICY "Digital can manage content" ON public.content_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'comms_director') OR public.has_role(auth.uid(), 'digital_strategist'));

CREATE POLICY "Staff can view touchpoints" ON public.cadence_touchpoints FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'lead_advisor') OR public.has_role(auth.uid(), 'senior_advisor'));
CREATE POLICY "Leads can manage touchpoints" ON public.cadence_touchpoints FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'lead_advisor'));

-- CRISIS TABLES
CREATE POLICY "Staff can view crisis types" ON public.crisis_types FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'lead_advisor') OR public.has_role(auth.uid(), 'senior_advisor') OR public.has_role(auth.uid(), 'comms_director'));
CREATE POLICY "Advisors can manage crisis types" ON public.crisis_types FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'lead_advisor'));

CREATE POLICY "Staff can view crisis events" ON public.crisis_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'lead_advisor') OR public.has_role(auth.uid(), 'senior_advisor') OR public.has_role(auth.uid(), 'comms_director'));
CREATE POLICY "Advisors can manage crisis events" ON public.crisis_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'lead_advisor'));

-- ADMIN TABLES
CREATE POLICY "Auth users can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can manage integrations" ON public.integration_configs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view own portal access" ON public.client_portal_access FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage portal access" ON public.client_portal_access FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'lead_advisor'));

-- ============================================================
-- SEED DEFAULT ROLES
-- ============================================================
INSERT INTO public.roles (name, permissions) VALUES
  ('super_admin', '{"all": true}'::jsonb),
  ('lead_advisor', '{"engagements": ["create","read","update"], "clients": ["create","read","update"], "intel": ["read"], "strategy": ["create","read","update"], "crisis": ["create","read","update"]}'::jsonb),
  ('senior_advisor', '{"engagements": ["read","update"], "clients": ["read"], "intel": ["read"], "strategy": ["create","read","update"], "crisis": ["read"]}'::jsonb),
  ('comms_director', '{"engagements": ["read"], "content": ["create","read","update","delete"], "narrative": ["create","read","update"], "crisis": ["read","update"]}'::jsonb),
  ('intel_analyst', '{"engagements": ["read"], "intel": ["create","read","update","delete"], "stakeholders": ["create","read","update"], "competitors": ["create","read","update"]}'::jsonb),
  ('digital_strategist', '{"engagements": ["read"], "content": ["create","read","update"], "comms": ["read"]}'::jsonb),
  ('client_principal', '{"portal": ["read"]}'::jsonb);
