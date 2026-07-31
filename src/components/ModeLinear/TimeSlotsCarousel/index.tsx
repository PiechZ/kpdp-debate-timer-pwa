import { FunctionalComponent, h } from 'preact';
import { useContext, useRef } from 'preact/hooks';
import { Context } from '../../../store';
import Card from './Card';
import { getLinearActiveSlotIndex, getLinearTimeSlots } from '../getters';
import { TimeSlot } from '../../../types';
import { Dispatch } from '../../../store/types';

const handleCardClick = (
  activeSlot: TimeSlot, dispatch: Dispatch,
) => {
  dispatch({
    type: 'HIDE_FEATURE_DISCOVERY',
    payload: null,
  });
  dispatch({
    type: activeSlot.paused ? 'TOGGLE_PAUSED_TIMER' : 'INCREMENT_LINEAR_ACTIVE_SLOT_INDEX',
    payload: null,
  });
};

const SWIPE_THRESHOLD = 50;

const TimeSlotsCarousel: FunctionalComponent = () => {
  const { store, dispatch } = useContext(Context);
  const timeSlots: TimeSlot[] = getLinearTimeSlots(store);
  const activeSlotIndex = getLinearActiveSlotIndex(store);
  const touchStartX = useRef<number | null>(null);

  return (
    <section
      className={`time-slots-carousel time-slots-carousel--card-${activeSlotIndex}-visible${activeSlotIndex === timeSlots.length - 1 ? ' time-slots-carousel--last-card-visible' : ''}`}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (deltaX > SWIPE_THRESHOLD) {
          dispatch({ type: 'DECREMENT_LINEAR_ACTIVE_SLOT_INDEX', payload: null });
        }
      }}
    >
      {
        timeSlots.map((slot, index) => (
          <Card
            timeSlot={slot}
            active={index === activeSlotIndex}
            clickable={index === activeSlotIndex - 1}
            onClick={() => {
              if (index === activeSlotIndex - 1) {
                dispatch({ type: 'DECREMENT_LINEAR_ACTIVE_SLOT_INDEX', payload: null });
              } else if (index === activeSlotIndex) {
                handleCardClick(slot, dispatch);
              }
            }}
          />
        ))
      }
    </section>
  );
};

export default TimeSlotsCarousel;
