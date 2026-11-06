# Revlog mobile API: inventory and plan

Status: agreed with the owner. No Supabase key on the phone; the Expo app lives in `mobile/`. Written against `main` at 5b10440c, with PR #34 merged.

## What the phone app can't reach today

All logic runs in Server Actions and `src/lib`. Server Actions are private to the website, so the
app needs real HTTP endpoints. The database connection bypasses row-level security, so every rule
lives in application code and every query filters by user id.

## Data operations

| Area | Operations | Today | Phase |
| --- | --- | --- | --- |
| Account | sign up, sign in, refresh, sign out, resend confirmation (password reset opens the website) | `(auth)/actions.ts`, `garage/settings/actions.ts` | 1 |
| Account | choose username, for accounts without one | `(auth)/actions.ts` | 3 |
| Account | delete account (both stores require this in the app) | `garage/settings/actions.ts` | 1 |
| Garage | list cars with status and photos, add with service plan, edit, remove, favorite, reorder, update mileage, set or clear car photo | `garage/actions.ts`, `reminders/actions.ts`, `garage/page.tsx` | 1 |
| Service log | list, add, edit, delete, log from a reminder, list and add service types | `service/actions.ts`, `lib/service-records.ts`, `lib/service-types.ts` | 1 |
| Reminders | list with status, add, edit, delete, mark never done | `reminders/actions.ts`, `lib/reminder-store.ts`, `lib/reminders.ts` | 1 |
| Photos | list, upload one at a time, delete | `photos/actions.ts`, `lib/gallery.ts`, `lib/photos.ts` | 1 |
| AI consent | read, grant, withdraw | `garage/ai-consent-actions.ts`, `lib/ai-consent.ts` | 1 |
| Settings | reminder emails and percent, test email | `garage/settings/actions.ts`, `lib/email-settings.ts` | 2 |
| Scans | receipt, mod, history file (email check, then AI consent check) | `service/actions.ts`, `mods/actions.ts`, `service/import/actions.ts` | 2 |
| Mods and parts | mods, status, parts, price checks, costs | `mods/actions.ts`, `parts/actions.ts`, `lib/costs.ts` | 2 |
| Community | feed, post, build, photos, likes, comments, profiles | `community/actions.ts`, `lib/community.ts` | 3 |
| Moderation | report, block, unblock, moderator queue, remove, suspend, restore | `community/actions.ts`, `garage/moderation/actions.ts`, `lib/moderation.ts` | 3 |

Community ships with report, block, and moderator actions together (Apple guideline 1.2).

## Rules moved out of action files and pages

These now live in `src/lib`, so the website and API call the same code. Actions stay as thin
wrappers that read the form and redirect.

- Sign up, sign in, and account deletion: `lib/account.ts`.
- Service logging: `lib/service-log.ts`. Saved parts stay untouched unless `parts` is sent, because
  syncing an empty list would delete them.
- Reminder add and edit: `lib/reminder-forms.ts`.
- Photo upload rules: `lib/gallery.ts`.
- Reminder ranking: `rankReminders` and `carUrgency` in `lib/reminders.ts`.

Still to move when community reaches the app: `checkText`, the daily post limit, and the suspension
and profile checks in `community/actions.ts`.

## API

JSON route handlers under `/api/v1`, plus multipart for photos.

1. `createClient()` in `src/lib/supabase/server.ts` also accepts `Authorization: Bearer`. Everything
   built on it (`getUser`, signed photo links, storage under the user's own folder) then works
   unchanged, with storage rules still applied as that user.
2. A `withUser` wrapper returns JSON 401 instead of the `/login` redirect, and maps errors to one
   shape: `{ "error": "message" }`.
3. `src/proxy.ts` skips `/api/v1`, so requests don't check the session twice.
4. Handlers parse input with the existing zod schemas and call `src/lib`. No rules in handlers.
5. `updateTag` throws in Route Handlers, so API writes that touch the featured build use
   `revalidateTag(FEATURED_BUILD_TAG, "max")`. The landing page can show stale data briefly.
6. No database migrations are needed for phase 1.

## Auth

The Supabase key has never left the server. No client code uses it, and nothing calls
`supabase.from`. RLS on `posts`, `post_comments`, and `profiles` is owner-all, so a signed-in user
holding the key could write those tables directly, skipping the text filter, suspensions, and daily
limits. Likewise `ai_consents` and `user_blocks`, and files in the public `community-photos` bucket.

The app holds no Supabase key. `/api/v1/auth/*` signs in and refreshes on the server
and returns tokens, which the app keeps in `expo-secure-store`.

## Checks

`npm test` runs Vitest over the phase 1 rules: 401 without a token, the user id coming from the token
and never the body, the text filter on usernames, and the email gate on photos. Suspensions and the AI
consent gate have no phase 1 route; test them when community and scans arrive. Tests never write to the real database, so `src/lib` calls are mocked and the run on a real phone is the
end-to-end check. Whether a separate test Supabase project exists is still to confirm.

## Expo

Expo SDK 58 (React Native 0.88), Expo Router. The first run on a phone uses Expo Go, which now needs
a free Expo login, and no Mac or paid Apple account. Later iOS builds go through EAS.
