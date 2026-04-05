-- Add submission tracking to prevent abuse
-- This migration adds fields to track failed submissions and rate limiting

-- Add columns to profiles table for rate limiting
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS failed_submissions_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_submission_attempt TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS submission_blocked_until TIMESTAMP WITH TIME ZONE;

-- Create a table to track submission attempts
CREATE TABLE IF NOT EXISTS public.submission_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL, -- 'success', 'rejected', 'failed'
  reason TEXT,
  title TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for tracking
CREATE INDEX idx_submission_attempts_user_id ON public.submission_attempts(user_id);
CREATE INDEX idx_submission_attempts_created_at ON public.submission_attempts(created_at);
CREATE INDEX idx_submission_attempts_status ON public.submission_attempts(status);

-- Enable RLS
ALTER TABLE public.submission_attempts ENABLE ROW LEVEL SECURITY;

-- Users can view their own submission attempts
DROP POLICY IF EXISTS "Users can view their own submission attempts" ON public.submission_attempts;
CREATE POLICY "Users can view their own submission attempts" ON public.submission_attempts
  FOR SELECT
  USING (user_id = auth.uid());

-- Admins can view all submission attempts
DROP POLICY IF EXISTS "Admins can view all submission attempts" ON public.submission_attempts;
CREATE POLICY "Admins can view all submission attempts" ON public.submission_attempts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- System can insert submission attempts
DROP POLICY IF EXISTS "System can insert submission attempts" ON public.submission_attempts;
CREATE POLICY "System can insert submission attempts" ON public.submission_attempts
  FOR INSERT
  WITH CHECK (true);
