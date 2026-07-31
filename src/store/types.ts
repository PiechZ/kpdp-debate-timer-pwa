import {
  Screen, TimeSlot,
} from '../types';
import { RadioOption } from '../components/Radio';

export interface StoreContent {
  screen: Screen
  themes: RadioOption[]
  modes: RadioOption[]
  formats: RadioOption[]
  speakers: TimeSlot[][]
  prepTimes: TimeSlot[]
  resetDialogVisible: boolean,
  linearActiveSlotIndex: number,
  featureDiscoveryVisible: boolean,
  pendingFormat: string | null,
}

export type StoreActionType =
  'SET_SCREEN'
  | 'SET_THEME'
  | 'SET_MODE'
  | 'SET_FORMAT'
  | 'SET_PENDING_FORMAT'
  | 'INCREMENT_LINEAR_ACTIVE_SLOT_INDEX'
  | 'DECREMENT_LINEAR_ACTIVE_SLOT_INDEX'
  | 'SET_SELECTED_SPEAKER'
  | 'TOGGLE_ACTIVE_PREP_TIME'
  | 'TIMESLOT_TICK'
  | 'RESET'
  | 'RESET_PREP_TIME'
  | 'TOGGLE_RESET_DIALOG'
  | 'TOGGLE_PAUSED_TIMER'
  | 'HIDE_FEATURE_DISCOVERY';

export interface StoreAction {
  type: StoreActionType
  payload: any
}

export type Dispatch = (action: StoreAction) => void;
