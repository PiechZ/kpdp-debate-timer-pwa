# Implementation spec: add English UI language, selectable in Settings

Audience: an AI coding agent working in this repo. Execute the steps **in order**. Each step
is independently verifiable — do not start step N+1 until step N's "Done when" holds.

---

## 1. Goal

The app is Czech-only today. Add a second UI language, **English**, selectable in Settings,
alongside the existing theme/mode/format radios. This is a "quality of life" addition — it
must **not** reset the running debate, unlike switching debate format.

## 2. Locked decisions

These were agreed with the user. Do not re-litigate them.

1. Debate notation (`A1`, `N1`, `➝`) is **not** translated — it's shorthand shared across
   languages. Only actual prose gets translated: `Afirmace`/`Negace` → `Affirmative`/`Negative`,
   `Přípravný čas` → `Prep time`, and Debatiáda's `A1 závěr` → `A1 Closing`.
2. Switching language **preserves the running debate** — elapsed time, pause state, and
   selection are untouched. Only display text (`RadioOption.label`, `TimeSlot.label`,
   `TimeSlot.labelSuffix`) is refreshed. No confirmation dialog, unlike format switching.
3. Default language is **auto-detected from the browser locale**: `navigator.language`
   starting with `cs` → Czech, anything else → English. This is only the *default* — an
   explicit choice in Settings is persisted and always wins after that, exactly like
   `getActiveThemeColour`'s `prefers-color-scheme` fallback already works for theme.
4. The two options in the language radio are labelled **in their own language, always** —
   `Čeština` and `English` — regardless of which language is currently active. (Standard
   language-picker convention: a user who can't read the current UI language must still be
   able to find their own language by its native name.)
5. `src/manifest.json`'s PWA app name and `src/template.html`'s `<html lang>` stay as they are.
   A runtime toggle can't rename an already-installed home-screen icon; out of scope.

## 3. What the current code assumes (read before editing)

**A. Most of `localisation.ts`'s ~30 keys are already read live, on every render.** Every
component that imports `localisation` (`About`, `Navbar`, `Toolbar`, `Settings`, `Timer`,
`ModeClassic/Header`, `ModeClassic/PrepTime`, `ModeLinear/FeatureDiscovery`, `PWAPromptIOS`)
does `localisation.xxx` inline in its render body — not once at import time. Nothing is
memoised (`grep -rn "memo(\|PureComponent"` in `src/` is empty) and the whole app renders
inside a single `<Context.Provider>` at the root
([`src/store/index.tsx`](src/store/index.tsx)), so **any** dispatch (including the new
`SET_LANGUAGE`) re-renders the entire tree. This means turning `localisation` from a static
object into a live function call (`getLocalisation().xxx`) is enough to make all of these ~24
call sites language-reactive — no store plumbing needed for them.

**B. `RadioOption` label sets and `TimeSlot` labels are baked once, not read live — this is
the actual work.**
[`src/config.ts`](src/config.ts)'s `themes`/`modes`/`formats` arrays call `localisation.xxx`
once at **module import time**. [`src/store/initialStore.ts`](src/store/initialStore.ts)'s
`createInitialStore(format)` copies `TimeSlotConfig.label`/`labelSuffix` from
`formatConfigs[format]` onto each `TimeSlot` **once, at store-creation time**. A language
switch needs a new reducer action that re-derives all of this from fresh data — it will not
happen automatically from a re-render, unlike (A).

**C. `formatConfigs`'s `linearOrder`/`overviewGroups`/`prepTimeParties` never depend on
language — only `speakers`/`prepTimes` (the label-bearing arrays) do.** Check
[`src/components/ModeLinear/getters.ts`](src/components/ModeLinear/getters.ts): it destructures
only `overviewGroups`/`linearOrder` from `formatConfigs[format]`, never `speakers`/`prepTimes`
directly (it resolves actual `TimeSlot` objects from the **store**, which already has labels
baked in). This means `getFormatConfigs(language)` only needs to vary the label-bearing parts;
the structural parts can be built once per format regardless of language, and
`ModeLinear/getters.ts` needs **zero changes** in this feature.

**D. Only one speaker label is real Czech prose today, and it isn't even routed through
`localisation`.** `'A1 závěr'` (Debatiáda's closing speech) is a hardcoded literal in
`debatiadaSpeakers` inside `config.ts` — unlike the prep-time labels, which already flow
through `localisation.affirmative`/`negative`/`preptime`. It needs a new translation key.

**E. `navigator`/`window` are unavailable during the production build's SSR prerender step**
(`preact build` produces an `ssr-bundle.js` that runs in Node). The existing
`getActiveThemeColour` in [`src/themes.ts`](src/themes.ts) already guards this with
`typeof window !== 'undefined' && window.matchMedia && ...`, falling back to a fixed default
when unavailable. Mirror that exact guard style for the new `getActiveLanguage()` — do not
introduce an unguarded `navigator.language` access, it will break `npm run build`.

**F. `createInitialStore` must become a required two-argument factory,
`(format, language)` — not one with a language default.** All 13 existing test call sites
(`src/components/ModeLinear/__tests__/getters.test.ts`,
`src/store/__tests__/reducer.test.ts`) call it with one argument today. If `language` were
optional, these would silently keep compiling and silently start depending on jsdom's default
`navigator.language` (`'en-US''`) for their expected-Czech-label assertions — exactly the kind
of implicit-global-state bug this project got bitten by once already (see the `npm run build`
regression fixed in the Debatiáda work). Making `language` a required parameter forces
TypeScript to flag every call site that needs updating, so none can be missed silently.

## 4. Guard rails

- KPDP and Debatiáda behaviour (slot structure, ids, elapsed/paused/selected/timeStartedDate
  handling, carousel order) must stay **bit-identical** — this feature only ever touches
  `label`/`labelSuffix` text and `RadioOption` label text, never anything else. All existing
  tests must keep passing **unmodified** except where this doc explicitly says to touch them
  (the `createInitialStore` call-site signature change).
- `npm run lint` and `npm run build` must pass after every step — the build is the strict gate
  (§3.E), the dev server's async type-checking will not catch a mistake here.
- All user-facing Czech strings continue to go through `src/localisation.ts` — including the
  new `'A1 závěr'` → keyed translation (§3.D). No inline literal strings in components.
- Do not touch `preact.config.js`, `src/.babelrc`, or `jest.config.js`.
- Keep the existing code style: functional components, `FunctionalComponent`, arrow functions,
  airbnb-typescript lint rules.

---

# Step 1 — Language config layer

**Goal:** describe the language setting as data, mirroring `src/formats.ts` exactly.

### 1.1 `src/languages.ts` (new)

```ts
import { getActiveOption } from './localStorage';

export type Language = 'cs' | 'en';

const detectDefaultLanguage = (): Language => (
  (typeof window !== 'undefined' && window.navigator && window.navigator.language
    && window.navigator.language.toLowerCase().startsWith('cs'))
    ? 'cs' : 'en'
);

export const getActiveLanguage = (): Language => <Language>getActiveOption('language', detectDefaultLanguage());
```

Note this does **not** use the `autoValue`/`'auto'` mechanism `themes.ts` uses — there is no
persistent "Auto" radio option for language (unlike theme, which can keep following
`prefers-color-scheme` indefinitely). Detection only supplies the *initial* default the first
time `getActiveOption` finds nothing stored; once the user picks a language explicitly in
Settings, that stored value always wins. The Settings radio has exactly two options: `cs`, `en`.

### 1.2 `src/localStorage.ts`

Add `'language'` to `StorageKey` and `language: 'activeLanguage'` to `localStorageKeys`.

### 1.3 Tests — `src/__tests__/languages.test.ts` (new)

Using `Object.defineProperty(window.navigator, 'language', { value: ..., configurable: true })`
to simulate different browser locales, and `localStorage.clear()` in `beforeEach`:

1. No stored value, `navigator.language = 'cs-CZ'` → `getActiveLanguage() === 'cs'`.
2. No stored value, `navigator.language = 'en-US'` → `getActiveLanguage() === 'en'`.
3. No stored value, `navigator.language = 'de-DE'` (neither) → `getActiveLanguage() === 'en'`.
4. Stored value `'cs'` present, `navigator.language = 'en-US'` → stored value wins, `'cs'`.

**Done when:** `npm test` and `npm run lint` pass. **Commit here.**

---

# Step 2 — Per-language translation dictionary

**Goal:** `localisation.ts` becomes language-aware; every existing static call site becomes a
live lookup. No visible behaviour change yet (still defaults to whatever `getActiveLanguage()`
resolves to, same as today's fixed Czech).

### 2.1 `src/localisation.ts` — restructure

```ts
import { Language, getActiveLanguage } from './languages';

const translations: Record<Language, Record<string, string>> = {
  cs: { /* existing 30 keys, verbatim, plus the 3 new keys below */ },
  en: { /* English translations, see table */ },
};

const getLocalisation = (language: Language = getActiveLanguage()): Record<string, string> => translations[language];

export default getLocalisation;
```

Every existing consumer changes from `import localisation from '../../localisation'` +
`localisation.xxx` to `import getLocalisation from '../../localisation'` +
`getLocalisation().xxx`. This is the only change needed in:
`About`, `Navbar`, `Toolbar`, `Settings`, `Timer`, `ModeClassic/Header`, `ModeClassic/PrepTime`,
`ModeLinear/FeatureDiscovery`, `PWAPromptIOS`. (`config.ts`'s usage is handled in step 3, not
here, since it needs the function to accept an explicit language argument rather than reading
the global default — see §3.C in the assumptions section above.)

### 2.2 New keys (add to both `cs` and `en`, alphabetically sorted like today)

| key | cs | en |
|---|---|---|
| `language` | `Jazyk` | `Language` |
| `languageCs` | `Čeština` | `Čeština` *(same in both — §2 decision 4)* |
| `languageEn` | `English` | `English` *(same in both)* |
| `debatiadaA1ClosingLabel` | `A1 závěr` | `A1 Closing` |

### 2.3 English translations of existing keys

| key | cs (existing) | en (new) |
|---|---|---|
| `about` | `Jakékoliv připomínky či nápady neváhejte sdělit na:` | `Feel free to share any feedback or ideas at:` |
| `affirmative` | `Afirmace` | `Affirmative` |
| `cancel` | `Zrušit` | `Cancel` |
| `close` | `Zavřít` | `Close` |
| `format` | `Formát debaty` | `Debate format` |
| `formatChangeConfirm` | `Změna formátu resetuje stopky. Opravdu pokračovat?` | `Changing the format resets the timer. Continue?` |
| `formatDebatiada` | `Debatiáda` | `Debatiáda` *(proper noun, unchanged)* |
| `formatKpdp` | `KPDP` | `KPDP` *(acronym, unchanged)* |
| `linearFeatureDiscoveryButton` | `Klepněte na kartičku na začátku a konci každé řeči` | `Tap the card at the start and end of each speech` |
| `linearFeatureDiscoverySettings` | `Rozložení můžete změnit v nastavení` | `You can change the layout in Settings` |
| `linearPrepTimeSuffix` | ` - přípravný čas` | ` - prep time` |
| `mode` | `Režim zobrazení` | `Display mode` |
| `modeClassic` | `Klasický` | `Classic` |
| `modeLinear` | `Jednoduchý` | `Linear` |
| `negative` | `Negace` | `Negative` |
| `ok` | `Ano` | `OK` |
| `pause` | `Pozastavit` | `Pause` |
| `preptime` | `Přípravný čas` | `Prep time` |
| `pwaPromptIOSAddToHomescreen` | `Vyberte možnost Přidat na plochu` | `Select "Add to Home Screen"` |
| `pwaPromptIOSDone` | `Potvrďte instalaci a je hotovo!` | `Confirm the installation and you're done!` |
| `pwaPromptIOSOpenMenu` | `Otevřete menu prohlížeče` | `Open the browser menu` |
| `pwaPromptIOSParagraph` | `Abyste měli stopky uložené mezi aplikacemi a mohli je používat offline, je potřeba je nainstalovat:` | `To keep the timer saved between launches and use it offline, install it:` |
| `pwaPromptIOSTitle` | `Nainstalujte si Debatní stopky` | `Install Debate Timer` |
| `reset` | `Resetovat` | `Reset` |
| `resetConfirm` | `Opravdu si přejete stopky resetovat?` | `Are you sure you want to reset the timer?` |
| `settings` | `Nastavení` | `Settings` |
| `start` | `Spustit` | `Start` |
| `themeColour` | `Barevný režim` | `Color theme` |
| `themeColourAuto` | `Auto` | `Auto` |
| `themeColourDark` | `Tmavý` | `Dark` |
| `themeColourLight` | `Světlý` | `Light` |
| `title` | `Debatní stopky` | `Debate Timer` |

### 2.4 Tests — `src/__tests__/localisation.test.ts` (new)

1. `Object.keys(translations.cs)` and `Object.keys(translations.en)` are identical sets (no
   missing/extra keys in either language).
2. `getLocalisation('cs').title === 'Debatní stopky'`, `getLocalisation('en').title === 'Debate Timer'`.
3. `getLocalisation('cs').languageEn === getLocalisation('en').languageEn` and same for
   `languageCs` (the "always native name" invariant from §2 decision 4).

**Done when:** `npm test`, `npm run lint`, and `npm run build` all pass, and a manual check of
the running app shows **no visible change** (still Czech, since nothing calls `SET_LANGUAGE`
yet and detection still resolves to whatever it resolved to before). **Commit here.**

---

# Step 3 — Language-aware format config

**Goal:** `config.ts` can produce correctly-labelled `speakers`/`prepTimes` for either
language, and correctly-labelled `RadioOption[]` for `themes`/`modes`/`formats`/the new
`languages`, without changing anything `ModeLinear/getters.ts` relies on (§3.C).

### 3.1 `src/config.ts` — parameterise the label-bearing builders

Change `getLocalisation` to be called **with an explicit language argument** here (not the
implicit-global-default one-arg form used in step 2's components) — this file must be able to
build config for a language other than whatever is currently active, for the reducer's benefit
in step 5.

Restructure so `kpdpPrepTimes`, `debatiadaSpeakers` (specifically the `a1-closing` entry using
the new `debatiadaA1ClosingLabel` key instead of the literal `'A1 závěr'`), and
`debatiadaPrepTimes` are built by small functions taking a resolved translation dict, e.g.
`buildKpdpPrepTimes(t: Record<string,string>)`, `buildDebatiadaSpeakers(t)`,
`buildDebatiadaPrepTimes(t)`. `kpdpSpeakers` needs no such function — none of its labels are
language-dependent (all are notation: `A1`, `A3 ➝ N1`, etc.) — keep it exactly as it is today.

Add:
```ts
export const getFormatConfigs = (language: Language): Record<Format, FormatConfig> => {
  const t = getLocalisation(language);
  return {
    kpdp: {
      speakers: kpdpSpeakers, // unchanged, language-independent
      prepTimes: buildKpdpPrepTimes(t),
      prepTimeParties: ['affirmative', 'negative'], // unchanged
      linearOrder: [...], // unchanged, copy today's literal array
      overviewGroups: [...], // unchanged, copy today's literal array
    },
    debatiada: {
      speakers: buildDebatiadaSpeakers(t),
      prepTimes: buildDebatiadaPrepTimes(t),
      prepTimeParties: [...], // unchanged
      linearOrder: [...], // unchanged
      overviewGroups: [...], // unchanged
    },
  };
};
```

Keep the existing exported `formatConfigs` constant, now computed as
`getFormatConfigs(getActiveLanguage())` — it is still correct for its only consumer
(`ModeLinear/getters.ts`, which never reads `speakers`/`prepTimes` from it, per §3.C) even if it
goes stale relative to a later language switch. Keep the existing `speakers`/`prepTimes`
top-level re-exports (`= formatConfigs.kpdp`) working as they do today.

### 3.2 `themes`/`modes`/`formats`/new `languages` — parameterise similarly

Extract each into a small builder taking `(t: Record<string,string>, activeValue: string)`,
e.g. `buildThemeOptions(t, activeThemeValue): RadioOption[]`. Keep the existing top-level
`export const themes = buildThemeOptions(getLocalisation(), activeThemeColour)` pattern (same
for `modes`, `formats`). Add the new one:

```ts
export const languages: RadioOption[] = buildLanguageOptions(getActiveLanguage());
```

`buildLanguageOptions(activeValue: string): RadioOption[]` is special per §2 decision 4 — it
does **not** take a translation dict, since `languageCs`/`languageEn` are identical in both
dicts anyway; just use `getLocalisation('cs').languageCs`/`getLocalisation('cs').languageEn`
(either language dict works, they're equal) directly:

```ts
export const buildLanguageOptions = (activeValue: string): RadioOption[] => [
  { label: getLocalisation('cs').languageCs, value: 'cs' },
  { label: getLocalisation('cs').languageEn, value: 'en' },
].map((item) => ({ ...item, active: item.value === activeValue }));
```

### 3.3 Tests — extend `src/__tests__/config.test.ts`

1. `getFormatConfigs('cs').debatiada.speakers[0].find(s => s.id === 'a1-closing')!.label === 'A1 závěr'`;
   same lookup with `'en'` → `'A1 Closing'`.
2. `getFormatConfigs('cs').kpdp.prepTimes[0].label === 'Afirmace'`; `'en'` → `'Affirmative'`.
3. `getFormatConfigs('cs').kpdp.speakers[0][0].label === 'A1'` and the same with `'en'` — proves
   notation labels are identical across languages (§2 decision 1).
4. All the existing step-4 (Debatiáda) config tests keep passing unmodified, run against
   `getFormatConfigs('cs')` implicitly via whatever the existing tests currently import (adjust
   only the import if the plain `formatConfigs` constant's shape changed — it shouldn't have).
5. `buildLanguageOptions('en')` returns two options, `en` active, both labels are the fixed
   native names regardless of which is active.

**Done when:** `npm test`, `npm run lint`, `npm run build` pass. **Commit here.**

---

# Step 4 — `createInitialStore` becomes `(format, language)`

**Goal:** wire the language-aware config into store creation. Still no reducer action yet —
this step only changes how the store is *built*, at app load and at every existing
`createInitialStore` call site.

### 4.1 `src/store/initialStore.ts`

```ts
export const createInitialStore = (format: Format, language: Language): StoreContent => {
  const { speakers, prepTimes, prepTimeParties } = getFormatConfigs(language)[format];
  return {
    ...
    languages, // new field, see step 5.2 for StoreContent addition — import the module-level snapshot here, consistent with how `formats`/`modes`/`themes` are already threaded through
    ...
  };
};
export default createInitialStore(getActiveFormat(), getActiveLanguage());
```

### 4.2 `src/store/reducer.ts` — update the two existing `createInitialStore` call sites

`setFormat` and `reset` both call `createInitialStore(someFormat)` today. Both need the current
language passed as the second argument now. Add `getActiveStoreLanguage(store)` to
`src/store/getters.ts` first (mirrors `getActiveStoreFormat` exactly:
`store.languages.find(item => item.active)!.value`) and use it at both call sites:
`createInitialStore(value as Format, getActiveStoreLanguage(store))` in `setFormat`,
`createInitialStore(getActiveStoreFormat(store), getActiveStoreLanguage(store))` in `reset`.

(`StoreContent` doesn't have a `languages` field yet at this point in the plan — that's added in
step 5.1, which must land in the same commit as this step's reducer changes, since
`getActiveStoreLanguage` needs it to compile. Do steps 4 and 5.1–5.2 together if that's cleaner
than strictly sequencing them; the important ordering constraint is only "don't touch UI before
the reducer compiles.")

### 4.3 Test call sites — required, mechanical, exhaustive

Every one of the 13 existing `createInitialStore('kpdp')` / `createInitialStore('debatiada')`
calls in `src/components/ModeLinear/__tests__/getters.test.ts` and
`src/store/__tests__/reducer.test.ts` must become `createInitialStore('kpdp', 'cs')` /
`createInitialStore('debatiada', 'cs')` — **always `'cs'`**, since every one of those tests
asserts Czech label text (`'Negace'`, `'Afirmace'`, `'A1 závěr'`, etc.) and must keep doing so
unmodified in substance (only the call signature changes, not the assertions). This is the one
place in this feature where a large number of existing test files get touched — do it
mechanically, file by file, and diff-review that no assertion text changed, only call
signatures.

**Done when:** `npm test` (all pre-existing assertions unchanged in substance, only
`createInitialStore` call sites gained a `'cs'` argument), `npm run lint`, `npm run build` all
pass. Manually confirm the running app is still Czech by default (no visible change).
**Commit here.**

---

# Step 5 — `SET_LANGUAGE` reducer action

**Goal:** the one genuinely new piece of logic — switch language, refresh every label, don't
touch timer state.

### 5.1 `src/store/types.ts`

Add `languages: RadioOption[]` to `StoreContent`. Add `'SET_LANGUAGE'` to `StoreActionType`
(payload: `'cs' | 'en'` as a string, same convention as `'SET_FORMAT'`).

### 5.2 `src/store/getters.ts`

Add `getActiveStoreLanguage(store: StoreContent): Language`, mirroring
`getActiveStoreFormat`/`getActiveStoreMode` exactly.

### 5.3 `src/store/reducer.ts` — `setLanguage`

```ts
const relabelSlots = <T extends TimeSlot>(current: T[], fresh: TimeSlotConfig[]): T[] => (
  current.map((slot) => {
    const match = fresh.find((f) => f.id === slot.id)!;
    return { ...slot, label: match.label, labelSuffix: match.labelSuffix };
  })
);

const setLanguage = (store: StoreContent, value: string): StoreContent => {
  setActiveOption('language', value);
  const language = value as Language;
  const t = getLocalisation(language);
  const format = getActiveStoreFormat(store);
  const { speakers, prepTimes } = getFormatConfigs(language)[format];

  return {
    ...store,
    languages: buildLanguageOptions(value),
    themes: buildThemeOptions(t, store.themes.find((i) => i.active)!.value),
    modes: buildModeOptions(t, store.modes.find((i) => i.active)!.value),
    formats: buildFormatOptions(t, store.formats.find((i) => i.active)!.value),
    speakers: store.speakers.map((party, i) => relabelSlots(party, speakers[i])),
    prepTimes: relabelSlots(store.prepTimes, prepTimes),
  };
};
```

Wire `'SET_LANGUAGE'` into the reducer's `switch`. **Explicitly do not** touch `elapsed`,
`paused`, `selected`, `timeStartedDate`, `party`, `type`, `total`, `id`, `linearActiveSlotIndex`,
`screen`, `resetDialogVisible`, `pendingFormat`, `featureDiscoveryVisible` — `relabelSlots`
spreads the existing slot and overwrites only `label`/`labelSuffix`, so this is automatic as
long as nothing else in this function constructs slots from scratch.

### 5.4 Tests — extend `src/store/__tests__/reducer.test.ts`

1. **The core guarantee**: build a KPDP store, start a speaker (`TOGGLE_PAUSED_TIMER`), tick it
   5 times, dispatch `{ type: 'SET_LANGUAGE', payload: 'en' }`, and assert: `elapsed === 5` on
   the ticked slot (unchanged), `paused`/`selected`/`timeStartedDate` unchanged, but
   `label` on the affirmative prep slot is now `'Affirmative'` (was `'Afirmace'`).
2. Debatiáda: dispatch `SET_LANGUAGE` to `'en'`, assert the `a1-closing` slot's `label` is now
   `'A1 Closing'`, and a KPDP-style notation slot like `a1` still reads `'A1'` (unchanged by
   language, per §2 decision 1).
3. `store.languages`, `store.themes`, `store.modes`, `store.formats` all have refreshed label
   text after the switch, with `active`/`value` unchanged from before the switch.
4. `localStorage.getItem('activeLanguage') === 'en'` after the dispatch.
5. Switching language does **not** reset `linearActiveSlotIndex` (unlike `SET_FORMAT`).

**Done when:** `npm test`, `npm run lint`, `npm run build` pass. **Commit here.**

---

# Step 6 — Settings UI

**Goal:** expose the new radio. No confirmation dialog (§2 decision 2).

### 6.1 `src/screens/Settings/index.tsx`

Add a fourth `Radio`, using the existing generic `setActiveOption` dispatch helper already used
for theme/mode (no special handler needed, unlike format's `requestFormatChange` — language
switching is always immediate):

```tsx
<Radio
  label={`${getLocalisation().language}:`}
  options={store.languages}
  onChange={(newValue) => setActiveOption(newValue, dispatch, 'SET_LANGUAGE')}
/>
```

Placement: alongside the other three settings radios: your call, but grouping it near the top
(language arguably affects how a user reads everything else in Settings) is reasonable.

**Done when:** switching language in Settings immediately updates every visible label — Settings
radios' own option text, Navbar title, About text, Toolbar button titles, and (if a debate is
in progress) the Timer screen's slot labels — with the timer continuing to run/preserve its
elapsed time throughout. **Commit here.**

---

# Step 7 — Docs and final QA

### 7.1 `CLAUDE.md`

Add a short section documenting: `src/languages.ts` / `getActiveLanguage()`, the
`getFormatConfigs(language)` / `getLocalisation(language)` functions, the
`SET_LANGUAGE` reducer action and its "relabel in place, never reset" contract, and the browser
locale detection default.

### 7.2 Manual QA matrix

- [ ] Fresh browser profile / cleared localStorage with a non-Czech locale → app opens in
      English by default.
- [ ] Fresh browser profile with a Czech locale → app opens in Czech by default.
- [ ] Explicit language choice in Settings persists across a page reload, overriding locale
      detection.
- [ ] Switch language mid-debate (KPDP and Debatiáda, both display modes) with a timer
      currently running — elapsed time and pause state are preserved, only text changes.
- [ ] Switch mode/format/theme after switching language — new content still appears in the
      chosen language (not reset back to Czech).
- [ ] Debatiáda's `A1`/`A1 Closing` and KPDP's `A1`/`N1`/arrow notation look correct in both
      languages.
- [ ] `pwaPromptIOS*` strings (iOS install prompt) read correctly in English — hard to trigger
      outside real iOS Safari, so a visual/string read-through of the component is an acceptable
      substitute.

### 7.3 Final gate

```bash
npm run lint && npm test && npm run build
```

---

## Assumptions being made (flag to the user if they turn out wrong)

1. `linearOrder`/`overviewGroups`/`prepTimeParties` truly never vary by language (§3.C) — if a
   future format ever needed language-dependent ordering this would need revisiting, but
   nothing today does.
2. English translations in §2.3 are a reasonable first pass, not run past a native-English
   debate-format audience — the user should skim them before merging, not just trust the table.
3. No RTL or pluralisation concerns for `cs`/`en` — a third language later might need more than
   a flat `Record<string,string>`, but that's out of scope here.
