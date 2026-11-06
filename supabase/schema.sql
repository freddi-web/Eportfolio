create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  email text not null check (char_length(btrim(email)) between 3 and 254),
  message text not null check (char_length(btrim(message)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create table if not exists public.registration_submissions (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(btrim(full_name)) between 1 and 120),
  email text not null check (char_length(btrim(email)) between 3 and 254),
  service text not null check (service in ('web-dev', 'software-design', 'consultation')),
  created_at timestamptz not null default now()
);

alter table public.contact_submissions enable row level security;
alter table public.registration_submissions enable row level security;

revoke all on table public.contact_submissions from anon, authenticated;
revoke all on table public.registration_submissions from anon, authenticated;
grant insert on table public.contact_submissions to service_role;
grant insert on table public.registration_submissions to service_role;
