-- Backend enforcement: prevent booking past time slots on the current date.

create or replace function public.check_booking_not_past_time()
returns trigger
language plpgsql
as $$
begin
  if TG_TABLE_NAME = 'pickleball_bookings' then
    if NEW.booking_date = current_date and NEW.start_time < to_char(now(), 'HH24:MI') then
      raise exception 'PICKLEBALL_PAST_TIME';
    end if;
  elsif TG_TABLE_NAME = 'activity_bookings' then
    if NEW.booking_date = current_date and NEW.start_time < to_char(now(), 'HH24:MI') then
      raise exception 'ACTIVITY_PAST_TIME';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_pickleball_not_past_time on public.pickleball_bookings;
create trigger trg_pickleball_not_past_time
  before insert or update on public.pickleball_bookings
  for each row execute function public.check_booking_not_past_time();

drop trigger if exists trg_activity_not_past_time on public.activity_bookings;
create trigger trg_activity_not_past_time
  before insert or update on public.activity_bookings
  for each row execute function public.check_booking_not_past_time();