import { StoreContent } from './types';
import {
  formatConfigs, formats, modes, themes,
} from '../config';
import { Screen } from '../types';
import { getActiveOption } from '../localStorage';
import { Format, getActiveFormat } from '../formats';

export const createInitialStore = (format: Format): StoreContent => {
  const { speakers, prepTimes, prepTimeParties } = formatConfigs[format];

  return {
    screen: 'timer' as Screen,
    themes,
    modes,
    formats: formats.map((item) => ({ ...item, active: item.value === format })),
    speakers: speakers.map(
      (party, partyIndex) => party.map(
        (speaker, speakerIndex) => ({
          ...speaker,
          party: partyIndex === 0 ? 'affirmative' : 'negative',
          type: 'speaker',
          paused: true,
          selected: speakerIndex === 0 && partyIndex === speakerIndex,
          total: speaker.time * 60,
          elapsed: 0,
          timeStartedDate: null,
        }),
      ),
    ),
    prepTimes: prepTimes.map((item, itemIndex) => ({
      ...item,
      party: prepTimeParties[itemIndex],
      type: 'prepTime',
      selected: false,
      paused: true,
      total: item.time * 60,
      elapsed: 0,
      timeStartedDate: null,
    })),
    resetDialogVisible: false,
    linearActiveSlotIndex: 0,
    featureDiscoveryVisible: getActiveOption('featureDiscoveryHidden', 'false') === 'false',
    pendingFormat: null,
  } as StoreContent;
};

export default createInitialStore(getActiveFormat());
