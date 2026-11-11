# Usage limits

Every cap Revlog puts on users, and where to change it. These stop one account (or a script)
from running up the AI bill or filling the free Supabase and Vercel allowances.

All per-user caps are counted in the database, so they hold across every Vercel server
instance. Users can read their own counter rows but can't change or delete them; only the server
writes them.

When a user hits a cap, they see a plain message saying what happened and when to try again.
The website and the phone app share the same checks, because both go through `src/lib`.

## Per-user caps over time

| What | Limit | Window | Where to change it |
|---|---|---|---|
| Photo uploads (cars, mods, records, new-car photo, edited photos) | 50 | 24 hours | `LIMITS["photo-upload"]` in `src/lib/rate-limit.ts` |
| "Check price now" | 30 | 1 hour | `LIMITS["price-check"]` in `src/lib/rate-limit.ts` |
| "Check price now" on the same part | 1 | 1 minute | `priceCheckBlocked` in `src/lib/parts.ts` |
| Test reminder email | 5 | 24 hours | `LIMITS["test-email"]` in `src/lib/rate-limit.ts` |
| Resend confirmation link | 5 | 24 hours | `LIMITS["confirm-email"]` in `src/lib/rate-limit.ts` |
| Receipt and mod scans (AI) | 20 | 24 hours | `DAILY_SCAN_LIMIT` in `src/lib/receipt-scan.ts` |
| Service history scans (AI) | 60 | 24 hours | `HISTORY_SCAN_LIMIT` in `src/lib/history-scan.ts` |
| Community posts | 10 | 24 hours | `POSTS_PER_DAY` in `src/lib/community-rules.ts` |
| Community comments | 100 | 24 hours | `COMMENTS_PER_DAY` in `src/lib/community-rules.ts` |

The two AI scan caps share one counter (the `receipt_scans` table). A receipt scan is refused
once the user has done 20 scans of any kind that day; a history scan is refused at 60.

Supabase also limits sign-ups, sign-ins and auth emails on its own. Those are set in the
Supabase dashboard under Authentication > Rate Limits, not in this code.

## Storage caps

| What | Limit | Where to change it |
|---|---|---|
| Photos per account (all cars) | 300 | `ACCOUNT_PHOTO_LIMIT` in `src/lib/gallery.ts` |
| Build photos per car | 30 | `PHOTO_LIMITS.build` in `src/lib/gallery.ts` |
| Photos per mod | 10 | `PHOTO_LIMITS.mod` in `src/lib/gallery.ts` |
| Photos per service record | 5 | `PHOTO_LIMITS.record` in `src/lib/gallery.ts` |
| Photos per community post | 10 | `MAX_POST_PHOTOS` in `src/lib/community.ts` |
| Records saved from one history import | 1,000 | `MAX_IMPORT_RECORDS` in `src/lib/history-draft.ts` |

## File sizes

| What | Limit | Where to change it |
|---|---|---|
| Photo upload (car and community) | 1 MB, JPG, PNG or WebP | `MAX_BYTES` in `src/lib/photos.ts` |
| Photo shrink target on the device | 900 KB | `MAX_UPLOAD_BYTES` in `src/lib/resize-image.ts` |
| History scan PDF | 3.5 MB | `MAX_PDF_BYTES` in `src/lib/history-scan.ts` (also in the import page) |
| History spreadsheet | 2 MB, 150,000 characters | `src/lib/sheet-import.ts`, `MAX_SHEET_CHARS` in `src/lib/history-scan.ts` |
| Store page read for a price | 2 MB, 4 redirects | `src/lib/price-fetch.ts` |

## Site-wide limits (daily jobs)

These cap the whole site, not one user. Both jobs run once a day (see `vercel.json`).

| What | Limit | Where to change it |
|---|---|---|
| Reminder emails per day | 90 (Resend's free plan allows 100) | `MAX_EMAILS_PER_RUN` in `src/lib/reminder-emails.ts` |
| Tracked part prices checked per day | 20 | `BATCH` in `src/app/api/cron/prices/route.ts` |

If more than 20 parts are tracked across all users, the oldest-checked go first, so some parts
are checked less than daily. Raise `BATCH` (within the job's 60-second limit) as usage grows.

## Adding a new cap

1. Add an entry to `LIMITS` in `src/lib/rate-limit.ts` with a name, `max` and `hours`.
2. Call `claimAction(userId, "<name>")` in the shared `src/lib` function, before the costly work.
   It returns `false` once the cap is reached; show the user a message saying when to try again.
3. Add a row to this file.

No migration is needed: every cap shares the `rate_events` table, and old rows are pruned as
new ones are added.
