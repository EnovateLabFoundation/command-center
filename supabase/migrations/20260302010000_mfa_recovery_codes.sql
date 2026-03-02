-- ============================================================
-- Migration: 20260302010000_mfa_recovery_codes
-- Adds recovery_codes column to profiles for MFA recovery
-- ============================================================

-- Add recovery_codes: array of SHA-256 hashed codes (JSONB for flexibility)
-- Each entry is a hex-encoded SHA-256 hash of the raw recovery code.
-- Codes are removed after use (splice pattern).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS recovery_codes JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Index for efficient lookup (partial index since most rows will have empty arrays)
CREATE INDEX IF NOT EXISTS idx_profiles_has_recovery_codes
  ON public.profiles USING gin(recovery_codes)
  WHERE jsonb_array_length(recovery_codes) > 0;

-- Comment for documentation
COMMENT ON COLUMN public.profiles.recovery_codes IS
  'Array of SHA-256 hex hashes of one-time MFA recovery codes. '
  'Codes are removed on use. Generated during MFA setup.';
