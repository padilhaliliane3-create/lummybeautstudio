
-- Enum tipos de financeiro / cronograma
do $$ begin
  create type public.finance_type as enum ('income','expense');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.hair_step_type as enum ('hidratacao','nutricao','reconstrucao');
exception when duplicate_object then null; end $$;

-- 1) Clientes: vínculo com auth + restringir leitura pública
alter table public.clients add column if not exists auth_user_id uuid unique;
create index if not exists idx_clients_auth_user on public.clients(auth_user_id);

-- Substitui leitura pública pelo dono ou admin
drop policy if exists "clients_select_public" on public.clients;
drop policy if exists "admins read clients" on public.clients;

create policy "clients select self or admin" on public.clients
  for select using (
    auth_user_id = auth.uid() or public.has_role(auth.uid(),'admin')
  );

-- mantém insert público (fluxo /agendar sem login)
-- update: dono ou admin (público não atualiza)
create policy "clients update self or admin" on public.clients
  for update to authenticated
  using (auth_user_id = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check (auth_user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- Permite cliente autenticado fazer claim do próprio cadastro via update público (whatsapp/cpf) — via server fn admin-only

-- 2) Bookings: cliente lê os próprios via join clients.auth_user_id
drop policy if exists "bookings_select_public" on public.bookings;
create policy "bookings select self or admin or unlinked" on public.bookings
  for select using (
    public.has_role(auth.uid(),'admin')
    or exists (
      select 1 from public.clients c
      where c.id = bookings.client_id
        and (c.auth_user_id = auth.uid() or c.auth_user_id is null)
    )
  );

-- 3) finance_entries
create table if not exists public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  type public.finance_type not null,
  category text not null,
  amount numeric(12,2) not null check (amount >= 0),
  description text,
  entry_date date not null default current_date,
  payment_method text,
  booking_id uuid references public.bookings(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_finance_date on public.finance_entries(entry_date);
create index if not exists idx_finance_type on public.finance_entries(type);

grant select, insert, update, delete on public.finance_entries to authenticated;
grant all on public.finance_entries to service_role;
alter table public.finance_entries enable row level security;

create policy "finance admin all" on public.finance_entries
  for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

create trigger trg_finance_updated before update on public.finance_entries
for each row execute function public.set_updated_at();

-- 4) hair_schedules
create table if not exists public.hair_schedules (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  step_type public.hair_step_type not null,
  scheduled_date date not null,
  done boolean not null default false,
  done_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_hair_client on public.hair_schedules(client_id);
create index if not exists idx_hair_date on public.hair_schedules(scheduled_date);

grant select, insert, update, delete on public.hair_schedules to authenticated;
grant all on public.hair_schedules to service_role;
alter table public.hair_schedules enable row level security;

create policy "hair admin all" on public.hair_schedules
  for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

create policy "hair client read own" on public.hair_schedules
  for select to authenticated
  using (exists (select 1 from public.clients c where c.id = hair_schedules.client_id and c.auth_user_id = auth.uid()));

create policy "hair client update own" on public.hair_schedules
  for update to authenticated
  using (exists (select 1 from public.clients c where c.id = hair_schedules.client_id and c.auth_user_id = auth.uid()))
  with check (exists (select 1 from public.clients c where c.id = hair_schedules.client_id and c.auth_user_id = auth.uid()));

create trigger trg_hair_updated before update on public.hair_schedules
for each row execute function public.set_updated_at();

-- 5) client_recommendations
create table if not exists public.client_recommendations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  body text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_recs_client on public.client_recommendations(client_id);

grant select, insert, update, delete on public.client_recommendations to authenticated;
grant all on public.client_recommendations to service_role;
alter table public.client_recommendations enable row level security;

create policy "recs admin all" on public.client_recommendations
  for all to authenticated
  using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

create policy "recs client read own" on public.client_recommendations
  for select to authenticated
  using (exists (select 1 from public.clients c where c.id = client_recommendations.client_id and c.auth_user_id = auth.uid()));

create trigger trg_recs_updated before update on public.client_recommendations
for each row execute function public.set_updated_at();

-- 6) salon_settings: categorias financeiras
alter table public.salon_settings
  add column if not exists finance_categories jsonb default '["Serviços","Produtos","Comissão","Aluguel","Marketing","Outros"]'::jsonb;
