-- Add checked_in status to all booking tables

-- bookings.status uses enum booking_status
do $$ begin
  alter type public.booking_status add value if not exists 'checked_in';
exception when others then null;
end $$;

-- pickleball/activity may use enum or text; try common enum names
do $$ begin
  alter type public.pickleball_booking_status add value if not exists 'checked_in';
exception when others then null;
end $$;

do $$ begin
  alter type public.activity_booking_status add value if not exists 'checked_in';
exception when others then null;
end $$;

-- If status is text with a check constraint, recreate constraints to include checked_in
alter table public.pickleball_bookings drop constraint if exists pickleball_bookings_status_check;
alter table public.pickleball_bookings
  add constraint pickleball_bookings_status_check
  check (status in ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled'));

alter table public.activity_bookings drop constraint if exists activity_bookings_status_check;
alter table public.activity_bookings
  add constraint activity_bookings_status_check
  check (status in ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled'));

-- bookings uses enum; no check constraint needed, but ensure any existing check is updated
alter table public.bookings drop constraint if exists bookings_status_check;

-- Update verify_payment to auto-confirm booking on approval
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
    set payment_status = v_booking_payment_status::public.payment_status,
        status = case when p_approve then 'confirmed'::public.booking_status else status end,
        updated_at = now()
    where booking_reference = v_record.booking_reference;
  elsif v_record.booking_type = 'pickleball' then
    update public.pickleball_bookings
    set payment_status = v_booking_payment_status,
        status = case when p_approve then 'confirmed' else status end,
        updated_at = now()
    where reference = v_record.booking_reference;
  else
    update public.activity_bookings b
    set payment_status = v_booking_payment_status, updated_at = now(),
        status = case when p_approve then 'confirmed' else b.status end
    from public.activities a
    where b.activity_id = a.id
      and b.reference = v_record.booking_reference
      and ((v_record.booking_type = 'billiards' and a.type = 'billiards') or (v_record.booking_type = 'atv' and a.type = 'atv'));
  end if;

  return v_record;
end;
$$;

grant execute on function public.verify_payment(uuid, boolean, text) to authenticated;