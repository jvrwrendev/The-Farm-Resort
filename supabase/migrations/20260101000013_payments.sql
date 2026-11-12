-- 50% GCash down payment system for all booking types.

-- Extend payment_status enum used by accommodation bookings.
alter type public.payment_status add value if not exists 'pending_verification';
alter type public.payment_status add value if not exists 'rejected';

-- Add payment status to pickleball and activity bookings for consistency.
alter table public.pickleball_bookings
  add column if not exists payment_status text not null default 'unpaid'
  check (payment_status in ('unpaid', 'pending_verification', 'partially_paid', 'paid', 'rejected'));

alter table public.activity_bookings
  add column if not exists payment_status text not null default 'unpaid'
  check (payment_status in ('unpaid', 'pending_verification', 'partially_paid', 'paid', 'rejected'));

-- Admin-configurable GCash payment settings (singleton row).
create table if not exists public.payment_settings (
  id int primary key default 1 check (id = 1),
  gcash_account_name text not null default '',
  gcash_number text not null default '',
  gcash_qr_url text,
  instructions text not null default 'Scan the QR code and pay 50% of your total booking amount via GCash, then upload a screenshot of your receipt.',
  updated_at timestamptz not null default now()
);

insert into public.payment_settings (id) values (1) on conflict (id) do nothing;

alter table public.payment_settings enable row level security;

drop policy if exists "payment_settings public read" on public.payment_settings;
create policy "payment_settings public read"
  on public.payment_settings for select using (true);

drop policy if exists "payment_settings admin write" on public.payment_settings;
create policy "payment_settings admin write"
  on public.payment_settings for all
  using (public.is_admin())
  with check (public.is_admin());

-- Payment records linked to bookings by type + reference.
create table if not exists public.payment_records (
  id uuid primary key default gen_random_uuid(),
  booking_type text not null check (booking_type in ('accommodation', 'pickleball', 'billiards', 'atv')),
  booking_reference text not null,
  total_amount numeric not null default 0,
  down_payment_amount numeric not null default 0,
  remaining_balance numeric not null default 0,
  receipt_url text,
  status text not null default 'pending_verification'
    check (status in ('pending_verification', 'verified', 'rejected')),
  rejection_reason text,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_type, booking_reference)
);

create index if not exists payment_records_status_idx on public.payment_records (status, created_at desc);
create index if not exists payment_records_reference_idx on public.payment_records (booking_reference);

alter table public.payment_records enable row level security;

drop policy if exists "payment_records admin all" on public.payment_records;
create policy "payment_records admin all"
  on public.payment_records for all
  using (public.is_admin())
  with check (public.is_admin());

-- Storage buckets for QR codes and receipts.
insert into storage.buckets (id, name, public)
values ('payment-settings', 'payment-settings', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('payment-receipts', 'payment-receipts', true)
on conflict (id) do nothing;

-- Storage policies: public read; authenticated/anon can upload receipts (client uploads before/with submit);
-- admin manages settings bucket. Keep simple: allow public read, allow anyone insert (paths are UUID-based).
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'payment settings public read'
  ) then
    create policy "payment settings public read" on storage.objects for select
      using (bucket_id in ('payment-settings', 'payment-receipts'));
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'payment settings admin insert'
  ) then
    create policy "payment settings admin insert" on storage.objects for insert
      with check (bucket_id = 'payment-settings' and public.is_admin());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'payment settings admin update'
  ) then
    create policy "payment settings admin update" on storage.objects for update
      using (bucket_id = 'payment-settings' and public.is_admin());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'payment settings admin delete'
  ) then
    create policy "payment settings admin delete" on storage.objects for delete
      using (bucket_id = 'payment-settings' and public.is_admin());
  end if;
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'payment receipts public insert'
  ) then
    create policy "payment receipts public insert" on storage.objects for insert
      with check (bucket_id = 'payment-receipts');
  end if;
end $$;

-- Return payment settings for checkout display.
create or replace function public.get_payment_settings()
returns public.payment_settings
language sql
security definer
set search_path = public
stable
as $$
  select * from public.payment_settings where id = 1 limit 1;
$$;

grant execute on function public.get_payment_settings() to anon, authenticated;

-- Submit a 50% down payment receipt for a booking.
create or replace function public.submit_payment(
  p_booking_type text,
  p_reference text,
  p_total_amount numeric,
  p_receipt_url text
)
returns public.payment_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric;
  v_down numeric;
  v_remaining numeric;
  v_record public.payment_records%rowtype;
  v_found boolean := false;
begin
  if p_booking_type not in ('accommodation', 'pickleball', 'billiards', 'atv') then
    raise exception 'INVALID_BOOKING_TYPE';
  end if;

  if p_reference is null or trim(p_reference) = '' then
    raise exception 'BOOKING_REFERENCE_REQUIRED';
  end if;

  if p_receipt_url is null or trim(p_receipt_url) = '' then
    raise exception 'RECEIPT_REQUIRED';
  end if;

  if p_booking_type = 'accommodation' then
    select true, b.total_price into v_found, v_total
    from public.bookings b
    where b.booking_reference = trim(p_reference);
  elsif p_booking_type = 'pickleball' then
    select true, b.total_amount into v_found, v_total
    from public.pickleball_bookings b
    where b.reference = trim(p_reference);
  else
    select true, b.total_amount into v_found, v_total
    from public.activity_bookings b
    join public.activities a on a.id = b.activity_id
    where b.reference = trim(p_reference)
      and ((p_booking_type = 'billiards' and a.type = 'billiards') or (p_booking_type = 'atv' and a.type = 'atv'));
  end if;

  if not coalesce(v_found, false) then
    raise exception 'BOOKING_NOT_FOUND';
  end if;

  v_total := coalesce(nullif(v_total, 0), p_total_amount, 0);
  v_down := round(v_total * 0.5, 2);
  v_remaining := round(v_total - v_down, 2);

  insert into public.payment_records (
    booking_type,
    booking_reference,
    total_amount,
    down_payment_amount,
    remaining_balance,
    receipt_url,
    status,
    rejection_reason,
    verified_at,
    verified_by,
    updated_at
  ) values (
    p_booking_type,
    trim(p_reference),
    v_total,
    v_down,
    v_remaining,
    trim(p_receipt_url),
    'pending_verification',
    null,
    null,
    null,
    now()
  )
  on conflict (booking_type, booking_reference) do update set
    total_amount = excluded.total_amount,
    down_payment_amount = excluded.down_payment_amount,
    remaining_balance = excluded.remaining_balance,
    receipt_url = excluded.receipt_url,
    status = 'pending_verification',
    rejection_reason = null,
    verified_at = null,
    verified_by = null,
    updated_at = now()
  returning * into v_record;

  if p_booking_type = 'accommodation' then
    update public.bookings
    set payment_status = 'pending_verification', updated_at = now()
    where booking_reference = trim(p_reference);
  elsif p_booking_type = 'pickleball' then
    update public.pickleball_bookings
    set payment_status = 'pending_verification', updated_at = now()
    where reference = trim(p_reference);
  else
    update public.activity_bookings b
    set payment_status = 'pending_verification', updated_at = now()
    from public.activities a
    where b.activity_id = a.id
      and b.reference = trim(p_reference)
      and ((p_booking_type = 'billiards' and a.type = 'billiards') or (p_booking_type = 'atv' and a.type = 'atv'));
  end if;

  return v_record;
end;
$$;

grant execute on function public.submit_payment(text, text, numeric, text) to anon, authenticated;

-- Get a payment record for a specific booking (public, for confirmation/tracking).
create or replace function public.get_payment_for_booking(p_booking_type text, p_reference text)
returns public.payment_records
language sql
security definer
set search_path = public
stable
as $$
  select *
  from public.payment_records
  where booking_type = p_booking_type
    and booking_reference = trim(p_reference)
  limit 1;
$$;

grant execute on function public.get_payment_for_booking(text, text) to anon, authenticated;

-- Admin: list all payment records for review.
create or replace function public.list_payment_records(p_status text default null)
returns setof public.payment_records
language sql
security definer
set search_path = public
stable
as $$
  select *
  from public.payment_records
  where public.is_admin()
    and (p_status is null or status = p_status)
  order by created_at desc;
$$;

grant execute on function public.list_payment_records(text) to authenticated;

-- Admin: verify or reject a submitted payment.
create or replace function public.verify_payment(
  p_record_id uuid,
  p_approve boolean,
  p_reason text default null
)
returns public.payment_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.payment_records%rowtype;
  v_new_status text;
  v_booking_payment_status text;
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select * into v_record
  from public.payment_records
  where id = p_record_id
  for update;

  if not found then
    raise exception 'PAYMENT_RECORD_NOT_FOUND';
  end if;

  if p_approve then
    v_new_status := 'verified';
    v_booking_payment_status := 'partially_paid';
  else
    v_new_status := 'rejected';
    v_booking_payment_status := 'unpaid';
  end if;

  update public.payment_records
  set
    status = v_new_status,
    rejection_reason = case when p_approve then null else nullif(trim(p_reason), '') end,
    verified_at = case when p_approve then now() else null end,
    verified_by = case when p_approve then auth.uid() else null end,
    updated_at = now()
  where id = p_record_id
  returning * into v_record;

  if v_record.booking_type = 'accommodation' then
    update public.bookings
    set payment_status = v_booking_payment_status::public.payment_status, updated_at = now()
    where booking_reference = v_record.booking_reference;
  elsif v_record.booking_type = 'pickleball' then
    update public.pickleball_bookings
    set payment_status = v_booking_payment_status, updated_at = now()
    where reference = v_record.booking_reference;
  else
    update public.activity_bookings b
    set payment_status = v_booking_payment_status, updated_at = now()
    from public.activities a
    where b.activity_id = a.id
      and b.reference = v_record.booking_reference
      and ((v_record.booking_type = 'billiards' and a.type = 'billiards') or (v_record.booking_type = 'atv' and a.type = 'atv'));
  end if;

  return v_record;
end;
$$;

grant execute on function public.verify_payment(uuid, boolean, text) to authenticated;
