
-- Create competitor_metrics_history table for tracking historical social metrics
CREATE TABLE public.competitor_metrics_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competitor_profile_id uuid NOT NULL REFERENCES public.competitor_profiles(id) ON DELETE CASCADE,
  metric_date date NOT NULL DEFAULT CURRENT_DATE,
  followers integer DEFAULT 0,
  engagement_rate numeric DEFAULT 0,
  platform text NOT NULL DEFAULT 'twitter',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (competitor_profile_id, metric_date, platform)
);

-- Enable RLS
ALTER TABLE public.competitor_metrics_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Analysts can manage competitor metrics" ON public.competitor_metrics_history
  FOR ALL USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'intel_analyst'::app_role)
  );

CREATE POLICY "Staff can view competitor metrics" ON public.competitor_metrics_history
  FOR SELECT USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'lead_advisor'::app_role)
    OR public.has_role(auth.uid(), 'senior_advisor'::app_role)
    OR public.has_role(auth.uid(), 'intel_analyst'::app_role)
  );

-- Partial unique index on intel_items.url for deduplication (only non-null URLs)
CREATE UNIQUE INDEX idx_intel_items_url_unique ON public.intel_items (url) WHERE url IS NOT NULL;

-- Enable realtime for competitor_metrics_history
ALTER PUBLICATION supabase_realtime ADD TABLE public.competitor_metrics_history;
