ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE INDEX IF NOT EXISTS clients_archived_at_idx ON public.clients (archived_at);