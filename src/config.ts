import { TimeSlotConfig } from './types';
import localisation from './localisation';
import { RadioOption } from './components/Radio';
import { getActiveThemeColourOption } from './themes';
import { getActiveMode } from './modes';
import { autoValue } from './localStorage';

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

const speechTimes: Record<string, number> = {
  constructive: 6,
  closing: 6,
  questions: 3,
};

export const speakers: TimeSlotConfig[][] = [
  [{
    id: 'a1',
    label: 'A1',
    time: speechTimes.constructive,
  }, {
    id: 'a2',
    label: 'A2',
    time: speechTimes.constructive,
  }, {
    id: 'a3',
    label: 'A3',
    time: speechTimes.closing,
  }, {
    id: 'a3-n1',
    label: 'A3 ➝ N1',
    time: speechTimes.questions,
  }, {
    id: 'a1-n2',
    label: 'A1 ➝ N2',
    time: speechTimes.questions,
  }],
  [{
    id: 'n1',
    label: 'N1',
    time: speechTimes.constructive,
  }, {
    id: 'n2',
    label: 'N2',
    time: speechTimes.constructive,
  }, {
    id: 'n3',
    label: 'N3',
    time: speechTimes.closing,
  }, {
    id: 'n3-a1',
    label: 'N3 ➝ A1',
    time: speechTimes.questions,
  }, {
    id: 'n1-a2',
    label: 'N1 ➝ A2',
    time: speechTimes.questions,
  }],
];

export const prepTimes: TimeSlotConfig[] = [
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
