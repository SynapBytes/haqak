
-- Add MP profile fields for constituency info
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS constituency text,
  ADD COLUMN IF NOT EXISTS governorate text,
  ADD COLUMN IF NOT EXISTS center text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS contact_phone text;
