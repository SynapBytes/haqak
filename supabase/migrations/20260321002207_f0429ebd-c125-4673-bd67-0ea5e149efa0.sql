-- Add latitude and longitude columns to issues table for GIS
ALTER TABLE public.issues ADD COLUMN latitude double precision;
ALTER TABLE public.issues ADD COLUMN longitude double precision;