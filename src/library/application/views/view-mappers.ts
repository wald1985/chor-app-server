import { LibraryBook } from '../../domain/entities/library-book.entity';
import { LibrarySeries } from '../../domain/entities/library-series.entity';
import { LibrarySong } from '../../domain/entities/library-song.entity';
import { LibraryTheme } from '../../domain/entities/library-theme.entity';
import type {
  BookSongItemView,
  BookSummaryView,
  BookView,
  SeriesView,
  SongThemeItemView,
  SongView,
  ThemeView,
} from './library.views';

export function toThemeItemView(theme: LibraryTheme): SongThemeItemView {
  return {
    id: theme.id,
    name: theme.nameValue,
    archived: theme.isArchived,
  };
}

export function toSeriesView(
  series: LibrarySeries,
  books: LibraryBook[],
): SeriesView {
  const sortedBooks = [...books].sort((a, b) => {
    const volA = a.volumeValue ?? Number.MAX_SAFE_INTEGER;
    const volB = b.volumeValue ?? Number.MAX_SAFE_INTEGER;
    if (volA !== volB) {
      return volA - volB;
    }
    return a.title.value.localeCompare(b.title.value, 'de');
  });

  return {
    id: series.id,
    title: series.title.value,
    archived: series.isArchived,
    books: sortedBooks.map((b) => ({
      id: b.id,
      title: b.title.value,
      volume: b.volumeValue,
      archived: b.isArchived,
    })),
  };
}

export function toBookSummaryView(
  book: LibraryBook,
  series: LibrarySeries | null,
  songCount: number,
): BookSummaryView {
  return {
    id: book.id,
    title: book.title.value,
    series: series
      ? {
          id: series.id,
          title: series.title.value,
        }
      : null,
    volume: book.volumeValue,
    songCount,
    archived: book.isArchived,
  };
}

export function toBookSongItemView(
  song: LibrarySong,
  themes: LibraryTheme[],
): BookSongItemView {
  return {
    id: song.id,
    number: song.numberValue,
    title: song.titleValue,
    author: song.authorValue,
    arranger: song.arrangerValue,
    themes: themes.map(toThemeItemView),
    archived: song.isArchived,
  };
}

export function toBookView(
  book: LibraryBook,
  series: LibrarySeries | null,
  songs: LibrarySong[],
  themesMap: Map<string, LibraryTheme>,
): BookView {
  const sortedSongs = [...songs].sort((a, b) =>
    a.sortKey.localeCompare(b.sortKey),
  );

  return {
    id: book.id,
    title: book.title.value,
    series: series
      ? {
          id: series.id,
          title: series.title.value,
        }
      : null,
    volume: book.volumeValue,
    archived: book.isArchived,
    songs: sortedSongs.map((s) => {
      const themes = s.themeIds
        .map((tId) => themesMap.get(tId))
        .filter((t): t is LibraryTheme => t !== undefined);
      return toBookSongItemView(s, themes);
    }),
  };
}

export function toSongView(
  song: LibrarySong,
  book: LibraryBook,
  series: LibrarySeries | null,
  themes: LibraryTheme[],
): SongView {
  return {
    id: song.id,
    number: song.numberValue,
    title: song.titleValue,
    author: song.authorValue,
    arranger: song.arrangerValue,
    book: {
      id: book.id,
      title: book.title.value,
      volume: book.volumeValue,
      archived: book.isArchived,
    },
    series: series
      ? {
          id: series.id,
          title: series.title.value,
        }
      : null,
    themes: themes.map(toThemeItemView),
    archived: song.isArchived,
  };
}

export function toThemeView(theme: LibraryTheme, songCount: number): ThemeView {
  return {
    id: theme.id,
    name: theme.nameValue,
    archived: theme.isArchived,
    songCount,
  };
}
