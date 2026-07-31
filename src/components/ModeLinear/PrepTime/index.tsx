import { FunctionalComponent, h } from 'preact';
import { useContext } from 'preact/hooks';
import { Context } from '../../../store';
import { Dispatch } from '../../../store/types';
import { getActiveStoreFormat, getSelectedTimeSlot } from '../../../store/getters';
import { getCurrentGapPrepTime } from '../getters';
import Button from '../../Button';
import Time from '../../Time';
import Pause from '../../Icons/Pause';
import Play from '../../Icons/Play';

const togglePausedTimer = (dispatch: Dispatch) => {
  dispatch({
    type: 'TOGGLE_PAUSED_TIMER',
    payload: null,
  });
};

const PrepTime: FunctionalComponent = () => {
  const { store, dispatch } = useContext(Context);
  const format = getActiveStoreFormat(store);
  const activeTimeSlot = getSelectedTimeSlot(store);
  const gapPrepTime = getCurrentGapPrepTime(store);

  return (
    <section className="preptime preptime--linear">
      {
        format === 'debatiada'
          ? (
            <span className={`preptime__button preptime__button--linear preptime__button--single preptime__button--${gapPrepTime.party}`}>
              <Time time={gapPrepTime} display="remaining" />
            </span>
          )
          : store.prepTimes.map((time) => (
            <span className={`preptime__button preptime__button--linear preptime__button--${time.party}`}>
              <Time time={time} display="remaining" />
            </span>
          ))
      }
      <Button
        className={`preptime__toggle-paused-button preptime__toggle-paused-button--${activeTimeSlot?.party}`}
        icon={activeTimeSlot?.paused ? Play : Pause}
        active
        onClick={() => togglePausedTimer(dispatch)}
      />
    </section>
  );
};

export default PrepTime;
