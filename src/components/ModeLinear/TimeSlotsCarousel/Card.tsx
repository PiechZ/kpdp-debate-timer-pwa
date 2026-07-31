import { FunctionalComponent, h } from 'preact';
import Time from '../../Time';
import { TimeSlot } from '../../../types';

export type CardOnClickEvent = h.JSX.TargetedEvent<HTMLElement, MouseEvent>;

interface CardProps {
  timeSlot: TimeSlot
  active: boolean,
  clickable?: boolean,
  onClick?: (e: CardOnClickEvent) => void
}

const Card: FunctionalComponent<CardProps> = ({
  timeSlot,
  active,
  clickable = false,
  onClick,
}) => (
  <button
    type="button"
    disabled={!active && !clickable}
    className={`time-slots-carousel__card time-slots-carousel__card--${timeSlot.party}${!active ? ' time-slots-carousel__card--disabled' : ''}${active && timeSlot.paused ? ' time-slots-carousel__card--paused' : ''}${timeSlot.elapsed === 0 ? ' time-slots-carousel__card--not-started' : ''}`}
    onClick={(e) => (onClick ? onClick(e) : null)}
  >
    <span className="time-slots-carousel__card-label">
      {timeSlot.label}
      { timeSlot.labelSuffix }
    </span>
    <Time
      className="main-time time-slots-carousel__card-time"
      time={timeSlot}
      display="remaining"
    />
  </button>
);

export default Card;
