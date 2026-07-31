import { getActiveLanguage } from '../languages';

describe('getActiveLanguage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('detects Czech from navigator.language = "cs-CZ"', () => {
    Object.defineProperty(window.navigator, 'language', {
      value: 'cs-CZ',
      configurable: true,
    });
    expect(getActiveLanguage()).toBe('cs');
  });

  it('detects English from navigator.language = "en-US"', () => {
    Object.defineProperty(window.navigator, 'language', {
      value: 'en-US',
      configurable: true,
    });
    expect(getActiveLanguage()).toBe('en');
  });

  it('defaults to English for unknown navigator.language = "de-DE"', () => {
    Object.defineProperty(window.navigator, 'language', {
      value: 'de-DE',
      configurable: true,
    });
    expect(getActiveLanguage()).toBe('en');
  });

  it('prefers stored value over navigator.language detection', () => {
    localStorage.setItem('activeLanguage', 'cs');
    Object.defineProperty(window.navigator, 'language', {
      value: 'en-US',
      configurable: true,
    });
    expect(getActiveLanguage()).toBe('cs');
  });
});
