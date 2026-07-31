import { FunctionalComponent, h } from 'preact';
import { useContext } from 'preact/hooks';
import { Context } from '../../../store';
import { Dispatch } from '../../../store/types';
import { getSelectedPrepTime, getSelectedSpeaker } from '../../../store/getters';
import Button from '../../Button';
import localisation from '../../../localisation';

const toggleActivePrepTime = (dispatch: Dispatch, id: string) => {
  dispatch({
    type: 'TOGGLE_ACTIVE_PREP_TIME',
    payload: id,
  });
};

const PrepTime: FunctionalComponent = () => {
  const { store, dispatch } = useContext(Context);
  const selectedSpeaker = getSelectedSpeaker(store);
  const selectedPrepTime = getSelectedPrepTime(store);

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
