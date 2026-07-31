import { getLinearSpeakersData, getLinearTimeSlots } from '../getters';
import initialStore from '../../../store/initialStore';
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
