-- Add missing Sohag district: Monsha'a (المنشأة)
-- This district appears in egypt-geo-complete.json under Sohag but was absent
-- from the sprint1 centers seed.  It belongs to the electoral district
-- "Sohag 3 - Girga & Dar El Salam".

INSERT INTO public.centers (
  governorate_en, governorate_ar, district_en, district_ar,
  electoral_district_en, electoral_district_ar, electoral_seats,
  code, name_en, name_ar
)
VALUES (
  'Sohag', 'سوهاج', 'Monsha''a', 'المنشأة',
  'Sohag 3 - Girga & Dar El Salam', 'سوهاج ٣ - جرجا ودار السلام', 2,
  md5(lower('sohag-monsha''a')), 'Monsha''a', 'المنشأة'
)
ON CONFLICT (governorate_en, district_en) DO NOTHING;
