import {
  extractLegacyData,
  validateLegacyInvariants,
  convertLegacyCatalog,
  LegacyDatabase,
} from './convert-legacy-catalog';

describe('convert-legacy-catalog', () => {
  const sampleThemes = Array.from({ length: 30 }, (_, i) => ({
    thema: `Thema ${i + 1}`,
  }));

  const createValidHtml = (
    songs: any[],
    themes: any[] = sampleThemes,
  ): string => {
    const db: LegacyDatabase = {
      songs,
      themen_kanonisch: themes,
    };
    return `<!DOCTYPE html><html><body><script id="song-data" type="application/json">${JSON.stringify(db)}</script></body></html>`;
  };

  it('extracts legacy data correctly from HTML', () => {
    const html = createValidHtml([]);
    const extracted = extractLegacyData(html);
    expect(extracted.songs).toEqual([]);
    expect(extracted.themen_kanonisch.length).toBe(30);
  });

  it('throws error if <script id="song-data"> is missing', () => {
    expect(() =>
      extractLegacyData('<html><body>No data</body></html>'),
    ).toThrow('Could not find <script id="song-data"> in HTML content');
  });

  it('throws error if JSON parsing fails', () => {
    const invalidHtml = '<script id="song-data">{ invalid json }</script>';
    expect(() => extractLegacyData(invalidHtml)).toThrow(
      'Failed to parse legacy JSON data',
    );
  });

  it('throws error if themes count is not 30', () => {
    const invalidThemes = sampleThemes.slice(0, 20);
    const db: LegacyDatabase = {
      songs: [],
      themen_kanonisch: invalidThemes,
    };
    expect(() => validateLegacyInvariants(db)).toThrow(
      'Expected exactly 30 themes, got 20',
    );
  });

  it('throws error if duplicate themes exist in themen_kanonisch', () => {
    const dupThemes = [...sampleThemes.slice(0, 29), { thema: 'Thema 1' }];
    const db: LegacyDatabase = {
      songs: [],
      themen_kanonisch: dupThemes,
    };
    expect(() => validateLegacyInvariants(db)).toThrow(
      'Duplicate themes found in themen_kanonisch',
    );
  });

  it('throws error if song count is not 727', () => {
    const db: LegacyDatabase = {
      songs: [],
      themen_kanonisch: sampleThemes,
    };
    expect(() => validateLegacyInvariants(db)).toThrow(
      'Expected exactly 727 songs, got 0',
    );
  });

  it('throws error if song references unknown theme', () => {
    const songs = Array.from({ length: 727 }, (_, i) => ({
      buch: 'Buch 1',
      nummer: i + 1,
      titel: `Song ${i + 1}`,
      themen: i === 0 ? ['Unknown Theme'] : ['Thema 1'],
    }));

    const db: LegacyDatabase = {
      songs,
      themen_kanonisch: sampleThemes,
    };

    expect(() => validateLegacyInvariants(db)).toThrow(
      "Song #1 references unknown theme 'Unknown Theme'",
    );
  });

  it('throws error if song number sequence has duplicates or gaps', () => {
    const songsWithDup = Array.from({ length: 727 }, (_, i) => ({
      buch: 'Buch 1',
      nummer: i === 726 ? 1 : i + 1,
      titel: `Song ${i + 1}`,
      themen: ['Thema 1'],
    }));

    const db: LegacyDatabase = {
      songs: songsWithDup,
      themen_kanonisch: sampleThemes,
    };

    expect(() => validateLegacyInvariants(db)).toThrow(
      'Duplicate song number: 1',
    );
  });

  it('converts valid legacy HTML into JsonCatalogOutput format', () => {
    const songs = Array.from({ length: 727 }, (_, i) => {
      const num = i + 1;
      let buch = 'Buch 1';
      if (num > 163 && num <= 357) buch = 'Buch 2';
      else if (num > 357 && num <= 563) buch = 'Buch 3';
      else if (num > 563) buch = 'Buch 4';

      return {
        buch,
        nummer: num,
        titel: `Song ${num}`,
        themen: ['Thema 1', 'Thema 2'],
      };
    });

    const html = createValidHtml(songs);
    const converted = convertLegacyCatalog(html);

    expect(converted.format).toBe('chor-app-library/v1');
    expect(converted.books.length).toBe(4);
    expect(converted.books[0]).toEqual({
      title: 'Buch 1',
      series: 'Bücher',
      volume: 1,
      songs: expect.any(Array),
    });
    expect(converted.books[0].songs.length).toBe(163);
    expect(converted.books[1].songs.length).toBe(194);
    expect(converted.books[2].songs.length).toBe(206);
    expect(converted.books[3].songs.length).toBe(164);
    expect(converted.books[0].songs[0]).toEqual({
      number: '1',
      title: 'Song 1',
      author: null,
      arranger: null,
      themes: ['Thema 1', 'Thema 2'],
    });
  });
});
