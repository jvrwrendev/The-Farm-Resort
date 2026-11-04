# The Farm - Resort Booking Management System

A whole-property resort booking system with a public marketing site, an online
reservation flow, and an admin dashboard for managing bookings, the calendar,
reports, and settings.

## Tech stack

- **React 19** + **Vite** + **TypeScript**
- **React Router 7** for routing
- **TanStack Query 5** for server state
- **React Hook Form** + **Zod** for forms and validation
- **Tailwind CSS 4** + **shadcn/ui** primitives (Radix)
- **Supabase** (Postgres, Auth, Row Level Security, RPC) as the backend
- **Recharts** for reports, **jsPDF** / **html2canvas** for exports

## Getting started

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Configure the backend connection by copying `.env.example` to `.env` and
   filling in the Supabase URL and anon/publishable key. See
   [`supabase/README.md`](./supabase/README.md) for the full backend setup,
   including applying migrations and creating the first admin user.

3. Start the dev server:

   ```powershell
   npm run dev
   ```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check (`tsc -b`) and build for production |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the production build |

## Backend

The database lives in [`supabase/`](./supabase):

- `migrations/` - schema, triggers, RLS policies, and RPC functions
- `seed.sql` - the single accommodation (PHP 7,000 / night, up to 25 guests) and resort settings

All booking writes, availability checks, admin mutations, and reports go through
`SECURITY DEFINER` RPCs. New sign-ups always receive the `customer` role; an
existing account must be promoted to `admin` in SQL (see the backend README).

## Project structure

```
src/
  components/     shared UI primitives and layout
  features/
    admin/        admin dashboard, bookings, calendar, reports, settings
    auth/         AuthProvider and route protection
    booking/      public booking flow and confirmation
    landing/      marketing sections
  lib/            supabase client, mappers, error mapper, query keys, helpers
  services/       data-access layer (booking, admin, accommodation, settings, resort)
  types/          database and domain types
supabase/
  migrations/     SQL migrations
  seed.sql        initial data
```

## Admin access

There is no public admin sign-up. Create a user, then promote it:

```sql
update public.profiles set role = 'admin' where email = 'owner@example.com';
```

Sign in at `/admin/login`.
