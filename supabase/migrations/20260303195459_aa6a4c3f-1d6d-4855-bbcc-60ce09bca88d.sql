
-- Create stakeholder_interactions table to track contact log for each stakeholder
CREATE TABLE public.stakeholder_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stakeholder_id UUID NOT NULL REFERENCES public.stakeholders(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  interaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  interaction_type TEXT NOT NULL DEFAULT 'Meeting',
  led_by_id UUID,
  notes TEXT,
  outcome TEXT,
  follow_up_required BOOLEAN NOT NULL DEFAULT false,
  follow_up_status TEXT DEFAULT 'pending',
  follow_up_due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Enable RLS
ALTER TABLE public.stakeholder_interactions ENABLE ROW LEVEL SECURITY;

-- Advisors and analysts can manage interactions
CREATE POLICY "Staff can manage stakeholder interactions"
ON public.stakeholder_interactions FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'lead_advisor'::app_role) OR
  has_role(auth.uid(), 'intel_analyst'::app_role)
);

-- Broader read access for relevant roles
CREATE POLICY "Staff can view stakeholder interactions"
ON public.stakeholder_interactions FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'lead_advisor'::app_role) OR
  has_role(auth.uid(), 'senior_advisor'::app_role) OR
  has_role(auth.uid(), 'intel_analyst'::app_role)
);

-- Add updated_at trigger
CREATE TRIGGER update_stakeholder_interactions_updated_at
BEFORE UPDATE ON public.stakeholder_interactions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
