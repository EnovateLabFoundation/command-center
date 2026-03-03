
-- Create briefs table for storing AI-generated intelligence and discovery briefs
CREATE TABLE public.briefs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'intel',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_by uuid NOT NULL,
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  date_from date,
  date_to date,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view briefs"
  ON public.briefs FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'lead_advisor'::app_role) OR
    has_role(auth.uid(), 'senior_advisor'::app_role) OR
    has_role(auth.uid(), 'comms_director'::app_role) OR
    has_role(auth.uid(), 'intel_analyst'::app_role)
  );

CREATE POLICY "Advisors can create briefs"
  ON public.briefs FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'lead_advisor'::app_role) OR
    has_role(auth.uid(), 'intel_analyst'::app_role)
  );

CREATE INDEX idx_briefs_engagement ON public.briefs(engagement_id);

-- Create scenario_alerts table for AI-detected trigger matches
CREATE TABLE public.scenario_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  scenario_id uuid NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  intel_item_id uuid REFERENCES public.intel_items(id) ON DELETE SET NULL,
  matched_keyword text NOT NULL,
  is_dismissed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.scenario_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view scenario alerts"
  ON public.scenario_alerts FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'lead_advisor'::app_role) OR
    has_role(auth.uid(), 'senior_advisor'::app_role)
  );

CREATE POLICY "System can insert scenario alerts"
  ON public.scenario_alerts FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'lead_advisor'::app_role) OR
    has_role(auth.uid(), 'intel_analyst'::app_role)
  );

CREATE POLICY "Staff can update scenario alerts"
  ON public.scenario_alerts FOR UPDATE
  USING (
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'lead_advisor'::app_role)
  );

CREATE INDEX idx_scenario_alerts_engagement ON public.scenario_alerts(engagement_id);
CREATE INDEX idx_scenario_alerts_scenario ON public.scenario_alerts(scenario_id);

-- Enable realtime for scenario_alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.scenario_alerts;
