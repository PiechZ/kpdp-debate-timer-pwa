import getLocalisation from '../localisation';

describe('getLocalisation', () => {
  it('has identical keys across Czech and English translations', () => {
    const csKeys = Object.keys(getLocalisation('cs')).sort();
    const enKeys = Object.keys(getLocalisation('en')).sort();
    expect(csKeys).toEqual(enKeys);
  });

  it('provides correct translations for title', () => {
    expect(getLocalisation('cs').title).toBe('Debatní stopky');
    expect(getLocalisation('en').title).toBe('Debate Timer');
  });

  it('keeps language names in their native form regardless of active language', () => {
    expect(getLocalisation('cs').languageCs).toBe('Čeština');
    expect(getLocalisation('cs').languageEn).toBe('English');
    expect(getLocalisation('en').languageCs).toBe('Čeština');
    expect(getLocalisation('en').languageEn).toBe('English');
    expect(getLocalisation('cs').languageCs).toBe(getLocalisation('en').languageCs);
    expect(getLocalisation('cs').languageEn).toBe(getLocalisation('en').languageEn);
  });
});
