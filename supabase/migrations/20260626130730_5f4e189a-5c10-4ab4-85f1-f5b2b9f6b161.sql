
-- =========================================================
-- LUMMY BEAUTY STUDIO — Schema inicial
-- =========================================================

-- Função para updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ========== Categorias ==========
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  image_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_public_read" ON public.categories FOR SELECT USING (active = true);

-- ========== Profissionais ==========
CREATE TABLE public.professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  photo_url TEXT,
  specialty TEXT,
  bio TEXT,
  whatsapp TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  pix_key TEXT,
  commission_pct NUMERIC(5,2) DEFAULT 0,
  rating NUMERIC(2,1) DEFAULT 5.0,
  working_days INT[] NOT NULL DEFAULT '{1,2,3,4,5,6}', -- 0=dom..6=sab
  work_start TIME NOT NULL DEFAULT '09:00',
  work_end   TIME NOT NULL DEFAULT '19:00',
  break_start TIME,
  break_end   TIME,
  slot_minutes INT NOT NULL DEFAULT 30,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.professionals TO anon, authenticated;
GRANT ALL ON public.professionals TO service_role;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "professionals_public_read" ON public.professionals FOR SELECT USING (active = true);
CREATE TRIGGER trg_professionals_updated BEFORE UPDATE ON public.professionals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========== Serviços ==========
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price NUMERIC(10,2) NOT NULL,
  duration_min INT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.services TO anon, authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services_public_read" ON public.services FOR SELECT USING (active = true);
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========== Vínculo Profissional ↔ Serviço ==========
CREATE TABLE public.professional_services (
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  PRIMARY KEY (professional_id, service_id)
);
GRANT SELECT ON public.professional_services TO anon, authenticated;
GRANT ALL ON public.professional_services TO service_role;
ALTER TABLE public.professional_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prof_services_public_read" ON public.professional_services FOR SELECT USING (true);

-- ========== Clientes ==========
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_clients_whatsapp ON public.clients(whatsapp);
GRANT INSERT, SELECT ON public.clients TO anon, authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
-- Anon pode inserir (cadastro público) e ler apenas o registro recém criado via id retornado.
CREATE POLICY "clients_insert_public" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "clients_select_public" ON public.clients FOR SELECT USING (true);
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========== Agendamentos ==========
CREATE TYPE booking_status AS ENUM ('pending_payment','confirmed','cancelled','completed','no_show');

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE DEFAULT upper(substring(replace(gen_random_uuid()::text,'-',''),1,8)),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE RESTRICT,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  scheduled_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  deposit_amount NUMERIC(10,2) NOT NULL,
  remaining_amount NUMERIC(10,2) NOT NULL,
  deposit_paid BOOLEAN NOT NULL DEFAULT false,
  status booking_status NOT NULL DEFAULT 'pending_payment',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bookings_prof_date ON public.bookings(professional_id, scheduled_date);
GRANT INSERT, SELECT, UPDATE ON public.bookings TO anon, authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookings_insert_public" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "bookings_select_public" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "bookings_update_pending" ON public.bookings FOR UPDATE
  USING (status IN ('pending_payment','confirmed'))
  WITH CHECK (status IN ('pending_payment','confirmed','cancelled'));
CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========== Bloqueios de agenda ==========
CREATE TABLE public.schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  block_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_blocks_prof_date ON public.schedule_blocks(professional_id, block_date);
GRANT SELECT ON public.schedule_blocks TO anon, authenticated;
GRANT ALL ON public.schedule_blocks TO service_role;
ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocks_public_read" ON public.schedule_blocks FOR SELECT USING (true);

-- ========== Configurações do salão ==========
CREATE TABLE public.salon_settings (
  id INT PRIMARY KEY DEFAULT 1,
  name TEXT NOT NULL DEFAULT 'LUMMY Beauty Studio',
  whatsapp TEXT NOT NULL DEFAULT '5542999870704',
  email TEXT,
  instagram TEXT,
  address TEXT,
  opening_hours JSONB DEFAULT '{"seg-sex":"09:00-19:00","sab":"09:00-17:00","dom":"fechado"}'::jsonb,
  deposit_pct NUMERIC(5,2) NOT NULL DEFAULT 20,
  cancel_policy TEXT DEFAULT 'Cancelamento gratuito até 24h antes do horário.',
  CHECK (id = 1)
);
GRANT SELECT ON public.salon_settings TO anon, authenticated;
GRANT ALL ON public.salon_settings TO service_role;
ALTER TABLE public.salon_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_public_read" ON public.salon_settings FOR SELECT USING (true);

INSERT INTO public.salon_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
