-- Add banned_until column to profiles for weekly ban system
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_until timestamp with time zone DEFAULT NULL;