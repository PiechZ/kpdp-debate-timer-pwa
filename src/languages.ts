import { getActiveOption } from './localStorage';

export type Language = 'cs' | 'en';

const detectDefaultLanguage = (): Language => (
  (typeof window !== 'undefined' && window.navigator && window.navigator.language
    && window.navigator.language.toLowerCase().startsWith('cs'))
    ? 'cs' : 'en'
);

export const getActiveLanguage = (): Language => <Language>getActiveOption('language', detectDefaultLanguage());
