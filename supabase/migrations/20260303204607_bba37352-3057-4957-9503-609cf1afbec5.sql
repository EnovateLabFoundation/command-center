
-- Knowledge base table without generated column
CREATE TABLE public.knowledge_base (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL DEFAULT 'lesson',
  title text NOT NULL,
  content text,
  tags text[] DEFAULT '{}',
  client_type text,
  engagement_type text,
  engagement_id uuid REFERENCES public.engagements(id) ON DELETE SET NULL,
  search_vector tsvector,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  updated_by uuid
);

CREATE INDEX idx_knowledge_base_search ON public.knowledge_base USING gin(search_vector);
CREATE INDEX idx_knowledge_base_category ON public.knowledge_base(category);

-- Trigger to update search_vector
CREATE OR REPLACE FUNCTION public.knowledge_base_search_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_knowledge_base_search
BEFORE INSERT OR UPDATE ON public.knowledge_base
FOR EACH ROW EXECUTE FUNCTION public.knowledge_base_search_update();

ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view knowledge base"
ON public.knowledge_base FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'lead_advisor'::app_role) OR has_role(auth.uid(), 'senior_advisor'::app_role) OR has_role(auth.uid(), 'comms_director'::app_role) OR has_role(auth.uid(), 'intel_analyst'::app_role) OR has_role(auth.uid(), 'digital_strategist'::app_role));

CREATE POLICY "Leads can manage knowledge base"
ON public.knowledge_base FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'lead_advisor'::app_role));

-- Add close-out fields to engagements
ALTER TABLE public.engagements
  ADD COLUMN IF NOT EXISTS close_out_status text,
  ADD COLUMN IF NOT EXISTS lessons_learned jsonb,
  ADD COLUMN IF NOT EXISTS close_out_commentary text,
  ADD COLUMN IF NOT EXISTS relationship_status text,
  ADD COLUMN IF NOT EXISTS relationship_notes text,
  ADD COLUMN IF NOT EXISTS re_engagement_date date,
  ADD COLUMN IF NOT EXISTS closed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS closed_by uuid;
