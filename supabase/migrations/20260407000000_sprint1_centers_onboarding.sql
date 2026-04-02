-- Sprint 1: canonical Egypt centers and onboarding scoping

CREATE TABLE IF NOT EXISTS public.centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  governorate_en text NOT NULL,
  governorate_ar text NOT NULL,
  district_en text NOT NULL,
  district_ar text NOT NULL,
  electoral_district_en text NULL,
  electoral_district_ar text NULL,
  electoral_seats integer NULL CHECK (electoral_seats IS NULL OR electoral_seats >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (governorate_en, district_en)
);

CREATE INDEX IF NOT EXISTS idx_centers_governorate_en ON public.centers (governorate_en);
CREATE INDEX IF NOT EXISTS idx_centers_district_en ON public.centers (district_en);

ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read centers" ON public.centers;
CREATE POLICY "Anyone can read centers" ON public.centers
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role manages centers" ON public.centers;
CREATE POLICY "Service role manages centers" ON public.centers
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

INSERT INTO public.centers (
  governorate_en, governorate_ar, district_en, district_ar, electoral_district_en, electoral_district_ar, electoral_seats
)
VALUES
  ('Cairo', 'القاهرة', 'Nasr City', 'مدينة نصر', 'Cairo 1 - Nasr City, Heliopolis & Nozha', 'القاهرة ١ - مدينة نصر ومصر الجديدة والنزهة', 4),
  ('Cairo', 'القاهرة', 'Heliopolis', 'مصر الجديدة', 'Cairo 1 - Nasr City, Heliopolis & Nozha', 'القاهرة ١ - مدينة نصر ومصر الجديدة والنزهة', 4),
  ('Cairo', 'القاهرة', 'Nozha', 'النزهة', 'Cairo 1 - Nasr City, Heliopolis & Nozha', 'القاهرة ١ - مدينة نصر ومصر الجديدة والنزهة', 4),
  ('Cairo', 'القاهرة', 'New Cairo', 'القاهرة الجديدة', 'Cairo 2 - New Cairo, Shorouk, Badr', 'القاهرة ٢ - القاهرة الجديدة والشروق وبدر', 3),
  ('Cairo', 'القاهرة', 'El Shorouk', 'الشروق', 'Cairo 2 - New Cairo, Shorouk, Badr', 'القاهرة ٢ - القاهرة الجديدة والشروق وبدر', 3),
  ('Cairo', 'القاهرة', 'Badr City', 'بدر', 'Cairo 2 - New Cairo, Shorouk, Badr', 'القاهرة ٢ - القاهرة الجديدة والشروق وبدر', 3),
  ('Cairo', 'القاهرة', 'Fifth Settlement', 'التجمع الخامس', 'Cairo 2 - New Cairo, Shorouk, Badr', 'القاهرة ٢ - القاهرة الجديدة والشروق وبدر', 3),
  ('Cairo', 'القاهرة', 'Third Settlement', 'التجمع الثالث', 'Cairo 2 - New Cairo, Shorouk, Badr', 'القاهرة ٢ - القاهرة الجديدة والشروق وبدر', 3),
  ('Cairo', 'القاهرة', 'First Settlement', 'التجمع الأول', 'Cairo 2 - New Cairo, Shorouk, Badr', 'القاهرة ٢ - القاهرة الجديدة والشروق وبدر', 3),
  ('Cairo', 'القاهرة', 'Maadi', 'المعادي', 'Cairo 3 - Maadi to Mokattam', 'القاهرة ٣ - المعادي والمقطم والبساتين', 3),
  ('Cairo', 'القاهرة', 'Helwan', 'حلوان', 'Cairo 4 - Helwan & 15 May', 'القاهرة ٤ - حلوان و15 مايو', 2),
  ('Cairo', 'القاهرة', 'Fifteen May', '15 مايو', 'Cairo 4 - Helwan & 15 May', 'القاهرة ٤ - حلوان و15 مايو', 2),
  ('Cairo', 'القاهرة', 'Dar El Salam', 'دار السلام', 'Cairo 3 - Maadi to Mokattam', 'القاهرة ٣ - المعادي والمقطم والبساتين', 3),
  ('Cairo', 'القاهرة', 'Basatin', 'البساتين', 'Cairo 3 - Maadi to Mokattam', 'القاهرة ٣ - المعادي والمقطم والبساتين', 3),
  ('Cairo', 'القاهرة', 'Mokattam', 'المقطم', 'Cairo 3 - Maadi to Mokattam', 'القاهرة ٣ - المعادي والمقطم والبساتين', 3),
  ('Cairo', 'القاهرة', 'Old Cairo', 'مصر القديمة', 'Cairo 6 - Downtown & Historic Cairo', 'القاهرة ٦ - وسط القاهرة والمناطق التاريخية', 3),
  ('Cairo', 'القاهرة', 'El Sayeda Zeinab', 'السيدة زينب', 'Cairo 6 - Downtown & Historic Cairo', 'القاهرة ٦ - وسط القاهرة والمناطق التاريخية', 3),
  ('Cairo', 'القاهرة', 'Abdeen', 'عابدين', 'Cairo 6 - Downtown & Historic Cairo', 'القاهرة ٦ - وسط القاهرة والمناطق التاريخية', 3),
  ('Cairo', 'القاهرة', 'Qasr El Nil', 'قصر النيل', 'Cairo 6 - Downtown & Historic Cairo', 'القاهرة ٦ - وسط القاهرة والمناطق التاريخية', 3),
  ('Cairo', 'القاهرة', 'Down Town', 'وسط القاهرة', 'Cairo 6 - Downtown & Historic Cairo', 'القاهرة ٦ - وسط القاهرة والمناطق التاريخية', 3),
  ('Cairo', 'القاهرة', 'El Waily', 'الوايلي', NULL, NULL, NULL),
  ('Cairo', 'القاهرة', 'El Daher', 'الظاهر', NULL, NULL, NULL),
  ('Cairo', 'القاهرة', 'El Salam', 'السلام', 'Cairo 5 - Eastern Belt', 'القاهرة ٥ - السلام والمرج وعين شمس والمطرية', 3),
  ('Cairo', 'القاهرة', 'El Marg', 'المرج', 'Cairo 5 - Eastern Belt', 'القاهرة ٥ - السلام والمرج وعين شمس والمطرية', 3),
  ('Cairo', 'القاهرة', 'Ain Shams', 'عين شمس', 'Cairo 5 - Eastern Belt', 'القاهرة ٥ - السلام والمرج وعين شمس والمطرية', 3),
  ('Cairo', 'القاهرة', 'Matariya', 'المطرية', 'Cairo 5 - Eastern Belt', 'القاهرة ٥ - السلام والمرج وعين شمس والمطرية', 3),
  ('Cairo', 'القاهرة', 'Sheraton', 'مساكن شيراتون', NULL, NULL, NULL),
  ('Cairo', 'القاهرة', 'Shubra', 'شبرا', NULL, NULL, NULL),
  ('Cairo', 'القاهرة', 'El Sahel', 'الساحل', NULL, NULL, NULL),
  ('Cairo', 'القاهرة', 'Rod El Farag', 'روض الفرج', NULL, NULL, NULL),
  ('Cairo', 'القاهرة', 'Bulaq', 'بولاق', 'Cairo 6 - Downtown & Historic Cairo', 'القاهرة ٦ - وسط القاهرة والمناطق التاريخية', 3),
  ('Cairo', 'القاهرة', 'Hadaeq El Kobba', 'حدائق القبة', NULL, NULL, NULL),
  ('Cairo', 'القاهرة', 'Zaytoun', 'الزيتون', NULL, NULL, NULL),
  ('Cairo', 'القاهرة', 'El Zawya El Hamra', 'الزاوية الحمراء', NULL, NULL, NULL),
  ('Giza', 'الجيزة', 'Dokki', 'الدقي', 'Giza 1 - Dokki, Agouza & Imbaba', 'الجيزة ١ - الدقي والعجوزة وإمبابة', 3),
  ('Giza', 'الجيزة', 'Agouza', 'العجوزة', 'Giza 1 - Dokki, Agouza & Imbaba', 'الجيزة ١ - الدقي والعجوزة وإمبابة', 3),
  ('Giza', 'الجيزة', 'Imbaba', 'إمبابة', 'Giza 1 - Dokki, Agouza & Imbaba', 'الجيزة ١ - الدقي والعجوزة وإمبابة', 3),
  ('Giza', 'الجيزة', 'Mohandessin', 'المهندسين', 'Giza 1 - Dokki, Agouza & Imbaba', 'الجيزة ١ - الدقي والعجوزة وإمبابة', 3),
  ('Giza', 'الجيزة', 'Bulaq El Dakrour', 'بولاق الدكرور', 'Giza 3 - Giza City & Bulaq', 'الجيزة ٣ - قسم الجيزة وبولاق الدكرور', 2),
  ('Giza', 'الجيزة', 'Haram', 'الهرم', 'Giza 2 - Haram, Faisal & Omraneya', 'الجيزة ٢ - الهرم وفيصل والعمرانية', 3),
  ('Giza', 'الجيزة', 'Faisal', 'فيصل', 'Giza 2 - Haram, Faisal & Omraneya', 'الجيزة ٢ - الهرم وفيصل والعمرانية', 3),
  ('Giza', 'الجيزة', 'Omraneya', 'العمرانية', 'Giza 2 - Haram, Faisal & Omraneya', 'الجيزة ٢ - الهرم وفيصل والعمرانية', 3),
  ('Giza', 'الجيزة', 'Giza City', 'قسم الجيزة', 'Giza 3 - Giza City & Bulaq', 'الجيزة ٣ - قسم الجيزة وبولاق الدكرور', 2),
  ('Giza', 'الجيزة', 'Warraq', 'الوراق', 'Giza 4 - North Giza', 'الجيزة ٤ - الوراق وكرداسة وأوسيم', 2),
  ('Giza', 'الجيزة', 'Kerdasa', 'كرداسة', 'Giza 4 - North Giza', 'الجيزة ٤ - الوراق وكرداسة وأوسيم', 2),
  ('Giza', 'الجيزة', 'Sheikh Zayed', 'الشيخ زايد', 'Giza 5 - October & Sheikh Zayed', 'الجيزة ٥ - السادس من أكتوبر والشيخ زايد', 2),
  ('Giza', 'الجيزة', 'Sixth of October', 'السادس من أكتوبر', 'Giza 5 - October & Sheikh Zayed', 'الجيزة ٥ - السادس من أكتوبر والشيخ زايد', 2),
  ('Giza', 'الجيزة', 'Atfih', 'أطفيح', 'Giza 6 - Southern Giza', 'الجيزة ٦ - أطفيح والصف والبدرشين', 2),
  ('Giza', 'الجيزة', 'Al Saf', 'الصف', 'Giza 6 - Southern Giza', 'الجيزة ٦ - أطفيح والصف والبدرشين', 2),
  ('Giza', 'الجيزة', 'Badrashein', 'البدرشين', 'Giza 6 - Southern Giza', 'الجيزة ٦ - أطفيح والصف والبدرشين', 2),
  ('Giza', 'الجيزة', 'Awsim', 'أوسيم', 'Giza 4 - North Giza', 'الجيزة ٤ - الوراق وكرداسة وأوسيم', 2),
  ('Giza', 'الجيزة', 'Manshiyet El Bakry', 'منشأة البكري', NULL, NULL, NULL),
  ('Alexandria', 'الإسكندرية', 'Montaza', 'المنتزه', 'Alexandria 1 - Eastern', 'الإسكندرية ١ - شرق الإسكندرية', 3),
  ('Alexandria', 'الإسكندرية', 'Sidi Gaber', 'سيدي جابر', 'Alexandria 1 - Eastern', 'الإسكندرية ١ - شرق الإسكندرية', 3),
  ('Alexandria', 'الإسكندرية', 'Raml', 'الرمل', 'Alexandria 1 - Eastern', 'الإسكندرية ١ - شرق الإسكندرية', 3),
  ('Alexandria', 'الإسكندرية', 'Bab Sharq', 'باب شرقي', 'Alexandria 2 - Central', 'الإسكندرية ٢ - وسط الإسكندرية', 2),
  ('Alexandria', 'الإسكندرية', 'Attarin', 'العطارين', 'Alexandria 2 - Central', 'الإسكندرية ٢ - وسط الإسكندرية', 2),
  ('Alexandria', 'الإسكندرية', 'Mansheya', 'المنشية', 'Alexandria 2 - Central', 'الإسكندرية ٢ - وسط الإسكندرية', 2),
  ('Alexandria', 'الإسكندرية', 'Labban', 'اللبان', 'Alexandria 2 - Central', 'الإسكندرية ٢ - وسط الإسكندرية', 2),
  ('Alexandria', 'الإسكندرية', 'Dekheila', 'الدخيلة', 'Alexandria 3 - Western & Borg El Arab', 'الإسكندرية ٣ - غرب والعامرية وبرج العرب', 3),
  ('Alexandria', 'الإسكندرية', 'Amreya', 'العامرية', 'Alexandria 3 - Western & Borg El Arab', 'الإسكندرية ٣ - غرب والعامرية وبرج العرب', 3),
  ('Alexandria', 'الإسكندرية', 'Borg El Arab', 'برج العرب', 'Alexandria 3 - Western & Borg El Arab', 'الإسكندرية ٣ - غرب والعامرية وبرج العرب', 3),
  ('Alexandria', 'الإسكندرية', 'Agamy', 'العجمي', 'Alexandria 3 - Western & Borg El Arab', 'الإسكندرية ٣ - غرب والعامرية وبرج العرب', 3),
  ('Red Sea', 'البحر الأحمر', 'Hurghada', 'الغردقة', 'Red Sea 1 - Northern', 'البحر الأحمر ١ - الشمال', 1),
  ('Red Sea', 'البحر الأحمر', 'Safaga', 'سفاجا', 'Red Sea 2 - Central', 'البحر الأحمر ٢ - الوسط', 1),
  ('Red Sea', 'البحر الأحمر', 'Quseir', 'القصير', 'Red Sea 2 - Central', 'البحر الأحمر ٢ - الوسط', 1),
  ('Red Sea', 'البحر الأحمر', 'Ras Gharib', 'رأس غارب', 'Red Sea 1 - Northern', 'البحر الأحمر ١ - الشمال', 1),
  ('Red Sea', 'البحر الأحمر', 'Marsa Alam', 'مرسى علم', 'Red Sea 2 - Central', 'البحر الأحمر ٢ - الوسط', 1),
  ('Red Sea', 'البحر الأحمر', 'Shalateen', 'الشلاتين', 'Red Sea 3 - Southern', 'البحر الأحمر ٣ - الجنوب', 1),
  ('Red Sea', 'البحر الأحمر', 'Halayeb', 'حلايب', 'Red Sea 3 - Southern', 'البحر الأحمر ٣ - الجنوب', 1),
  ('Beheira', 'البحيرة', 'Damanhour', 'دمنهور', 'Beheira 1 - Damanhour', 'البحيرة ١ - دمنهور', 2),
  ('Beheira', 'البحيرة', 'Kafr El Dawwar', 'كفر الدوار', 'Beheira 2 - Kafr El Dawwar', 'البحيرة ٢ - كفر الدوار', 2),
  ('Beheira', 'البحيرة', 'Rashid', 'رشيد', 'Beheira 3 - Northern Coast', 'البحيرة ٣ - رشيد وإدكو', 1),
  ('Beheira', 'البحيرة', 'Edku', 'إدكو', 'Beheira 3 - Northern Coast', 'البحيرة ٣ - رشيد وإدكو', 1),
  ('Beheira', 'البحيرة', 'Abu Hummus', 'أبو حمص', 'Beheira 4 - Central', 'البحيرة ٤ - أبو حمص وأبو المطامير وإيتاي البارود', 3),
  ('Beheira', 'البحيرة', 'Abu El Matamir', 'أبو المطامير', 'Beheira 4 - Central', 'البحيرة ٤ - أبو حمص وأبو المطامير وإيتاي البارود', 3),
  ('Beheira', 'البحيرة', 'Mahmoudiya', 'المحمودية', NULL, NULL, NULL),
  ('Beheira', 'البحيرة', 'Rahmaniya', 'الرحمانية', 'Beheira 5 - Southern', 'البحيرة ٥ - كوم حمادة والدلنجات والرحمانية', 3),
  ('Beheira', 'البحيرة', 'Shubrakhit', 'شبراخيت', 'Beheira 5 - Southern', 'البحيرة ٥ - كوم حمادة والدلنجات والرحمانية', 3),
  ('Beheira', 'البحيرة', 'Hosh Essa', 'حوش عيسى', 'Beheira 5 - Southern', 'البحيرة ٥ - كوم حمادة والدلنجات والرحمانية', 3),
  ('Beheira', 'البحيرة', 'Delengat', 'الدلنجات', 'Beheira 5 - Southern', 'البحيرة ٥ - كوم حمادة والدلنجات والرحمانية', 3),
  ('Beheira', 'البحيرة', 'Kom Hamada', 'كوم حمادة', 'Beheira 5 - Southern', 'البحيرة ٥ - كوم حمادة والدلنجات والرحمانية', 3),
  ('Beheira', 'البحيرة', 'Itay El Barud', 'إيتاي البارود', 'Beheira 4 - Central', 'البحيرة ٤ - أبو حمص وأبو المطامير وإيتاي البارود', 3),
  ('Beheira', 'البحيرة', 'Wadi El Natrun', 'وادي النطرون', 'Beheira 6 - Wadi El Natrun', 'البحيرة ٦ - وادي النطرون', 1),
  ('Fayoum', 'الفيوم', 'Fayoum City', 'الفيوم', 'Fayoum 1 - Fayoum City', 'الفيوم ١ - مدينة الفيوم', 2),
  ('Fayoum', 'الفيوم', 'New Fayoum', 'الفيوم الجديدة', 'Fayoum 1 - Fayoum City', 'الفيوم ١ - مدينة الفيوم', 2),
  ('Fayoum', 'الفيوم', 'Tamiya', 'طامية', 'Fayoum 2 - Tamiya & Sinnuris', 'الفيوم ٢ - طامية وسنورس', 2),
  ('Fayoum', 'الفيوم', 'Sinnuris', 'سنورس', 'Fayoum 2 - Tamiya & Sinnuris', 'الفيوم ٢ - طامية وسنورس', 2),
  ('Fayoum', 'الفيوم', 'Itsa', 'إطسا', 'Fayoum 3 - Itsa & Ebsheway', 'الفيوم ٣ - إطسا وإبشواي', 2),
  ('Fayoum', 'الفيوم', 'Ebsheway', 'إبشواي', 'Fayoum 3 - Itsa & Ebsheway', 'الفيوم ٣ - إطسا وإبشواي', 2),
  ('Fayoum', 'الفيوم', 'Yousef El Seddik', 'يوسف الصديق', 'Fayoum 3 - Itsa & Ebsheway', 'الفيوم ٣ - إطسا وإبشواي', 2),
  ('Gharbia', 'الغربية', 'Tanta', 'طنطا', 'Gharbia 1 - Tanta', 'الغربية ١ - طنطا', 2),
  ('Gharbia', 'الغربية', 'El Mahalla', 'المحلة الكبرى', 'Gharbia 2 - El Mahalla', 'الغربية ٢ - المحلة الكبرى', 3),
  ('Gharbia', 'الغربية', 'Zefta', 'زفتى', 'Gharbia 3 - Zefta & Santa', 'الغربية ٣ - زفتى والسنطة', 2),
  ('Gharbia', 'الغربية', 'Kafr El Zayat', 'كفر الزيات', 'Gharbia 4 - Northern', 'الغربية ٤ - كفر الزيات وبسيون وقطور', 3),
  ('Gharbia', 'الغربية', 'Basyoun', 'بسيون', 'Gharbia 4 - Northern', 'الغربية ٤ - كفر الزيات وبسيون وقطور', 3),
  ('Gharbia', 'الغربية', 'Samanoud', 'سمنود', 'Gharbia 4 - Northern', 'الغربية ٤ - كفر الزيات وبسيون وقطور', 3),
  ('Gharbia', 'الغربية', 'Qutour', 'قطور', 'Gharbia 4 - Northern', 'الغربية ٤ - كفر الزيات وبسيون وقطور', 3),
  ('Gharbia', 'الغربية', 'Santa', 'السنطة', 'Gharbia 3 - Zefta & Santa', 'الغربية ٣ - زفتى والسنطة', 2),
  ('Ismailia', 'الإسماعيلية', 'Ismailia', 'الإسماعيلية', 'Ismailia 1 - Ismailia', 'الإسماعيلية ١ - مدينة الإسماعيلية', 2),
  ('Ismailia', 'الإسماعيلية', 'Fayed', 'فايد', 'Ismailia 2 - Canal Belt', 'الإسماعيلية ٢ - فايد والتل الكبير', 1),
  ('Ismailia', 'الإسماعيلية', 'Tel El Kebir', 'التل الكبير', 'Ismailia 2 - Canal Belt', 'الإسماعيلية ٢ - فايد والتل الكبير', 1),
  ('Ismailia', 'الإسماعيلية', 'Qantara West', 'القنطرة غرب', 'Ismailia 3 - Qantara', 'الإسماعيلية ٣ - القنطرة شرق وغرب', 1),
  ('Ismailia', 'الإسماعيلية', 'Qantara East', 'القنطرة شرق', 'Ismailia 3 - Qantara', 'الإسماعيلية ٣ - القنطرة شرق وغرب', 1),
  ('Ismailia', 'الإسماعيلية', 'Abu Suwir', 'أبو صوير', 'Ismailia 3 - Qantara', 'الإسماعيلية ٣ - القنطرة شرق وغرب', 1),
  ('Menoufia', 'المنوفية', 'Shebin El Koum', 'شبين الكوم', 'Menoufia 1 - Shebin & Quesna', 'المنوفية ١ - شبين الكوم وقويسنا', 2),
  ('Menoufia', 'المنوفية', 'Menouf', 'منوف', 'Menoufia 2 - Menouf & Sadat', 'المنوفية ٢ - منوف والسادات', 1),
  ('Menoufia', 'المنوفية', 'Ashmoun', 'أشمون', 'Menoufia 4 - Ashmoun & Bagour', 'المنوفية ٤ - أشمون والباجور', 2),
  ('Menoufia', 'المنوفية', 'Tala', 'تلا', 'Menoufia 3 - Tala & Berket', 'المنوفية ٣ - تلا وبركة السبع', 1),
  ('Menoufia', 'المنوفية', 'Quesna', 'قويسنا', 'Menoufia 1 - Shebin & Quesna', 'المنوفية ١ - شبين الكوم وقويسنا', 2),
  ('Menoufia', 'المنوفية', 'Bagour', 'الباجور', 'Menoufia 4 - Ashmoun & Bagour', 'المنوفية ٤ - أشمون والباجور', 2),
  ('Menoufia', 'المنوفية', 'Berket El Sabaa', 'بركة السبع', 'Menoufia 3 - Tala & Berket', 'المنوفية ٣ - تلا وبركة السبع', 1),
  ('Menoufia', 'المنوفية', 'Sadat City', 'السادات', 'Menoufia 2 - Menouf & Sadat', 'المنوفية ٢ - منوف والسادات', 1),
  ('Minya', 'المنيا', 'Minya', 'المنيا', 'Minya 1 - Minya & Abu Qurqas', 'المنيا ١ - المنيا وأبو قرقاص', 2),
  ('Minya', 'المنيا', 'New Minya', 'المنيا الجديدة', 'Minya 1 - Minya & Abu Qurqas', 'المنيا ١ - المنيا وأبو قرقاص', 2),
  ('Minya', 'المنيا', 'Samalout', 'سمالوط', 'Minya 2 - Samalout & Matay', 'المنيا ٢ - سمالوط ومطاي', 2),
  ('Minya', 'المنيا', 'Matay', 'مطاي', 'Minya 2 - Samalout & Matay', 'المنيا ٢ - سمالوط ومطاي', 2),
  ('Minya', 'المنيا', 'Maghagha', 'مغاغة', 'Minya 3 - Maghagha & Beni Mazar', 'المنيا ٣ - مغاغة وبني مزار', 2),
  ('Minya', 'المنيا', 'Beni Mazar', 'بني مزار', 'Minya 3 - Maghagha & Beni Mazar', 'المنيا ٣ - مغاغة وبني مزار', 2),
  ('Minya', 'المنيا', 'Malawi', 'ملوي', 'Minya 4 - Malawi & Deir Mawas', 'المنيا ٤ - ملوي ودير مواس', 2),
  ('Minya', 'المنيا', 'Deir Mawas', 'دير مواس', 'Minya 4 - Malawi & Deir Mawas', 'المنيا ٤ - ملوي ودير مواس', 2),
  ('Minya', 'المنيا', 'Abu Qurqas', 'أبو قرقاص', 'Minya 1 - Minya & Abu Qurqas', 'المنيا ١ - المنيا وأبو قرقاص', 2),
  ('Minya', 'المنيا', 'Al Adwa', 'العدوة', 'Minya 3 - Maghagha & Beni Mazar', 'المنيا ٣ - مغاغة وبني مزار', 2),
  ('Qalyubia', 'القليوبية', 'Banha', 'بنها', 'Qalyubia 1 - Banha & Qalyub', 'القليوبية ١ - بنها وقليوب', 2),
  ('Qalyubia', 'القليوبية', 'Qalyub', 'قليوب', 'Qalyubia 1 - Banha & Qalyub', 'القليوبية ١ - بنها وقليوب', 2),
  ('Qalyubia', 'القليوبية', 'Shubra El Kheima', 'شبرا الخيمة', 'Qalyubia 2 - Shubra', 'القليوبية ٢ - شبرا الخيمة', 2),
  ('Qalyubia', 'القليوبية', 'Shibin El Qanater', 'شبين القناطر', 'Qalyubia 4 - Qanater & Shibin', 'القليوبية ٤ - القناطر الخيرية وشبين القناطر', 1),
  ('Qalyubia', 'القليوبية', 'Qanater El Khayriya', 'القناطر الخيرية', 'Qalyubia 4 - Qanater & Shibin', 'القليوبية ٤ - القناطر الخيرية وشبين القناطر', 1),
  ('Qalyubia', 'القليوبية', 'Toukh', 'طوخ', 'Qalyubia 3 - Toukh & Kafr Shukr', 'القليوبية ٣ - طوخ وكفر شكر', 2),
  ('Qalyubia', 'القليوبية', 'Kafr Shukr', 'كفر شكر', 'Qalyubia 3 - Toukh & Kafr Shukr', 'القليوبية ٣ - طوخ وكفر شكر', 2),
  ('Qalyubia', 'القليوبية', 'El Khanka', 'الخانكة', 'Qalyubia 5 - Khanka & Obour', 'القليوبية ٥ - الخانكة والعبور', 1),
  ('Qalyubia', 'القليوبية', 'El Obour', 'العبور', 'Qalyubia 5 - Khanka & Obour', 'القليوبية ٥ - الخانكة والعبور', 1),
  ('Qalyubia', 'القليوبية', 'Qaha', 'قها', 'Qalyubia 5 - Khanka & Obour', 'القليوبية ٥ - الخانكة والعبور', 1),
  ('New Valley', 'الوادي الجديد', 'Kharga', 'الخارجة', 'New Valley - Single District', 'الوادي الجديد - دائرة واحدة', 2),
  ('New Valley', 'الوادي الجديد', 'Dakhla', 'الداخلة', 'New Valley - Single District', 'الوادي الجديد - دائرة واحدة', 2),
  ('New Valley', 'الوادي الجديد', 'Farafra', 'الفرافرة', 'New Valley - Single District', 'الوادي الجديد - دائرة واحدة', 2),
  ('New Valley', 'الوادي الجديد', 'Balat', 'بلاط', 'New Valley - Single District', 'الوادي الجديد - دائرة واحدة', 2),
  ('New Valley', 'الوادي الجديد', 'Baris', 'باريس', 'New Valley - Single District', 'الوادي الجديد - دائرة واحدة', 2),
  ('Suez', 'السويس', 'Suez', 'السويس', 'Suez - Governorate District', 'السويس - الدائرة العامة', 2),
  ('Suez', 'السويس', 'Arbaeen', 'الأربعين', 'Suez - Governorate District', 'السويس - الدائرة العامة', 2),
  ('Suez', 'السويس', 'Ganayen', 'الجناين', 'Suez - Governorate District', 'السويس - الدائرة العامة', 2),
  ('Suez', 'السويس', 'Attaka', 'عتاقة', 'Suez - Governorate District', 'السويس - الدائرة العامة', 2),
  ('Suez', 'السويس', 'Faisal', 'فيصل', 'Suez - Governorate District', 'السويس - الدائرة العامة', 2),
  ('Aswan', 'أسوان', 'Aswan', 'أسوان', 'Aswan 1 - Aswan & Daraw', 'أسوان ١ - أسوان ودراو', 2),
  ('Aswan', 'أسوان', 'Edfu', 'إدفو', 'Aswan 3 - Edfu & Nasr El Nuba', 'أسوان ٣ - إدفو ونصر النوبة', 2),
  ('Aswan', 'أسوان', 'Kom Ombo', 'كوم أمبو', 'Aswan 2 - Kom Ombo', 'أسوان ٢ - كوم أمبو', 1),
  ('Aswan', 'أسوان', 'Nasr El Nuba', 'نصر النوبة', 'Aswan 3 - Edfu & Nasr El Nuba', 'أسوان ٣ - إدفو ونصر النوبة', 2),
  ('Aswan', 'أسوان', 'Daraw', 'دراو', 'Aswan 1 - Aswan & Daraw', 'أسوان ١ - أسوان ودراو', 2),
  ('Aswan', 'أسوان', 'Abu Simbel', 'أبو سمبل', 'Aswan 3 - Edfu & Nasr El Nuba', 'أسوان ٣ - إدفو ونصر النوبة', 2),
  ('Assiut', 'أسيوط', 'Assiut', 'أسيوط', 'Assiut 1 - Assiut City', 'أسيوط ١ - مدينة أسيوط', 2),
  ('Assiut', 'أسيوط', 'New Assiut', 'أسيوط الجديدة', 'Assiut 1 - Assiut City', 'أسيوط ١ - مدينة أسيوط', 2),
  ('Assiut', 'أسيوط', 'Dairut', 'ديروط', 'Assiut 2 - North', 'أسيوط ٢ - ديروط والقوصية ومنفلوط', 3),
  ('Assiut', 'أسيوط', 'Qusiya', 'القوصية', 'Assiut 2 - North', 'أسيوط ٢ - ديروط والقوصية ومنفلوط', 3),
  ('Assiut', 'أسيوط', 'Manfalut', 'منفلوط', 'Assiut 2 - North', 'أسيوط ٢ - ديروط والقوصية ومنفلوط', 3),
  ('Assiut', 'أسيوط', 'Abnoub', 'أبنوب', 'Assiut 3 - South', 'أسيوط ٣ - أبوتيج وأبنوب والبداري وساحل سليم', 3),
  ('Assiut', 'أسيوط', 'Abu Tig', 'أبو تيج', 'Assiut 3 - South', 'أسيوط ٣ - أبوتيج وأبنوب والبداري وساحل سليم', 3),
  ('Assiut', 'أسيوط', 'El Badari', 'البداري', 'Assiut 3 - South', 'أسيوط ٣ - أبوتيج وأبنوب والبداري وساحل سليم', 3),
  ('Assiut', 'أسيوط', 'Sahel Selim', 'ساحل سليم', 'Assiut 3 - South', 'أسيوط ٣ - أبوتيج وأبنوب والبداري وساحل سليم', 3),
  ('Assiut', 'أسيوط', 'El Fath', 'الفتح', 'Assiut 1 - Assiut City', 'أسيوط ١ - مدينة أسيوط', 2),
  ('Beni Suef', 'بني سويف', 'Beni Suef', 'بني سويف', 'Beni Suef 2 - Center', 'بني سويف ٢ - بني سويف وإهناسيا', 2),
  ('Beni Suef', 'بني سويف', 'New Beni Suef', 'بني سويف الجديدة', 'Beni Suef 2 - Center', 'بني سويف ٢ - بني سويف وإهناسيا', 2),
  ('Beni Suef', 'بني سويف', 'El Wasta', 'الواسطى', 'Beni Suef 1 - North', 'بني سويف ١ - الواسطى وناصر', 2),
  ('Beni Suef', 'بني سويف', 'Nasser', 'ناصر', 'Beni Suef 1 - North', 'بني سويف ١ - الواسطى وناصر', 2),
  ('Beni Suef', 'بني سويف', 'Beba', 'ببا', 'Beni Suef 3 - South', 'بني سويف ٣ - ببا وسمسطا والفشن', 3),
  ('Beni Suef', 'بني سويف', 'Fashn', 'الفشن', 'Beni Suef 3 - South', 'بني سويف ٣ - ببا وسمسطا والفشن', 3),
  ('Beni Suef', 'بني سويف', 'Somosta', 'سمسطا', 'Beni Suef 3 - South', 'بني سويف ٣ - ببا وسمسطا والفشن', 3),
  ('Beni Suef', 'بني سويف', 'Ehnasia', 'إهناسيا', 'Beni Suef 2 - Center', 'بني سويف ٢ - بني سويف وإهناسيا', 2),
  ('Port Said', 'بورسعيد', 'Port Said', 'بورسعيد', 'Port Said - Governorate District', 'بورسعيد - الدائرة العامة', 2),
  ('Port Said', 'بورسعيد', 'Port Fouad', 'بور فؤاد', 'Port Said - Governorate District', 'بورسعيد - الدائرة العامة', 2),
  ('Port Said', 'بورسعيد', 'Al Zohour', 'الزهور', 'Port Said - Governorate District', 'بورسعيد - الدائرة العامة', 2),
  ('Port Said', 'بورسعيد', 'Al Manakh', 'المناخ', 'Port Said - Governorate District', 'بورسعيد - الدائرة العامة', 2),
  ('Port Said', 'بورسعيد', 'Al Arab', 'العرب', 'Port Said - Governorate District', 'بورسعيد - الدائرة العامة', 2),
  ('Port Said', 'بورسعيد', 'Al Sharq', 'الشرق', 'Port Said - Governorate District', 'بورسعيد - الدائرة العامة', 2),
  ('Port Said', 'بورسعيد', 'Al Dawahy', 'الضواحي', 'Port Said - Governorate District', 'بورسعيد - الدائرة العامة', 2),
  ('Damietta', 'دمياط', 'Damietta', 'دمياط', 'Damietta 1 - Damietta & New Damietta', 'دمياط ١ - دمياط ودمياط الجديدة', 2),
  ('Damietta', 'دمياط', 'New Damietta', 'دمياط الجديدة', 'Damietta 1 - Damietta & New Damietta', 'دمياط ١ - دمياط ودمياط الجديدة', 2),
  ('Damietta', 'دمياط', 'Faraskur', 'فارسكور', 'Damietta 2 - Faraskur & Kafr Saad', 'دمياط ٢ - فارسكور وكفر سعد', 2),
  ('Damietta', 'دمياط', 'Kafr Saad', 'كفر سعد', 'Damietta 2 - Faraskur & Kafr Saad', 'دمياط ٢ - فارسكور وكفر سعد', 2),
  ('Damietta', 'دمياط', 'Kafr El Battikh', 'كفر البطيخ', 'Damietta 2 - Faraskur & Kafr Saad', 'دمياط ٢ - فارسكور وكفر سعد', 2),
  ('Damietta', 'دمياط', 'Zarqa', 'الزرقا', 'Damietta 2 - Faraskur & Kafr Saad', 'دمياط ٢ - فارسكور وكفر سعد', 2),
  ('Damietta', 'دمياط', 'Ras El Bar', 'رأس البر', 'Damietta 1 - Damietta & New Damietta', 'دمياط ١ - دمياط ودمياط الجديدة', 2),
  ('Damietta', 'دمياط', 'Ezbet El Burg', 'عزبة البرج', 'Damietta 1 - Damietta & New Damietta', 'دمياط ١ - دمياط ودمياط الجديدة', 2),
  ('Dakahlia', 'الدقهلية', 'Mansoura', 'المنصورة', 'Dakahlia 1 - Mansoura & Talkha', 'الدقهلية ١ - المنصورة وطلخا', 3),
  ('Dakahlia', 'الدقهلية', 'Talkha', 'طلخا', 'Dakahlia 1 - Mansoura & Talkha', 'الدقهلية ١ - المنصورة وطلخا', 3),
  ('Dakahlia', 'الدقهلية', 'Dekernes', 'دكرنس', 'Dakahlia 4 - Dekernes & Senbellawein', 'الدقهلية ٤ - دكرنس والسنبلاوين', 3),
  ('Dakahlia', 'الدقهلية', 'Aga', 'أجا', 'Dakahlia 2 - Meet Ghamr & Aga', 'الدقهلية ٢ - ميت غمر وأجا', 2),
  ('Dakahlia', 'الدقهلية', 'Sherbin', 'شربين', 'Dakahlia 3 - Sherbin & Belqas', 'الدقهلية ٣ - شربين وبلقاس', 2),
  ('Dakahlia', 'الدقهلية', 'Belqas', 'بلقاس', 'Dakahlia 3 - Sherbin & Belqas', 'الدقهلية ٣ - شربين وبلقاس', 2),
  ('Dakahlia', 'الدقهلية', 'Meet Ghamr', 'ميت غمر', 'Dakahlia 2 - Meet Ghamr & Aga', 'الدقهلية ٢ - ميت غمر وأجا', 2),
  ('Dakahlia', 'الدقهلية', 'Senbellawein', 'السنبلاوين', 'Dakahlia 4 - Dekernes & Senbellawein', 'الدقهلية ٤ - دكرنس والسنبلاوين', 3),
  ('Dakahlia', 'الدقهلية', 'Mit Salsil', 'ميت سلسيل', 'Dakahlia 4 - Dekernes & Senbellawein', 'الدقهلية ٤ - دكرنس والسنبلاوين', 3),
  ('Dakahlia', 'الدقهلية', 'Manzala', 'المنزلة', 'Dakahlia 5 - Manzala', 'الدقهلية ٥ - المنزلة', 1),
  ('Dakahlia', 'الدقهلية', 'Gamasa', 'جمصة', 'Dakahlia 3 - Sherbin & Belqas', 'الدقهلية ٣ - شربين وبلقاس', 2),
  ('Dakahlia', 'الدقهلية', 'El Kurdi', 'الكردي', 'Dakahlia 3 - Sherbin & Belqas', 'الدقهلية ٣ - شربين وبلقاس', 2),
  ('Dakahlia', 'الدقهلية', 'Nabaruh', 'نبروه', 'Dakahlia 1 - Mansoura & Talkha', 'الدقهلية ١ - المنصورة وطلخا', 3),
  ('Sharqia', 'الشرقية', 'Zagazig', 'الزقازيق', 'Sharqia 1 - Zagazig', 'الشرقية ١ - الزقازيق', 3),
  ('Sharqia', 'الشرقية', '10th of Ramadan', 'العاشر من رمضان', 'Sharqia 2 - Belbeis & 10th Ramadan', 'الشرقية ٢ - بلبيس والعاشر من رمضان', 2),
  ('Sharqia', 'الشرقية', 'Belbeis', 'بلبيس', 'Sharqia 2 - Belbeis & 10th Ramadan', 'الشرقية ٢ - بلبيس والعاشر من رمضان', 2),
  ('Sharqia', 'الشرقية', 'Abu Hammad', 'أبو حماد', NULL, NULL, NULL),
  ('Sharqia', 'الشرقية', 'Abu Kabir', 'أبو كبير', 'Sharqia 3 - Fakous & Abu Kabir', 'الشرقية ٣ - فاقوس وأبو كبير', 3),
  ('Sharqia', 'الشرقية', 'Hehia', 'ههيا', 'Sharqia 3 - Fakous & Abu Kabir', 'الشرقية ٣ - فاقوس وأبو كبير', 3),
  ('Sharqia', 'الشرقية', 'Fakous', 'فاقوس', 'Sharqia 3 - Fakous & Abu Kabir', 'الشرقية ٣ - فاقوس وأبو كبير', 3),
  ('Sharqia', 'الشرقية', 'Al Qenayat', 'القنايات', 'Sharqia 1 - Zagazig', 'الشرقية ١ - الزقازيق', 3),
  ('Sharqia', 'الشرقية', 'Awlad Saqr', 'أولاد صقر', 'Sharqia 5 - Northern Belt', 'الشرقية ٥ - الحسينية وأولاد صقر وكفر صقر', 2),
  ('Sharqia', 'الشرقية', 'Kafr Saqr', 'كفر صقر', 'Sharqia 5 - Northern Belt', 'الشرقية ٥ - الحسينية وأولاد صقر وكفر صقر', 2),
  ('Sharqia', 'الشرقية', 'Diyarb Negm', 'ديرب نجم', NULL, NULL, NULL),
  ('Sharqia', 'الشرقية', 'Al Husseiniya', 'الحسينية', 'Sharqia 5 - Northern Belt', 'الشرقية ٥ - الحسينية وأولاد صقر وكفر صقر', 2),
  ('Sharqia', 'الشرقية', 'Mashtoul El Souq', 'مشتول السوق', 'Sharqia 4 - Minya Al Qamh & Mashtoul', 'الشرقية ٤ - منيا القمح ومشتول السوق', 2),
  ('Sharqia', 'الشرقية', 'Minya Al Qamh', 'منيا القمح', 'Sharqia 4 - Minya Al Qamh & Mashtoul', 'الشرقية ٤ - منيا القمح ومشتول السوق', 2),
  ('Sharqia', 'الشرقية', 'El Salheya El Gedida', 'الصالحية الجديدة', 'Sharqia 6 - El Salheya', 'الشرقية ٦ - الصالحية الجديدة', 1),
  ('South Sinai', 'جنوب سيناء', 'El Tor', 'الطور', 'South Sinai - Governorate District', 'جنوب سيناء - دائرة واحدة', 2),
  ('South Sinai', 'جنوب سيناء', 'Sharm El Sheikh', 'شرم الشيخ', 'South Sinai - Governorate District', 'جنوب سيناء - دائرة واحدة', 2),
  ('South Sinai', 'جنوب سيناء', 'Dahab', 'دهب', 'South Sinai - Governorate District', 'جنوب سيناء - دائرة واحدة', 2),
  ('South Sinai', 'جنوب سيناء', 'Nuweiba', 'نويبع', 'South Sinai - Governorate District', 'جنوب سيناء - دائرة واحدة', 2),
  ('South Sinai', 'جنوب سيناء', 'Taba', 'طابا', 'South Sinai - Governorate District', 'جنوب سيناء - دائرة واحدة', 2),
  ('South Sinai', 'جنوب سيناء', 'Saint Catherine', 'سانت كاترين', 'South Sinai - Governorate District', 'جنوب سيناء - دائرة واحدة', 2),
  ('South Sinai', 'جنوب سيناء', 'Ras Sidr', 'رأس سدر', 'South Sinai - Governorate District', 'جنوب سيناء - دائرة واحدة', 2),
  ('South Sinai', 'جنوب سيناء', 'Abu Rudeis', 'أبو رديس', 'South Sinai - Governorate District', 'جنوب سيناء - دائرة واحدة', 2),
  ('South Sinai', 'جنوب سيناء', 'Abu Zenima', 'أبو زنيمة', 'South Sinai - Governorate District', 'جنوب سيناء - دائرة واحدة', 2),
  ('Kafr El Sheikh', 'كفر الشيخ', 'Kafr El Sheikh', 'كفر الشيخ', 'Kafr El Sheikh 1 - Capital & Qillin', 'كفر الشيخ ١ - العاصمة وقلين', 2),
  ('Kafr El Sheikh', 'كفر الشيخ', 'Desouk', 'دسوق', 'Kafr El Sheikh 2 - Desouk & Fuwwah', 'كفر الشيخ ٢ - دسوق وفوه', 2),
  ('Kafr El Sheikh', 'كفر الشيخ', 'Fuwwah', 'فوه', 'Kafr El Sheikh 2 - Desouk & Fuwwah', 'كفر الشيخ ٢ - دسوق وفوه', 2),
  ('Kafr El Sheikh', 'كفر الشيخ', 'Biyala', 'بيلا', 'Kafr El Sheikh 4 - Biyala & Sidi Salem', 'كفر الشيخ ٤ - بيلا وسيدي سالم', 3),
  ('Kafr El Sheikh', 'كفر الشيخ', 'Baltim', 'بلطيم', 'Kafr El Sheikh 3 - Baltim & Motobas', 'كفر الشيخ ٣ - بلطيم ومطوبس', 1),
  ('Kafr El Sheikh', 'كفر الشيخ', 'Motobas', 'مطوبس', 'Kafr El Sheikh 3 - Baltim & Motobas', 'كفر الشيخ ٣ - بلطيم ومطوبس', 1),
  ('Kafr El Sheikh', 'كفر الشيخ', 'Sidi Salem', 'سيدي سالم', 'Kafr El Sheikh 4 - Biyala & Sidi Salem', 'كفر الشيخ ٤ - بيلا وسيدي سالم', 3),
  ('Kafr El Sheikh', 'كفر الشيخ', 'Qillin', 'قلين', 'Kafr El Sheikh 1 - Capital & Qillin', 'كفر الشيخ ١ - العاصمة وقلين', 2),
  ('Kafr El Sheikh', 'كفر الشيخ', 'El Reyad', 'الرياض', 'Kafr El Sheikh 4 - Biyala & Sidi Salem', 'كفر الشيخ ٤ - بيلا وسيدي سالم', 3),
  ('Kafr El Sheikh', 'كفر الشيخ', 'Hamoul', 'الحامول', 'Kafr El Sheikh 4 - Biyala & Sidi Salem', 'كفر الشيخ ٤ - بيلا وسيدي سالم', 3),
  ('Matrouh', 'مطروح', 'Marsa Matrouh', 'مرسى مطروح', 'Matrouh - Western Border', 'مطروح - الحدود الغربية', 2),
  ('Matrouh', 'مطروح', 'Siwa', 'سيوة', 'Matrouh - Western Border', 'مطروح - الحدود الغربية', 2),
  ('Matrouh', 'مطروح', 'El Alamein', 'العلمين', 'Matrouh - Coast Belt', 'مطروح - الشريط الساحلي', 2),
  ('Matrouh', 'مطروح', 'El Dabaa', 'الضبعة', 'Matrouh - Coast Belt', 'مطروح - الشريط الساحلي', 2),
  ('Matrouh', 'مطروح', 'Negaila', 'النجيلة', 'Matrouh - Coast Belt', 'مطروح - الشريط الساحلي', 2),
  ('Matrouh', 'مطروح', 'Sidi Barrani', 'سيدي براني', 'Matrouh - Western Border', 'مطروح - الحدود الغربية', 2),
  ('Matrouh', 'مطروح', 'Salloum', 'السلوم', 'Matrouh - Western Border', 'مطروح - الحدود الغربية', 2),
  ('Matrouh', 'مطروح', 'Hammam', 'الحمام', 'Matrouh - Coast Belt', 'مطروح - الشريط الساحلي', 2),
  ('Luxor', 'الأقصر', 'Luxor', 'الأقصر', 'Luxor 1 - Luxor & Tiba', 'الأقصر ١ - الأقصر وطيبة', 2),
  ('Luxor', 'الأقصر', 'New Luxor', 'الأقصر الجديدة', 'Luxor 1 - Luxor & Tiba', 'الأقصر ١ - الأقصر وطيبة', 2),
  ('Luxor', 'الأقصر', 'Qurna', 'القرنة', 'Luxor 3 - Armant & Qurna', 'الأقصر ٣ - أرمنت والقرنة', 1),
  ('Luxor', 'الأقصر', 'Esna', 'إسنا', 'Luxor 2 - Esna', 'الأقصر ٢ - إسنا', 1),
  ('Luxor', 'الأقصر', 'Armant', 'أرمنت', 'Luxor 3 - Armant & Qurna', 'الأقصر ٣ - أرمنت والقرنة', 1),
  ('Luxor', 'الأقصر', 'Tiba', 'طيبة', 'Luxor 1 - Luxor & Tiba', 'الأقصر ١ - الأقصر وطيبة', 2),
  ('Qena', 'قنا', 'Qena', 'قنا', 'Qena 1 - Qena & Qus', 'قنا ١ - قنا وقوص', 3),
  ('Qena', 'قنا', 'Qus', 'قوص', 'Qena 1 - Qena & Qus', 'قنا ١ - قنا وقوص', 3),
  ('Qena', 'قنا', 'Qift', 'قفط', 'Qena 1 - Qena & Qus', 'قنا ١ - قنا وقوص', 3),
  ('Qena', 'قنا', 'Nag Hammadi', 'نجع حمادي', 'Qena 2 - Nag Hammadi & Farshut', 'قنا ٢ - نجع حمادي وفرشوط', 2),
  ('Qena', 'قنا', 'Farshut', 'فرشوط', 'Qena 2 - Nag Hammadi & Farshut', 'قنا ٢ - نجع حمادي وفرشوط', 2),
  ('Qena', 'قنا', 'Dishna', 'دشنا', 'Qena 3 - Dishna', 'قنا ٣ - دشنا', 1),
  ('Qena', 'قنا', 'Abu Tesht', 'أبوتشت', 'Qena 2 - Nag Hammadi & Farshut', 'قنا ٢ - نجع حمادي وفرشوط', 2),
  ('Qena', 'قنا', 'Naqada', 'نقادة', 'Qena 1 - Qena & Qus', 'قنا ١ - قنا وقوص', 3),
  ('Sohag', 'سوهاج', 'Sohag', 'سوهاج', 'Sohag 1 - Sohag & Akhmim', 'سوهاج ١ - سوهاج وأخميم', 3),
  ('Sohag', 'سوهاج', 'Akhmim', 'أخميم', 'Sohag 1 - Sohag & Akhmim', 'سوهاج ١ - سوهاج وأخميم', 3),
  ('Sohag', 'سوهاج', 'Girga', 'جرجا', 'Sohag 3 - Girga & Dar El Salam', 'سوهاج ٣ - جرجا ودار السلام', 2),
  ('Sohag', 'سوهاج', 'Tahta', 'طهطا', 'Sohag 2 - Tahta & Tama', 'سوهاج ٢ - طهطا وطما', 2),
  ('Sohag', 'سوهاج', 'Tema', 'طما', 'Sohag 2 - Tahta & Tama', 'سوهاج ٢ - طهطا وطما', 2),
  ('Sohag', 'سوهاج', 'Maragha', 'المراغة', 'Sohag 2 - Tahta & Tama', 'سوهاج ٢ - طهطا وطما', 2),
  ('Sohag', 'سوهاج', 'Balyana', 'البلينا', 'Sohag 4 - Balyana', 'سوهاج ٤ - البلينا', 1),
  ('Sohag', 'سوهاج', 'Monsha''a', 'المنشأة', 'Sohag 3 - Girga & Dar El Salam', 'سوهاج ٣ - جرجا ودار السلام', 2),
  ('Sohag', 'سوهاج', 'Juhayna', 'جهينة', 'Sohag 4 - Balyana', 'سوهاج ٤ - البلينا', 1),
  ('Sohag', 'سوهاج', 'Saqilatuh', 'ساقلتة', 'Sohag 1 - Sohag & Akhmim', 'سوهاج ١ - سوهاج وأخميم', 3),
  ('Sohag', 'سوهاج', 'Dar El Salam', 'دار السلام', 'Sohag 3 - Girga & Dar El Salam', 'سوهاج ٣ - جرجا ودار السلام', 2),
  ('North Sinai', 'شمال سيناء', 'Arish', 'العريش', 'North Sinai 1 - Coastal', 'شمال سيناء ١ - الساحل', 2),
  ('North Sinai', 'شمال سيناء', 'Bir El Abd', 'بئر العبد', 'North Sinai 1 - Coastal', 'شمال سيناء ١ - الساحل', 2),
  ('North Sinai', 'شمال سيناء', 'Sheikh Zuweid', 'الشيخ زويد', 'North Sinai 1 - Coastal', 'شمال سيناء ١ - الساحل', 2),
  ('North Sinai', 'شمال سيناء', 'Rafah', 'رفح', 'North Sinai 1 - Coastal', 'شمال سيناء ١ - الساحل', 2),
  ('North Sinai', 'شمال سيناء', 'Nakhl', 'نخل', 'North Sinai 2 - Inland', 'شمال سيناء ٢ - الوسط', 1),
  ('North Sinai', 'شمال سيناء', 'Hassana', 'الحسنة', 'North Sinai 2 - Inland', 'شمال سيناء ٢ - الوسط', 1)
ON CONFLICT (governorate_en, district_en) DO UPDATE
SET
  governorate_ar = EXCLUDED.governorate_ar,
  district_ar = EXCLUDED.district_ar,
  electoral_district_en = EXCLUDED.electoral_district_en,
  electoral_district_ar = EXCLUDED.electoral_district_ar,
  electoral_seats = EXCLUDED.electoral_seats;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS electoral_district text,
  ADD COLUMN IF NOT EXISTS center_id uuid REFERENCES public.centers(id);

CREATE INDEX IF NOT EXISTS idx_profiles_center_id ON public.profiles (center_id);

CREATE OR REPLACE FUNCTION public.resolve_center_id(
  _governorate text,
  _district text
)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT c.id
  FROM public.centers c
  WHERE
    (c.governorate_en = _governorate OR c.governorate_ar = _governorate)
    AND (c.district_en = _district OR c.district_ar = _district)
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.sync_profile_center_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _center public.centers%ROWTYPE;
  _resolved_center_id uuid;
  _district_input text;
BEGIN
  -- Backward-compatible fallback: older rows only stored center text and not district.
  -- Trigger then normalizes both fields to canonical district from centers table.
  _district_input := COALESCE(NEW.district, NEW.center);

  IF NEW.center_id IS NOT NULL THEN
    SELECT * INTO _center
    FROM public.centers c
    WHERE c.id = NEW.center_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid center_id';
    END IF;
  ELSIF NEW.governorate IS NOT NULL AND _district_input IS NOT NULL THEN
    _resolved_center_id := public.resolve_center_id(NEW.governorate, _district_input);

    IF _resolved_center_id IS NULL THEN
      RAISE EXCEPTION 'Invalid governorate/district combination';
    END IF;

    NEW.center_id := _resolved_center_id;

    SELECT * INTO _center
    FROM public.centers c
    WHERE c.id = NEW.center_id;
  END IF;

  IF NEW.center_id IS NOT NULL THEN
    NEW.governorate := _center.governorate_en;
    NEW.district := _center.district_en;
    NEW.center := _center.district_en;
    NEW.constituency := COALESCE(NEW.constituency, _center.electoral_district_en);
    NEW.electoral_district := COALESCE(NEW.electoral_district, _center.electoral_district_en);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_center_fields ON public.profiles;
CREATE TRIGGER trg_sync_profile_center_fields
BEFORE INSERT OR UPDATE OF center_id, governorate, district, center, constituency, electoral_district
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_center_fields();

UPDATE public.profiles p
SET
  center_id = public.resolve_center_id(p.governorate, COALESCE(p.district, p.center)),
  district = COALESCE(p.district, p.center)
WHERE p.center_id IS NULL
  AND p.governorate IS NOT NULL
  AND COALESCE(p.district, p.center) IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _role app_role := 'citizen';
  -- Backward compatibility: older clients send registration_number, newer send membership_number.
  _membership_number text := COALESCE(NEW.raw_user_meta_data->>'membership_number', NEW.raw_user_meta_data->>'registration_number');
  _governorate text := NEW.raw_user_meta_data->>'governorate';
  _district text := NEW.raw_user_meta_data->>'district';
  _electoral_district text := NEW.raw_user_meta_data->>'electoral_district';
  _center_id uuid := NULL;
BEGIN
  IF _governorate IS NOT NULL AND _district IS NOT NULL THEN
    _center_id := public.resolve_center_id(_governorate, _district);
  END IF;

  INSERT INTO public.profiles (
    user_id,
    full_name,
    phone,
    membership_number,
    governorate,
    district,
    center,
    constituency,
    electoral_district,
    center_id
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    _membership_number,
    _governorate,
    _district,
    _district,
    _electoral_district,
    _electoral_district,
    _center_id
  );

  IF NEW.raw_user_meta_data->>'role' = 'mp'
     AND _membership_number IS NOT NULL
     AND _membership_number != ''
     AND _center_id IS NOT NULL THEN
    _role := 'mp';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role);

  RETURN NEW;
END;
$function$;

DROP VIEW IF EXISTS public.mp_public_profiles;
CREATE VIEW public.mp_public_profiles
WITH (security_invoker = true)
AS
SELECT
  user_id,
  full_name,
  constituency,
  governorate,
  center,
  district,
  electoral_district,
  center_id,
  avatar_url,
  contact_phone,
  is_approved
FROM public.profiles
WHERE is_approved = true
  AND has_role(user_id, 'mp'::app_role);

GRANT SELECT ON public.mp_public_profiles TO anon, authenticated;
