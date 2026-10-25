# Ember

A phone-first, installable web app for keeping the important areas of your life warm. Each area is a fire that cools on its own. Small actions ("sparks", 5–10 minutes) heat it back up.

Everything is stored on your device (`localStorage`, key `ember:v1`). There is no backend and no account.

- `CLAUDE.md` is the product spec and `design/` is the design system reference.
- The heat engine (`src/engine/heat.ts`) is pure functions with tests; the current heat is computed when you look, never by background timers.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # heat engine, streaks, storage, formatting
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
```

`/?preview` opens the FireRing preview page used to check the design.

## Deploy

Ember builds to a static site, so any static host works. It uses hash routes (`#/areas`), so no server rewrites are needed.

**GitHub Pages.** `.github/workflows/deploy.yml` runs the tests and builds on every push to `main`, then updates the `gh-pages` branch. In the repo go to Settings → Pages, choose "Deploy from a branch", branch `gh-pages`, folder `/ (root)`. The app lives at `https://<user>.github.io/<repo>/`.

If Actions is unavailable (for example a billing lock), `npm run deploy` does the same from your own machine: it runs the tests, builds and force-pushes to `gh-pages`.

**Vercel or Netlify.** Build command `npm run build`, output directory `dist`. Leave `VITE_BASE` unset so assets load from `/`.

If the app is served from a sub-path, set `VITE_BASE` to that path with slashes on both sides, e.g. `VITE_BASE=/ember/ npm run build`.

## Install on your phone

Open the deployed address in the phone's browser, then:

- **iPhone (Safari):** tap Share, then **Add to Home Screen**, then Add. It opens full screen like an app.
- **Android (Chrome):** tap the ⋮ menu, then **Install app** (or **Add to Home screen**).

After the first visit the app works offline. Updates download in the background and apply the next time you open it.

## How feeding works

Tap **Feed it**, write what you did, say how many minutes it took and how much effort it was (1 barely to 5 all in). The fire then holds its level for a while before it starts to cool, and the harder and longer you worked, the longer that is. As a guide for the main fire (cools every 2.5 h): 1 minute holds about an hour, 30 minutes a little under 3 hours, and an hour of all-in effort about 6 hours. Side fires scale with their own cooling speed. Instead of the automatic hold you can pick a next time (tonight, tomorrow, in 3 days or any date), which is saved in your notes. The formula is in `src/engine/hold.ts`.

## Reminders

Settings → Reminders turns on notifications: a heads-up shortly before a fire drops to Embers or Cold (never at night), and a nudge at any next time you set. They are never guilt trips, they just suggest the area's smallest spark.

Ember has no server, so a phone can only show these while the app is open or was used a moment ago. On Android, an installed Ember is also woken by Chrome every few hours to check (Chrome decides when, so don't rely on it). iPhones cannot do background checks without a server. For a reminder that always rings, open an area with a next time and tap **Add to calendar**. That creates a calendar event with an alarm.

Fully reliable push notifications need a small server to send them (for example a free Cloudflare Worker with web push). The plan the app prepares (`src/notify/plan.ts`) is what such a server would send.

## Your data

Because data lives only in the browser on one device, use **Areas → Settings → Export a backup** now and then. **Import a backup** restores it, for example on a new phone. Clearing browser or site data deletes the app's data.

Notifications, the History calendar, Badges, holiday mode, the evening nudge and ambient mode are phase 2. The data model already has room for them.

## Credits

The 3D fire is from Microsoft Fluent Emoji (MIT licence). The font is Inter Tight.

## Which version opens

The campfire (3D) app is the main app and opens at the plain address. Your fires and sparks are saved on the device
(`ember:campfire:v1`), with Export and Import in its Options panel (it also reads backups from the first version).

- `/` opens the campfire app.
- `/?classic` opens the first version (rings and cards). It keeps its own saved data.

## Test copy

`/?test` opens the campfire app on a copy of your data. It keeps its own save (`ember:campfire:test:v1`), so you can try
anything without touching the real fires. If you have no data yet it starts with example fires. Options has "Reset the test copy".
