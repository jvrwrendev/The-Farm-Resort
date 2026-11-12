-- Simplified booking approval workflow: add rejected status + approve/reject RPCs

do $$ begin
  alter type public.booking_status add value if not exists 'rejected';
exception when others then null;
end $$;

do $$ begin
  alter type public.pickleball_booking_status add value if not exists 'rejected';
exception when others then null;
end $$;

do $$ begin
  alter type public.activity_booking_status add value if not exists 'rejected';
exception when others then null;
end $$;

alter table public.pickleball_bookings drop constraint if exists pickleball_bookings_status_check;
alter table public.pickleball_bookings
  add constraint pickleball_bookings_status_check
  check (status in ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'rejected'));

alter table public.activity_bookings drop constraint if exists activity_bookings_status_check;
alter table public.activity_bookings
  add constraint activity_bookings_status_check
  check (status in ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'rejected'));

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
    set status = 'confirmed', payment_status = 'partially_paid', updated_at = now()
    where booking_reference = trim(p_reference);
  elsif p_booking_type = 'pickleball' then
    update public.pickleball_bookings
    set status = 'confirmed', payment_status = 'partially_paid', updated_at = now()
    where reference = trim(p_reference);
  else
    update public.activity_bookings b
    set status = 'confirmed', payment_status = 'partially_paid', updated_at = now()
    from public.activities a
    where b.activity_id = a.id and b.reference = trim(p_reference)
      and ((p_booking_type='billiards' and a.type='billiards') or (p_booking_type='atv' and a.type='atv'));
  end if;
end;
$$;

grant execute on function public.approve_booking(text, text) to authenticated;

create or replace function public.reject_booking(
  p_booking_type text,
  p_reference text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  if p_booking_type not in ('accommodation', 'pickleball', 'billiards', 'atv') then raise exception 'INVALID_BOOKING_TYPE'; end if;

  if p_booking_type = 'accommodation' then
    update public.bookings set status = 'rejected', payment_status = 'rejected', updated_at = now()
      where booking_reference = trim(p_reference);
  elsif p_booking_type = 'pickleball' then
    update public.pickleball_bookings set status = 'rejected', payment_status = 'rejected', updated_at = now()
      where reference = trim(p_reference);
  else
    update public.activity_bookings b set status = 'rejected', payment_status = 'rejected', updated_at = now()
      from public.activities a
      where b.activity_id = a.id and b.reference = trim(p_reference)
        and ((p_booking_type='billiards' and a.type='billiards') or (p_booking_type='atv' and a.type='atv'));
  end if;

  update public.payment_records
  set status = 'rejected', rejection_reason = nullif(trim(p_reason), ''), updated_at = now()
  where booking_type = p_booking_type and booking_reference = trim(p_reference);
end;
$$;

grant execute on function public.reject_booking(text, text, text) to authenticated;