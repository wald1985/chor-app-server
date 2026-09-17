import { BookPlacementInvalidError } from '../errors/library.errors';
import { Volume } from './volume';

export interface BookPlacementProps {
  seriesId: string | null;
  volume: Volume | number | null;
}

export class BookPlacement {
  readonly seriesId: string | null;
  readonly volume: Volume | null;

  constructor(props: BookPlacementProps) {
    const rawSeriesId = props.seriesId;
    const seriesId =
      typeof rawSeriesId === 'string' && rawSeriesId.trim().length > 0
        ? rawSeriesId.trim()
        : null;
    const rawVolume = props.volume;
    const hasSeries = seriesId !== null;
    const hasVolume = rawVolume !== null && rawVolume !== undefined;

    if ((hasSeries && !hasVolume) || (!hasSeries && hasVolume)) {
      throw new BookPlacementInvalidError();
    }

    this.seriesId = seriesId;
    this.volume = hasVolume
      ? rawVolume instanceof Volume
        ? rawVolume
        : new Volume(rawVolume)
      : null;
  }

  get volumeValue(): number | null {
    return this.volume ? this.volume.value : null;
  }

  static unplaced(): BookPlacement {
    return new BookPlacement({ seriesId: null, volume: null });
  }

  equals(other: BookPlacement): boolean {
    const seriesMatches = this.seriesId === other.seriesId;
    const volumeMatches =
      this.volume === null
        ? other.volume === null
        : other.volume !== null && this.volume.equals(other.volume);
    return seriesMatches && volumeMatches;
  }
}
