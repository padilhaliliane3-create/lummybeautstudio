create type public.client_maintenance_type as enum ('hair', 'nails', 'other');
create type public.client_maintenance_status as enum ('pending', 'confirmed', 'refused', 'done');

create table public.client_maintenances (
    id uuid default gen_random_uuid() primary key,
    client_id uuid not null references public.clients(id) on delete cascade,
    type public.client_maintenance_type not null default 'hair',
    procedure_name text not null,
    scheduled_date date not null,
    suggested_time time without time zone,
    notes text,
    status public.client_maintenance_status not null default 'pending',
    booking_id uuid references public.bookings(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.client_maintenances enable row level security;

create policy "Admins can do everything on maintenances" 
on public.client_maintenances for all 
using ( public.has_role(auth.uid(), 'admin') );

create policy "Clients can view their own maintenances"
on public.client_maintenances for select
using ( 
  client_id in (select id from public.clients where auth_user_id = auth.uid())
);

create policy "Clients can update their own maintenances"
on public.client_maintenances for update
using (
  client_id in (select id from public.clients where auth_user_id = auth.uid())
);
