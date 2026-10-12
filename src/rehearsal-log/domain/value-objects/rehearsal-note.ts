import { RehearsalValueInvalidError } from '../errors/rehearsal-log.errors';

const MAX_NOTE_LENGTH = 500;

/** Optional free text, trimmed; blank means "no note" (null). */
export const parseRehearsalNote = (
  raw: string | null | undefined,
): string | null => {
  if (raw === undefined || raw === null) {
    return null;
  }
  if (typeof raw !== 'string') {
    throw new RehearsalValueInvalidError('note');
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > MAX_NOTE_LENGTH) {
    throw new RehearsalValueInvalidError('note');
  }
  return trimmed;
};
