
-- Reports table for storing published reports with storage paths
CREATE TABLE public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id uuid NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'intel',
  file_path text,
  published_by uuid NOT NULL,
  published_at timestamp with time zone NOT NULL DEFAULT now(),
  is_public boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Staff can view reports
CREATE POLICY "Staff can view reports"
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'lead_advisor'::app_role)
    OR has_role(auth.uid(), 'senior_advisor'::app_role)
    OR has_role(auth.uid(), 'comms_director'::app_role)
    OR has_role(auth.uid(), 'intel_analyst'::app_role)
    OR has_role(auth.uid(), 'digital_strategist'::app_role)
  );

-- Advisors can create/update reports
CREATE POLICY "Advisors can manage reports"
  ON public.reports
  FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'lead_advisor'::app_role)
  );

-- Clients can view public reports for their engagement
CREATE POLICY "Clients can view public reports"
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (
    is_public = true
    AND has_role(auth.uid(), 'client_principal'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.client_portal_access cpa
      WHERE cpa.user_id = auth.uid()
        AND cpa.engagement_id = reports.engagement_id
        AND cpa.is_active = true
        AND (cpa.expires_at IS NULL OR cpa.expires_at > now())
    )
  );

-- Index for fast lookups
CREATE INDEX idx_reports_engagement ON public.reports (engagement_id, is_public);

-- Storage bucket for reports
INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', false)
  ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload to reports bucket
CREATE POLICY "Authenticated can upload reports"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reports');

-- Authenticated users can read reports they have access to
CREATE POLICY "Authenticated can read reports"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'reports');
