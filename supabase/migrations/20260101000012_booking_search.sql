-- Public, privacy-safe booking search across all reservation types.
-- Returns only the minimal details needed to track a reservation (no contact info).

create or replace function public.search_bookings(p_query text)
returns table (
  reference text,
  customer_name text,
  booking_type text,
  item_name text,
  booking_date date,
  status text
)
language sql
security definer
set search_path = public
stable
as $$
  select * from (
    select
      b.booking_reference as reference,
      b.customer_name as customer_name,
      'accommodation'::text as booking_type,
      r.name as item_name,
      b.check_in as booking_date,
      b.status::text as status
    from public.bookings b
    left join public.rooms r on r.id = b.room_id
    where length(trim(coalesce(p_query, ''))) > 0
      and (
        b.booking_reference ilike '%' || trim(p_query) || '%'
        or b.customer_name ilike '%' || trim(p_query) || '%'
      )

    union all

    select
      pb.reference as reference,
      pb.customer_name as customer_name,
      'pickleball'::text as booking_type,
      pc.name as item_name,
      pb.booking_date as booking_date,
      pb.status as status
    from public.pickleball_bookings pb
    left join public.pickleball_courts pc on pc.id = pb.court_id
    where length(trim(coalesce(p_query, ''))) > 0
      and (
        pb.reference ilike '%' || trim(p_query) || '%'
        or pb.customer_name ilike '%' || trim(p_query) || '%'
      )

    union all

    select
      ab.reference as reference,
      ab.customer_name as customer_name,
      case when a.type = 'billiards' then 'billiards' else 'atv' end as booking_type,
      coalesce(u.name, a.name) as item_name,
      ab.booking_date as booking_date,
      ab.status as status
    from public.activity_bookings ab
    left join public.activities a on a.id = ab.activity_id
    left join public.activity_units u on u.id = ab.unit_id
    where length(trim(coalesce(p_query, ''))) > 0
      and (
        ab.reference ilike '%' || trim(p_query) || '%'
        or ab.customer_name ilike '%' || trim(p_query) || '%'
      )
  ) results
  order by booking_date desc nulls last
  limit 50;
$$;

grant execute on function public.search_bookings(text) to anon, authenticated;
