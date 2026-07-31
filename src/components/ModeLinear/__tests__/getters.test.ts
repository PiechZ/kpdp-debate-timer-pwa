import { getCurrentGapPrepTime, getLinearSpeakersData, getLinearTimeSlots } from '../getters';
import initialStore, { createInitialStore } from '../../../store/initialStore';
import { TimeSlot } from '../../../types';

const labelsOf = (slots: TimeSlot[]) => slots.map((slot) => slot.label);

describe('getLinearTimeSlots', () => {
  const slots = getLinearTimeSlots(initialStore);

  it('returns the 19 KPDP carousel cards in the expected order', () => {
    expect(labelsOf(slots)).toEqual([
      'A1',
      'Negace',
      'N3 ➝ A1',
      'Negace',
      'N1',
      'Afirmace',
      'A3 ➝ N1',
      'Afirmace',
      'A2',
      'Negace',
      'N1 ➝ A2',
      'Negace',
      'N2',
      'Afirmace',
      'A1 ➝ N2',
      'Afirmace',
      'A3',
      'Negace',
      'N3',
    ]);
  });

  it('gives every prep slot the party of the slot that follows it', () => {
    slots.forEach((slot, index) => {
      if (slot.type === 'prepTime') {
        expect(slot.party).toBe(slots[index + 1].party);
      }
    });
  });
});

describe('getLinearSpeakersData', () => {
  it('groups each party speakers with their opposing questioners', () => {
    const data = getLinearSpeakersData(initialStore);
    const labelsData = data.map((party) => party.map((group) => labelsOf(group)));

    expect(labelsData).toEqual([
      [['A1', 'N3 ➝ A1'], ['A2', 'N1 ➝ A2'], ['A3']],
      [['N1', 'A3 ➝ N1'], ['N2', 'A1 ➝ N2'], ['N3']],
    ]);
  });
});

describe('getCurrentGapPrepTime', () => {
  it('KPDP: returns the active slot itself when it is a prep slot', () => {
    const store = {
      ...createInitialStore('kpdp'),
      linearActiveSlotIndex: 1, // prep-negative, after a1
    };

    expect(getCurrentGapPrepTime(store).id).toBe('prep-negative');
  });

  it('KPDP: returns the next prep slot when the active slot is a speaker', () => {
    const store = {
      ...createInitialStore('kpdp'),
      linearActiveSlotIndex: 4, // n1, next prep is prep-affirmative at index 5
    };

    expect(getCurrentGapPrepTime(store).id).toBe('prep-affirmative');
  });

  it('KPDP: returns the last prep slot once on the final card', () => {
    const store = {
      ...createInitialStore('kpdp'),
      linearActiveSlotIndex: 18, // n3, the last card, no prep ahead
    };

    expect(getCurrentGapPrepTime(store).id).toBe('prep-negative');
  });

  it('Debatiáda: returns the active slot itself when it is a prep slot', () => {
    const store = {
      ...createInitialStore('debatiada'),
      linearActiveSlotIndex: 1, // prep-1, after a1
    };

    expect(getCurrentGapPrepTime(store).id).toBe('prep-1');
  });

  it('Debatiáda: returns the next prep slot when the active slot is a speaker', () => {
    const store = {
      ...createInitialStore('debatiada'),
      linearActiveSlotIndex: 4, // n1, next prep is prep-3 at index 5
    };

    expect(getCurrentGapPrepTime(store).id).toBe('prep-3');
  });

  it('Debatiáda: returns the last prep slot (prep-8) once on the final a1-closing card', () => {
    const store = {
      ...createInitialStore('debatiada'),
      linearActiveSlotIndex: 16, // a1-closing, the last card, no prep ahead
    };

    expect(getCurrentGapPrepTime(store).id).toBe('prep-8');
  });
});
