-- ============ Fase 1: Cliente 360 ============

-- 1) Anamnese (1:1 com cliente)
CREATE TABLE public.client_anamnesis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  hair_type text,
  hair_chemistry text,
  hair_treatments text,
  scalp_condition text,
  nail_condition text,
  allergies text,
  medications text,
  health_conditions text,
  preferences text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_anamnesis TO authenticated;
GRANT ALL ON public.client_anamnesis TO service_role;
ALTER TABLE public.client_anamnesis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anamnesis admin all" ON public.client_anamnesis
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "anamnesis client read own" ON public.client_anamnesis
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.auth_user_id = auth.uid()));

CREATE TRIGGER trg_anamnesis_updated BEFORE UPDATE ON public.client_anamnesis
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Fotos de evolução
CREATE TABLE public.client_evolution_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  caption text,
  taken_at date NOT NULL DEFAULT CURRENT_DATE,
  tag text, -- ex: 'antes', 'depois', 'progresso'
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_evo_photos_client ON public.client_evolution_photos(client_id, taken_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_evolution_photos TO authenticated;
GRANT ALL ON public.client_evolution_photos TO service_role;
ALTER TABLE public.client_evolution_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evo admin all" ON public.client_evolution_photos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "evo client read own" ON public.client_evolution_photos
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.auth_user_id = auth.uid()));

-- 3) Notificações internas
CREATE TABLE public.client_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  kind text NOT NULL DEFAULT 'info', -- info, reminder, promo, system
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notif_client ON public.client_notifications(client_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_notifications TO authenticated;
GRANT ALL ON public.client_notifications TO service_role;
ALTER TABLE public.client_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif admin all" ON public.client_notifications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "notif client read own" ON public.client_notifications
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.auth_user_id = auth.uid()));

CREATE POLICY "notif client mark own read" ON public.client_notifications
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.auth_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.auth_user_id = auth.uid()));

-- 4) Expandir bookings com pós-atendimento
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS products_used text,
  ADD COLUMN IF NOT EXISTS post_notes text;
