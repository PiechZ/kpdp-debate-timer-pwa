import reducer from '../reducer';
import initialStore from '../initialStore';
import { StoreContent } from '../types';
import { hasElapsedTime } from '../getters';

const tick = (store: StoreContent) => reducer(store, {
  type: 'TIMESLOT_TICK',
  payload: store.speakers[0][0],
});

describe('hasElapsedTime', () => {
  it('is false for a fresh store', () => {
    expect(hasElapsedTime(initialStore)).toBe(false);
  });

  it('is true once any slot has ticked', () => {
    const store = tick(initialStore);
    expect(hasElapsedTime(store)).toBe(true);
  });
});
