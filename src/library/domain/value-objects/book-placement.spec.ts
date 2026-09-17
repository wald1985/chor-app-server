import { BookPlacementInvalidError } from '../errors/library.errors';
import { BookPlacement } from './book-placement';
import { Volume } from './volume';

describe('BookPlacement', () => {
  it('creates valid placement when both seriesId and volume are provided', () => {
    const placement = new BookPlacement({ seriesId: 'series-1', volume: 2 });
    expect(placement.seriesId).toBe('series-1');
    expect(placement.volume).toEqual(new Volume(2));
    expect(placement.volumeValue).toBe(2);
  });

  it('accepts Volume instance directly', () => {
    const vol = new Volume(3);
    const placement = new BookPlacement({ seriesId: 'series-1', volume: vol });
    expect(placement.volume).toBe(vol);
    expect(placement.volumeValue).toBe(3);
  });

  it('creates unplaced when both seriesId and volume are null', () => {
    const placement = new BookPlacement({ seriesId: null, volume: null });
    expect(placement.seriesId).toBeNull();
    expect(placement.volume).toBeNull();
    expect(placement.volumeValue).toBeNull();
  });

  it('static unplaced() creates placement with null seriesId and null volume', () => {
    const placement = BookPlacement.unplaced();
    expect(placement.seriesId).toBeNull();
    expect(placement.volume).toBeNull();
  });

  it('throws BookPlacementInvalidError if only seriesId is provided (volume is null)', () => {
    expect(
      () => new BookPlacement({ seriesId: 'series-1', volume: null }),
    ).toThrow(BookPlacementInvalidError);
  });

  it('throws BookPlacementInvalidError if only volume is provided (seriesId is null)', () => {
    expect(() => new BookPlacement({ seriesId: null, volume: 1 })).toThrow(
      BookPlacementInvalidError,
    );
  });

  it('throws BookPlacementInvalidError if seriesId is empty whitespace string and volume is provided', () => {
    expect(() => new BookPlacement({ seriesId: '   ', volume: 1 })).toThrow(
      BookPlacementInvalidError,
    );
  });

  it('equals() compares seriesId and volume correctly', () => {
    const p1 = new BookPlacement({ seriesId: 's1', volume: 1 });
    const p2 = new BookPlacement({ seriesId: 's1', volume: 1 });
    const p3 = new BookPlacement({ seriesId: 's1', volume: 2 });
    const p4 = BookPlacement.unplaced();

    expect(p1.equals(p2)).toBe(true);
    expect(p1.equals(p3)).toBe(false);
    expect(p1.equals(p4)).toBe(false);
  });
});
