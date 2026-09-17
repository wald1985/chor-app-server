export interface SeriesBookItemView {
  id: string;
  title: string;
  volume: number | null;
  archived: boolean;
}

export interface SeriesView {
  id: string;
  title: string;
  archived: boolean;
  books: SeriesBookItemView[];
}

export interface BookSummarySeriesView {
  id: string;
  title: string;
}

export interface BookSummaryView {
  id: string;
  title: string;
  series: BookSummarySeriesView | null;
  volume: number | null;
  songCount: number;
  archived: boolean;
}

export interface SongThemeItemView {
  id: string;
  name: string;
  archived: boolean;
}

export interface BookSongItemView {
  id: string;
  number: string;
  title: string;
  author: string | null;
  arranger: string | null;
  themes: SongThemeItemView[];
  archived: boolean;
}

export interface BookView {
  id: string;
  title: string;
  series: BookSummarySeriesView | null;
  volume: number | null;
  archived: boolean;
  songs: BookSongItemView[];
}

export interface SongBookRefView {
  id: string;
  title: string;
  volume: number | null;
  archived: boolean;
}

export interface SongView {
  id: string;
  number: string;
  title: string;
  author: string | null;
  arranger: string | null;
  book: SongBookRefView;
  series: BookSummarySeriesView | null;
  themes: SongThemeItemView[];
  archived: boolean;
}

export interface ThemeView {
  id: string;
  name: string;
  archived: boolean;
  songCount: number;
}
