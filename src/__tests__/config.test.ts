import { formatConfigs } from '../config';
import { Format } from '../formats';

const formats: Format[] = ['kpdp', 'debatiada'];

const isPrepId = (format: Format, id: string): boolean => (
  formatConfigs[format].prepTimes.some((slot) => slot.id === id)
);

const partyOfId = (format: Format, id: string): string => {
  const config = formatConfigs[format];
  const [affirmative, negative] = config.speakers;

  if (affirmative.some((slot) => slot.id === id)) {
    return 'affirmative';
  }
  if (negative.some((slot) => slot.id === id)) {
    return 'negative';
  }

  const prepIndex = config.prepTimes.findIndex((slot) => slot.id === id);
  if (prepIndex === -1) {
    throw new Error(`Unknown slot id: ${id}`);
  }
  return config.prepTimeParties[prepIndex];
};

describe.each(formats)('formatConfigs.%s', (format) => {
  const config = formatConfigs[format];
  const allIds = [
    ...config.speakers.flat().map((slot) => slot.id),
    ...config.prepTimes.map((slot) => slot.id),
  ];

  it('references only ids that exist in speakers or prepTimes', () => {
    const referencedIds = [
      ...config.linearOrder,
      ...config.overviewGroups.flat(2),
    ];

    referencedIds.forEach((id) => {
      expect(allIds).toContain(id);
    });
  });

  it('has globally unique ids across speakers and prepTimes', () => {
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('gives every prep slot in linearOrder the party of the slot that follows it', () => {
    config.linearOrder.forEach((id, index) => {
      if (isPrepId(format, id)) {
        const nextId = config.linearOrder[index + 1];
        expect(partyOfId(format, id)).toBe(partyOfId(format, nextId));
      }
    });
  });

  it('never starts or ends linearOrder with a prep slot', () => {
    expect(isPrepId(format, config.linearOrder[0])).toBe(false);
    expect(isPrepId(format, config.linearOrder[config.linearOrder.length - 1])).toBe(false);
  });
});

describe('linearOrder lengths', () => {
  it('KPDP has 19 slots', () => {
    expect(formatConfigs.kpdp.linearOrder.length).toBe(19);
  });

  it('Debatiáda has 17 slots', () => {
    expect(formatConfigs.debatiada.linearOrder.length).toBe(17);
  });
});

describe('Debatiáda timing totals', () => {
  it('speakers total 20 minutes across both parties', () => {
    const totalMinutes = formatConfigs.debatiada.speakers
      .flat()
      .reduce((sum, slot) => sum + slot.time, 0);

    expect(totalMinutes).toBe(20);
  });

  it('the 8 gap preps (excluding prep-shared) total 8 minutes', () => {
    const totalMinutes = formatConfigs.debatiada.prepTimes
      .filter((slot) => slot.id !== 'prep-shared')
      .reduce((sum, slot) => sum + slot.time, 0);

    expect(totalMinutes).toBe(8);
  });
});
