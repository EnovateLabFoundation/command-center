-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Notifications table + Audit log hash chain + Security hardening
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Notifications ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type          TEXT        NOT NULL DEFAULT 'system'
    CHECK (type IN (
      'escalation','crisis','overdue','quality_gate',
      'portal_access','system','sentiment','scenario',
      'content','report'
    )),
  title         TEXT        NOT NULL,
  body          TEXT,
  link_to       TEXT,
  is_read       BOOLEAN     NOT NULL DEFAULT FALSE,
  engagement_id UUID        REFERENCES engagements(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID        REFERENCES profiles(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS notifications_user_id_idx
  ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON notifications(user_id, is_read)
  WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS notifications_created_at_idx
  ON notifications(created_at DESC);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;


-- ── Audit log hash chain ──────────────────────────────────────────────────────
-- Add hash_chain column to audit_logs for tamper detection.
-- Each row stores SHA-256(previous_hash || current_row_content).

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS hash_chain TEXT;

-- Function: compute hash for audit log entry
CREATE OR REPLACE FUNCTION compute_audit_hash(
  p_prev_hash TEXT,
  p_user_id   UUID,
  p_action    TEXT,
  p_table_name TEXT,
  p_record_id TEXT,
  p_created_at TIMESTAMPTZ
) RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    digest(
      COALESCE(p_prev_hash, 'GENESIS') ||
      COALESCE(p_user_id::TEXT, '') ||
      COALESCE(p_action, '') ||
      COALESCE(p_table_name, '') ||
      COALESCE(p_record_id, '') ||
      COALESCE(p_created_at::TEXT, ''),
      'sha256'
    ),
    'hex'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-compute hash chain on insert
CREATE OR REPLACE FUNCTION audit_log_hash_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_prev_hash TEXT;
BEGIN
  -- Get previous entry's hash
  SELECT hash_chain INTO v_prev_hash
  FROM audit_logs
  ORDER BY created_at DESC
  LIMIT 1;

  NEW.hash_chain := compute_audit_hash(
    v_prev_hash,
    NEW.user_id,
    NEW.action,
    NEW.table_name,
    NEW.record_id::TEXT,
    NEW.created_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_hash_chain ON audit_logs;
CREATE TRIGGER audit_log_hash_chain
  BEFORE INSERT ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_log_hash_trigger();


-- ── Storage security policies ─────────────────────────────────────────────────
-- Restrict uploads to known MIME types and max 50MB per file.
-- Path must match /engagements/{engagement_id}/... pattern.

-- Create engagement-files bucket if not exists (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'engagement-files',
  'engagement-files',
  false,
  52428800,  -- 50MB in bytes
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.ms-excel',
    'video/mp4'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit  = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS: authenticated users can upload to their engagement path
CREATE POLICY IF NOT EXISTS "Engagement file upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'engagement-files'
    AND name ~ '^engagements/[0-9a-f-]+/.+'
  );

CREATE POLICY IF NOT EXISTS "Engagement file read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'engagement-files');

CREATE POLICY IF NOT EXISTS "Engagement file delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'engagement-files');

