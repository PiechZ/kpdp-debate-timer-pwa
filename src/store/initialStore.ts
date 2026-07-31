import { StoreContent } from './types';
import {
  getFormatConfigs, formats, languages, modes, themes,
} from '../config';
import { Screen } from '../types';
import { getActiveOption } from '../localStorage';
import { Format, getActiveFormat } from '../formats';
import { Language, getActiveLanguage } from '../languages';

export const createInitialStore = (format: Format, language: Language): StoreContent => {
  const { speakers, prepTimes, prepTimeParties } = getFormatConfigs(language)[format];

  return {
    screen: 'timer' as Screen,
    themes,
    modes,
    formats: formats.map((item) => ({ ...item, active: item.value === format })),
    languages: languages.map((item) => ({ ...item, active: item.value === language })),
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

export default createInitialStore(getActiveFormat(), getActiveLanguage());
