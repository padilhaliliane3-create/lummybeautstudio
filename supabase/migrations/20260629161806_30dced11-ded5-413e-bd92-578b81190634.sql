
CREATE TABLE IF NOT EXISTS public.client_maintenances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('hair','nails','other')),
  procedure_name text NOT NULL,
  scheduled_date date NOT NULL,
  suggested_time time,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','refused','done')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_maintenances TO authenticated;
GRANT ALL ON public.client_maintenances TO service_role;

ALTER TABLE public.client_maintenances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage client_maintenances"
  ON public.client_maintenances FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients view their maintenances"
  ON public.client_maintenances FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.clients c
            WHERE c.id = client_maintenances.client_id
              AND c.auth_user_id = auth.uid())
  );

CREATE POLICY "Clients update their maintenance status"
  ON public.client_maintenances FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.clients c
            WHERE c.id = client_maintenances.client_id
              AND c.auth_user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.clients c
            WHERE c.id = client_maintenances.client_id
              AND c.auth_user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS client_maintenances_client_id_idx ON public.client_maintenances(client_id);
CREATE INDEX IF NOT EXISTS client_maintenances_date_idx ON public.client_maintenances(scheduled_date);

CREATE TRIGGER client_maintenances_set_updated_at
  BEFORE UPDATE ON public.client_maintenances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
