-- Rename registration_number to membership_number in profiles table
ALTER TABLE public.profiles RENAME COLUMN registration_number TO membership_number;

-- Add check constraint for membership_number range (1-568)
-- We first cast to integer to perform the check, assuming it's stored as text
ALTER TABLE public.profiles 
ADD CONSTRAINT membership_number_range 
CHECK (
  membership_number IS NULL OR 
  (membership_number ~ '^[0-9]+$' AND membership_number::INTEGER BETWEEN 1 AND 568)
);

-- Add unique constraint for membership_number to prevent duplicates
ALTER TABLE public.profiles ADD CONSTRAINT membership_number_unique UNIQUE (membership_number);

-- Update the handle_new_user function to use the new column name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone, membership_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NEW.raw_user_meta_data->>'membership_number'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'citizen'::app_role)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
