
-- Add portal_approved flag to intel_items for controlling client visibility
ALTER TABLE public.intel_items
  ADD COLUMN portal_approved boolean NOT NULL DEFAULT false;

-- Index for efficient portal queries
CREATE INDEX idx_intel_items_portal_approved
  ON public.intel_items (engagement_id, portal_approved)
  WHERE portal_approved = true;

-- Allow client_principal users to read portal-approved intel items
-- via their engagement's portal access
CREATE POLICY "Clients can view portal-approved intel"
  ON public.intel_items
  FOR SELECT
  TO authenticated
  USING (
    portal_approved = true
    AND has_role(auth.uid(), 'client_principal'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.client_portal_access cpa
      WHERE cpa.user_id = auth.uid()
        AND cpa.engagement_id = intel_items.engagement_id
        AND cpa.is_active = true
        AND (cpa.expires_at IS NULL OR cpa.expires_at > now())
    )
  );

-- Allow client_principal to read engagements they have portal access to
CREATE POLICY "Clients can view own engagements"
  ON public.engagements
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'client_principal'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.client_portal_access cpa
      WHERE cpa.user_id = auth.uid()
        AND cpa.engagement_id = engagements.id
        AND cpa.is_active = true
        AND (cpa.expires_at IS NULL OR cpa.expires_at > now())
    )
  );

-- Allow client_principal to read brand_audit for their engagements
CREATE POLICY "Clients can view brand audit"
  ON public.brand_audit
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'client_principal'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.client_portal_access cpa
      WHERE cpa.user_id = auth.uid()
        AND cpa.engagement_id = brand_audit.engagement_id
        AND cpa.is_active = true
        AND (cpa.expires_at IS NULL OR cpa.expires_at > now())
    )
  );

-- Allow client_principal to read briefs for their engagements
CREATE POLICY "Clients can view briefs"
  ON public.briefs
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'client_principal'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.client_portal_access cpa
      WHERE cpa.user_id = auth.uid()
        AND cpa.engagement_id = briefs.engagement_id
        AND cpa.is_active = true
        AND (cpa.expires_at IS NULL OR cpa.expires_at > now())
    )
  );

-- Allow client_principal to read clients they're linked to
CREATE POLICY "Clients can view own client record"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'client_principal'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.client_portal_access cpa
        JOIN public.engagements e ON e.id = cpa.engagement_id
      WHERE cpa.user_id = auth.uid()
        AND e.client_id = clients.id
        AND cpa.is_active = true
        AND (cpa.expires_at IS NULL OR cpa.expires_at > now())
    )
  );
