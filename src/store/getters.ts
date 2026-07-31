import { StoreContent } from './types';
import { TimeSlot } from '../types';
import { Mode } from '../modes';
import { Format } from '../formats';
import { Language } from '../languages';

// Get active mode from store
export const getActiveStoreMode = (store: StoreContent): Mode => <Mode>(
  store.modes.find((item) => item.active)!.value
);

// Get active format from store
export const getActiveStoreFormat = (store: StoreContent): Format => <Format>(
  store.formats.find((item) => item.active)!.value
);

// Get active language from store
export const getActiveStoreLanguage = (store: StoreContent): Language => <Language>(
  store.languages.find((item) => item.active)!.value
);

// Filter selected time slots
const filterSelectedTimeSlot = (slots: TimeSlot[]): TimeSlot | undefined => (
  slots.find((slot) => slot.selected)
);

export const getSelectedSpeaker = (
  store: StoreContent,
): TimeSlot | undefined => filterSelectedTimeSlot(store.speakers.flat());

export const getSelectedPrepTime = (
  store: StoreContent,
): TimeSlot | undefined => filterSelectedTimeSlot(store.prepTimes);

export const getSelectedTimeSlot = (
  store: StoreContent,
): TimeSlot | undefined => getSelectedPrepTime(store) ?? getSelectedSpeaker(store);

// Filter running time slots
const filterRunningTimeSlot = (slots: TimeSlot[]): TimeSlot | undefined => [
  filterSelectedTimeSlot(slots),
].find((slot) => slot && !slot.paused);

export const getRunningSpeaker = (
  store: StoreContent,
): TimeSlot | undefined => filterRunningTimeSlot(store.speakers.flat());

export const getRunningPrepTime = (
  store: StoreContent,
): TimeSlot | undefined => filterRunningTimeSlot(store.prepTimes);

export const getRunningTimeSlot = (
  store: StoreContent,
): TimeSlot | undefined => getRunningPrepTime(store) ?? getRunningSpeaker(store);

export const timerOrPrepTimeRunning = (store: StoreContent): boolean => (
  !!getRunningPrepTime(store) || !!getRunningSpeaker(store)
);

// Whether any slot (speaker or prep time) has accumulated elapsed time
export const hasElapsedTime = (store: StoreContent): boolean => (
  store.speakers.flat().some((slot) => slot.elapsed > 0)
  || store.prepTimes.some((slot) => slot.elapsed > 0)
);
