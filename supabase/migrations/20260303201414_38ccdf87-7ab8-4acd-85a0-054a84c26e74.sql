
-- Google Trends data table for storing interest-over-time and regional data
CREATE TABLE public.google_trends_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  interest_score integer DEFAULT 0,
  region text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.google_trends_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Analysts can manage trends data"
  ON public.google_trends_data FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'intel_analyst'::app_role));

CREATE POLICY "Staff can view trends data"
  ON public.google_trends_data FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'lead_advisor'::app_role) OR has_role(auth.uid(), 'senior_advisor'::app_role) OR has_role(auth.uid(), 'intel_analyst'::app_role) OR has_role(auth.uid(), 'digital_strategist'::app_role));

CREATE INDEX idx_google_trends_engagement ON public.google_trends_data(engagement_id, keyword, date);

-- Geo data table for INEC electoral data powering the Geospatial Engine
CREATE TABLE public.geo_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  state text NOT NULL,
  lga text,
  ward text,
  polling_unit_code text,
  registered_voters integer,
  last_election_votes integer,
  winning_party text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.geo_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Analysts can manage geo data"
  ON public.geo_data FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'intel_analyst'::app_role));

CREATE POLICY "Staff can view geo data"
  ON public.geo_data FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'lead_advisor'::app_role) OR has_role(auth.uid(), 'senior_advisor'::app_role) OR has_role(auth.uid(), 'intel_analyst'::app_role));

CREATE INDEX idx_geo_data_state_lga ON public.geo_data(state, lga);

-- Geo demographics table for NBS demographic/economic data
CREATE TABLE public.geo_demographics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lga_name text NOT NULL,
  state text NOT NULL,
  population_estimate integer,
  median_income numeric,
  poverty_rate numeric,
  literacy_rate numeric,
  urban_rural text DEFAULT 'rural',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.geo_demographics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Analysts can manage demographics"
  ON public.geo_demographics FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'intel_analyst'::app_role));

CREATE POLICY "Staff can view demographics"
  ON public.geo_demographics FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'lead_advisor'::app_role) OR has_role(auth.uid(), 'senior_advisor'::app_role) OR has_role(auth.uid(), 'intel_analyst'::app_role));

CREATE INDEX idx_geo_demographics_state ON public.geo_demographics(state, lga_name);
