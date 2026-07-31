# kpdp-debate-timer-pwa

Preact + TypeScript PWA debate timer. Two **display modes** — linear (carousel-based, one slot
at a time) and classic (all slots visible, manual selection) — crossed with two **debate
formats** — KPDP and Debatiáda — crossed with two **UI languages** — Czech and English — all
selectable independently in Settings. Format switching resets the debate; language switching
does not.

## Dev

```
npm install
npm run dev    # http://localhost:8081
npm test       # jest, pure-logic unit tests only (no component/DOM tests)
npm run lint
npm run build
```

Jest is deliberately isolated from the preact-cli build toolchain (`jest.config.js` inlines its
own babel config with `configFile: false, babelrc: false` so `src/.babelrc` is never loaded by
Jest, and no root `babel.config.js` leaks into the production build). Tests live under
`src/**/__tests__/**/*.test.ts` — pure logic only (reducer, getters, config), no `.tsx`
rendering.

## Key structure

- `src/config.ts` — `getFormatConfigs(language): Record<Format, FormatConfig>`, one entry per
  debate format: speaker/prep-time data (label text resolved for the given language),
  prep-time party ownership, the linear carousel order, and the linear overview box grouping.
  `linearOrder`/`overviewGroups`/`prepTimeParties` never depend on language — only the label
  text inside `speakers`/`prepTimes` does. A module-level `formatConfigs` snapshot (built at
  import time from whatever language was active then) is kept only for
  `ModeLinear/getters.ts`, which never reads label text from it — just ordering/grouping ids —
  so it staying stale across a language switch is harmless. `buildThemeOptions`/
  `buildModeOptions`/`buildFormatOptions`/`buildLanguageOptions` build each Settings radio's
  `RadioOption[]` from a resolved translation dict plus the currently-active value.
- `src/formats.ts` — `Format = 'kpdp' | 'debatiada'`, `getActiveFormat()` (localStorage-backed),
  mirrors `src/modes.ts`.
- `src/languages.ts` — `Language = 'cs' | 'en'`, `getActiveLanguage()`: an explicit
  localStorage choice always wins; absent that, defaults to browser locale detection
  (`navigator.language` starting with `cs` → Czech, else English), guarded for the SSR
  prerender step where `window`/`navigator` don't exist (mirrors `getActiveThemeColour`'s
  `prefers-color-scheme` guard in `src/themes.ts`).
- `src/localisation.ts` — `getLocalisation(language?)` returns that language's translation
  dict, defaulting to `getActiveLanguage()`. Every UI-chrome component reads it live on each
  render (nothing in the tree is memoised, so any dispatch re-renders everything), so most
  consumers just needed `localisation.xxx` → `getLocalisation().xxx`. `config.ts`'s consumers
  need an explicit language argument instead, since they build data that gets snapshotted into
  the store rather than read live.
- `src/store/` — Redux-style store: `types.ts` (action types), `reducer.ts` (all state
  transitions), `initialStore.ts` (`createInitialStore(format, language)` factory — both
  parameters required, never defaulted, so nothing can silently depend on an implicit,
  environment-dependent default — not a frozen constant, since slot data depends on both).
- `src/components/ModeLinear/` — linear mode UI; `TimeSlotsCarousel/` is the swipeable card
  carousel; `getters.ts` resolves a format's `linearOrder`/`overviewGroups` against the store.
- `src/components/ModeClassic/` — classic mode UI.
- `src/screens/` — top-level screen components (Timer, Settings, About).

## Slot identity: id, not label

Every `TimeSlot`/`TimeSlotConfig` has an `id` (e.g. `a1`, `prep-negative`, `prep-3`) that all
state transitions match on — never the display `label`. This matters because labels can repeat
across slots that must track independently: Debatiáda's `A1` speaks twice (`a1` and
`a1-closing`, different ids, different timers), and its eight prep gaps (`prep-1`…`prep-8`) all
share the same label (`Přípravný čas`) but tick independently. KPDP's prep slots are the
opposite case — the *same* `prep-affirmative`/`prep-negative` id appears at multiple carousel
positions and deliberately shares one pooled countdown, because carousel resolution
(`getLinearTimeSlots`) looks the id up in the store rather than storing separate copies per
position.

## Language switching relabels in place, never resets

`SET_LANGUAGE` (see `reducer.ts`'s `setLanguage`/`relabelSlots`) walks the store's existing
speakers/prep times by `id` and overwrites only `label`/`labelSuffix` from freshly-resolved
`getFormatConfigs(language)` data — `elapsed`/`paused`/`selected`/`timeStartedDate` and
`linearActiveSlotIndex` are untouched, so switching language mid-debate never loses progress.
Contrast with `SET_FORMAT`, which rebuilds the whole slot set via `createInitialStore` and does
reset the debate (the two are fundamentally different: format changes the slot *set*, language
only changes slot *label text*). Debate notation (`A1`, `N1`, `➝`) is identical across
languages — only prose labels (`Afirmace`/`Negace`/`Přípravný čas`, Debatiáda's `A1 závěr`) are
actually translated.

## Linear mode flow

`getLinearTimeSlots(store)` (in `ModeLinear/getters.ts`) resolves the active format's
`linearOrder` (an ordered list of slot ids) against the store to build the flat carousel list.
`linearActiveSlotIndex` in the store tracks the current position.

- Tap paused card → start timer (`TOGGLE_PAUSED_TIMER`)
- Tap running card → advance to next slot (`INCREMENT_LINEAR_ACTIVE_SLOT_INDEX`)
- Swipe right on carousel → go back to previous slot (`DECREMENT_LINEAR_ACTIVE_SLOT_INDEX`), pauses the restored slot
- Prep gap ownership: each prep gap's party is the party of the slot that *follows* it (drives
  card colour) — true in both formats.

## Prep time model differs by format

- **KPDP**: one pooled 5:00 timer per team, drawn down across the whole debate. Linear mode
  shows two counters in the prep bar; classic mode shows two team buttons.
- **Debatiáda**: eight independent 1:00 timers, one per gap, unused time never carries over.
  Linear mode shows a single counter for the *current* gap (`getCurrentGapPrepTime`, walks
  `linearOrder` from `linearActiveSlotIndex`). Classic mode shows one shared button
  (`prep-shared`) that doesn't track which of the 8 gaps was consumed — pressing it starts a
  fresh 1:00 on first press or after it's run out, otherwise just pauses/resumes in place
  (`RESET_PREP_TIME` + `TOGGLE_ACTIVE_PREP_TIME`, see `ModeClassic/PrepTime`).

## Timings

**KPDP** — total ~46 min:
- All speakers (constructive + closing): 6 min each, 3 per side
- Prep time: 5 min pooled per team
- Cross-questions: 3 min each, 2 per side

**Debatiáda** — total 28 min:
- Speeches: A1 3′, N1 4′, A2 4′, N2 4′, A1-závěr 1′
- Cross-questions: 1 min each, 4 total (`N ➝ A1`, `A ➝ N1`, `N ➝ A2`, `A ➝ N2`)
- Prep time: 1 min × 8 independent gaps (8 min total)
