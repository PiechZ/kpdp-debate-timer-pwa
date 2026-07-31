type StorageKey = 'theme' | 'mode' | 'format' | 'featureDiscoveryHidden' | 'language';

const localStorageKeys: Record<StorageKey, string> = {
  mode: 'activeMode',
  format: 'activeFormat',
  theme: 'themeColour',
  featureDiscoveryHidden: 'featureDiscoveryHidden',
  language: 'activeLanguage',
};

export const autoValue = 'auto';

const getLocalStorageIndex = (key: StorageKey): string => localStorageKeys[key];

export const getActiveOption = (key: StorageKey, defaultValue: string = autoValue): string => {
  const storedValue = typeof window !== 'undefined' ? localStorage.getItem(getLocalStorageIndex(key)) : null;
  if (storedValue !== null && storedValue !== autoValue) {
    return storedValue;
  }
  return defaultValue;
};

export const setActiveOption = (key: StorageKey, value: string) => {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(getLocalStorageIndex(key), value);
};
