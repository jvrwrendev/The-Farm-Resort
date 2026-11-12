-- Backend time validation for accommodation bookings on the current date.

create or replace function public.check_booking_time_not_past()
returns trigger
language plpgsql
as $$
begin
  if NEW.check_in = current_date and NEW.check_in_time is not null
     and NEW.check_in_time < to_char(now(), 'HH24:MI') then
    raise exception 'PAST_CHECK_IN_TIME';
  end if;
  if NEW.check_in = current_date and NEW.check_in_period = 'AM'
     and extract(hour from now()) >= 12 then
    raise exception 'PAST_CHECK_IN_PERIOD';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_booking_time_not_past on public.bookings;
create trigger trg_booking_time_not_past
  before insert or update on public.bookings
  for each row execute function public.check_booking_time_not_past();