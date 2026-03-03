
-- Create sync_logs table for tracking integration sync operations
CREATE TABLE public.sync_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform_name text NOT NULL,
  integration_id uuid REFERENCES public.integration_configs(id) ON DELETE SET NULL,
  triggered_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  duration_ms integer,
  records_ingested integer DEFAULT 0,
  status text NOT NULL DEFAULT 'running',
  error_message text,
  engagement_id uuid REFERENCES public.engagements(id) ON DELETE SET NULL,
  triggered_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Only super_admin can view sync logs
CREATE POLICY "Admins can view sync logs"
ON public.sync_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Edge functions insert via service role, but allow auth insert for manual triggers
CREATE POLICY "Admins can insert sync logs"
ON public.sync_logs
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Allow updates (for completing sync logs)
CREATE POLICY "Admins can update sync logs"
ON public.sync_logs
FOR UPDATE
USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Add index for querying recent logs
CREATE INDEX idx_sync_logs_triggered_at ON public.sync_logs(triggered_at DESC);
CREATE INDEX idx_sync_logs_platform ON public.sync_logs(platform_name);
