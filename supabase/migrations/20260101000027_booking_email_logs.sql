-- Audit log for transactional booking emails (confirmation/rejection).
-- Idempotency is enforced by the unique (booking_type, booking_reference, email_type)
-- constraint so retries/double-clicks never send a duplicate confirmation.

create table if not exists public.booking_email_logs (
  id uuid primary key default gen_random_uuid(),
  booking_type text not null check (booking_type in ('accommodation', 'pickleball', 'billiards', 'atv')),
  booking_reference text not null,
  email_type text not null default 'confirmation' check (email_type in ('confirmation', 'rejection')),
  recipient text not null,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts integer not null default 0,
  message_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists booking_email_logs_unique_idx
  on public.booking_email_logs (booking_type, booking_reference, email_type);

alter table public.booking_email_logs enable row level security;

drop policy if exists "booking_email_logs admin read" on public.booking_email_logs;
create policy "booking_email_logs admin read"
  on public.booking_email_logs for select
  using (public.is_admin());

-- Service role (used by the Edge Function) bypasses RLS. No client writes.

create index if not exists booking_email_logs_status_idx
  on public.booking_email_logs (status, updated_at);

create or replace function public.touch_booking_email_log()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_booking_email_log_updated on public.booking_email_logs;
create trigger trg_booking_email_log_updated
  before update on public.booking_email_logs
  for each row execute function public.touch_booking_email_log();