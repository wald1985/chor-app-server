export interface ImportSummaryView {
  series: { create: number; restore: number };
  books: { create: number; place: number; restore: number; unchanged: number };
  themes: { create: number; restore: number };
  songs: {
    create: number;
    update: number;
    move: number;
    restore: number;
    archive: number;
    unchanged: number;
  };
}

export interface ImportBookSongsView {
  create: string[];
  update: Array<{ number: string; fields: string[] }>;
  move: string[];
  restore: string[];
  archive: string[];
}

export interface ImportBookPreviewView {
  title: string;
  action: 'CREATE' | 'RESTORE' | 'PLACE' | 'UNCHANGED';
  series: string | null;
  volume: number | null;
  songs: ImportBookSongsView;
}

export interface ImportThemesPreviewView {
  create: string[];
  restore: string[];
}

export interface ImportInUseView {
  type: 'BOOK' | 'SONG' | 'THEME';
  id: string;
  label: string;
  communities: number;
  references: number;
}

export interface ImportPreviewView {
  planHash: string;
  format: 'JSON' | 'CSV' | 'XLSX';
  summary: ImportSummaryView;
  books: ImportBookPreviewView[];
  themes: ImportThemesPreviewView;
  inUse: ImportInUseView[];
  requiresConfirmation: boolean;
}

export interface ImportResultView {
  planHash: string;
  summary: ImportSummaryView;
}
