import { FunctionalComponent, h } from 'preact';
import { useState } from 'preact/hooks';
import getLocalisation from '../../localisation';
import Dialog from '../Dialog';
import SafariOpenMenu from '../Icons/SafariOpenMenu';
import SafariAddToHomescreen from '../Icons/SafariAddToHomescreen';

const promptVisibleLocalStorageKey = 'PWAPromptIOSVisible';

const isAppleDevice = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const isIOS = /iphone|ipad|ipod/.test(
    window.navigator.userAgent.toLowerCase(),
  );
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

  return isIOS || isIPadOS;
};

const isOpenAsApp = (): boolean => typeof window !== 'undefined' && 'standalone' in window.navigator && (window.navigator as Record<string, never>).standalone;

const PWAPromptIOS: FunctionalComponent = () => {
  if (!isAppleDevice() || isOpenAsApp()) {
    return null;
  }

  const visibilityStoredValue = typeof window !== 'undefined' ? localStorage.getItem(promptVisibleLocalStorageKey) : 'true';
  const visibleByDefault = visibilityStoredValue !== 'false';

  const [promptVisible, setPromptVisible] = useState<boolean>(visibleByDefault);

  if (!promptVisible) {
    return null;
  }

  const t = getLocalisation();

  return (
    <Dialog
      cancel={{
        title: t.close,
      }}
      setVisible={() => {
        setPromptVisible(false);
        if (typeof window !== 'undefined') {
          localStorage.setItem(promptVisibleLocalStorageKey, 'false');
        }
      }}
    >
      <h3>{t.pwaPromptIOSTitle}</h3>
      <p className="pwa-prompt__paragraph">
        {t.pwaPromptIOSParagraph}
      </p>
      <ol className="pwa-prompt__list">
        <li className="pwa-prompt__list-item">
          {t.pwaPromptIOSOpenMenu}
          <span className="pwa-prompt__icon"><SafariOpenMenu /></span>
        </li>
        <li className="pwa-prompt__list-item">
          {t.pwaPromptIOSAddToHomescreen}
          <span className="pwa-prompt__icon"><SafariAddToHomescreen /></span>
        </li>
        <li className="pwa-prompt__list-item">
          {t.pwaPromptIOSDone}
        </li>
      </ol>
    </Dialog>
  );
};

export default PWAPromptIOS;
