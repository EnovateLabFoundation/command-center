-- ============================================================
-- LBD-SIP Comprehensive Row Level Security Policies
-- Migration: 20260302000000_rls_policies
-- CONFIDENTIAL — Lead by Darth Strategic Intelligence Platform
-- ============================================================
-- This migration REPLACES the basic policies in the schema migration.
-- Full SECURITY ARCHITECTURE:
--   super_admin         → full access, all tables, all rows
--   lead_advisor        → own engagements (lead_advisor_id) + children
--   senior_advisor      → read/write intel + strategy on all active engagements
--   comms_director      → read/write narrative, comms, content on all active engagements
--   intel_analyst       → read/write intel tables; READ ONLY on strategy
--   digital_strategist  → read/write content + comms; read intel + narrative
--   client_principal    → portal-granted engagements only; NEVER sees restricted tables
-- ============================================================


-- ============================================================
-- STEP 0: DROP ALL EXISTING BASIC POLICIES FROM SCHEMA MIGRATION
-- ============================================================

-- roles
DROP POLICY IF EXISTS "Authenticated can read roles"           ON public.roles;
DROP POLICY IF EXISTS "Admins can manage roles"                ON public.roles;

-- user_roles
DROP POLICY IF EXISTS "Users can view own roles"               ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles"              ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles"           ON public.user_roles;

-- profiles
DROP POLICY IF EXISTS "Users can view own profile"             ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles"           ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"           ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles"         ON public.profiles;

-- clients
DROP POLICY IF EXISTS "Staff can view clients"                 ON public.clients;
DROP POLICY IF EXISTS "Leads can create clients"               ON public.clients;
DROP POLICY IF EXISTS "Leads can update clients"               ON public.clients;

-- engagements
DROP POLICY IF EXISTS "Staff can view engagements"             ON public.engagements;
DROP POLICY IF EXISTS "Leads can create engagements"           ON public.engagements;
DROP POLICY IF EXISTS "Leads can update engagements"           ON public.engagements;

-- stakeholders
DROP POLICY IF EXISTS "Staff can view stakeholders"            ON public.stakeholders;
DROP POLICY IF EXISTS "Analysts can manage stakeholders"       ON public.stakeholders;

-- intel_items
DROP POLICY IF EXISTS "Staff can view intel items"             ON public.intel_items;
DROP POLICY IF EXISTS "Analysts can manage intel items"        ON public.intel_items;

-- competitor_profiles
DROP POLICY IF EXISTS "Staff can view competitors"             ON public.competitor_profiles;
DROP POLICY IF EXISTS "Analysts can manage competitors"        ON public.competitor_profiles;

-- scenarios
DROP POLICY IF EXISTS "Staff can view scenarios"               ON public.scenarios;
DROP POLICY IF EXISTS "Advisors can manage scenarios"          ON public.scenarios;

-- narrative_platform
DROP POLICY IF EXISTS "Staff can view narrative platform"      ON public.narrative_platform;
DROP POLICY IF EXISTS "Comms can manage narrative"             ON public.narrative_platform;

-- narrative_audience_matrix
DROP POLICY IF EXISTS "Staff can view audience matrix"         ON public.narrative_audience_matrix;
DROP POLICY IF EXISTS "Comms can manage audience matrix"       ON public.narrative_audience_matrix;

-- brand_audit
DROP POLICY IF EXISTS "Staff can view brand audit"             ON public.brand_audit;
DROP POLICY IF EXISTS "Advisors can manage brand audit"        ON public.brand_audit;

-- comms_initiatives
DROP POLICY IF EXISTS "Staff can view comms initiatives"       ON public.comms_initiatives;
DROP POLICY IF EXISTS "Comms can manage initiatives"           ON public.comms_initiatives;

-- content_items
DROP POLICY IF EXISTS "Staff can view content items"           ON public.content_items;
DROP POLICY IF EXISTS "Digital can manage content"             ON public.content_items;

-- cadence_touchpoints
DROP POLICY IF EXISTS "Staff can view touchpoints"             ON public.cadence_touchpoints;
DROP POLICY IF EXISTS "Leads can manage touchpoints"           ON public.cadence_touchpoints;

-- crisis_types
DROP POLICY IF EXISTS "Staff can view crisis types"            ON public.crisis_types;
DROP POLICY IF EXISTS "Advisors can manage crisis types"       ON public.crisis_types;

-- crisis_events
DROP POLICY IF EXISTS "Staff can view crisis events"           ON public.crisis_events;
DROP POLICY IF EXISTS "Advisors can manage crisis events"      ON public.crisis_events;

-- audit_logs
DROP POLICY IF EXISTS "Auth users can insert audit logs"       ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view audit logs"             ON public.audit_logs;

-- integration_configs
DROP POLICY IF EXISTS "Admins can manage integrations"         ON public.integration_configs;

-- client_portal_access
DROP POLICY IF EXISTS "Users can view own portal access"       ON public.client_portal_access;
DROP POLICY IF EXISTS "Admins can manage portal access"        ON public.client_portal_access;


-- ============================================================
-- STEP 1: HELPER FUNCTIONS
-- ============================================================

-- get_user_role()
-- Returns the highest-privilege role for the current user.
-- Priority order ensures super_admin always wins if multi-roled.
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY
    CASE role
      WHEN 'super_admin'        THEN 1
      WHEN 'lead_advisor'       THEN 2
      WHEN 'senior_advisor'     THEN 3
      WHEN 'comms_director'     THEN 4
      WHEN 'intel_analyst'      THEN 5
      WHEN 'digital_strategist' THEN 6
      WHEN 'client_principal'   THEN 7
    END
  LIMIT 1
$$;


-- get_user_engagement_ids()
-- Returns UUID[] of engagements the current user is permitted to access.
--   super_admin        → all engagements
--   lead_advisor       → engagements where lead_advisor_id = self
--   client_principal   → engagements granted via client_portal_access
--   all other staff    → all non-closed engagements
CREATE OR REPLACE FUNCTION public.get_user_engagement_ids()
RETURNS UUID[]
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
BEGIN
  v_role := public.get_user_role();

  RETURN CASE v_role
    WHEN 'super_admin' THEN
      ARRAY(SELECT id FROM public.engagements)

    WHEN 'lead_advisor' THEN
      ARRAY(SELECT id FROM public.engagements WHERE lead_advisor_id = auth.uid())

    WHEN 'client_principal' THEN
      ARRAY(
        SELECT engagement_id
        FROM public.client_portal_access
        WHERE user_id = auth.uid()
          AND is_active = true
          AND (expires_at IS NULL OR expires_at > now())
      )

    ELSE  -- senior_advisor, comms_director, intel_analyst, digital_strategist
      ARRAY(SELECT id FROM public.engagements WHERE status != 'closed')
  END;
END;
$$;


-- is_internal_staff()
-- True for any non-client role; used for broad read gates.
CREATE OR REPLACE FUNCTION public.is_internal_staff()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN (
        'super_admin', 'lead_advisor', 'senior_advisor',
        'comms_director', 'intel_analyst', 'digital_strategist'
      )
  )
$$;


-- ============================================================
-- STEP 2: ENFORCE RLS ON ALL TABLES (idempotent)
-- ============================================================

ALTER TABLE public.roles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagements             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stakeholders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intel_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_platform      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narrative_audience_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_audit             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comms_initiatives       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadence_touchpoints     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crisis_types            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crisis_events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_configs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portal_access    ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- STEP 3: roles
-- All authenticated → SELECT (needed for role-checking UI)
-- super_admin only  → INSERT / UPDATE / DELETE
-- ============================================================

CREATE POLICY "roles__select__authenticated"
  ON public.roles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "roles__insert__super_admin"
  ON public.roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "roles__update__super_admin"
  ON public.roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "roles__delete__super_admin"
  ON public.roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));


-- ============================================================
-- STEP 4: profiles
-- Own profile       → SELECT, UPDATE
-- Internal staff    → SELECT (team visibility)
-- super_admin       → SELECT, UPDATE all; INSERT; DELETE
-- No direct INSERT by others — auto-created via on_auth_user_created trigger
-- ============================================================

CREATE POLICY "profiles__select__own"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles__select__internal_staff"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_internal_staff());

CREATE POLICY "profiles__insert__super_admin"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "profiles__update__own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles__update__super_admin"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "profiles__delete__super_admin"
  ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));


-- ============================================================
-- STEP 5: user_roles
-- Own rows          → SELECT
-- super_admin       → all operations
-- No other role may read or modify another user's role assignment
-- ============================================================

CREATE POLICY "user_roles__select__own"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_roles__select__super_admin"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "user_roles__insert__super_admin"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "user_roles__update__super_admin"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "user_roles__delete__super_admin"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));


-- ============================================================
-- STEP 6: clients
-- Internal staff    → SELECT
-- client_principal  → SELECT their own client (via portal engagement)
-- lead_advisor +    → INSERT, UPDATE
--   super_admin
-- super_admin       → DELETE
-- ============================================================

CREATE POLICY "clients__select__internal"
  ON public.clients FOR SELECT TO authenticated
  USING (public.is_internal_staff());

CREATE POLICY "clients__select__client_principal"
  ON public.clients FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'client_principal')
    AND id IN (
      SELECT e.client_id
      FROM public.engagements e
      WHERE e.id = ANY(public.get_user_engagement_ids())
    )
  );

CREATE POLICY "clients__insert__lead_admin"
  ON public.clients FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'lead_advisor')
  );

CREATE POLICY "clients__update__lead_admin"
  ON public.clients FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'lead_advisor')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'lead_advisor')
  );

CREATE POLICY "clients__delete__super_admin"
  ON public.clients FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));


-- ============================================================
-- STEP 7: engagements
-- super_admin       → all rows
-- lead_advisor      → rows where lead_advisor_id = self
-- internal staff    → all non-closed (read only scope for non-leads)
-- client_principal  → portal-granted rows only
-- INSERT/UPDATE     → super_admin + lead_advisor (own rows only for lead)
-- DELETE            → super_admin only
-- ============================================================

CREATE POLICY "engagements__select__super_admin"
  ON public.engagements FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "engagements__select__lead_advisor"
  ON public.engagements FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'lead_advisor')
    AND lead_advisor_id = auth.uid()
  );

CREATE POLICY "engagements__select__internal_staff"
  ON public.engagements FOR SELECT TO authenticated
  USING (
    (
      public.has_role(auth.uid(), 'senior_advisor')
      OR public.has_role(auth.uid(), 'comms_director')
      OR public.has_role(auth.uid(), 'intel_analyst')
      OR public.has_role(auth.uid(), 'digital_strategist')
    )
    AND status != 'closed'
  );

CREATE POLICY "engagements__select__client_principal"
  ON public.engagements FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'client_principal')
    AND id = ANY(public.get_user_engagement_ids())
  );

CREATE POLICY "engagements__insert__lead_admin"
  ON public.engagements FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'lead_advisor')
  );

-- Lead advisors may only update their own engagements
CREATE POLICY "engagements__update__lead_admin"
  ON public.engagements FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'lead_advisor')
      AND lead_advisor_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'lead_advisor')
      AND lead_advisor_id = auth.uid()
    )
  );

CREATE POLICY "engagements__delete__super_admin"
  ON public.engagements FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));


-- ============================================================
-- STEP 8: stakeholders
-- super_admin       → all
-- lead_advisor      → own engagement rows
-- senior_advisor    → SELECT + write on all active engagement rows
-- intel_analyst     → SELECT + write on all active engagement rows
-- client_principal  → NEVER
-- digital_strategist→ NEVER
-- comms_director    → NEVER
-- ============================================================

CREATE POLICY "stakeholders__select__super_admin"
  ON public.stakeholders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "stakeholders__select__lead_advisor"
  ON public.stakeholders FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'lead_advisor')
    AND engagement_id = ANY(public.get_user_engagement_ids())
  );

CREATE POLICY "stakeholders__select__intel_senior"
  ON public.stakeholders FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'intel_analyst')
    OR public.has_role(auth.uid(), 'senior_advisor')
  );

CREATE POLICY "stakeholders__insert__authorized"
  ON public.stakeholders FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'lead_advisor')
      AND engagement_id = ANY(public.get_user_engagement_ids())
    )
    OR public.has_role(auth.uid(), 'intel_analyst')
    OR public.has_role(auth.uid(), 'senior_advisor')
  );

CREATE POLICY "stakeholders__update__authorized"
  ON public.stakeholders FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'lead_advisor')
      AND engagement_id = ANY(public.get_user_engagement_ids())
    )
    OR public.has_role(auth.uid(), 'intel_analyst')
    OR public.has_role(auth.uid(), 'senior_advisor')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'lead_advisor')
      AND engagement_id = ANY(public.get_user_engagement_ids())
    )
    OR public.has_role(auth.uid(), 'intel_analyst')
    OR public.has_role(auth.uid(), 'senior_advisor')
  );

CREATE POLICY "stakeholders__delete__lead_admin"
  ON public.stakeholders FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'lead_advisor')
      AND engagement_id = ANY(public.get_user_engagement_ids())
    )
  );


-- ============================================================
-- STEP 9: intel_items
-- CRITICAL: client_principal NEVER accesses this table directly.
-- Portal uses a restricted view (created below).
-- digital_strategist → SELECT only (summary fields, no raw_content)
-- ============================================================

CREATE POLICY "intel_items__select__super_admin"
  ON public.intel_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "intel_items__select__lead_advisor"
  ON public.intel_items FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'lead_advisor')
    AND engagement_id = ANY(public.get_user_engagement_ids())
  );

CREATE POLICY "intel_items__select__intel_analyst"
  ON public.intel_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'intel_analyst'));

CREATE POLICY "intel_items__select__senior_comms"
  ON public.intel_items FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'senior_advisor')
    OR public.has_role(auth.uid(), 'comms_director')
  );

-- Digital strategist: read intel for content alignment (limited scope)
CREATE POLICY "intel_items__select__digital_strategist"
  ON public.intel_items FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'digital_strategist')
    AND engagement_id = ANY(public.get_user_engagement_ids())
  );

-- Only intel_analyst and super_admin may write intel
CREATE POLICY "intel_items__insert__analyst_admin"
  ON public.intel_items FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'intel_analyst')
  );

CREATE POLICY "intel_items__update__analyst_admin"
  ON public.intel_items FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'intel_analyst')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'intel_analyst')
  );

CREATE POLICY "intel_items__delete__super_admin"
  ON public.intel_items FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Portal-safe intel view: strips raw_content, restricts to portal-granted engagements
-- Use this view for any client-facing portal data instead of the base table.
CREATE OR REPLACE VIEW public.intel_items_portal AS
  SELECT
    id, engagement_id, date_logged, source_name, source_type,
    headline, summary, sentiment_score, reach_tier,
    narrative_theme, action_required, action_status,
    is_urgent, platform, created_at
    -- raw_content EXCLUDED
    -- is_escalated EXCLUDED (internal flag)
    -- url EXCLUDED (avoid leaking source tracking)
  FROM public.intel_items
  WHERE engagement_id = ANY(public.get_user_engagement_ids());


-- ============================================================
-- STEP 10: competitor_profiles
-- CRITICAL: client_principal NEVER accesses this table.
-- CRITICAL: digital_strategist NEVER accesses this table.
-- vulnerabilities column: masked for everyone except super_admin + lead_advisor.
-- ============================================================

CREATE POLICY "competitor_profiles__select__super_admin"
  ON public.competitor_profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "competitor_profiles__select__lead_advisor"
  ON public.competitor_profiles FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'lead_advisor')
    AND engagement_id = ANY(public.get_user_engagement_ids())
  );

CREATE POLICY "competitor_profiles__select__intel_senior"
  ON public.competitor_profiles FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'intel_analyst')
    OR public.has_role(auth.uid(), 'senior_advisor')
  );

CREATE POLICY "competitor_profiles__insert__analyst_admin"
  ON public.competitor_profiles FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'intel_analyst')
  );

CREATE POLICY "competitor_profiles__update__analyst_admin"
  ON public.competitor_profiles FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'intel_analyst')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'intel_analyst')
  );

CREATE POLICY "competitor_profiles__delete__super_admin"
  ON public.competitor_profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Column-level masking for competitor_profiles.vulnerabilities
-- RLS is row-level; column restriction requires a security view.
-- Use competitor_profiles_safe in all application queries.
-- The raw table is only queried internally by super_admin + lead_advisor.
CREATE OR REPLACE VIEW public.competitor_profiles_safe AS
  SELECT
    id, engagement_id, name, role_position, party_affiliation, constituency,
    biography, influence_score, threat_score,
    twitter_handle, facebook_page, instagram_handle, youtube_channel,
    twitter_followers, facebook_likes, instagram_followers, youtube_subscribers,
    monthly_media_mentions, avg_sentiment_score,
    key_messages, alliance_map, last_updated, created_at, updated_at, created_by,
    -- vulnerabilities: NULL unless caller is super_admin or lead_advisor
    CASE
      WHEN public.has_role(auth.uid(), 'super_admin')
        OR public.has_role(auth.uid(), 'lead_advisor')
      THEN vulnerabilities
      ELSE NULL::jsonb
    END AS vulnerabilities
  FROM public.competitor_profiles
  WHERE engagement_id = ANY(public.get_user_engagement_ids());


-- ============================================================
-- STEP 11: scenarios
-- intel_analyst     → SELECT ONLY (spec: read-only on strategy)
-- senior_advisor    → SELECT + INSERT + UPDATE
-- lead_advisor      → SELECT + INSERT + UPDATE (own engagements)
-- super_admin       → all
-- DELETE            → super_admin only
-- client_principal  → NEVER
-- ============================================================

CREATE POLICY "scenarios__select__super_admin"
  ON public.scenarios FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "scenarios__select__lead_advisor"
  ON public.scenarios FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'lead_advisor')
    AND engagement_id = ANY(public.get_user_engagement_ids())
  );

CREATE POLICY "scenarios__select__intel_senior"
  ON public.scenarios FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'intel_analyst')
    OR public.has_role(auth.uid(), 'senior_advisor')
  );

-- intel_analyst: READ ONLY — no INSERT/UPDATE/DELETE policies granted
CREATE POLICY "scenarios__insert__advisor_admin"
  ON public.scenarios FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'lead_advisor')
      AND engagement_id = ANY(public.get_user_engagement_ids())
    )
    OR public.has_role(auth.uid(), 'senior_advisor')
  );

CREATE POLICY "scenarios__update__advisor_admin"
  ON public.scenarios FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'lead_advisor')
      AND engagement_id = ANY(public.get_user_engagement_ids())
    )
    OR public.has_role(auth.uid(), 'senior_advisor')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'lead_advisor')
      AND engagement_id = ANY(public.get_user_engagement_ids())
    )
    OR public.has_role(auth.uid(), 'senior_advisor')
  );

CREATE POLICY "scenarios__delete__super_admin"
  ON public.scenarios FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));


-- ============================================================
-- STEP 12: narrative_platform
-- client_principal → NEVER (what_we_never_say field masked via view below)
-- digital_strategist → SELECT only (content alignment)
-- comms_director   → SELECT + INSERT + UPDATE
-- lead_advisor     → SELECT + INSERT + UPDATE (own engagements)
-- super_admin      → all
-- ============================================================

CREATE POLICY "narrative_platform__select__super_admin"
  ON public.narrative_platform FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "narrative_platform__select__lead_advisor"
  ON public.narrative_platform FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'lead_advisor')
    AND engagement_id = ANY(public.get_user_engagement_ids())
  );

CREATE POLICY "narrative_platform__select__internal"
  ON public.narrative_platform FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'senior_advisor')
    OR public.has_role(auth.uid(), 'comms_director')
    OR public.has_role(auth.uid(), 'digital_strategist')
  );

CREATE POLICY "narrative_platform__insert__comms_lead_admin"
  ON public.narrative_platform FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'lead_advisor')
      AND engagement_id = ANY(public.get_user_engagement_ids())
    )
    OR public.has_role(auth.uid(), 'comms_director')
  );

CREATE POLICY "narrative_platform__update__comms_lead_admin"
  ON public.narrative_platform FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'lead_advisor')
      AND engagement_id = ANY(public.get_user_engagement_ids())
    )
    OR public.has_role(auth.uid(), 'comms_director')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'lead_advisor')
      AND engagement_id = ANY(public.get_user_engagement_ids())
    )
    OR public.has_role(auth.uid(), 'comms_director')
  );

CREATE POLICY "narrative_platform__delete__super_admin"
  ON public.narrative_platform FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Column-level masking: what_we_never_say — NEVER exposed to client_principal
-- Use narrative_platform_safe in all portal and external queries.
CREATE OR REPLACE VIEW public.narrative_platform_safe AS
  SELECT
    id, engagement_id, master_narrative, defining_purpose, leadership_promise,
    core_values_in_action, voice_tone_guide, crisis_anchor_message,
    is_approved, approved_by, approved_at, version, created_at, updated_at, created_by,
    CASE
      WHEN public.has_role(auth.uid(), 'client_principal') THEN NULL::text
      ELSE what_we_never_say
    END AS what_we_never_say
  FROM public.narrative_platform
  WHERE engagement_id = ANY(public.get_user_engagement_ids());


-- ============================================================
-- STEP 13: narrative_audience_matrix
-- Inherits access via parent narrative_platform engagement scope.
-- comms_director    → SELECT + INSERT + UPDATE
-- lead_advisor      → SELECT + INSERT + UPDATE (own engagements)
-- senior_advisor + digital_strategist → SELECT
-- super_admin       → all
-- client_principal  → NEVER
-- ============================================================

CREATE POLICY "narrative_audience_matrix__select__super_admin"
  ON public.narrative_audience_matrix FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "narrative_audience_matrix__select__internal"
  ON public.narrative_audience_matrix FOR SELECT TO authenticated
  USING (
    (
      public.has_role(auth.uid(), 'lead_advisor')
      OR public.has_role(auth.uid(), 'comms_director')
      OR public.has_role(auth.uid(), 'digital_strategist')
      OR public.has_role(auth.uid(), 'senior_advisor')
    )
    AND narrative_platform_id IN (
      SELECT id FROM public.narrative_platform
      WHERE engagement_id = ANY(public.get_user_engagement_ids())
    )
  );

CREATE POLICY "narrative_audience_matrix__insert__comms_lead_admin"
  ON public.narrative_audience_matrix FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'comms_director')
    OR (
      public.has_role(auth.uid(), 'lead_advisor')
      AND narrative_platform_id IN (
        SELECT id FROM public.narrative_platform
        WHERE engagement_id = ANY(public.get_user_engagement_ids())
      )
    )
  );

CREATE POLICY "narrative_audience_matrix__update__comms_lead_admin"
  ON public.narrative_audience_matrix FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'comms_director')
    OR (
      public.has_role(auth.uid(), 'lead_advisor')
      AND narrative_platform_id IN (
        SELECT id FROM public.narrative_platform
        WHERE engagement_id = ANY(public.get_user_engagement_ids())
      )
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'comms_director')
    OR (
      public.has_role(auth.uid(), 'lead_advisor')
      AND narrative_platform_id IN (
        SELECT id FROM public.narrative_platform
        WHERE engagement_id = ANY(public.get_user_engagement_ids())
      )
    )
  );

CREATE POLICY "narrative_audience_matrix__delete__super_admin"
  ON public.narrative_audience_matrix FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));


-- ============================================================
-- STEP 14: brand_audit
-- lead_advisor      → SELECT + INSERT + UPDATE (own engagements)
-- senior_advisor + comms_director → SELECT
-- super_admin       → all
-- DELETE            → super_admin only
-- client_principal  → NEVER
-- ============================================================

CREATE POLICY "brand_audit__select__super_admin"
  ON public.brand_audit FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "brand_audit__select__lead_advisor"
  ON public.brand_audit FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'lead_advisor')
    AND engagement_id = ANY(public.get_user_engagement_ids())
  );

CREATE POLICY "brand_audit__select__senior_comms"
  ON public.brand_audit FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'senior_advisor')
    OR public.has_role(auth.uid(), 'comms_director')
  );

CREATE POLICY "brand_audit__insert__lead_admin"
  ON public.brand_audit FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'lead_advisor')
      AND engagement_id = ANY(public.get_user_engagement_ids())
    )
  );

CREATE POLICY "brand_audit__update__lead_admin"
  ON public.brand_audit FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'lead_advisor')
      AND engagement_id = ANY(public.get_user_engagement_ids())
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'lead_advisor')
      AND engagement_id = ANY(public.get_user_engagement_ids())
    )
  );

CREATE POLICY "brand_audit__delete__super_admin"
  ON public.brand_audit FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));


-- ============================================================
-- STEP 15: comms_initiatives
-- comms_director    → SELECT + INSERT + UPDATE
-- digital_strategist→ SELECT
-- lead_advisor      → SELECT + INSERT + UPDATE (own engagements)
-- super_admin       → all
-- DELETE            → super_admin + comms_director
-- client_principal  → NEVER
-- ============================================================

CREATE POLICY "comms_initiatives__select__super_admin"
  ON public.comms_initiatives FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "comms_initiatives__select__lead_advisor"
  ON public.comms_initiatives FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'lead_advisor')
    AND engagement_id = ANY(public.get_user_engagement_ids())
  );

CREATE POLICY "comms_initiatives__select__comms_digital"
  ON public.comms_initiatives FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'comms_director')
    OR public.has_role(auth.uid(), 'digital_strategist')
  );

CREATE POLICY "comms_initiatives__insert__comms_lead_admin"
  ON public.comms_initiatives FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'comms_director')
    OR (
      public.has_role(auth.uid(), 'lead_advisor')
      AND engagement_id = ANY(public.get_user_engagement_ids())
    )
  );

CREATE POLICY "comms_initiatives__update__comms_lead_admin"
  ON public.comms_initiatives FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'comms_director')
    OR (
      public.has_role(auth.uid(), 'lead_advisor')
      AND engagement_id = ANY(public.get_user_engagement_ids())
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'comms_director')
    OR (
      public.has_role(auth.uid(), 'lead_advisor')
      AND engagement_id = ANY(public.get_user_engagement_ids())
    )
  );

CREATE POLICY "comms_initiatives__delete__comms_admin"
  ON public.comms_initiatives FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'comms_director')
  );


-- ============================================================
-- STEP 16: content_items
-- comms_director    → SELECT + INSERT + UPDATE + DELETE
-- digital_strategist→ SELECT + INSERT + UPDATE
-- lead_advisor      → SELECT (own engagement rows)
-- super_admin       → all
-- client_principal  → NEVER (portal has separate approved content view)
-- ============================================================

CREATE POLICY "content_items__select__super_admin"
  ON public.content_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "content_items__select__lead_advisor"
  ON public.content_items FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'lead_advisor')
    AND engagement_id = ANY(public.get_user_engagement_ids())
  );

CREATE POLICY "content_items__select__comms_digital"
  ON public.content_items FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'comms_director')
    OR public.has_role(auth.uid(), 'digital_strategist')
  );

CREATE POLICY "content_items__insert__comms_digital_admin"
  ON public.content_items FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'comms_director')
    OR public.has_role(auth.uid(), 'digital_strategist')
  );

CREATE POLICY "content_items__update__comms_digital_admin"
  ON public.content_items FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'comms_director')
    OR public.has_role(auth.uid(), 'digital_strategist')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'comms_director')
    OR public.has_role(auth.uid(), 'digital_strategist')
  );

CREATE POLICY "content_items__delete__comms_admin"
  ON public.content_items FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'comms_director')
  );


-- ============================================================
-- STEP 17: cadence_touchpoints
-- lead_advisor      → SELECT + INSERT + UPDATE (own engagements)
-- senior_advisor    → SELECT
-- super_admin       → all
-- DELETE            → super_admin only
-- client_principal  → NEVER
-- ============================================================

CREATE POLICY "cadence_touchpoints__select__super_admin"
  ON public.cadence_touchpoints FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "cadence_touchpoints__select__lead_advisor"
  ON public.cadence_touchpoints FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'lead_advisor')
    AND engagement_id = ANY(public.get_user_engagement_ids())
  );

CREATE POLICY "cadence_touchpoints__select__senior"
  ON public.cadence_touchpoints FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'senior_advisor'));

CREATE POLICY "cadence_touchpoints__insert__lead_admin"
  ON public.cadence_touchpoints FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'lead_advisor')
      AND engagement_id = ANY(public.get_user_engagement_ids())
    )
  );

CREATE POLICY "cadence_touchpoints__update__lead_admin"
  ON public.cadence_touchpoints FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'lead_advisor')
      AND engagement_id = ANY(public.get_user_engagement_ids())
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'lead_advisor')
      AND engagement_id = ANY(public.get_user_engagement_ids())
    )
  );

CREATE POLICY "cadence_touchpoints__delete__super_admin"
  ON public.cadence_touchpoints FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));


-- ============================================================
-- STEP 18: crisis_types
-- All internal staff → SELECT
-- lead_advisor + comms_director → INSERT + UPDATE
-- super_admin       → all including DELETE
-- client_principal  → NEVER
-- ============================================================

CREATE POLICY "crisis_types__select__internal"
  ON public.crisis_types FOR SELECT TO authenticated
  USING (public.is_internal_staff());

CREATE POLICY "crisis_types__insert__comms_lead_admin"
  ON public.crisis_types FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'lead_advisor')
      AND engagement_id = ANY(public.get_user_engagement_ids())
    )
    OR public.has_role(auth.uid(), 'comms_director')
  );

CREATE POLICY "crisis_types__update__comms_lead_admin"
  ON public.crisis_types FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'lead_advisor')
      AND engagement_id = ANY(public.get_user_engagement_ids())
    )
    OR public.has_role(auth.uid(), 'comms_director')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'lead_advisor')
      AND engagement_id = ANY(public.get_user_engagement_ids())
    )
    OR public.has_role(auth.uid(), 'comms_director')
  );

CREATE POLICY "crisis_types__delete__super_admin"
  ON public.crisis_types FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));


-- ============================================================
-- STEP 19: crisis_events
-- All internal staff → SELECT
-- lead_advisor + comms_director → INSERT + UPDATE
-- super_admin       → all including DELETE
-- client_principal  → NEVER
-- ============================================================

CREATE POLICY "crisis_events__select__internal"
  ON public.crisis_events FOR SELECT TO authenticated
  USING (public.is_internal_staff());

CREATE POLICY "crisis_events__insert__comms_lead_admin"
  ON public.crisis_events FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'lead_advisor')
      AND engagement_id = ANY(public.get_user_engagement_ids())
    )
    OR public.has_role(auth.uid(), 'comms_director')
  );

CREATE POLICY "crisis_events__update__comms_lead_admin"
  ON public.crisis_events FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'lead_advisor')
      AND engagement_id = ANY(public.get_user_engagement_ids())
    )
    OR public.has_role(auth.uid(), 'comms_director')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      public.has_role(auth.uid(), 'lead_advisor')
      AND engagement_id = ANY(public.get_user_engagement_ids())
    )
    OR public.has_role(auth.uid(), 'comms_director')
  );

CREATE POLICY "crisis_events__delete__super_admin"
  ON public.crisis_events FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));


-- ============================================================
-- STEP 20: audit_logs
-- IMMUTABLE: no UPDATE or DELETE policies (rows cannot be modified)
-- INSERT: any authenticated user for their own user_id rows
--         (trigger inserts via SECURITY DEFINER bypass RLS)
-- SELECT: super_admin ONLY
-- ============================================================

CREATE POLICY "audit_logs__select__super_admin"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "audit_logs__insert__own"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Intentionally no UPDATE or DELETE policy → rows are immutable at the DB level


-- ============================================================
-- STEP 21: integration_configs
-- super_admin ONLY for all operations
-- ============================================================

CREATE POLICY "integration_configs__all__super_admin"
  ON public.integration_configs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));


-- ============================================================
-- STEP 22: client_portal_access
-- client_principal  → SELECT own rows only
-- lead_advisor      → SELECT + INSERT + UPDATE (no DELETE)
-- super_admin       → all operations including DELETE
-- ============================================================

CREATE POLICY "client_portal_access__select__own"
  ON public.client_portal_access FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "client_portal_access__select__lead_admin"
  ON public.client_portal_access FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'lead_advisor')
  );

CREATE POLICY "client_portal_access__insert__lead_admin"
  ON public.client_portal_access FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'lead_advisor')
  );

CREATE POLICY "client_portal_access__update__lead_admin"
  ON public.client_portal_access FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'lead_advisor')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'lead_advisor')
  );

-- Only super_admin may revoke portal access (DELETE)
CREATE POLICY "client_portal_access__delete__super_admin"
  ON public.client_portal_access FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));


-- ============================================================
-- STEP 23: AUDIT TRIGGER FUNCTION
-- SECURITY DEFINER → bypasses RLS so it can always write to audit_logs
-- Handles INSERT / UPDATE / DELETE on sensitive tables
-- Falls back to system UUID when auth.uid() is NULL (service_role ops)
-- ============================================================

CREATE OR REPLACE FUNCTION public.audit_sensitive_tables()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_action     public.audit_action;
  v_record_id  UUID;
  v_old        JSONB;
  v_new        JSONB;
BEGIN
  CASE TG_OP
    WHEN 'INSERT' THEN
      v_action    := 'create';
      v_record_id := NEW.id;
      v_old       := NULL;
      v_new       := to_jsonb(NEW);

    WHEN 'UPDATE' THEN
      v_action    := 'update';
      v_record_id := NEW.id;
      v_old       := to_jsonb(OLD);
      v_new       := to_jsonb(NEW);

    WHEN 'DELETE' THEN
      v_action    := 'delete';
      v_record_id := OLD.id;
      v_old       := to_jsonb(OLD);
      v_new       := NULL;

    ELSE
      RETURN COALESCE(NEW, OLD);
  END CASE;

  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    v_action,
    TG_TABLE_NAME,
    v_record_id,
    v_old,
    v_new
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;


-- ============================================================
-- STEP 24: ATTACH AUDIT TRIGGERS TO ALL SENSITIVE TABLES
-- ============================================================

-- clients
DROP TRIGGER IF EXISTS audit_clients ON public.clients;
CREATE TRIGGER audit_clients
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_tables();

-- engagements
DROP TRIGGER IF EXISTS audit_engagements ON public.engagements;
CREATE TRIGGER audit_engagements
  AFTER INSERT OR UPDATE OR DELETE ON public.engagements
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_tables();

-- stakeholders
DROP TRIGGER IF EXISTS audit_stakeholders ON public.stakeholders;
CREATE TRIGGER audit_stakeholders
  AFTER INSERT OR UPDATE OR DELETE ON public.stakeholders
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_tables();

-- intel_items
DROP TRIGGER IF EXISTS audit_intel_items ON public.intel_items;
CREATE TRIGGER audit_intel_items
  AFTER INSERT OR UPDATE OR DELETE ON public.intel_items
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_tables();

-- competitor_profiles
DROP TRIGGER IF EXISTS audit_competitor_profiles ON public.competitor_profiles;
CREATE TRIGGER audit_competitor_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.competitor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_tables();

-- scenarios
DROP TRIGGER IF EXISTS audit_scenarios ON public.scenarios;
CREATE TRIGGER audit_scenarios
  AFTER INSERT OR UPDATE OR DELETE ON public.scenarios
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_tables();

-- narrative_platform
DROP TRIGGER IF EXISTS audit_narrative_platform ON public.narrative_platform;
CREATE TRIGGER audit_narrative_platform
  AFTER INSERT OR UPDATE OR DELETE ON public.narrative_platform
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_tables();

-- integration_configs
DROP TRIGGER IF EXISTS audit_integration_configs ON public.integration_configs;
CREATE TRIGGER audit_integration_configs
  AFTER INSERT OR UPDATE OR DELETE ON public.integration_configs
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_tables();

-- client_portal_access
DROP TRIGGER IF EXISTS audit_client_portal_access ON public.client_portal_access;
CREATE TRIGGER audit_client_portal_access
  AFTER INSERT OR UPDATE OR DELETE ON public.client_portal_access
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_tables();

-- crisis_events
DROP TRIGGER IF EXISTS audit_crisis_events ON public.crisis_events;
CREATE TRIGGER audit_crisis_events
  AFTER INSERT OR UPDATE OR DELETE ON public.crisis_events
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_tables();

-- user_roles (critical: any role change must be audited)
DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;
CREATE TRIGGER audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_tables();

-- profiles
DROP TRIGGER IF EXISTS audit_profiles ON public.profiles;
CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_tables();
