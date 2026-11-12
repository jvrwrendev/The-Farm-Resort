-- Payment discount + completion support

alter table public.payment_records
  add column if not exists original_amount numeric not null default 0,
  add column if not exists discount_type text not null default 'none'
    check (discount_type in ('none', 'fixed', 'percent')),
  add column if not exists discount_value numeric not null default 0,
  add column if not exists amount_paid numeric not null default 0;

update public.payment_records
set
  original_amount = case when original_amount = 0 then total_amount else original_amount end,
  amount_paid = case when status = 'verified' then down_payment_amount else amount_paid end
where true;

alter table public.payment_records drop constraint if exists payment_records_status_check;
alter table public.payment_records
  add constraint payment_records_status_check
  check (status in ('pending_verification', 'verified', 'rejected', 'paid'));

create or replace function public.apply_discount(
  p_booking_type text,
  p_reference text,
  p_discount_type text,
  p_discount_value numeric
)
returns public.payment_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric;
  v_found boolean := false;
  v_original numeric;
  v_discount numeric;
  v_final numeric;
  v_paid numeric;
  v_record public.payment_records%rowtype;
  v_down numeric;
  v_remaining numeric;
begin
  if p_booking_type not in ('accommodation', 'pickleball', 'billiards', 'atv') then
    raise exception 'INVALID_BOOKING_TYPE';
  end if;
  if p_discount_type not in ('none', 'fixed', 'percent') then
    raise exception 'INVALID_DISCOUNT_TYPE';
  end if;
  if p_discount_value < 0 then
    raise exception 'INVALID_DISCOUNT_VALUE';
  end if;

  if p_booking_type = 'accommodation' then
    select true, b.total_price into v_found, v_total from public.bookings b where b.booking_reference = trim(p_reference);
  elsif p_booking_type = 'pickleball' then
    select true, b.total_amount into v_found, v_total from public.pickleball_bookings b where b.reference = trim(p_reference);
  else
    select true, b.total_amount into v_found, v_total from public.activity_bookings b join public.activities a on a.id = b.activity_id
      where b.reference = trim(p_reference) and ((p_booking_type='billiards' and a.type='billiards') or (p_booking_type='atv' and a.type='atv'));
  end if;

  if not coalesce(v_found, false) then
    raise exception 'BOOKING_NOT_FOUND';
  end if;

  v_original := coalesce(v_total, 0);

  select * into v_record from public.payment_records
    where booking_type = p_booking_type and booking_reference = trim(p_reference);

  if found then
    v_paid := v_record.amount_paid;
    if v_record.original_amount is null or v_record.original_amount = 0 then
      v_record.original_amount := v_original;
    end if;
    v_original := v_record.original_amount;
  else
    v_paid := 0;
  end if;

  if p_discount_type = 'fixed' then
    v_discount := least(p_discount_value, v_original);
  elsif p_discount_type = 'percent' then
    v_discount := round(v_original * (p_discount_value / 100.0), 2);
    if v_discount > v_original then v_discount := v_original; end if;
  else
    v_discount := 0;
  end if;

  v_final := round(v_original - v_discount, 2);
  if v_final < 0 then v_final := 0; end if;

  v_down := round(v_final * 0.5, 2);
  v_remaining := round(v_final - v_paid, 2);
  if v_remaining < 0 then v_remaining := 0; end if;

  if found then
    update public.payment_records set
      original_amount = v_original,
      discount_type = p_discount_type,
      discount_value = p_discount_value,
      total_amount = v_final,
      down_payment_amount = case when v_paid = 0 then v_down else v_record.down_payment_amount end,
      remaining_balance = v_remaining,
      updated_at = now()
    where booking_type = p_booking_type and booking_reference = trim(p_reference)
    returning * into v_record;
  else
    insert into public.payment_records (
      booking_type, booking_reference, original_amount, discount_type, discount_value,
      total_amount, down_payment_amount, remaining_balance, amount_paid, status
    ) values (
      p_booking_type, trim(p_reference), v_original, p_discount_type, p_discount_value,
      v_final, v_down, v_remaining, 0, 'unpaid'
    ) returning * into v_record;
  end if;

  return v_record;
end;
$$;

grant execute on function public.apply_discount(text, text, text, numeric) to authenticated;

create or replace function public.complete_payment(p_record_id uuid)
returns public.payment_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.payment_records%rowtype;
  v_final numeric;
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select * into v_record from public.payment_records where id = p_record_id for update;
  if not found then raise exception 'PAYMENT_RECORD_NOT_FOUND'; end if;
  if v_record.status = 'paid' then
    raise exception 'ALREADY_PAID';
  end if;

  v_final := v_record.total_amount;

  update public.payment_records set
    status = 'paid',
    amount_paid = v_final,
    remaining_balance = 0,
    down_payment_amount = v_final,
    verified_at = coalesce(verified_at, now()),
    verified_by = coalesce(verified_by, auth.uid()),
    updated_at = now()
  where id = p_record_id
  returning * into v_record;

  if v_record.booking_type = 'accommodation' then
    update public.bookings set payment_status = 'paid', updated_at = now()
      where booking_reference = v_record.booking_reference;
  elsif v_record.booking_type = 'pickleball' then
    update public.pickleball_bookings set payment_status = 'paid', updated_at = now()
      where reference = v_record.booking_reference;
  else
    update public.activity_bookings b set payment_status = 'paid', updated_at = now()
      from public.activities a
      where b.activity_id = a.id and b.reference = v_record.booking_reference
        and ((v_record.booking_type='billiards' and a.type='billiards') or (v_record.booking_type='atv' and a.type='atv'));
  end if;

  return v_record;
end;
$$;

grant execute on function public.complete_payment(uuid) to authenticated;