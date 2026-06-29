-- 0056_login_tracking.sql — suivi des connexions équipe (RGPD : aucune IP)
create table if not exists public.login_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  started_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  user_agent   text
);
create index if not exists login_sessions_user_idx on public.login_sessions(user_id, started_at desc);
alter table public.login_sessions enable row level security;
create policy login_sessions_own_insert on public.login_sessions for insert with check (user_id = auth.uid());
create policy login_sessions_own_update on public.login_sessions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy login_sessions_own_select on public.login_sessions for select using (user_id = auth.uid());
create policy login_sessions_admin_select on public.login_sessions for select using (public.is_admin());
