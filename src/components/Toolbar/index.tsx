import { FunctionalComponent, h } from 'preact';
import { useContext } from 'preact/hooks';
import { Context } from '../../store';
import ToolbarButton from './ToolbarButton';
import { timerOrPrepTimeRunning } from '../../store/getters';
import getLocalisation from '../../localisation';

const Toolbar: FunctionalComponent = () => {
  const { store, dispatch } = useContext(Context);
  const timeRunning = timerOrPrepTimeRunning(store);

  return (
    <nav className="toolbar">
      <ToolbarButton
        title={getLocalisation().reset}
        icon="reset"
        disabled={timeRunning}
        onClick={() => {
          dispatch({
            type: 'TOGGLE_RESET_DIALOG',
            payload: true,
          });
        }}
      />
      <ToolbarButton
        title={getLocalisation().settings}
        icon="settings"
        disabled={timeRunning}
        onClick={() => {
          /*
          dispatch({
            type: 'HIDE_FEATURE_DISCOVERY',
            payload: null,
          });
           */
          dispatch({
            type: 'SET_SCREEN',
            payload: 'settings',
          });
        }}
      />
    </nav>
  );
};

export default Toolbar;
