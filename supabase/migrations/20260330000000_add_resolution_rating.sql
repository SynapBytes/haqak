-- Add rating columns to issues table
ALTER TABLE issues ADD COLUMN IF NOT EXISTS resolution_rating INTEGER CHECK (resolution_rating >= 1 AND resolution_rating <= 5);
ALTER TABLE issues ADD COLUMN IF NOT EXISTS resolution_feedback TEXT;

-- Update RLS policies to allow citizens to update their own issues with rating
CREATE POLICY update_rating_policy ON issues
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
