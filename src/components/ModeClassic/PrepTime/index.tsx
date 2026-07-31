import { FunctionalComponent, h } from 'preact';
import { useContext } from 'preact/hooks';
import { Context } from '../../../store';
import { Dispatch } from '../../../store/types';
import { TimeSlot } from '../../../types';
import { getActiveStoreFormat, getSelectedPrepTime, getSelectedSpeaker } from '../../../store/getters';
import Button from '../../Button';
import localisation from '../../../localisation';

const toggleActivePrepTime = (dispatch: Dispatch, id: string) => {
  dispatch({
    type: 'TOGGLE_ACTIVE_PREP_TIME',
    payload: id,
  });
};

const activateSharedPrepTime = (dispatch: Dispatch, prepShared: TimeSlot) => {
  // toggleActivePrepTime always deselects the slot when it pauses it (its `toggleSelected`
  // argument is unconditionally `true`), so `!prepShared.selected` is also true right after a
  // plain pause — not only before the very first press. Gate the reset on "not currently
  // running" as well, so a resume (paused, 0 < elapsed < total) never gets a spurious reset.
  const isRunning = prepShared.selected && !prepShared.paused;
  const needsFreshStart = prepShared.elapsed === 0 || prepShared.elapsed >= prepShared.total;

  if (!isRunning && needsFreshStart) {
    dispatch({
      type: 'RESET_PREP_TIME',
      payload: prepShared.id,
    });
  }
  toggleActivePrepTime(dispatch, prepShared.id);
};

const PrepTime: FunctionalComponent = () => {
  const { store, dispatch } = useContext(Context);
  const selectedSpeaker = getSelectedSpeaker(store);
  const selectedPrepTime = getSelectedPrepTime(store);

  if (getActiveStoreFormat(store) === 'debatiada') {
    const prepShared = store.prepTimes.find((time) => time.id === 'prep-shared')!;

    return (
      <section className="preptime">
        <h2 className="preptime__heading">{localisation.preptime}</h2>
        <Button
          title={localisation.preptime}
          className="preptime__button"
          time={prepShared}
          active={prepShared.selected && !prepShared.paused}
          inverse
          disabled={!selectedSpeaker?.paused}
          party={prepShared.party}
          display="remaining"
          onClick={() => activateSharedPrepTime(dispatch, prepShared)}
        />
      </section>
    );
  }

  return (
    <section className="preptime">
      <h2 className="preptime__heading">{localisation.preptime}</h2>
      {
        store.prepTimes.map((time) => (
          <Button
            title={time.label}
            className="preptime__button"
            time={time}
            active={time.selected && !time.paused}
            inverse
            disabled={(selectedPrepTime && selectedPrepTime !== time) || !selectedSpeaker?.paused}
            party={time.party}
            display="remaining"
            onClick={() => toggleActivePrepTime(dispatch, time.id)}
          />
        ))
      }
    </section>
  );
};

export default PrepTime;
