import { FormatConfig, TimeSlotConfig } from './types';
import getLocalisation from './localisation';
import { RadioOption } from './components/Radio';
import { getActiveThemeColourOption } from './themes';
import { getActiveMode } from './modes';
import { getActiveFormat, Format } from './formats';
import { autoValue } from './localStorage';

const localisation = getLocalisation('cs');

const activeThemeColour = getActiveThemeColourOption();
export const themes: RadioOption[] = [{
  label: localisation.themeColourAuto,
  value: autoValue,
}, {
  label: localisation.themeColourDark,
  value: 'dark',
}, {
  label: localisation.themeColourLight,
  value: 'light',
}].map((item) => ({
  ...item,
  active: item.value === activeThemeColour,
}));

const activeMode = getActiveMode();
export const modes: RadioOption[] = [{
  label: localisation.modeLinear,
  value: 'linear',
}, {
  label: localisation.modeClassic,
  value: 'classic',
}].map((item) => ({
  ...item,
  active: item.value === activeMode,
}));

const activeFormat = getActiveFormat();
export const formats: RadioOption[] = [{
  label: localisation.formatKpdp,
  value: 'kpdp',
}, {
  label: localisation.formatDebatiada,
  value: 'debatiada',
}].map((item) => ({
  ...item,
  active: item.value === activeFormat,
}));

const kpdpSpeechTimes: Record<string, number> = {
  constructive: 6,
  closing: 6,
  questions: 3,
};

const kpdpSpeakers: TimeSlotConfig[][] = [
  [{
    id: 'a1',
    label: 'A1',
    time: kpdpSpeechTimes.constructive,
  }, {
    id: 'a2',
    label: 'A2',
    time: kpdpSpeechTimes.constructive,
  }, {
    id: 'a3',
    label: 'A3',
    time: kpdpSpeechTimes.closing,
  }, {
    id: 'a3-n1',
    label: 'A3 ➝ N1',
    time: kpdpSpeechTimes.questions,
  }, {
    id: 'a1-n2',
    label: 'A1 ➝ N2',
    time: kpdpSpeechTimes.questions,
  }],
  [{
    id: 'n1',
    label: 'N1',
    time: kpdpSpeechTimes.constructive,
  }, {
    id: 'n2',
    label: 'N2',
    time: kpdpSpeechTimes.constructive,
  }, {
    id: 'n3',
    label: 'N3',
    time: kpdpSpeechTimes.closing,
  }, {
    id: 'n3-a1',
    label: 'N3 ➝ A1',
    time: kpdpSpeechTimes.questions,
  }, {
    id: 'n1-a2',
    label: 'N1 ➝ A2',
    time: kpdpSpeechTimes.questions,
  }],
];

const kpdpPrepTimes: TimeSlotConfig[] = [
  {
    id: 'prep-affirmative',
    label: localisation.affirmative,
    time: 5,
    labelSuffix: localisation.linearPrepTimeSuffix,
  }, {
    id: 'prep-negative',
    label: localisation.negative,
    time: 5,
    labelSuffix: localisation.linearPrepTimeSuffix,
  },
];

const debatiadaSpeakers: TimeSlotConfig[][] = [
  [{
    id: 'a1',
    label: 'A1',
    time: 3,
  }, {
    id: 'a2',
    label: 'A2',
    time: 4,
  }, {
    id: 'a1-closing',
    label: 'A1 závěr',
    time: 1,
  }, {
    id: 'a-n1',
    label: 'A ➝ N1',
    time: 1,
  }, {
    id: 'a-n2',
    label: 'A ➝ N2',
    time: 1,
  }],
  [{
    id: 'n1',
    label: 'N1',
    time: 4,
  }, {
    id: 'n2',
    label: 'N2',
    time: 4,
  }, {
    id: 'n-a1',
    label: 'N ➝ A1',
    time: 1,
  }, {
    id: 'n-a2',
    label: 'N ➝ A2',
    time: 1,
  }],
];

const debatiadaPrepTimes: TimeSlotConfig[] = [
  { id: 'prep-1', label: localisation.preptime, time: 1 },
  { id: 'prep-2', label: localisation.preptime, time: 1 },
  { id: 'prep-3', label: localisation.preptime, time: 1 },
  { id: 'prep-4', label: localisation.preptime, time: 1 },
  { id: 'prep-5', label: localisation.preptime, time: 1 },
  { id: 'prep-6', label: localisation.preptime, time: 1 },
  { id: 'prep-7', label: localisation.preptime, time: 1 },
  { id: 'prep-8', label: localisation.preptime, time: 1 },
  // classic-mode-only placeholder; not part of linearOrder, semantics decided in a later step
  { id: 'prep-shared', label: localisation.preptime, time: 1 },
];

export const formatConfigs: Record<Format, FormatConfig> = {
  kpdp: {
    speakers: kpdpSpeakers,
    prepTimes: kpdpPrepTimes,
    prepTimeParties: ['affirmative', 'negative'],
    linearOrder: [
      'a1', 'prep-negative', 'n3-a1', 'prep-negative',
      'n1', 'prep-affirmative', 'a3-n1', 'prep-affirmative',
      'a2', 'prep-negative', 'n1-a2', 'prep-negative',
      'n2', 'prep-affirmative', 'a1-n2', 'prep-affirmative',
      'a3', 'prep-negative', 'n3',
    ],
    overviewGroups: [
      [['a1', 'n3-a1'], ['a2', 'n1-a2'], ['a3']],
      [['n1', 'a3-n1'], ['n2', 'a1-n2'], ['n3']],
    ],
  },
  debatiada: {
    speakers: debatiadaSpeakers,
    prepTimes: debatiadaPrepTimes,
    prepTimeParties: [
      'negative', 'negative', 'affirmative', 'affirmative',
      'negative', 'negative', 'affirmative', 'affirmative',
      'affirmative',
    ],
    linearOrder: [
      'a1', 'prep-1', 'n-a1', 'prep-2',
      'n1', 'prep-3', 'a-n1', 'prep-4',
      'a2', 'prep-5', 'n-a2', 'prep-6',
      'n2', 'prep-7', 'a-n2', 'prep-8',
      'a1-closing',
    ],
    overviewGroups: [
      [['a1', 'n-a1'], ['a2', 'n-a2'], ['a1-closing']],
      [['n1', 'a-n1'], ['n2', 'a-n2']],
    ],
  },
};

// Kept for existing call sites (e.g. store/initialStore.ts) that build KPDP-only state
// directly. Single source of truth remains formatConfigs.kpdp.
const { speakers, prepTimes } = formatConfigs.kpdp;
export { speakers, prepTimes };
