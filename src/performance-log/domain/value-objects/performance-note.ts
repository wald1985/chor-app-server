import { PerformanceValueInvalidError } from '../errors/performance-log.errors';

const MAX_NOTE_LENGTH = 500;

/** Optional free text, trimmed; blank means "no note" (null). */
export const parsePerformanceNote = (
  raw: string | null | undefined,
): string | null => {
  if (raw === undefined || raw === null) {
    return null;
  }
  if (typeof raw !== 'string') {
    throw new PerformanceValueInvalidError('note');
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > MAX_NOTE_LENGTH) {
    throw new PerformanceValueInvalidError('note');
  }
  return trimmed;
};
