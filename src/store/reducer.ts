import { StoreAction, StoreContent } from './types';
import {
  Screen, screens, TimeSlot, TimeSlotConfig,
} from '../types';
import { createInitialStore } from './initialStore';
import { activateThemeColour } from '../themes';
import { setActiveOption } from '../localStorage';
import { getLinearTimeSlots } from '../components/ModeLinear/getters';
import { getActiveStoreFormat, getActiveStoreLanguage } from './getters';
import { Format } from '../formats';
import { Language } from '../languages';
import {
  getFormatConfigs, buildThemeOptions, buildModeOptions, buildFormatOptions, buildLanguageOptions,
} from '../config';
import getLocalisation from '../localisation';

const setScreen = (
  store: StoreContent,
  { screen, pushHistory = true }: {
    screen: string,
    pushHistory: boolean,
  },
): StoreContent => {
  // screenSafe will include only valid type Screen
  let screenSafe: string = screen;
  if (!screens.includes(<Screen>screenSafe)) {
    [screenSafe] = screens;
  }

  if (pushHistory) {
    window.history.pushState(screenSafe, document.title, `/${screenSafe}`);
  }

  return {
    ...store,
    screen: screenSafe as Screen,
  };
};

const setTheme = (store: StoreContent, value: string): StoreContent => {
  setActiveOption('theme', value);
  activateThemeColour();
  return {
    ...store,
    themes: store.themes.map((item) => ({
      ...item,
      active: item.value === value,
    })),
  };
};

const setMode = (store: StoreContent, value: string): StoreContent => {
  setActiveOption('mode', value);
  return {
    ...store,
    modes: store.modes.map((item) => ({
      ...item,
      active: item.value === value,
    })),
  };
};

const setFormat = (store: StoreContent, value: string): StoreContent => {
  setActiveOption('format', value);
  const fresh = createInitialStore(value as Format, getActiveStoreLanguage(store));
  return {
    ...store,
    formats: store.formats.map((item) => ({
      ...item,
      active: item.value === value,
    })),
    speakers: fresh.speakers,
    prepTimes: fresh.prepTimes,
    linearActiveSlotIndex: fresh.linearActiveSlotIndex,
    pendingFormat: null,
  };
};

const setPendingFormat = (store: StoreContent, value: string | null): StoreContent => ({
  ...store,
  pendingFormat: value,
});

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

const toggleActiveTimeSlot = (
  slot: TimeSlot,
  active: boolean = slot.selected && slot.paused,
  toggleSelected: boolean = false,
  running: boolean = true,
) => ({
  ...slot,
  selected: toggleSelected ? active : slot.selected,
  paused: !active || !running,
  timeStartedDate: active && running ? Date.now() : null,
});

const incrementLinearActiveSlotIndex = (store: StoreContent): StoreContent => {
  const linearSlots: TimeSlot[] = getLinearTimeSlots(store);
  const currentSlot: TimeSlot | null = linearSlots[store.linearActiveSlotIndex];
  const nextSlot: TimeSlot | null = linearSlots[store.linearActiveSlotIndex + 1] ?? null;

  const slotShouldBeActive = (slot: TimeSlot) => nextSlot && slot.id === nextSlot.id;

  return {
    ...store,
    speakers: store.speakers.map((party) => party.map(
      (slot) => toggleActiveTimeSlot(slot, slotShouldBeActive(slot), !!nextSlot, currentSlot.type !== 'prepTime'),
    )),
    prepTimes: store.prepTimes.map((slot) => toggleActiveTimeSlot(
      slot, slotShouldBeActive(slot), !!nextSlot,
    )),
    linearActiveSlotIndex: store.linearActiveSlotIndex + (nextSlot ? 1 : 0),
  };
};

const decrementLinearActiveSlotIndex = (store: StoreContent): StoreContent => {
  const prevIndex = store.linearActiveSlotIndex - 1;
  if (prevIndex < 0) return store;

  const linearSlots: TimeSlot[] = getLinearTimeSlots(store);
  const prevSlot: TimeSlot = linearSlots[prevIndex];

  const slotShouldBeActive = (slot: TimeSlot) => slot.id === prevSlot.id;

  return {
    ...store,
    speakers: store.speakers.map((party) => party.map(
      (slot) => toggleActiveTimeSlot(slot, slotShouldBeActive(slot), true, false),
    )),
    prepTimes: store.prepTimes.map((slot) => toggleActiveTimeSlot(
      slot, slotShouldBeActive(slot), true, false,
    )),
    linearActiveSlotIndex: prevIndex,
  };
};

const setSelectedSpeaker = (store: StoreContent, id: string): StoreContent => ({
  ...store,
  speakers: store.speakers.map((party) => party.map(
    (item) => ({
      ...item,
      selected: item.id === id,
    }),
  )),
});

const toggleActivePrepTime = (store: StoreContent, id: string): StoreContent => ({
  ...store,
  prepTimes: store.prepTimes.map(
    (time) => toggleActiveTimeSlot(
      time,
      time.id === id && (!time.selected || time.paused),
      true,
    ),
  ),
});

const getNewTimestartedDate = (
  time: TimeSlot,
) => (time.timeStartedDate ? time.timeStartedDate + 1000 : Date.now());

const tickItem = (item: TimeSlot, activeSlot: TimeSlot): TimeSlot => {
  const isActive = activeSlot.id === item.id;
  return {
    ...item,
    elapsed: isActive ? item.elapsed + 1 : item.elapsed,
    timeStartedDate: isActive ? getNewTimestartedDate(item) : null,
  };
};
const timeslotTick = (store: StoreContent, slot: TimeSlot): StoreContent => ({
  ...store,
  prepTimes: store.prepTimes.map((item) => tickItem(item, slot)),
  speakers: store.speakers.map((party) => party.map((item) => tickItem(item, slot))),
});

const reset = (store: StoreContent): StoreContent => {
  const fresh = createInitialStore(getActiveStoreFormat(store), getActiveStoreLanguage(store));
  return {
    ...store,
    speakers: fresh.speakers,
    prepTimes: fresh.prepTimes,
    linearActiveSlotIndex: fresh.linearActiveSlotIndex,
  };
};

const resetPrepTime = (store: StoreContent, id: string): StoreContent => ({
  ...store,
  prepTimes: store.prepTimes.map((slot) => (
    slot.id === id ? { ...slot, elapsed: 0, timeStartedDate: null } : slot
  )),
});

const toggleResetDialog = (store: StoreContent, visible: boolean): StoreContent => ({
  ...store,
  resetDialogVisible: visible,
});

const togglePausedTimer = (store: StoreContent): StoreContent => ({
  ...store,
  speakers: store.speakers.map((party) => party.map(
    (slot) => toggleActiveTimeSlot(slot),
  )),
  prepTimes: store.prepTimes.map((slot) => toggleActiveTimeSlot(slot)),
});

const hideFeatureDiscovery = (store: StoreContent): StoreContent => {
  setActiveOption('featureDiscoveryHidden', 'true');
  return {
    ...store,
    featureDiscoveryVisible: false,
  };
};

const reducer = (store: StoreContent, action: StoreAction): StoreContent => {
  switch (action.type) {
    case 'SET_SCREEN':
      return setScreen(store, typeof action.payload !== 'string' ? action.payload : {
        screen: action.payload,
        pushHistory: true,
      });
    case 'SET_THEME':
      return setTheme(store, action.payload);
    case 'SET_MODE':
      return setMode(store, action.payload);
    case 'SET_FORMAT':
      return setFormat(store, action.payload);
    case 'SET_PENDING_FORMAT':
      return setPendingFormat(store, action.payload);
    case 'SET_LANGUAGE':
      return setLanguage(store, action.payload);
    case 'INCREMENT_LINEAR_ACTIVE_SLOT_INDEX':
      return incrementLinearActiveSlotIndex(store);
    case 'DECREMENT_LINEAR_ACTIVE_SLOT_INDEX':
      return decrementLinearActiveSlotIndex(store);
    case 'SET_SELECTED_SPEAKER':
      return setSelectedSpeaker(store, action.payload);
    case 'TOGGLE_ACTIVE_PREP_TIME':
      return toggleActivePrepTime(store, action.payload);
    case 'TIMESLOT_TICK':
      return timeslotTick(store, action.payload);
    case 'RESET':
      return reset(store);
    case 'RESET_PREP_TIME':
      return resetPrepTime(store, action.payload);
    case 'TOGGLE_RESET_DIALOG':
      return toggleResetDialog(store, action.payload);
    case 'TOGGLE_PAUSED_TIMER':
      return togglePausedTimer(store);
    case 'HIDE_FEATURE_DISCOVERY':
      return hideFeatureDiscovery(store);
    default:
      return store;
  }
};

export default reducer;
