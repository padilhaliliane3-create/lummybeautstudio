
-- Expand clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS notes text;

-- Expand salon_settings (single-row id=1)
ALTER TABLE public.salon_settings
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS facebook text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS hours_json jsonb,
  ADD COLUMN IF NOT EXISTS hero_title text,
  ADD COLUMN IF NOT EXISTS hero_subtitle text,
  ADD COLUMN IF NOT EXISTS about_text text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS banner_url text;

-- Allow public (anon) to read salon_settings for the site
DROP POLICY IF EXISTS "settings_public_read" ON public.salon_settings;
CREATE POLICY "settings_public_read" ON public.salon_settings
  FOR SELECT TO anon, authenticated USING (true);

-- Admin write on settings
DROP POLICY IF EXISTS "settings_admin_write" ON public.salon_settings;
CREATE POLICY "settings_admin_write" ON public.salon_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.salon_settings TO anon;
GRANT ALL ON public.salon_settings TO authenticated;
GRANT ALL ON public.salon_settings TO service_role;

-- Seed default row if not exists
INSERT INTO public.salon_settings (id, company_name, whatsapp, phone, instagram, hero_title, hero_subtitle, about_text)
VALUES (1, 'LUMMY Beauty Studio', '5542999870704', '5542999870704', 'lummybeautystudio',
  'Beleza que valoriza sua essência',
  'Cabelo, unhas, cílios e estética com cuidado artesanal e produtos premium.',
  'No LUMMY Beauty Studio cada cliente é cuidada como única — ambiente acolhedor, profissionais especializados e técnicas atuais.')
ON CONFLICT (id) DO NOTHING;
