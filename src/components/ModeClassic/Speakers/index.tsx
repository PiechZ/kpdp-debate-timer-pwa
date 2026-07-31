import { FunctionalComponent, h } from 'preact';
import { useContext } from 'preact/hooks';
import { Context } from '../../../store';
import { Dispatch } from '../../../store/types';
import { timerOrPrepTimeRunning } from '../../../store/getters';
import Button from '../../Button';

const setSelectedSpeaker = (dispatch: Dispatch, id: string) => {
  dispatch({
    type: 'SET_SELECTED_SPEAKER',
    payload: id,
  });
};

const Speakers: FunctionalComponent = () => {
  const { store, dispatch } = useContext(Context);
  const timeRunning = timerOrPrepTimeRunning(store);

  return (
    <section className="speakers">
      {
        store.speakers.map((party) => (
          <section className="speakers__column">
            {
              party.map((speaker) => (
                <Button
                  title={speaker.label}
                  className="speakers__button"
                  active={speaker.selected}
                  disabled={timeRunning}
                  party={speaker.party}
                  time={speaker}
                  onClick={() => setSelectedSpeaker(dispatch, speaker.id)}
                />
              ))
            }
          </section>
        ))
      }
    </section>
  );
};

export default Speakers;
