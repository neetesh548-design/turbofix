-- Native gen_random_uuid() will be used for UUIDs

-- 1. Companies Table
create table public.companies (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  domain text,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Users Table (Linked to auth.users)
create table public.users (
  id uuid references auth.users on delete cascade primary key,
  company_id uuid references public.companies on delete cascade not null,
  name text not null,
  role text not null default 'staff', -- owner, supervisor, staff, maintenance_head
  phone text,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Machines Table
create table public.machines (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies on delete cascade not null,
  name text not null,
  location text,
  qr_link text,
  status text default 'healthy',
  assigned_technician_phone text,
  informed_phone_1 text,
  supervisor_id uuid references public.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Tickets Table
create table public.tickets (
  id uuid default gen_random_uuid() primary key,
  machine_id uuid references public.machines on delete cascade not null,
  reporter_phone text,
  status text default 'open',
  issue_text text,
  ai_summary jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Events Table
create table public.events (
  id uuid default gen_random_uuid() primary key,
  ticket_id uuid references public.tickets on delete cascade not null,
  event_type text not null,
  message text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Documents Table
create table public.documents (
  id uuid default gen_random_uuid() primary key,
  machine_id uuid references public.machines on delete cascade not null,
  title text not null,
  category text not null,
  file_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Parts Table
create table public.parts (
  id uuid default gen_random_uuid() primary key,
  machine_id uuid references public.machines on delete cascade not null,
  part_name text not null,
  part_number text,
  qty_on_hand integer default 0,
  unit text,
  reorder_level integer default 0,
  supplier text
);

-- 8. Consumables Table
create table public.consumables (
  id uuid default gen_random_uuid() primary key,
  machine_id uuid references public.machines on delete cascade not null,
  name text not null,
  qty_on_hand integer default 0,
  unit text,
  reorder_level integer default 0
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

alter table public.companies enable row level security;
alter table public.users enable row level security;
alter table public.machines enable row level security;
alter table public.tickets enable row level security;
alter table public.events enable row level security;
alter table public.documents enable row level security;
alter table public.parts enable row level security;
alter table public.consumables enable row level security;

-- Function to get the current user's company_id
create or replace function public.get_current_company_id()
returns uuid
language sql
security definer
as $$
  select company_id from public.users where id = auth.uid();
$$;

-- Users can read their own company
create policy "Users can view their own company"
on public.companies for select
using (id = public.get_current_company_id());

-- Users can view other users in their company
create policy "Users can view users in same company"
on public.users for select
using (company_id = public.get_current_company_id());

-- Users can read/write machines in their company
create policy "Users can view machines in same company"
on public.machines for select
using (company_id = public.get_current_company_id());

create policy "Owners can insert machines"
on public.machines for insert
with check (company_id = public.get_current_company_id());

create policy "Owners can update machines"
on public.machines for update
using (company_id = public.get_current_company_id());

-- Documents RLS
create policy "Users can view documents for their machines"
on public.documents for select
using (machine_id in (select id from public.machines where company_id = public.get_current_company_id()));

create policy "Staff can insert documents"
on public.documents for insert
with check (machine_id in (select id from public.machines where company_id = public.get_current_company_id()));

-- Parts RLS
create policy "Users can view parts for their machines"
on public.parts for select
using (machine_id in (select id from public.machines where company_id = public.get_current_company_id()));

create policy "Staff can insert parts"
on public.parts for insert
with check (machine_id in (select id from public.machines where company_id = public.get_current_company_id()));

-- Consumables RLS
create policy "Users can view consumables for their machines"
on public.consumables for select
using (machine_id in (select id from public.machines where company_id = public.get_current_company_id()));

create policy "Staff can insert consumables"
on public.consumables for insert
with check (machine_id in (select id from public.machines where company_id = public.get_current_company_id()));

-- ==========================================
-- STORAGE BUCKETS
-- ==========================================

insert into storage.buckets (id, name, public) 
values ('machine-documents', 'machine-documents', true);

create policy "Public Access to Documents"
on storage.objects for select
using ( bucket_id = 'machine-documents' );

create policy "Staff can upload Documents"
on storage.objects for insert
with check ( bucket_id = 'machine-documents' );
