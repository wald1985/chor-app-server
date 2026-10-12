import { Performance } from './entities/performance.entity';
import { PerformanceValueInvalidError } from './errors/performance-log.errors';
import { PerformanceDate } from './value-objects/performance-date';
import { parsePerformanceNote } from './value-objects/performance-note';

describe('PerformanceDate', () => {
  it('parses a calendar date as UTC midnight and formats it back', () => {
    const date = new PerformanceDate('2026-10-04');
    expect(date.value.toISOString()).toBe('2026-10-04T00:00:00.000Z');
    expect(date.iso).toBe('2026-10-04');
  });

  it('accepts a leap day only in leap years', () => {
    expect(new PerformanceDate('2028-02-29').iso).toBe('2028-02-29');
    expect(() => new PerformanceDate('2026-02-29')).toThrow(
      PerformanceValueInvalidError,
    );
  });

  it.each(['2026-02-30', '2026-13-01', '2026-00-10', '26-10-04', '', 'x'])(
    'rejects %p',
    (raw) => {
      expect(() => new PerformanceDate(raw)).toThrow(
        PerformanceValueInvalidError,
      );
    },
  );

  it('rejects non-strings and reports the field name', () => {
    const error = (() => {
      try {
        new PerformanceDate(undefined as unknown as string, 'from');
      } catch (e) {
        return e as PerformanceValueInvalidError;
      }
    })();
    expect(error?.field).toBe('from');
  });

  it('round-trips a Date from the database without a day shift', () => {
    const fromDb = new Date('2026-12-31T00:00:00.000Z');
    expect(PerformanceDate.fromDate(fromDb).iso).toBe('2026-12-31');
  });
});

describe('parsePerformanceNote', () => {
  it('trims, and treats blank or missing as null', () => {
    expect(parsePerformanceNote('  Gottesdienst ')).toBe('Gottesdienst');
    expect(parsePerformanceNote('   ')).toBeNull();
    expect(parsePerformanceNote(null)).toBeNull();
    expect(parsePerformanceNote(undefined)).toBeNull();
  });

  it('allows 500 characters and rejects 501', () => {
    expect(parsePerformanceNote('x'.repeat(500))).toHaveLength(500);
    expect(() => parsePerformanceNote('x'.repeat(501))).toThrow(
      PerformanceValueInvalidError,
    );
  });
});

describe('Performance', () => {
  it('creates with only the required fields', () => {
    const performance = Performance.create({
      communityId: 'c-1',
      date: '2026-10-04',
      songId: 's-1',
    });
    expect(performance.id).toBeTruthy();
    expect(performance.pianistId).toBeNull();
    expect(performance.conductorId).toBeNull();
    expect(performance.note).toBeNull();
    expect(performance.date.iso).toBe('2026-10-04');
  });

  it('validates date and note', () => {
    expect(() =>
      Performance.create({ communityId: 'c', date: 'nope', songId: 's' }),
    ).toThrow(PerformanceValueInvalidError);
    expect(() =>
      Performance.create({
        communityId: 'c',
        date: '2026-10-04',
        songId: 's',
        note: 'x'.repeat(501),
      }),
    ).toThrow(PerformanceValueInvalidError);
  });
});
