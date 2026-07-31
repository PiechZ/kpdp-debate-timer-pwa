import reducer from '../reducer';
import { createInitialStore } from '../initialStore';
import { StoreContent } from '../types';
import { TimeSlot } from '../../types';
import { getRunningTimeSlot } from '../getters';
import { getLinearTimeSlots } from '../../components/ModeLinear/getters';

// Pinned to 'cs' explicitly: this test file asserts Czech label text, and must not depend on
// jsdom's environment-detected default language (see languages.ts / getActiveLanguage).
const initialStore = createInitialStore('kpdp', 'cs');

const increment = (store: StoreContent): StoreContent => reducer(store, {
  type: 'INCREMENT_LINEAR_ACTIVE_SLOT_INDEX',
  payload: null,
});

const decrement = (store: StoreContent): StoreContent => reducer(store, {
  type: 'DECREMENT_LINEAR_ACTIVE_SLOT_INDEX',
  payload: null,
});

const togglePausedTimer = (store: StoreContent): StoreContent => reducer(store, {
  type: 'TOGGLE_PAUSED_TIMER',
  payload: null,
});

const tick = (store: StoreContent, slot: TimeSlot): StoreContent => reducer(store, {
  type: 'TIMESLOT_TICK',
  payload: slot,
});

const allSlots = (store: StoreContent): TimeSlot[] => [
  ...store.speakers.flat(),
  ...store.prepTimes,
];

describe('initial state', () => {
  it('starts on slot 0 with only A1 selected and every slot paused at 0 elapsed', () => {
    expect(initialStore.linearActiveSlotIndex).toBe(0);

    const selected = allSlots(initialStore).filter((slot) => slot.selected);
    expect(selected.map((slot) => slot.label)).toEqual(['A1']);

    allSlots(initialStore).forEach((slot) => {
      expect(slot.paused).toBe(true);
      expect(slot.elapsed).toBe(0);
    });
  });
});

describe('TOGGLE_PAUSED_TIMER', () => {
  it('starts the selected slot', () => {
    const store = togglePausedTimer(initialStore);
    const a1 = store.speakers[0][0];

    expect(a1.label).toBe('A1');
    expect(a1.paused).toBe(false);
    expect(typeof a1.timeStartedDate).toBe('number');
  });
});

describe('INCREMENT_LINEAR_ACTIVE_SLOT_INDEX', () => {
  it('off a speech selects and starts the following prep slot', () => {
    const store = increment(initialStore);

    expect(store.linearActiveSlotIndex).toBe(1);

    const negativePrep = store.prepTimes.find((slot) => slot.label === 'Negace')!;
    expect(negativePrep.selected).toBe(true);
    expect(negativePrep.paused).toBe(false);
  });

  it('off a prep slot selects the following speech but leaves it paused', () => {
    const store = increment(increment(initialStore));

    expect(store.linearActiveSlotIndex).toBe(2);

    const crossQuestion = store.speakers[1].find((slot) => slot.label === 'N3 ➝ A1')!;
    expect(crossQuestion.selected).toBe(true);
    expect(crossQuestion.paused).toBe(true);
  });

  it('stays on the last index and leaves every slot paused', () => {
    let store = initialStore;
    for (let i = 0; i < 18; i += 1) {
      store = increment(store);
    }
    expect(store.linearActiveSlotIndex).toBe(18);

    store = increment(store);

    expect(store.linearActiveSlotIndex).toBe(18);
    allSlots(store).forEach((slot) => {
      expect(slot.paused).toBe(true);
    });
  });
});

describe('DECREMENT_LINEAR_ACTIVE_SLOT_INDEX', () => {
  it('at index 0 returns the same store reference', () => {
    const result = decrement(initialStore);
    expect(result).toBe(initialStore);
  });

  it('from index 1 restores A1 selected and paused, preserving elapsed', () => {
    const running = togglePausedTimer(initialStore);
    const a1Running = getRunningTimeSlot(running)!;
    const ticked = tick(tick(running, a1Running), a1Running);

    const advanced = increment(ticked);
    const store = decrement(advanced);

    expect(store.linearActiveSlotIndex).toBe(0);
    const a1 = store.speakers[0][0];
    expect(a1.label).toBe('A1');
    expect(a1.selected).toBe(true);
    expect(a1.paused).toBe(true);
    expect(a1.elapsed).toBe(2);
  });
});

describe('TIMESLOT_TICK', () => {
  it('increments elapsed only on the matching slot and clears timeStartedDate on the rest', () => {
    const running = togglePausedTimer(initialStore);
    const activeSlot = getRunningTimeSlot(running)!;
    const store = tick(running, activeSlot);

    const a1 = store.speakers[0][0];
    expect(a1.label).toBe('A1');
    expect(a1.elapsed).toBe(1);

    allSlots(store)
      .filter((slot) => slot.label !== 'A1')
      .forEach((slot) => {
        expect(slot.elapsed).toBe(0);
        expect(slot.timeStartedDate).toBeNull();
      });
  });
});

describe('prep time pooling', () => {
  it('shares elapsed across every carousel position of the same prep slot', () => {
    const n = 5;
    let store = reducer(initialStore, { type: 'TOGGLE_ACTIVE_PREP_TIME', payload: 'Negace' });
    const negativePrep = store.prepTimes.find((slot) => slot.label === 'Negace')!;

    for (let i = 0; i < n; i += 1) {
      store = tick(store, negativePrep);
    }

    const slots = getLinearTimeSlots(store);
    expect(slots[1].elapsed).toBe(n);
    expect(slots[3].elapsed).toBe(n);
  });
});

describe('SET_SELECTED_SPEAKER', () => {
  it('selects exactly one slot across both parties', () => {
    const store = reducer(initialStore, { type: 'SET_SELECTED_SPEAKER', payload: 'n2' });
    const selected = allSlots(store).filter((slot) => slot.selected);

    expect(selected.map((slot) => slot.label)).toEqual(['N2']);
  });
});

describe('TOGGLE_ACTIVE_PREP_TIME', () => {
  it('starts the named prep and deselects the other, then pauses on a second toggle', () => {
    const started = reducer(initialStore, { type: 'TOGGLE_ACTIVE_PREP_TIME', payload: 'prep-affirmative' });
    const affirmativePrep = started.prepTimes.find((slot) => slot.label === 'Afirmace')!;
    const negativePrep = started.prepTimes.find((slot) => slot.label === 'Negace')!;

    expect(affirmativePrep.selected).toBe(true);
    expect(affirmativePrep.paused).toBe(false);
    expect(negativePrep.selected).toBe(false);

    const toggledAgain = reducer(started, { type: 'TOGGLE_ACTIVE_PREP_TIME', payload: 'prep-affirmative' });
    const affirmativePrepAgain = toggledAgain.prepTimes.find((slot) => slot.label === 'Afirmace')!;

    expect(affirmativePrepAgain.paused).toBe(true);
  });
});

describe('RESET', () => {
  it('returns every elapsed value to 0 and the index to 0', () => {
    const running = togglePausedTimer(initialStore);
    const activeSlot = getRunningTimeSlot(running)!;
    const ticked = tick(running, activeSlot);
    const advanced = increment(ticked);

    const store = reducer(advanced, { type: 'RESET', payload: null });

    expect(store.linearActiveSlotIndex).toBe(0);
    allSlots(store).forEach((slot) => {
      expect(slot.elapsed).toBe(0);
    });
  });
});

describe('slot ids', () => {
  it('are unique across all speakers and prep times', () => {
    const ids = allSlots(initialStore).map((slot) => slot.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe('Debatiáda format', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('produces the expected 17-card linear carousel order', () => {
    const store = createInitialStore('debatiada', 'cs');
    const ids = getLinearTimeSlots(store).map((slot) => slot.id);

    expect(ids).toEqual([
      'a1', 'prep-1', 'n-a1', 'prep-2',
      'n1', 'prep-3', 'a-n1', 'prep-4',
      'a2', 'prep-5', 'n-a2', 'prep-6',
      'n2', 'prep-7', 'a-n2', 'prep-8',
      'a1-closing',
    ]);
  });

  it('ticks a1 and a1-closing independently', () => {
    const store = createInitialStore('debatiada', 'cs');
    const a1 = allSlots(store).find((slot) => slot.id === 'a1')!;
    const a1Closing = allSlots(store).find((slot) => slot.id === 'a1-closing')!;

    expect(a1.total).toBe(180);
    expect(a1Closing.total).toBe(60);

    let ticked = store;
    for (let i = 0; i < 10; i += 1) {
      ticked = tick(ticked, a1);
    }

    const tickedA1 = allSlots(ticked).find((slot) => slot.id === 'a1')!;
    const tickedA1Closing = allSlots(ticked).find((slot) => slot.id === 'a1-closing')!;

    expect(tickedA1.elapsed).toBe(10);
    expect(tickedA1Closing.elapsed).toBe(0);
  });

  it('ticks prep-1 through prep-8 independently', () => {
    const store = createInitialStore('debatiada', 'cs');
    const prep1 = store.prepTimes.find((slot) => slot.id === 'prep-1')!;

    let ticked = store;
    for (let i = 0; i < 5; i += 1) {
      ticked = tick(ticked, prep1);
    }

    const otherPreps = ticked.prepTimes.filter((slot) => slot.id !== 'prep-1' && slot.id.startsWith('prep-') && slot.id !== 'prep-shared');
    expect(otherPreps.length).toBe(7);
    otherPreps.forEach((slot) => {
      expect(slot.elapsed).toBe(0);
    });
  });

  it('SET_FORMAT swaps to the Debatiáda slot shape and persists the choice', () => {
    const kpdpStore = createInitialStore('kpdp', 'cs');
    const store = reducer(kpdpStore, { type: 'SET_FORMAT', payload: 'debatiada' });

    expect(store.linearActiveSlotIndex).toBe(0);
    expect(store.formats.find((item) => item.value === 'debatiada')!.active).toBe(true);
    expect(store.formats.find((item) => item.value === 'kpdp')!.active).toBe(false);
    expect(localStorage.getItem('activeFormat')).toBe('debatiada');
    expect(store.speakers[0].length).toBe(5);
  });

  it('RESET after SET_FORMAT rebuilds Debatiáda slots, not KPDP ones', () => {
    const kpdpStore = createInitialStore('kpdp', 'cs');
    const switched = reducer(kpdpStore, { type: 'SET_FORMAT', payload: 'debatiada' });
    const a1 = allSlots(switched).find((slot) => slot.id === 'a1')!;
    const ticked = tick(switched, a1);

    const store = reducer(ticked, { type: 'RESET', payload: null });

    expect(store.speakers[0].length).toBe(5);
    expect(store.speakers[1].length).toBe(4);
    expect(store.prepTimes.length).toBe(9);
    allSlots(store).forEach((slot) => {
      expect(slot.elapsed).toBe(0);
    });
  });

  it('walks through all 17 cards and stops advancing at index 16', () => {
    let store = createInitialStore('debatiada', 'cs');

    for (let i = 0; i < 16; i += 1) {
      store = togglePausedTimer(store);
      store = increment(store);
    }

    expect(store.linearActiveSlotIndex).toBe(16);

    store = increment(store);
    expect(store.linearActiveSlotIndex).toBe(16);
  });
});

describe('SET_LANGUAGE', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('relabels slots but never touches elapsed/paused/selected/timeStartedDate', () => {
    const kpdpStore = createInitialStore('kpdp', 'cs');
    const running = togglePausedTimer(kpdpStore);
    const activeSlot = getRunningTimeSlot(running)!;

    let ticked = running;
    for (let i = 0; i < 5; i += 1) {
      ticked = tick(ticked, activeSlot);
    }

    const beforeSwitch = allSlots(ticked).find((slot) => slot.id === activeSlot.id)!;
    expect(beforeSwitch.elapsed).toBe(5);

    const store = reducer(ticked, { type: 'SET_LANGUAGE', payload: 'en' });
    const afterSwitch = allSlots(store).find((slot) => slot.id === activeSlot.id)!;

    expect(afterSwitch.elapsed).toBe(5);
    expect(afterSwitch.paused).toBe(beforeSwitch.paused);
    expect(afterSwitch.selected).toBe(beforeSwitch.selected);
    expect(afterSwitch.timeStartedDate).toBe(beforeSwitch.timeStartedDate);

    const affirmativePrep = store.prepTimes.find((slot) => slot.id === 'prep-affirmative')!;
    expect(affirmativePrep.label).toBe('Affirmative');
  });

  it('Debatiáda: relabels a1-closing but leaves notation labels like a1 unchanged', () => {
    const debatiadaStore = createInitialStore('debatiada', 'cs');
    const store = reducer(debatiadaStore, { type: 'SET_LANGUAGE', payload: 'en' });

    const a1Closing = allSlots(store).find((slot) => slot.id === 'a1-closing')!;
    const a1 = allSlots(store).find((slot) => slot.id === 'a1')!;

    expect(a1Closing.label).toBe('A1 Closing');
    expect(a1.label).toBe('A1');
  });

  it('refreshes RadioOption labels while preserving which option is active', () => {
    const kpdpStore = createInitialStore('kpdp', 'cs');
    const store = reducer(kpdpStore, { type: 'SET_LANGUAGE', payload: 'en' });

    const enOption = store.languages.find((item) => item.value === 'en')!;
    const csOption = store.languages.find((item) => item.value === 'cs')!;
    expect(enOption.active).toBe(true);
    expect(csOption.active).toBe(false);
    expect(csOption.label).toBe('Čeština');
    expect(enOption.label).toBe('English');

    const activeTheme = kpdpStore.themes.find((item) => item.active)!;
    const newActiveTheme = store.themes.find((item) => item.active)!;
    expect(newActiveTheme.value).toBe(activeTheme.value);

    const activeMode = kpdpStore.modes.find((item) => item.active)!;
    const newActiveMode = store.modes.find((item) => item.active)!;
    expect(newActiveMode.value).toBe(activeMode.value);

    const activeFormat = kpdpStore.formats.find((item) => item.active)!;
    const newActiveFormat = store.formats.find((item) => item.active)!;
    expect(newActiveFormat.value).toBe(activeFormat.value);
    expect(newActiveFormat.label).toBe('KPDP');
  });

  it('persists the choice to localStorage', () => {
    const kpdpStore = createInitialStore('kpdp', 'cs');
    reducer(kpdpStore, { type: 'SET_LANGUAGE', payload: 'en' });

    expect(localStorage.getItem('activeLanguage')).toBe('en');
  });

  it('does not reset linearActiveSlotIndex', () => {
    const kpdpStore = createInitialStore('kpdp', 'cs');
    const advanced = increment(increment(increment(kpdpStore)));
    expect(advanced.linearActiveSlotIndex).toBe(3);

    const store = reducer(advanced, { type: 'SET_LANGUAGE', payload: 'en' });

    expect(store.linearActiveSlotIndex).toBe(3);
  });
});

describe('classic mode shared prep time (prep-shared)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const prepShared = (store: StoreContent): TimeSlot => (
    store.prepTimes.find((slot) => slot.id === 'prep-shared')!
  );

  it('walks through first press, running, paused, and post-expiry press', () => {
    let store = createInitialStore('debatiada', 'cs');

    // first press: RESET_PREP_TIME then TOGGLE_ACTIVE_PREP_TIME -> fresh 1:00, running
    store = reducer(store, { type: 'RESET_PREP_TIME', payload: 'prep-shared' });
    store = reducer(store, { type: 'TOGGLE_ACTIVE_PREP_TIME', payload: 'prep-shared' });

    expect(prepShared(store).selected).toBe(true);
    expect(prepShared(store).paused).toBe(false);
    expect(prepShared(store).elapsed).toBe(0);
    expect(typeof prepShared(store).timeStartedDate).toBe('number');

    for (let i = 0; i < 3; i += 1) {
      store = tick(store, prepShared(store));
    }
    expect(prepShared(store).elapsed).toBe(3);

    // press while running: TOGGLE_ACTIVE_PREP_TIME only, no reset.
    // Note: toggleActivePrepTime's `toggleSelected` argument is unconditionally `true`, so
    // pausing also flips `selected` to false here (it isn't just a `paused` flip) -- this is
    // existing, pre-Debatiáda reducer behaviour (see the KPDP "TOGGLE_ACTIVE_PREP_TIME" test
    // above, which only asserts `paused` for the same reason).
    store = reducer(store, { type: 'TOGGLE_ACTIVE_PREP_TIME', payload: 'prep-shared' });

    expect(prepShared(store).selected).toBe(false);
    expect(prepShared(store).paused).toBe(true);
    expect(prepShared(store).elapsed).toBe(3);
    expect(prepShared(store).timeStartedDate).toBeNull();

    // press while paused: TOGGLE_ACTIVE_PREP_TIME only, resumes without reset
    store = reducer(store, { type: 'TOGGLE_ACTIVE_PREP_TIME', payload: 'prep-shared' });

    expect(prepShared(store).selected).toBe(true);
    expect(prepShared(store).paused).toBe(false);
    expect(prepShared(store).elapsed).toBe(3);
    expect(typeof prepShared(store).timeStartedDate).toBe('number');

    // pause it again before it expires, then let it run down to (and past) its total while paused
    store = reducer(store, { type: 'TOGGLE_ACTIVE_PREP_TIME', payload: 'prep-shared' });
    expect(prepShared(store).paused).toBe(true);
    expect(prepShared(store).total).toBe(60);

    // press after it hit 0 (paused, elapsed >= total): RESET_PREP_TIME then TOGGLE_ACTIVE_PREP_TIME
    // -> fresh 1:00, running (not just a resume of the stale/expired value)
    store = {
      ...store,
      prepTimes: store.prepTimes.map((slot) => (
        slot.id === 'prep-shared' ? { ...slot, elapsed: slot.total } : slot
      )),
    };
    expect(prepShared(store).elapsed >= prepShared(store).total).toBe(true);
    store = reducer(store, { type: 'RESET_PREP_TIME', payload: 'prep-shared' });
    store = reducer(store, { type: 'TOGGLE_ACTIVE_PREP_TIME', payload: 'prep-shared' });

    expect(prepShared(store).selected).toBe(true);
    expect(prepShared(store).paused).toBe(false);
    expect(prepShared(store).elapsed).toBe(0);
    expect(typeof prepShared(store).timeStartedDate).toBe('number');
  });
});
