create table if not exists public.otp_challenges (
  phone text primary key,
  otp_hash text not null,
  expires_at timestamptz not null,
  resend_at timestamptz not null,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.otp_challenges enable row level security;

revoke all on table public.otp_challenges from anon, authenticated;
grant all on table public.otp_challenges to service_role;
