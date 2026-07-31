import { FunctionalComponent, h } from 'preact';
import { useContext } from 'preact/hooks';
import { Context } from '../../store';
import { StoreContent, Dispatch, StoreActionType } from '../../store/types';
import { getActiveStoreFormat, hasElapsedTime } from '../../store/getters';
import Navbar from '../../components/Navbar';
import Radio from '../../components/Radio';
import About from '../../components/About';
import Dialog from '../../components/Dialog';
import getLocalisation from '../../localisation';

const setActiveOption = (newValue: string, dispatch: Dispatch, type: StoreActionType): void => {
  dispatch({
    type,
    payload: newValue,
  });
};

const requestFormatChange = (newValue: string, store: StoreContent, dispatch: Dispatch): void => {
  if (newValue === getActiveStoreFormat(store)) {
    return;
  }

  if (!hasElapsedTime(store)) {
    dispatch({
      type: 'SET_FORMAT',
      payload: newValue,
    });
    return;
  }

  dispatch({
    type: 'SET_PENDING_FORMAT',
    payload: newValue,
  });
};

const Settings: FunctionalComponent = () => {
  const { store, dispatch } = useContext(Context);

  return (
    <main className="screen screen--settings">
      <Navbar />
      <Radio
        label={`${getLocalisation().language}:`}
        options={store.languages}
        onChange={(newValue) => setActiveOption(newValue, dispatch, 'SET_LANGUAGE')}
      />
      <Radio
        label={`${getLocalisation().themeColour}:`}
        options={store.themes}
        onChange={(newValue) => setActiveOption(newValue, dispatch, 'SET_THEME')}
      />
      <Radio
        label={`${getLocalisation().format}:`}
        options={store.formats}
        onChange={(newValue) => requestFormatChange(newValue, store, dispatch)}
      />
      <Radio
        label={`${getLocalisation().mode}:`}
        options={store.modes}
        onChange={(newValue) => setActiveOption(newValue, dispatch, 'SET_MODE')}
      />
      <About />
      {store.pendingFormat !== null && (
        <Dialog
          cancel={{
            title: getLocalisation().cancel,
          }}
          confirm={{
            title: getLocalisation().ok,
            onClick: () => dispatch({
              type: 'SET_FORMAT',
              payload: store.pendingFormat,
            }),
          }}
          setVisible={(visible: boolean) => dispatch({
            type: 'SET_PENDING_FORMAT',
            payload: visible ? store.pendingFormat : null,
          })}
        >
          <p>
            {getLocalisation().formatChangeConfirm}
          </p>
        </Dialog>
      )}
    </main>
  );
};

export default Settings;
