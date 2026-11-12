create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  type text not null default 'info' check (type in ('info', 'success', 'warning', 'error')),
  booking_type text check (booking_type in ('accommodation', 'pickleball', 'billiards', 'atv')),
  booking_reference text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "notifications admin all" on public.notifications;
create policy "notifications admin all"
  on public.notifications for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "notifications authenticated insert" on public.notifications;
create policy "notifications authenticated insert"
  on public.notifications for insert
  with check (auth.role() = 'authenticated' or auth.role() = 'anon');

create index if not exists notifications_created_at_idx on public.notifications (created_at desc);
create index if not exists notifications_is_read_idx on public.notifications (is_read);