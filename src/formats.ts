import { getActiveOption } from './localStorage';

export type Format = 'kpdp' | 'debatiada';

const defaultFormat: Format = 'kpdp';

// Get active format from local storage
export const getActiveFormat = (): Format => <Format>getActiveOption('format', defaultFormat);
