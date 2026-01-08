-- Supabase schema for Care Group Keeper
-- Run this in your Supabase SQL editor or via migrations

-- USERS
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null check (role in ('admin','leader')),
  phone text,
  care_group_id uuid references public.care_groups(id) on delete set null,
  -- For phase 1 demo only; move to Auth in phase 2
  password_hash text,
  created_at timestamptz not null default now()
);

-- CARE GROUPS
create table if not exists public.care_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  leader_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- MEMBERS
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  dob date,
  care_group_id uuid not null references public.care_groups(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists idx_members_group on public.members(care_group_id);

-- ATTENDANCE
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  care_group_id uuid not null references public.care_groups(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  status text not null check (status in ('present','absent')),
  absence_reason text,
  created_at timestamptz not null default now()
);
create index if not exists idx_attendance_date_group on public.attendance(date, care_group_id);
create index if not exists idx_attendance_member on public.attendance(member_id);

-- FOLLOW UPS
create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  care_group_id uuid not null references public.care_groups(id) on delete cascade,
  leader_user_id uuid references public.users(id) on delete set null,
  reason text not null,
  status text not null check (status in ('open','done')) default 'open',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists idx_followups_group_status on public.follow_ups(care_group_id, status);

-- ABSENCE REASONS (config table)
create table if not exists public.absence_reasons (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  sort_order int not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Minimal RLS (adjust for production)
alter table public.users enable row level security;
alter table public.care_groups enable row level security;
alter table public.members enable row level security;
alter table public.attendance enable row level security;
alter table public.follow_ups enable row level security;
alter table public.absence_reasons enable row level security;

-- Public read policies for demo (limit by group in a real app)
create policy if not exists "read_all_users_demo" on public.users
  for select using (true);
create policy if not exists "read_all_groups_demo" on public.care_groups
  for select using (true);
create policy if not exists "read_all_members_demo" on public.members
  for select using (true);
create policy if not exists "read_all_attendance_demo" on public.attendance
  for select using (true);
create policy if not exists "read_all_followups_demo" on public.follow_ups
  for select using (true);
create policy if not exists "read_absence_reasons_demo" on public.absence_reasons
  for select using (true);

-- Public write policies for demo (unsafe for prod)
create policy if not exists "write_all_members_demo" on public.members
  for insert with check (true);
create policy if not exists "write_all_members_demo_upd" on public.members
  for update using (true) with check (true);

create policy if not exists "write_attendance_demo" on public.attendance
  for insert with check (true);
create policy if not exists "write_attendance_demo_del" on public.attendance
  for delete using (true);

create policy if not exists "write_followups_demo" on public.follow_ups
  for insert with check (true);
create policy if not exists "update_followups_demo" on public.follow_ups
  for update using (true) with check (true);

-- Seed absence reasons (idempotent)
insert into public.absence_reasons(label, sort_order)
select * from (values
  ('Sick', 10),
  ('Health', 20),
  ('Travel', 30),
  ('Work', 40),
  ('Family', 50),
  ('Other', 90)
) v(label, sort_order)
on conflict (label) do nothing;

-- Seed minimal data (optional)
-- insert into public.care_groups(name) values ('Alpha'), ('Beta');
-- insert into public.users(name, role) values ('Admin', 'admin');
