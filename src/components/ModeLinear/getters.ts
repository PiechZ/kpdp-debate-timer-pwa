// Resolve the active format's linearOrder / overviewGroups against the store's current slots
import { StoreContent } from '../../store/types';
import { getActiveStoreFormat } from '../../store/getters';
import { TimeSlot } from '../../types';
import { formatConfigs } from '../../config';

// Find a slot (speaker or prep time) by id anywhere in the store
const findSlot = (store: StoreContent, id: string): TimeSlot => (
  store.speakers.flat().find((s) => s.id === id)
  ?? store.prepTimes.find((s) => s.id === id)!
);

// Convert classic speakers data to order for linear mode overview
export const getLinearSpeakersData = (store: StoreContent): TimeSlot[][][] => {
  const format = getActiveStoreFormat(store);
  const { overviewGroups } = formatConfigs[format];

  return overviewGroups.map(
    (party) => party.map(
      (row) => row.map((id) => findSlot(store, id)),
    ),
  );
};

// Get all time slots for linear mode carousel, including prep times
export const getLinearTimeSlots = (store: StoreContent): TimeSlot[] => {
  const format = getActiveStoreFormat(store);
  const { linearOrder } = formatConfigs[format];

  return linearOrder.map((id) => findSlot(store, id));
};

export const getLinearActiveSlotIndex = (
  store: StoreContent,
): number => store.linearActiveSlotIndex;
