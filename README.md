# Revlog

A car maintenance and modification tracker. Log every service, get reminded before the next one is due, track your build with photos and parts, see what it all cost, and share it with the community.

**Live at [revlog.me](https://revlog.me)**

## Features

- **Service history:** date, mileage, cost, shop, notes, parts, and receipt photos. Copy a past record in one click. Download the whole history as a PDF.
- **Reminders:** intervals by miles, months, or both. Each reminder counts from the latest matching service, so records can be logged in any order. Due soon turns amber, overdue turns red.
- **Reminder emails:** a daily job emails what's due, 500 mi or 14 days out, or at a percent of the interval you choose. One-click unsubscribe.
- **Build tracker:** mods marked planned, installed, or removed, a photo library per car, and photos on each mod.
- **Parts and prices:** parts with store links on any mod or service, checked daily for price changes.
- **Costs:** totals, a monthly service vs. mods chart, per-car totals, and top categories.
- **Community:** public posts with tags, photos, and optional part links, plus profiles by username.
- **Garage:** VIN lookup, favorites, custom order, custom service types.

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router, server actions), React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL on Supabase, Drizzle ORM and drizzle-kit migrations |
| Auth and storage | Supabase Auth (@supabase/ssr), Supabase Storage |
| Email | Resend |
| Hosting | Vercel, Vercel Cron |
| Other | Zod, pdf-lib, undici, NHTSA vPIC API |

## How it works

- Pages and forms are server components and server actions. The server connects to Postgres as the owner, so every query filters by the signed-in user's id. Row-level security policies on every table are a second layer.
- Garage photos live in a private bucket and are shown through short-lived signed URLs. Sharing a post copies the chosen photos to a public bucket.
- Two daily cron jobs, protected by a bearer secret, send reminder emails and check part prices. Price checks only fetch public http(s) addresses on ports 80 and 443, checked again at connect time, with limits on redirects, size, and time.

## Run it locally

You need Node.js 20.9 or newer and a free [Supabase](https://supabase.com) project.

1. Install dependencies:
   ```bash
   npm ci
   ```
2. Copy `.env.example` to `.env.local` and fill in your Supabase URL, publishable key, and database connection strings. Email settings are optional; without them, emails are skipped.
3. Create the tables, policies, and storage buckets:
   ```bash
   npm run db:migrate
   ```
4. Start the dev server and open [localhost:3000](http://localhost:3000):
   ```bash
   npm run dev
   ```

In Supabase, add `http://localhost:3000/**` to Authentication > URL Configuration > Redirect URLs so sign-up confirmation links work. Branded auth email templates are in `supabase/templates/`; paste each into Authentication > Emails (`magic-link.html` goes in "Magic link or OTP"). Leave "Confirm email" off under Sign In / Providers > Email: accounts work right away, and the magic link email is what confirms an address and unlocks photo uploads and scans.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate a migration from `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Browse the database |

## Project layout

```
src/
  app/            routes: landing, auth, garage, community, profiles, API
  components/     shared UI (app shell, photo strip, parts fieldset)
  db/             Drizzle schema and client
  lib/            data access, reminders, email, price checks, helpers
drizzle/          SQL migrations
supabase/         auth email templates
```
