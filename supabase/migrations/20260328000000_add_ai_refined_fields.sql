-- Add AI refined fields to issues table
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS refined_title TEXT;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS refined_description TEXT;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';

-- Update existing issues to have a default priority if needed
UPDATE public.issues SET priority = 'normal' WHERE priority IS NULL;
