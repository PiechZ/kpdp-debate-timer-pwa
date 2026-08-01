# Implementation spec: add the Debatiáda debate format

Audience: an AI coding agent working in this repo. Execute the steps **in order**. Each step
is independently verifiable — do not start step N+1 until step N's "Done when" holds.

---

## 1. Goal

The app currently supports exactly one debate format (KPDP). Add a second format,
**Debatiáda**, selectable in Settings, working in **both** display modes (linear + classic).

The two formats differ in speech count, speech lengths, cross-question structure, and — most
importantly — in how preparation time works:

| | KPDP (existing) | Debatiáda (new) |
|---|---|---|
| Speeches | 3 per side, 6 min each | A1 3′, N1 4′, A2 4′, N2 4′, A1-závěr 1′ |
| Cross-questions | 2 per side, 3 min | 4 total, 1 min each |
| Prep time | **One pooled 5:00 per team**, drawn down across the debate | **Eight independent 1:00 timers**, one in every gap |
| Total | ~46 min | 28 min |

## 2. Locked decisions

These were agreed with the user. Do not re-litigate them.

1. Debatiáda prep = 8 **independent** 1-minute timers. Unused time never carries over.
2. Debatiáda must work in **both** linear and classic display modes.
3. Each prep gap is **owned by the team of the slot that follows it** (drives card colour).
   Note: KPDP already follows this exact rule, so no new colour is needed.
4. Switching format in Settings **resets the debate**, behind a confirmation dialog when any
   time has already elapsed.
5. Cross-question labels are generic: `N ➝ A1`, `A ➝ N1`, `N ➝ A2`, `A ➝ N2`.
6. Classic mode gets **one shared 1:00 prep button** for Debatiáda — it does not track which
   of the 8 gaps was consumed.
7. The linear top bar shows **the current gap's remaining prep** for Debatiáda (single
   counter), keeping the centre play/pause button. KPDP's two-counter bar is unchanged.
8. The linear overview box keeps **uneven columns** for Debatiáda (3 affirmative rows,
   2 negative rows). No padding row.

## 3. What the current code assumes (read before editing)

Two facts block a second format.

**A. `initialStore` is a module-level constant.**
[`src/store/initialStore.ts`](src/store/initialStore.ts) builds the whole slot tree from
`src/config.ts` at import time, and `RESET` ([`reducer.ts:145`](src/store/reducer.ts:145))
copies from it. Format switching requires a factory.

**B. Slot identity is the `label` string.** Every state transition matches slots by label:

| Function | Line |
|---|---|
| `slotShouldBeActive` (increment) | [`reducer.ts:71`](src/store/reducer.ts:71) |
| `slotShouldBeActive` (decrement) | [`reducer.ts:92`](src/store/reducer.ts:92) |
| `setSelectedSpeaker` | [`reducer.ts:111`](src/store/reducer.ts:111) |
| `toggleActivePrepTime` | [`reducer.ts:121`](src/store/reducer.ts:121) |
| `tickItem` | [`reducer.ts:132`](src/store/reducer.ts:132) |

This is *deliberate* for KPDP: the single affirmative prep slot appears at 6 carousel
positions and shares one countdown **because** they match by label. Debatiáda breaks it in
two ways — A1 speaks twice, and the 8 preps must tick independently. Hence the `id` refactor
in step 3.

**Other constraints found:**

- [`ModeLinear/getters.ts`](src/components/ModeLinear/getters.ts) hardcodes speaker indices
  `[0]`–`[4]` and a KPDP-specific zip-with-prep loop.
- The carousel Sass hardcodes the last-card index:
  `$carouselCardCount: 18` plus `.time-slots-carousel--card-18-visible`
  ([`index.sass:27`](src/components/ModeLinear/TimeSlotsCarousel/index.sass:27) and
  [`:108`](src/components/ModeLinear/TimeSlotsCarousel/index.sass:108)). KPDP produces 19
  cards (indices 0–18); Debatiáda produces 17 (0–16), so the `@for` loop still covers it, but
  the "last card" rule would target the wrong index.
- "Mode" in Settings means *display layout*. The new axis is a **format** — separate concept,
  separate localStorage key, separate radio.
- `Card.tsx:29` appends the prep suffix based on `timeSlot.type === 'prepTime'`. Debatiáda's
  prep cards need a different label treatment, so this becomes data (`labelSuffix`).
- There is **no test framework** in the repo yet. Step 1 adds one.

## 4. Guard rails

- KPDP behaviour must be **bit-identical** after every step. The characterization tests in
  step 2 exist to prove this; they must stay green throughout.
- `npm run lint` must pass after every step.
- All user-facing Czech strings go through [`src/localisation.ts`](src/localisation.ts).
  Never inline a Czech string in a component.
- Do not touch the build toolchain (`preact.config.js`, `src/.babelrc`) — the test setup in
  step 1 is deliberately isolated from it.
- Keep the existing code style: functional components, `FunctionalComponent`, arrow
  functions, no semicolon-free style deviations, airbnb-typescript lint rules.

---

# Step 1 — Test infrastructure

**Goal:** a working `npm test` that runs pure-logic unit tests, without disturbing the
preact-cli build.

Environment: Node 20, TypeScript 3.7.5 (old — so **do not use `ts-jest`**; use `babel-jest`,
which strips types and ignores the TS version entirely).

### 1.1 devDependencies

Add to `package.json`:

```json
"@babel/core": "^7.24.0",
"@babel/preset-env": "^7.24.0",
"@babel/preset-typescript": "^7.24.0",
"@types/jest": "^29.5.0",
"babel-jest": "^29.7.0",
"jest": "^29.7.0",
"jest-environment-jsdom": "^29.7.0"
```

Add scripts:

```json
"test": "jest",
"test:watch": "jest --watch"
```

### 1.2 `jest.config.js` (repo root — new file)

The babel options are declared **inline** with `configFile: false, babelrc: false` so that
`src/.babelrc` (the `preact-cli/babel` preset) is never loaded by Jest and no root
`babel.config.js` leaks into the production build.

```js
module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  moduleNameMapper: {
    '\\.(sass|scss|css)$': '<rootDir>/jest.style-stub.js',
  },
  transform: {
    '^.+\\.tsx?$': ['babel-jest', {
      configFile: false,
      babelrc: false,
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-typescript',
      ],
    }],
  },
};
```

`jest.style-stub.js` (repo root): `module.exports = {};`

If a `.tsx` file ever has to be imported by a test, add
`['@babel/preset-react', { pragma: 'h', pragmaFrag: 'Fragment' }]` to `presets`. All tests in
this spec target `.ts` logic modules only, so it is not needed now.

### 1.3 Lint config

Test files live under `src/`, so `npm run lint` picks them up. Add to `.eslintrc`:

```json
"overrides": [
  {
    "files": ["src/**/__tests__/**/*.ts"],
    "env": { "jest": true }
  }
]
```

### 1.4 `.gitignore`

Add `/coverage`.

**Done when:** `npm install` succeeds, `npm test` runs and reports "no tests found" (or
passes a trivial smoke test), `npm run lint` passes, and `npm run dev` still boots.

---

# Step 2 — Characterization tests for current KPDP behaviour

**Goal:** pin today's behaviour *before* refactoring, so the id refactor is provably safe.

Write these against the **current** label-based API. Assert on **labels of resulting slots**
wherever possible (not on internal identity fields) so most tests survive step 3 untouched.

### 2.1 `src/components/ModeLinear/__tests__/getters.test.ts`

Helper: `const labelsOf = (slots: TimeSlot[]) => slots.map((s) => s.label);`

Pin the exact KPDP carousel order — **19 cards**. Note that prep labels are the team names
(`Afirmace` / `Negace`), so the prep after `A1` is labelled `Negace`:

| # | label | party |
|---|---|---|
| 0 | `A1` | affirmative |
| 1 | `Negace` (prep) | negative |
| 2 | `N3 ➝ A1` | negative |
| 3 | `Negace` (prep) | negative |
| 4 | `N1` | negative |
| 5 | `Afirmace` (prep) | affirmative |
| 6 | `A3 ➝ N1` | affirmative |
| 7 | `Afirmace` (prep) | affirmative |
| 8 | `A2` | affirmative |
| 9 | `Negace` (prep) | negative |
| 10 | `N1 ➝ A2` | negative |
| 11 | `Negace` (prep) | negative |
| 12 | `N2` | negative |
| 13 | `Afirmace` (prep) | affirmative |
| 14 | `A1 ➝ N2` | affirmative |
| 15 | `Afirmace` (prep) | affirmative |
| 16 | `A3` | affirmative |
| 17 | `Negace` (prep) | negative |
| 18 | `N3` | negative |

Tests:

1. `getLinearTimeSlots(initialStore)` returns 19 slots with exactly the labels above.
2. **Every prep slot's party equals the party of the slot that follows it.** (This proves the
   rule that Debatiáda reuses; assert it programmatically over the whole list.)
3. `getLinearSpeakersData(initialStore)` returns
   `[[[A1, N3 ➝ A1], [A2, N1 ➝ A2], [A3]], [[N1, A3 ➝ N1], [N2, A1 ➝ N2], [N3]]]`
   (compare by label).

### 2.2 `src/store/__tests__/reducer.test.ts`

Import `reducer` and `initialStore`. Use a small helper to dispatch a sequence.

1. **Initial state:** `linearActiveSlotIndex === 0`; `A1` is the only selected slot; every
   slot is paused with `elapsed === 0`.
2. **`TOGGLE_PAUSED_TIMER`** starts the selected slot: `paused === false`,
   `timeStartedDate` is a number.
3. **`INCREMENT_LINEAR_ACTIVE_SLOT_INDEX` off a speech** → index 1, the negative prep slot is
   selected **and running** (`paused === false`) — because
   `currentSlot.type !== 'prepTime'` at [`reducer.ts:76`](src/store/reducer.ts:76).
4. **`INCREMENT_LINEAR_ACTIVE_SLOT_INDEX` off a prep slot** → next slot selected but
   **paused** (`running` is `false` in that branch).
5. **`INCREMENT` at the last index (18)** → index stays `18`, and every slot ends up paused
   (`nextSlot` is `null`, so `toggleSelected` is `false` and selection is left alone).
6. **`DECREMENT` at index 0** returns the store unchanged (assert same object reference).
7. **`DECREMENT` from index 1** → index 0, `A1` selected, `paused === true`, and its
   `elapsed` is preserved.
8. **`TIMESLOT_TICK`** increments `elapsed` on the matching slot only; all other slots keep
   `elapsed` and get `timeStartedDate === null`.
9. **Prep pooling (the behaviour the id refactor must preserve):** tick the negative prep
   slot N times, then assert `getLinearTimeSlots(store)[1].elapsed === N` **and**
   `getLinearTimeSlots(store)[3].elapsed === N` — the same pooled slot at two carousel
   positions.
10. **`SET_SELECTED_SPEAKER`** selects exactly one slot across both parties.
11. **`TOGGLE_ACTIVE_PREP_TIME`** starts the named prep and deselects the other one; calling
    it again on the same prep pauses it.
12. **`RESET`** returns all `elapsed` to 0 and `linearActiveSlotIndex` to 0.

**Done when:** `npm test` is green and `npm run lint` passes. **Commit here.**

---

# Step 3 — Give slots a real `id`

**Goal:** decouple identity from the display label. No behaviour change.

### 3.1 `src/types.ts`

```ts
export interface TimeSlotConfig {
  id: string
  label: string
  time: number
  // appended after the label on linear-mode cards (KPDP prep only)
  labelSuffix?: string
}

export interface TimeSlot {
  id: string
  label: string
  labelSuffix?: string
  party: Party
  type: TimeSlotType
  total: number
  elapsed: number
  selected: boolean
  paused: boolean
  timeStartedDate: number | null
}
```

### 3.2 `src/config.ts`

Add ids to the existing KPDP data. **Do not change any label or time.**

| slot | id |
|---|---|
| `A1` | `a1` |
| `A2` | `a2` |
| `A3` | `a3` |
| `A3 ➝ N1` | `a3-n1` |
| `A1 ➝ N2` | `a1-n2` |
| `N1` | `n1` |
| `N2` | `n2` |
| `N3` | `n3` |
| `N3 ➝ A1` | `n3-a1` |
| `N1 ➝ A2` | `n1-a2` |
| prep `Afirmace` | `prep-affirmative` |
| prep `Negace` | `prep-negative` |

Both KPDP prep configs also get `labelSuffix: localisation.linearPrepTimeSuffix`.

### 3.3 `src/store/reducer.ts`

Replace all five label comparisons listed in §3B with `id` comparisons. `setSelectedSpeaker`
and `toggleActivePrepTime` now take an **id** as payload.

### 3.4 Call sites that pass a label as payload

- [`ModeClassic/Speakers/index.tsx:33`](src/components/ModeClassic/Speakers/index.tsx:33) →
  `setSelectedSpeaker(dispatch, speaker.id)`
- [`ModeClassic/PrepTime/index.tsx:35`](src/components/ModeClassic/PrepTime/index.tsx:35) →
  `toggleActivePrepTime(dispatch, time.id)`

### 3.5 `Card.tsx`

Replace `{ timeSlot.type === 'prepTime' && localisation.linearPrepTimeSuffix }` with
`{ timeSlot.labelSuffix }`.

### 3.6 Tests

Update only the tests that pass a payload (10 and 11 in §2.2) to use ids. Everything else
must pass **unmodified** — if a label-based assertion breaks, the refactor is wrong.

Add: every id in the store is unique across `speakers.flat()` + `prepTimes`.

**Done when:** all step-2 tests green, lint clean, and a manual run of both display modes in
KPDP behaves exactly as before. **Commit here.**

---

# Step 4 — Format configuration layer

**Goal:** describe both formats as data.

### 4.1 `src/formats.ts` (new — mirror `src/modes.ts`)

```ts
import { getActiveOption } from './localStorage';

export type Format = 'kpdp' | 'debatiada';

const defaultFormat: Format = 'kpdp';

export const getActiveFormat = (): Format => <Format>getActiveOption('format', defaultFormat);
```

### 4.2 `src/localStorage.ts`

Add `'format'` to `StorageKey` and `format: 'activeFormat'` to `localStorageKeys`.

### 4.3 `src/config.ts` — restructure

Export a radio option list (same shape as `themes`/`modes`):

```ts
const activeFormat = getActiveFormat();
export const formats: RadioOption[] = [
  { label: localisation.formatKpdp, value: 'kpdp' },
  { label: localisation.formatDebatiada, value: 'debatiada' },
].map((item) => ({ ...item, active: item.value === activeFormat }));
```

and a per-format description:

```ts
export interface FormatConfig {
  speakers: TimeSlotConfig[][]   // [affirmative, negative]
  prepTimes: TimeSlotConfig[]
  prepTimeParties: Party[]       // party per entry of prepTimes
  linearOrder: string[]          // slot ids, in debate order
  overviewGroups: string[][][]   // [party][row][slot ids] for the linear overview box
}

export const formatConfigs: Record<Format, FormatConfig> = { ... };
```

Keep the existing `speakers` / `prepTimes` exports **only** if something still needs them;
prefer removing them so there is a single source of truth.

### 4.4 KPDP config data

`linearOrder` — write the 19 ids out explicitly (this must reproduce the table in §2.1):

```
a1, prep-negative, n3-a1, prep-negative,
n1, prep-affirmative, a3-n1, prep-affirmative,
a2, prep-negative, n1-a2, prep-negative,
n2, prep-affirmative, a1-n2, prep-affirmative,
a3, prep-negative, n3
```

`overviewGroups`:
```
[[['a1','n3-a1'], ['a2','n1-a2'], ['a3']],
 [['n1','a3-n1'], ['n2','a1-n2'], ['n3']]]
```

### 4.5 Debatiáda config data

Speakers — affirmative array:

| id | label | minutes |
|---|---|---|
| `a1` | `A1` | 3 |
| `a2` | `A2` | 4 |
| `a1-closing` | `A1 závěr` | 1 |
| `a-n1` | `A ➝ N1` | 1 |
| `a-n2` | `A ➝ N2` | 1 |

Speakers — negative array:

| id | label | minutes |
|---|---|---|
| `n1` | `N1` | 4 |
| `n2` | `N2` | 4 |
| `n-a1` | `N ➝ A1` | 1 |
| `n-a2` | `N ➝ A2` | 1 |

A cross-question slot belongs to the **asking** party — same convention as KPDP, where
`N3 ➝ A1` lives in the negative array.

Prep — nine entries, all `time: 1`, all `label: localisation.preptime`, **no** `labelSuffix`:

| id | party | precedes |
|---|---|---|
| `prep-1` | negative | `n-a1` |
| `prep-2` | negative | `n1` |
| `prep-3` | affirmative | `a-n1` |
| `prep-4` | affirmative | `a2` |
| `prep-5` | negative | `n-a2` |
| `prep-6` | negative | `n2` |
| `prep-7` | affirmative | `a-n2` |
| `prep-8` | affirmative | `a1-closing` |
| `prep-shared` | affirmative | *(classic mode only — not in `linearOrder`)* |

`linearOrder` — 17 ids:

```
a1, prep-1, n-a1, prep-2,
n1, prep-3, a-n1, prep-4,
a2, prep-5, n-a2, prep-6,
n2, prep-7, a-n2, prep-8,
a1-closing
```

`overviewGroups` (uneven by design):
```
[[['a1','n-a1'], ['a2','n-a2'], ['a1-closing']],
 [['n1','a-n1'], ['n2','a-n2']]]
```

### 4.6 Tests — `src/__tests__/config.test.ts`

For **each** format:

1. Every id referenced by `linearOrder` and `overviewGroups` exists in `speakers` or
   `prepTimes`.
2. Ids are globally unique within the format.
3. Every prep slot in `linearOrder` has the same party as the slot that follows it.
4. `linearOrder` never ends with a prep slot and never starts with one.
5. KPDP `linearOrder.length === 19`; Debatiáda `=== 17`.
6. Debatiáda total speaking time is 20 minutes and total prep is 8 minutes.

**Done when:** tests green, lint clean.

---

# Step 5 — Data-driven linear getters

**Goal:** `ModeLinear/getters.ts` stops hardcoding KPDP.

Rewrite [`getLinearTimeSlots`](src/components/ModeLinear/getters.ts:42) and
[`getLinearSpeakersData`](src/components/ModeLinear/getters.ts:5) to resolve the active
format's `linearOrder` / `overviewGroups` against the store:

```ts
const findSlot = (store: StoreContent, id: string): TimeSlot => (
  store.speakers.flat().find((s) => s.id === id)
  ?? store.prepTimes.find((s) => s.id === id)!
);
```

Delete `zipSpeakersWithPrepTime` and the index-based `generateTimeSlots`.

The active format must come from the store (add `getActiveStoreFormat` to
[`src/store/getters.ts`](src/store/getters.ts), mirroring `getActiveStoreMode`) — **not** from
localStorage — so the reducer stays pure and tests stay deterministic.

**Done when:** every step-2 characterization test still passes unmodified. That is the proof
the rewrite is faithful.

---

# Step 6 — Store becomes format-aware

### 6.1 `src/store/initialStore.ts`

Convert to a factory:

```ts
export const createInitialStore = (format: Format): StoreContent => ({ ... });
export default createInitialStore(getActiveFormat());
```

The mapping logic is unchanged except that it reads from `formatConfigs[format]` and copies
`id` / `labelSuffix` through. Prep slot party comes from `prepTimeParties[index]` instead of
`itemIndex === 0 ? 'affirmative' : 'negative'`.

Initial selection stays as-is (`speakerIndex === 0 && partyIndex === speakerIndex` selects
`a1` in both formats).

### 6.2 `src/store/types.ts`

Add to `StoreContent`: `formats: RadioOption[]`, `pendingFormat: string | null`.
Add to `StoreActionType`: `'SET_FORMAT'`, `'SET_PENDING_FORMAT'`, `'RESET_PREP_TIME'`.

### 6.3 `src/store/reducer.ts`

```ts
const setFormat = (store, value) => {
  setActiveOption('format', value);
  const fresh = createInitialStore(value as Format);
  return {
    ...store,
    formats: store.formats.map((i) => ({ ...i, active: i.value === value })),
    speakers: fresh.speakers,
    prepTimes: fresh.prepTimes,
    linearActiveSlotIndex: fresh.linearActiveSlotIndex,
    pendingFormat: null,
  };
};
```

Fix `reset` ([`reducer.ts:145`](src/store/reducer.ts:145)) to rebuild from the **active
format** rather than the frozen module constant — otherwise `RESET` after a format switch
restores KPDP slots. This is a latent bug today; it becomes a real one now.

`RESET_PREP_TIME` (payload: id) sets `elapsed: 0` and `timeStartedDate: null` on the matching
prep slot. Used by classic mode in step 9.

### 6.4 Tests — extend `src/store/__tests__/reducer.test.ts`

Build Debatiáda state with `createInitialStore('debatiada')` directly — never rely on
localStorage, and call `localStorage.clear()` in `beforeEach`.

1. Debatiáda carousel order matches the 17-id list.
2. **`a1` and `a1-closing` tick independently** — tick `a1` 10×, assert `a1-closing.elapsed`
   is still 0, and their `total`s are 180 and 60. *(This is the regression the id refactor
   exists to prevent.)*
3. **`prep-1`…`prep-8` are independent** — tick `prep-1` 5×, assert `prep-2..8` are all 0.
4. KPDP prep is still **pooled** — the step-2 test 9 must still pass.
5. `SET_FORMAT` swaps the slot set, resets `linearActiveSlotIndex` to 0, marks the right
   radio option active, and writes `activeFormat` to localStorage.
6. `RESET` **after** `SET_FORMAT('debatiada')` yields Debatiáda slots, not KPDP ones.
7. Full walk-through: from index 0, alternate `TOGGLE_PAUSED_TIMER` / `INCREMENT` through all
   17 Debatiáda cards; assert the index lands on 16 and does not advance past it.

**Done when:** all tests green, lint clean. **Commit here.**

---

# Step 7 — Settings UI and the confirmation dialog

### 7.1 `src/screens/Settings/index.tsx`

Add a third `Radio` above (or below) the display-mode one:

```tsx
<Radio
  label={`${localisation.format}:`}
  options={store.formats}
  onChange={(newValue) => requestFormatChange(newValue, store, dispatch)}
/>
```

`requestFormatChange`:
- if the value equals the currently active format → no-op;
- if no slot has `elapsed > 0` → dispatch `SET_FORMAT` immediately;
- otherwise dispatch `SET_PENDING_FORMAT` with the value.

Add a helper `hasElapsedTime(store)` to [`src/store/getters.ts`](src/store/getters.ts).

### 7.2 Confirmation dialog

The reset `Dialog` currently lives inside [`Timer`](src/screens/Timer/index.tsx:54). Render a
second, independent `Dialog` in `Settings`, shown when `store.pendingFormat !== null`:

- body: `localisation.formatChangeConfirm`
- confirm → `dispatch({ type: 'SET_FORMAT', payload: store.pendingFormat })`
- cancel / `setVisible(false)` → `dispatch({ type: 'SET_PENDING_FORMAT', payload: null })`

Note `Dialog`'s backdrop click fires the **confirm** callback
([`Dialog/index.tsx:35`](src/components/Dialog/index.tsx:35)) — that is existing behaviour;
match how the reset dialog handles it and do not change `Dialog`.

**Done when:** switching formats with a clean timer is instant; switching with elapsed time
prompts; cancelling leaves the radio on the old value.

---

# Step 8 — Linear mode UI

### 8.1 Prep bar — `src/components/ModeLinear/PrepTime/index.tsx`

Branch on the active format:

- **KPDP:** unchanged (two pooled counters + centre play/pause).
- **Debatiáda:** one counter showing the prep slot of the current gap, coloured by its owning
  team, plus the same centre play/pause button.

"Current gap" = walk the format's `linearOrder` from `linearActiveSlotIndex`: if the active
slot is a prep slot, show it; otherwise show the next prep slot in the order; if none remains
(the final `a1-closing` card), show the last prep slot.

Add a `.preptime__button--single` modifier in
[`PrepTime/index.sass`](src/components/ModeLinear/PrepTime/index.sass) that spans the full
width instead of `calc((100% - var(--padding-x) * 2) / 2)`, and drops the half-rounded
corners / centre offset. Keep the play/pause button's absolute positioning intact in both
portrait and the `$iPhoneLandscape` media query.

### 8.2 Carousel last-card class

In [`TimeSlotsCarousel/index.tsx`](src/components/ModeLinear/TimeSlotsCarousel/index.tsx:32),
add `time-slots-carousel--last-card-visible` to the section's class list when
`activeSlotIndex === timeSlots.length - 1`.

In [`index.sass`](src/components/ModeLinear/TimeSlotsCarousel/index.sass:27), move the
`margin-right` rules from `.time-slots-carousel--card-18-visible` (both the base rule and the
`$iPhoneLandscape` one at line 108) onto `.time-slots-carousel--last-card-visible`. Leave
`$carouselCardCount: 18` alone — the `@for` loop still covers both formats.

### 8.3 Overview box

No component change needed — `Speakers` and `SpeakersBoxSlot` already map over whatever
`getLinearSpeakersData` returns. Verify visually that the affirmative column's 3 rows and the
negative column's 2 rows look acceptable with `justify-content: space-between`, in portrait
and in landscape.

`SpeakersBoxSlot` styles row index 0 as the speaker and the rest as questioners, so the
single-row `['a1-closing']` group renders correctly with no change.

**Done when:** Debatiáda runs end-to-end in linear mode on a phone-sized viewport, the last
card is not flush against the edge, swipe-back and tap-back work, and KPDP looks untouched.

---

# Step 9 — Classic mode

### 9.1 Speakers grid

No change required — [`ModeClassic/Speakers`](src/components/ModeClassic/Speakers/index.tsx)
maps over the arrays, so 5 affirmative vs 4 negative buttons work as-is. Check the column
heights look sane.

### 9.2 Prep section — `src/components/ModeClassic/PrepTime/index.tsx`

- **KPDP:** unchanged (two pooled team buttons).
- **Debatiáda:** render a single button bound to `prep-shared`, titled
  `localisation.preptime`, `display="remaining"`, disabled while a speech is running (keep
  the existing `!selectedSpeaker?.paused` condition).

Start/pause semantics for the shared button — start a **fresh** minute when it is started
while `!selected` **or** while `elapsed >= total`; otherwise resume where it was paused. So:

```
first press            -> RESET_PREP_TIME + TOGGLE_ACTIVE_PREP_TIME  (1:00)
press while running    -> TOGGLE_ACTIVE_PREP_TIME                    (pause)
press while paused     -> TOGGLE_ACTIVE_PREP_TIME                    (resume)
press after it hit 0   -> RESET_PREP_TIME + TOGGLE_ACTIVE_PREP_TIME  (fresh 1:00)
```

This is the "single shared prep button" decision from §2.6 — it intentionally does not record
which of the 8 gaps was consumed.

Add a reducer test covering all four transitions.

**Done when:** Debatiáda is usable in classic mode and KPDP classic mode is unchanged.

---

# Step 10 — Localisation, docs, final QA

### 10.1 `src/localisation.ts` — new keys

| key | Czech |
|---|---|
| `format` | `Formát debaty` |
| `formatKpdp` | `KPDP` |
| `formatDebatiada` | `Debatiáda` |
| `formatChangeConfirm` | `Změna formátu resetuje stopky. Opravdu pokračovat?` |

Keys stay alphabetically sorted, matching the existing file.

### 10.2 `CLAUDE.md`

Update with: the format layer (`src/formats.ts`, `formatConfigs` in `src/config.ts`), the
**id-not-label** identity rule and why it matters, the `npm test` command, and both formats'
timings.

### 10.3 Manual QA matrix

Run every cell — 2 formats × 2 display modes:

- [ ] Full run-through to the last slot; the timer does not advance past it.
- [ ] Swipe right and tap the previous card: both restore the previous slot **paused**, with
      elapsed time preserved.
- [ ] Prep: pooled and shared across positions in KPDP; independent per gap in Debatiáda.
- [ ] Overrun shows negative time (e.g. `-0:05`).
- [ ] `RESET` from the toolbar clears everything and returns to slot 0.
- [ ] Format switch with elapsed time prompts; cancel keeps the old format.
- [ ] Reload the page: the chosen format persists.
- [ ] Portrait, landscape, and iPad breakpoints for the linear layout.
- [ ] Dark and light theme.

### 10.4 Final gate

```bash
npm run lint && npm test && npm run build
```

---

## Assumptions being made (flag to the user if they turn out wrong)

1. Prep auto-starts when advancing off a speech, and the following speech stays paused until
   tapped — this is today's KPDP behaviour
   ([`reducer.ts:76`](src/store/reducer.ts:76)) and is carried over to Debatiáda unchanged.
2. There is no prep before the opening `A1` and none after the closing `A1 závěr` — 8 gaps
   in total.
3. The closing 1-minute A1 speech is not followed by a cross-question.
4. `A1 závěr` is a display label only; the speaker is the same person as `A1`, but the two
   slots time independently.
