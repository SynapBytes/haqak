-- Mobile App Features: FaceID & GeoTagged Photos (Strategic Enhancement 5)

-- 1. Identity Verification: FaceID & Biometric Enrollment
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS biometric_enrolled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS biometric_public_key TEXT, -- For WebAuthn/FaceID verification
ADD COLUMN IF NOT EXISTS last_biometric_auth TIMESTAMP WITH TIME ZONE;

-- 2. GeoTagged Photos: Ensuring location integrity
ALTER TABLE public.issue_attachments
ADD COLUMN IF NOT EXISTS is_geotagged BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS metadata_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS metadata_lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS metadata_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS device_info TEXT; -- e.g., 'iPhone 15 Pro, iOS 17.4'

-- 3. Function to verify Geotagged Photos (Simulated)
-- In production, this would be a trigger that extracts EXIF data from the uploaded file
CREATE OR REPLACE FUNCTION public.verify_geotagged_photo()
RETURNS TRIGGER AS $$
BEGIN
    -- Logic: If metadata_lat/lng is present, mark as geotagged
    IF NEW.metadata_lat IS NOT NULL AND NEW.metadata_lng IS NOT NULL THEN
        NEW.is_geotagged := true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_verify_geotagged
BEFORE INSERT ON public.issue_attachments
FOR EACH ROW EXECUTE FUNCTION public.verify_geotagged_photo();

-- 4. Mobile Push Notification Tokens (Already exists in Haqak, but we'll ensure it's ready)
-- Table fcm_tokens already exists in types.ts

-- 5. Citizen Profile: Mobile App Settings
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS mobile_app_version TEXT,
ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT true;
