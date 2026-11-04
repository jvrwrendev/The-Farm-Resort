# Supabase Backend

This folder contains the database schema, RPC functions, and seed data for The Farm
resort booking system. The frontend talks to Supabase directly using the anon
(publishable) key; all privileged operations are exposed as `SECURITY DEFINER`
Postgres functions so server-side validation can never be bypassed.

## Contents

| File | Purpose |
| --- | --- |
| `migrations/20260101000000_resort_core_schema.sql` | Tables, enums, triggers, RLS, overlap constraint |
| `migrations/20260101000001_resort_rpc.sql` | RPC functions used by the app |
| `seed.sql` | Resort settings singleton + the single room (PHP 7,000 / night, 25 guests) |

## Environment variables

Copy `.env.example` to `.env` and fill in the values from
**Dashboard > Project Settings > API**:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable / anon public key>
```

The `anon` key is safe to ship to the browser. Never put the `service_role` key in
the frontend or commit it.

## Applying migrations

### Option A - Supabase CLI (recommended)

```powershell
npx supabase login
npx supabase link --project-ref <project-ref>   # asks for the database password
npx supabase db push                            # applies supabase/migrations/*
```

Then apply the seed data (once, against the linked project):

```powershell
npx supabase db push --include-seed
```

If `--include-seed` does not pick up `seed.sql` (it depends on your CLI
config), run `seed.sql` manually in the Dashboard SQL Editor.

### Option B - Dashboard SQL Editor

Run the two files in `migrations/` in order, then `seed.sql`, inside the
**SQL Editor**. The scripts are idempotent and safe to re-run.

## Creating the first admin

New sign-ups are always created with the `customer` role - the
`handle_new_user` trigger ignores any client-supplied `role` to prevent
privilege escalation. Promote an account after it exists:

1. Create the user (Dashboard **Authentication > Users > Add user**, or let the
   person sign up in the app).
2. In the SQL Editor, promote it:

```sql
update public.profiles
set role = 'admin'
where email = 'owner@example.com';
```

`public.is_admin()` now returns true for that user and every admin page/RPC
becomes available. To revoke access, set `role = 'customer'` or
`is_active = false`.

## RPC contract

All functions are callable through `supabase.rpc(name, args)`. Parameter and
result names match the `Database` types in `src/types/index.ts`.

| Function | Caller | Returns |
| --- | --- | --- |
| `create_booking(p_room_id, p_customer_name, p_customer_email, p_customer_phone, p_check_in, p_check_out, p_guests, p_check_in_period, p_check_out_period, p_special_requests, p_adults, p_children, p_user_id)` | anon | `bookings` row |
| `get_booking_by_reference(p_reference)` | anon | `bookings` row |
| `is_range_available(p_room_id, p_check_in, p_check_out)` | anon | `boolean` |
| `get_calendar_occupancy(p_from, p_to, p_room_id)` | anon | masked occupancy rows |
| `list_admin_bookings(p_search, p_status, p_from, p_to)` | admin | `setof bookings` |
| `admin_update_booking_status(p_booking_id, p_status)` | admin | `bookings` row |
| `admin_update_payment_status(p_booking_id, p_payment_status)` | admin | `bookings` row |
| `dashboard_stats()` | admin | `jsonb` |
| `report_data(p_from, p_to)` | admin | `jsonb` |

### Enums

- `booking_status`: `pending`, `confirmed`, `cancelled`, `completed`
- `payment_status`: `unpaid`, `paid`, `partially_paid`
- `app_role`: `admin`, `customer`
- `day_period`: `AM`, `PM`

### Booking integrity

- `bookings_valid_dates` check enforces `check_out > check_in`.
- `bookings_no_overlap` is a `btree_gist` exclusion constraint over
  `daterange(check_in, check_out, '[)')` for the `pending`/`confirmed` statuses.
  `create_booking` catches the resulting `exclusion_violation` and returns a
  friendly `DATES_UNAVAILABLE` message.

### Security notes

- Row Level Security is enabled on every table.
- `bookings`, `rooms`, and `resort_settings` are read-only to the public where
  intended; direct booking writes are denied and must go through RPCs.
- `list_admin_bookings` returns an empty set for non-admins; the mutating and
  reporting RPCs raise `NOT_AUTHORIZED`.
- `get_calendar_occupancy` is public, so it masks guest name, party size, and
  amount (`"Reserved"`, `0`, `0`).

## Storage

No Supabase Storage bucket is required. Property imagery is bundled with the
frontend and selected in **Admin > Accommodation**. If you later want uploads,
the commented-out bucket/policy block at the end of the core-schema migration is
a starting point.
