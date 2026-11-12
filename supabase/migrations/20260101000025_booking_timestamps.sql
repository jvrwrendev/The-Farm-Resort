-- Auto-recorded check-in / check-out timestamps for all booking categories

alter table public.bookings
  add column if not exists check_in_at timestamptz,
  add column if not exists check_out_at timestamptz;

alter table public.pickleball_bookings
  add column if not exists check_in_at timestamptz,
  add column if not exists check_out_at timestamptz;

alter table public.activity_bookings
  add column if not exists check_in_at timestamptz,
  add column if not exists check_out_at timestamptz;

-- Update approve_booking to record check_in_at (already sets confirmed)
create or replace function public.approve_booking(
  p_booking_type text,
  p_reference text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric;
  v_found boolean := false;
  v_record public.payment_records%rowtype;
  v_final numeric;
  v_paid numeric;
  v_down numeric;
  v_remaining numeric;
  v_original numeric;
begin
  if not public.is_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  if p_booking_type not in ('accommodation', 'pickleball', 'billiards', 'atv') then raise exception 'INVALID_BOOKING_TYPE'; end if;

  if p_booking_type = 'accommodation' then
    select true, b.total_price into v_found, v_total from public.bookings b where b.booking_reference = trim(p_reference);
  elsif p_booking_type = 'pickleball' then
    select true, b.total_amount into v_found, v_total from public.pickleball_bookings b where b.reference = trim(p_reference);
  else
    select true, b.total_amount into v_found, v_total from public.activity_bookings b join public.activities a on a.id = b.activity_id
      where b.reference = trim(p_reference) and ((p_booking_type='billiards' and a.type='billiards') or (p_booking_type='atv' and a.type='atv'));
  end if;

  if not coalesce(v_found, false) then raise exception 'BOOKING_NOT_FOUND'; end if;
  v_total := coalesce(v_total, 0);

  select * into v_record from public.payment_records
    where booking_type = p_booking_type and booking_reference = trim(p_reference);

  if found then
    v_original := coalesce(nullif(v_record.original_amount, 0), v_total);
    v_paid := v_record.amount_paid;
    if v_paid = 0 and v_record.status in ('pending_verification', 'unpaid', 'rejected') then
      v_paid := round(v_total * 0.5, 2);
    end if;
  else
    v_original := v_total;
    v_paid := round(v_total * 0.5, 2);
  end if;

  v_final := v_total;
  v_down := round(v_final * 0.5, 2);
  if v_paid < v_down then v_paid := v_down; end if;
  v_remaining := round(v_final - v_paid, 2);
  if v_remaining < 0 then v_remaining := 0; end if;

  if found then
    update public.payment_records set
      original_amount = v_original,
      total_amount = v_final,
      down_payment_amount = v_paid,
      amount_paid = v_paid,
      remaining_balance = v_remaining,
      status = 'verified',
      rejection_reason = null,
      verified_at = coalesce(verified_at, now()),
      verified_by = coalesce(verified_by, auth.uid()),
      updated_at = now()
    where booking_type = p_booking_type and booking_reference = trim(p_reference);
  else
    insert into public.payment_records (
      booking_type, booking_reference, original_amount, discount_type, discount_value,
      total_amount, down_payment_amount, remaining_balance, amount_paid, status,
      verified_at, verified_by
    ) values (
      p_booking_type, trim(p_reference), v_original, 'none', 0,
      v_final, v_paid, v_remaining, v_paid, 'verified',
      now(), auth.uid()
    );
  end if;

  if p_booking_type = 'accommodation' then
    update public.bookings
    set status = 'confirmed', payment_status = 'partially_paid', check_in_at = coalesce(check_in_at, now()), updated_at = now()
    where booking_reference = trim(p_reference);
  elsif p_booking_type = 'pickleball' then
    update public.pickleball_bookings
    set status = 'confirmed', payment_status = 'partially_paid', check_in_at = coalesce(check_in_at, now()), updated_at = now()
    where reference = trim(p_reference);
  else
    update public.activity_bookings b
    set status = 'confirmed', payment_status = 'partially_paid', check_in_at = coalesce(check_in_at, now()), updated_at = now()
    from public.activities a
    where b.activity_id = a.id and b.reference = trim(p_reference)
      and ((p_booking_type='billiards' and a.type='billiards') or (p_booking_type='atv' and a.type='atv'));
  end if;
end;
$$;

grant execute on function public.approve_booking(text, text) to authenticated;

-- Trigger to record check_out_at when status becomes completed
create or replace function public.record_checkout_timestamp()
returns trigger
language plpgsql
as $$
begin
  if NEW.status = 'completed' and (OLD.status is null or OLD.status <> 'completed') then
    NEW.check_out_at := coalesce(NEW.check_out_at, now());
  end if;
  if NEW.status = 'checked_in' and (OLD.status is null or OLD.status <> 'checked_in') then
    NEW.check_in_at := coalesce(NEW.check_in_at, now());
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_bookings_checkout on public.bookings;
create trigger trg_bookings_checkout
  before update on public.bookings
  for each row execute function public.record_checkout_timestamp();

drop trigger if exists trg_pickleball_checkout on public.pickleball_bookings;
create trigger trg_pickleball_checkout
  before update on public.pickleball_bookings
  for each row execute function public.record_checkout_timestamp();

drop trigger if exists trg_activity_checkout on public.activity_bookings;
create trigger trg_activity_checkout
  before update on public.activity_bookings
  for each row execute function public.record_checkout_timestamp();