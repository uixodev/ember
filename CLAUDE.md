# Ember

A phone-first web app (installable PWA) for keeping the important areas of your life "warm". Each area is a fire that cools on its own over time. Small actions ("sparks", 5–10 minutes) heat it back up. Daily sparks keep momentum high, so starting bigger sessions is easy instead of restarting from cold.

The person using this is the only user. There is no backend, no accounts, no login.

## Design

The design system is final. Follow it exactly.

- `design/ember-design-system.pdf`: the full design system (colour, type, heat states, components, key screens). Read all 9 pages before building UI.
- `design/design-system.html`: the HTML/CSS that produced the PDF. Use it as the reference implementation for the fire ring, glass cards, buttons, pills, tabs, segmented control, tab bar, stepper, history rows, badges and celebration sheet. Port its CSS; don't reinvent it.
- `design/tokens.css`: all design tokens as CSS variables. Copy into the app as the single source of truth.
- `assets/fire-3d.png`: the 3D fire (Microsoft Fluent Emoji, MIT licence). Used in the spark button, streak pill, week row, area detail, spark timer and celebration sheet.
- `assets/fonts/inter-tight-variable.woff2`: the only font.

Hard rules:
- Fire core gradients use solid colours only. Never add transparency or pink/magenta/purple tints to fire colours (the owner dislikes pink, and transparent gradients rendered pink in some viewers).
- Warm colours (orange, red, yellow) are reserved for fire. Sun yellow `#FFD84D` is for highlighted numbers and the single most important action.
- Cold is a plain blue glow. No snowflakes.
- One sun-yellow highlight per screen at most.
- Cards are raised glass or sunken navy. No drop shadows except the spark button.
- Button labels say what happens ("Feed it", "Light this fire", "Done, feed the fire").
- Mobile first: design at 390px wide, respect safe areas (`env(safe-area-inset-*)`), tap targets at least 44px. Desktop just centres the phone-width layout.
- Respect `prefers-reduced-motion`.

## Tech stack

- Vite + React + TypeScript (strict).
- Plain CSS with the tokens in `tokens.css` (CSS modules or one stylesheet per component). No Tailwind, no UI kit.
- `vite-plugin-pwa` for manifest, service worker and offline support. App name "Ember", `display: standalone`, `theme_color: #4D45C6`, `background_color: #3F38B4`, icons generated from the fire.
- Storage: `localStorage` with a versioned schema (`ember:v1`), wrapped in a small storage module so it can move to IndexedDB later. Include JSON export and import in Settings.
- Tests: Vitest for the heat engine. It's the core of the app and must be fully unit tested, including active hours and edge cases.
- No backend. Deployable as a static site (Vercel, Netlify or GitHub Pages).

## Core concepts

### Areas
An area has: `id`, `name`, `place` (`main` | `side` | `archive`), `coolingMinutes` (time per heat level), `sparks` (list of short suggested actions), `level`, `levelSince` (timestamp), `createdAt`, and a log of events.

- **Main:** exactly one area at a time. Default cooling 150 minutes per level, counted only during active hours.
- **Side:** any number. Cooling presets: daily (1440 min), every 3 days (4320), weekly (10080), or custom. Counted in wall-clock time.
- **Archive:** frozen. Doesn't cool, doesn't remind. Keeps its level and history. When moved back, `levelSince` resets to now.
- Making an area main moves the current main to side (with its default side cooling, daily unless set). Ask for confirmation.

### Heat levels
`3 = hot`, `2 = warm`, `1 = embers`, `0 = cold`. Display names: Hot, Warm, Embers, Cold.

### Heat engine (pure functions in `src/engine/heat.ts`)
State is stored as `{ level, levelSince }` and the current state is computed on read, never with background timers.

```
elapsed   = coolingTimeBetween(levelSince, now, area)   // main: only minutes inside active hours; side: wall-clock
drops     = floor(elapsed / coolingMinutes)
current   = max(0, level - drops)
remaining = current > 0 ? coolingMinutes - (elapsed % coolingMinutes) : 0
progress  = remaining / coolingMinutes                  // drives the ring, 1 = full, 0 = empty
paused    = area is main AND now is outside active hours
```

Actions:
- **Spark:** compute current level, then `level = min(3, current + 1)`, `levelSince = now`. The ring refills to full.
- **Big session:** `level = 3`, `levelSince = now`. Store duration in minutes and an optional one-line note.
- **Archive / unarchive:** freeze the computed level; on return set `levelSince = now`.

Active hours: default 08:00–23:00, set in Settings. Must handle windows that cross midnight (e.g. 10:00–01:00) and elapsed periods spanning many days.

Every spark and big session is logged as an event `{ type: 'spark' | 'big', areaId, at, minutes?, note? }` for history and streaks.

### Streaks
A day "keeps an area alive" if it has at least one spark or big session for that area. The streak pill on Home shows the main area's current consecutive-day streak. Area detail shows current and longest.

## The fire ring (most important component)

Build `<FireRing level size progress paused label />` from the design system:
- Solid heat core gradient (`--core-hot` etc.), glowing white rim (`--fire-rim`, `--ice-rim` for cold), label text centred (navy text on Warm for contrast, white otherwise).
- **The rim is a countdown timer.** Render it as an SVG circle stroke. The full rim = time left before the fire drops one level. It drains clockwise starting from 12 o'clock, so the last part disappears next to the spark button at the bottom.
- In the last 15 minutes, the remaining rim turns sun yellow.
- When paused (outside active hours), the rim stops and a small moon icon shows inside the label.
- On spark: the rim refills with one short glow animation, the core swells and settles at the new level. No confetti.
- Cold: empty rim, no countdown.
- Update once a minute while visible (and on focus/visibility change). No per-second updates except inside the Spark timer.
- Small rings on side cards use the same component with a thin rim, counting in days.

## Screens for version 1

Build in this order. Each one should match the PDF.

1. **First-time setup** (3 steps): name your main area, add one or two side areas (optional), set active hours. Then go to Home.
2. **Home:** top bar (avatar initial, streak pill with arrow to area detail, "N sparks" today), main FireRing with "cools in 1 h 40" and the white spark button on the bottom of the rim, week row (check = kept alive, fire = big session day, lavender dot = missed, dashed = upcoming), side area cards. The coldest non-archived side area gets the Sunrise card with a white "Feed it" button; others are glass with "Fed" when handled today. Bottom tab bar: Home, Areas, History, Badges.
   - Tap spark button = log a spark instantly.
   - Hold spark button (500 ms) = open Spark timer.
   - Tap any fire or card = Area detail.
3. **Spark timer:** headline is one suggestion from the area's spark list (tap to shuffle), white blob shape with layered translucent shapes behind it (see PDF page 7), countdown 5 or 10 minutes, "Done, feed the fire" (logs a spark, works early too) and "Keep going as a big session".
4. **Area detail:** 3D fire, current streak in a big headline, longest streak card, spark list (add, edit, delete), history rows (sunken), segmented control History / Badges (Badges tab can be "coming soon" in v1), settings: cooling speed stepper, move to main/side/archive, rename, delete with confirmation.
5. **Areas:** big pill tabs Main / Side / Archive, list of area cards, "New area" button.
6. **New area:** name, place tabs, cooling stepper (big sun-yellow number), smallest possible spark (Bonfire card), "Light this fire".
7. **Celebration sheet:** white bottom sheet over the scrim, 3D fire on a pale sunburst, sun-yellow title "Hot again!", one line, navy "Got it". Show when a spark or big session takes an area from Embers or Cold up to Hot.
8. **Settings** (gear in Areas header): active hours, export JSON, import JSON, reset all data with confirmation.

Phase 2 (don't build yet, but keep the data model ready): History calendar, Badges, evening nudge, holiday mode, weekly look back, notifications (need push infrastructure), ambient mode.

## Empty and edge states
- No side areas: a glass card "Add something to keep warm on the side".
- Cold area: show its smallest spark as a suggestion, never a guilt message.
- Storage unavailable or corrupt: show a clear message and offer import.

## Working style
- Initialise a git repo, commit after each milestone with clear messages.
- Write the heat engine and its tests first, before any UI.
- After each screen, run the app and compare it against the PDF page.
- Keep components small: `FireRing`, `SparkButton`, `TopBar`, `WeekRow`, `AreaCard`, `Stepper`, `Pill`, `Tabs`, `Segmented`, `TabBar`, `Sheet`, `HistoryRow`.
- Add a README with how to run, build, deploy, and how to install on iPhone (Share → Add to Home Screen) and Android.
