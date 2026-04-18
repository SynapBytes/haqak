-- Fix onboarding center redirect trap:
-- - Ensure governorates/centers schema and baseline data exist
-- - Ensure read access on governorates/centers for onboarding dropdowns
-- - Ensure authenticated users can update their own profile row

CREATE TABLE IF NOT EXISTS public.governorates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  governorate_en text NOT NULL,
  governorate_ar text NOT NULL,
  district_en text NOT NULL,
  district_ar text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (governorate_en, district_en)
);

ALTER TABLE public.centers
  ADD COLUMN IF NOT EXISTS governorate_id uuid;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS center_id uuid,
  ADD COLUMN IF NOT EXISTS governorate_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'centers_governorate_id_fkey'
      AND conrelid = 'public.centers'::regclass
  ) THEN
    ALTER TABLE public.centers
      ADD CONSTRAINT centers_governorate_id_fkey
      FOREIGN KEY (governorate_id)
      REFERENCES public.governorates(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_governorate_id_fkey'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_governorate_id_fkey
      FOREIGN KEY (governorate_id)
      REFERENCES public.governorates(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_center_id_fkey'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_center_id_fkey
      FOREIGN KEY (center_id)
      REFERENCES public.centers(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

INSERT INTO public.governorates (name_en, name_ar)
SELECT x.name_en, x.name_ar
FROM (
  VALUES
    ('Cairo', 'القاهرة'),
    ('Giza', 'الجيزة'),
    ('Alexandria', 'الإسكندرية'),
    ('Dakahlia', 'الدقهلية'),
    ('Red Sea', 'البحر الأحمر'),
    ('Beheira', 'البحيرة'),
    ('Fayoum', 'الفيوم'),
    ('Gharbia', 'الغربية'),
    ('Ismailia', 'الإسماعيلية'),
    ('Menoufia', 'المنوفية'),
    ('Minya', 'المنيا'),
    ('Qalyubia', 'القليوبية'),
    ('New Valley', 'الوادي الجديد'),
    ('Suez', 'السويس'),
    ('Aswan', 'أسوان'),
    ('Assiut', 'أسيوط'),
    ('Beni Suef', 'بني سويف'),
    ('Port Said', 'بورسعيد'),
    ('Damietta', 'دمياط'),
    ('Sharkia', 'الشرقية'),
    ('South Sinai', 'جنوب سيناء'),
    ('Kafr El Sheikh', 'كفر الشيخ'),
    ('Matrouh', 'مطروح'),
    ('Luxor', 'الأقصر'),
    ('Qena', 'قنا'),
    ('North Sinai', 'شمال سيناء'),
    ('Sohag', 'سوهاج')
) AS x(name_en, name_ar)
WHERE NOT EXISTS (SELECT 1 FROM public.governorates g WHERE g.name_en = x.name_en);

WITH seed(governorate_en, governorate_ar, district_en, district_ar) AS (
  VALUES
    ('Cairo', 'القاهرة', 'Nasr City', 'مدينة نصر'),
    ('Cairo', 'القاهرة', 'New Cairo', 'القاهرة الجديدة'),
    ('Cairo', 'القاهرة', 'Maadi', 'المعادي'),
    ('Giza', 'الجيزة', 'Dokki', 'الدقي'),
    ('Giza', 'الجيزة', 'Haram', 'الهرم'),
    ('Giza', 'الجيزة', 'Sixth of October', 'السادس من أكتوبر'),
    ('Alexandria', 'الإسكندرية', 'Montaza', 'المنتزه'),
    ('Alexandria', 'الإسكندرية', 'Raml', 'الرمل'),
    ('Alexandria', 'الإسكندرية', 'Borg El Arab', 'برج العرب'),
    ('Dakahlia', 'الدقهلية', 'Mansoura', 'المنصورة'),
    ('Dakahlia', 'الدقهلية', 'Mit Ghamr', 'ميت غمر'),
    ('Red Sea', 'البحر الأحمر', 'Hurghada', 'الغردقة'),
    ('Red Sea', 'البحر الأحمر', 'Marsa Alam', 'مرسى علم'),
    ('Beheira', 'البحيرة', 'Damanhour', 'دمنهور'),
    ('Beheira', 'البحيرة', 'Kafr El Dawwar', 'كفر الدوار'),
    ('Fayoum', 'الفيوم', 'Fayoum City', 'الفيوم'),
    ('Fayoum', 'الفيوم', 'Tamiya', 'طامية'),
    ('Gharbia', 'الغربية', 'Tanta', 'طنطا'),
    ('Gharbia', 'الغربية', 'El Mahalla', 'المحلة الكبرى'),
    ('Ismailia', 'الإسماعيلية', 'Ismailia', 'الإسماعيلية'),
    ('Ismailia', 'الإسماعيلية', 'Tel El Kebir', 'التل الكبير'),
    ('Menoufia', 'المنوفية', 'Shebin El Koum', 'شبين الكوم'),
    ('Menoufia', 'المنوفية', 'Ashmoun', 'أشمون'),
    ('Minya', 'المنيا', 'Minya', 'المنيا'),
    ('Minya', 'المنيا', 'Samalout', 'سمالوط'),
    ('Qalyubia', 'القليوبية', 'Banha', 'بنها'),
    ('Qalyubia', 'القليوبية', 'Shubra El Kheima', 'شبرا الخيمة'),
    ('New Valley', 'الوادي الجديد', 'Kharga', 'الخارجة'),
    ('New Valley', 'الوادي الجديد', 'Dakhla', 'الداخلة'),
    ('Suez', 'السويس', 'Suez', 'السويس'),
    ('Aswan', 'أسوان', 'Aswan', 'أسوان'),
    ('Aswan', 'أسوان', 'Kom Ombo', 'كوم أمبو'),
    ('Assiut', 'أسيوط', 'Assiut', 'أسيوط'),
    ('Assiut', 'أسيوط', 'Dairut', 'ديروط'),
    ('Beni Suef', 'بني سويف', 'Beni Suef', 'بني سويف'),
    ('Beni Suef', 'بني سويف', 'Biba', 'ببا'),
    ('Port Said', 'بورسعيد', 'Port Said', 'بورسعيد'),
    ('Damietta', 'دمياط', 'Damietta', 'دمياط'),
    ('Damietta', 'دمياط', 'New Damietta', 'دمياط الجديدة'),
    ('Sharkia', 'الشرقية', 'Zagazig', 'الزقازيق'),
    ('Sharkia', 'الشرقية', '10th of Ramadan', 'العاشر من رمضان'),
    ('South Sinai', 'جنوب سيناء', 'Sharm El Sheikh', 'شرم الشيخ'),
    ('South Sinai', 'جنوب سيناء', 'El Tor', 'الطور'),
    ('Kafr El Sheikh', 'كفر الشيخ', 'Kafr El Sheikh', 'كفر الشيخ'),
    ('Kafr El Sheikh', 'كفر الشيخ', 'Desouk', 'دسوق'),
    ('Matrouh', 'مطروح', 'Marsa Matrouh', 'مرسى مطروح'),
    ('Matrouh', 'مطروح', 'El Alamein', 'العلمين'),
    ('Luxor', 'الأقصر', 'Luxor', 'الأقصر'),
    ('Luxor', 'الأقصر', 'Esna', 'إسنا'),
    ('Qena', 'قنا', 'Qena', 'قنا'),
    ('Qena', 'قنا', 'Nag Hammadi', 'نجع حمادي'),
    ('North Sinai', 'شمال سيناء', 'Arish', 'العريش'),
    ('North Sinai', 'شمال سيناء', 'Bir El Abd', 'بئر العبد'),
    ('Sohag', 'سوهاج', 'Sohag', 'سوهاج'),
    ('Sohag', 'سوهاج', 'Akhmim', 'أخميم')
)
INSERT INTO public.centers (governorate_en, governorate_ar, district_en, district_ar)
SELECT s.governorate_en, s.governorate_ar, s.district_en, s.district_ar
FROM seed s
ON CONFLICT (governorate_en, district_en) DO NOTHING;

UPDATE public.centers c
SET governorate_id = g.id
FROM public.governorates g
WHERE c.governorate_id IS NULL
  AND g.name_en = c.governorate_en;

UPDATE public.profiles p
SET governorate_id = c.governorate_id
FROM public.centers c
WHERE p.center_id = c.id
  AND p.governorate_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_centers_governorate_id ON public.centers(governorate_id);
CREATE INDEX IF NOT EXISTS idx_profiles_governorate_id ON public.profiles(governorate_id);
CREATE INDEX IF NOT EXISTS idx_profiles_center_id ON public.profiles(center_id);

ALTER TABLE public.governorates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read governorates" ON public.governorates;
CREATE POLICY "Anyone can read governorates" ON public.governorates
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role manages governorates" ON public.governorates;
CREATE POLICY "Service role manages governorates" ON public.governorates
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read centers" ON public.centers;
CREATE POLICY "Anyone can read centers" ON public.centers
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role manages centers" ON public.centers;
CREATE POLICY "Service role manages centers" ON public.centers
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
