# Eqraa — Phase 1
1. `cp .env.example .env` and set DATABASE_URL (Postgres)
2. `npm install && npm run db:push`
3. `npm test` / `npm run dev`

4. First Super Admin: register in the app, then `npm run make-admin -- +249XXXXXXXXX`

5. Rollover: schedule GET /api/cron/rollover every 5 min with header `Authorization: Bearer $CRON_SECRET` (set CRON_SECRET). The home page also rolls over lazily, but reminders (Phase 7) need the cron.

## Notifications (Phase 7)
- Run `npm run gen-vapid` once and put the 3 printed lines in `.env` to enable Web Push. Without them, in-app inbox notifications still work; push just won't be delivered.
- Reminders are now tied to the real 5 daily prayer times for Khartoum (Aladhan API, cached per date in `prayer_times`), configurable per-prayer in Admin → الإشعارات. Fajr is always the day boundary and cannot be turned off.
- "New Khatmah started" is sent once, on a group's very first day, not on every daily rotation (that would be one push per member per day).
- iOS push only works after the PWA is added to the home screen (iOS 16.4+); full offline install support is Phase 8.

## PWA + Offline (Phase 8)
- Manifest + icons are in `public/`; icons are simple placeholder art (brand colors, dawn-arc + book motif) generated programmatically — swap `public/icons/*.png` for real designed icons whenever ready, same filenames/sizes.
- `public/sw.js`: static assets are cache-first; page navigations are network-first with a cache fallback, so reopening the app offline shows the last successfully loaded page (may be stale until reconnected).
- Offline reading (BR-11): Start/Finish/Undo always try the network first. If that fails (no connection), the action is queued in IndexedDB and the UI updates optimistically with a "بانتظار المزامنة" note. A banner at the top shows how many actions are still queued.
- Sync (BR-O1..O3): queued actions are replayed in order (so an undo can't jump ahead of the finish it undoes) whenever the app regains connectivity or every 15s while open. Each carries its original idempotency key, so a retried or duplicated send can never create two readings. A real rejection (e.g. the day closed while offline) is dropped rather than retried forever; a genuine server error is kept queued rather than silently lost.
- Known limitation: this caches the *last-rendered* page, not a fully offline-first data layer — if the phone is offline across a Fajr boundary, the cached page won't reflect the new day until it's back online and reloads. Flagging this as an assumption in case you'd rather I build a dedicated offline snapshot for that edge case.

## Security, Accessibility & Landing (Phase 9)
- Security headers (CSP, X-Frame-Options, HSTS, etc.) are set in `next.config.ts`. CSRF: cookies are SameSite=Lax and no CORS headers are set anywhere, so a cross-site request can't carry the session cookie or complete its preflight — no separate CSRF token was added on top of that.
- Rate limiting now also covers reading actions, admin broadcasts (5/hour — it reaches a whole group at once), and push subscriptions, on top of the existing login/register limits.
- Fixed a real gap against the spec: admins can now move a seated member to a different empty slot directly (`member.move_slot`, audited) — previously only add/remove/replace existed. Only affects tomorrow's rotation onward; today's already-open day is untouched.
- Color contrast: added a darker `--dawn-text` token for dawn-colored *body text* (the bright `--dawn` accent alone is only 3.25:1 on white — fine for borders/large UI per WCAG, not for paragraph text); swapped the few places that used it for text.
- Added a skip-to-content link and confirmed touch targets (44px min), focus rings, RTL, and reduced-motion were already in place from earlier phases.
- Built the real Landing Page (`/`): hero, how it works, the group Khatmah, rotation, streak, leaderboard, notifications, privacy, install-as-app, and a closing CTA — all in Arabic, using only the app's existing 5 design tokens (no new colors/fonts introduced). Icons for the manifest are simple placeholder art in the brand's dawn-arc/book motif; swap `public/icons/*.png` for real designed icons whenever ready.
- Not yet done from the original Phase 9 scope: a full manual security-review pass and a formal accessibility audit with a screen reader — the above covers the concrete, testable parts; flag if you want a checklist-style review too.
