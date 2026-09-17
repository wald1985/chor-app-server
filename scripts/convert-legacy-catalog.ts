import * as fs from 'node:fs';
import * as path from 'node:path';

export interface LegacySong {
  buch: string;
  nummer: number;
  titel: string;
  themen: string[];
}

export interface LegacyThemeKanonisch {
  thema: string;
}

export interface LegacyDatabase {
  songs: LegacySong[];
  themen_kanonisch: LegacyThemeKanonisch[];
}

export interface JsonCatalogOutput {
  format: 'chor-app-library/v1';
  books: Array<{
    title: string;
    series: string;
    volume: number;
    songs: Array<{
      number: string;
      title: string;
      author: null;
      arranger: null;
      themes: string[];
    }>;
  }>;
}

const EXPECTED_SONGS_COUNT = 727;
const EXPECTED_THEMES_COUNT = 30;
const BOOK_VOLUMES: Record<string, number> = {
  'Buch 1': 1,
  'Buch 2': 2,
  'Buch 3': 3,
  'Buch 4': 4,
};

export function extractLegacyData(html: string): LegacyDatabase {
  const match = html.match(
    /<script\s+id=["']song-data["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  if (!match) {
    throw new Error('Could not find <script id="song-data"> in HTML content');
  }

  try {
    return JSON.parse(match[1]) as LegacyDatabase;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse legacy JSON data: ${msg}`);
  }
}

export function validateLegacyInvariants(data: LegacyDatabase): Set<string> {
  if (!Array.isArray(data.songs)) {
    throw new Error('Legacy data is missing songs array');
  }
  if (!Array.isArray(data.themen_kanonisch)) {
    throw new Error('Legacy data is missing themen_kanonisch array');
  }

  if (data.themen_kanonisch.length !== EXPECTED_THEMES_COUNT) {
    throw new Error(
      `Expected exactly ${EXPECTED_THEMES_COUNT} themes, got ${data.themen_kanonisch.length}`,
    );
  }

  const canonicalThemes = new Set(data.themen_kanonisch.map((t) => t.thema));
  if (canonicalThemes.size !== EXPECTED_THEMES_COUNT) {
    throw new Error('Duplicate themes found in themen_kanonisch');
  }

  if (data.songs.length !== EXPECTED_SONGS_COUNT) {
    throw new Error(
      `Expected exactly ${EXPECTED_SONGS_COUNT} songs, got ${data.songs.length}`,
    );
  }

  validateSongNumbersAndThemes(data.songs, canonicalThemes);
  return canonicalThemes;
}

function validateSongNumbersAndThemes(
  songs: LegacySong[],
  canonicalThemes: Set<string>,
): void {
  const seenNumbers = new Set<number>();

  for (const song of songs) {
    if (!BOOK_VOLUMES[song.buch]) {
      throw new Error(`Unexpected book name: '${song.buch}'`);
    }

    if (seenNumbers.has(song.nummer)) {
      throw new Error(`Duplicate song number: ${song.nummer}`);
    }
    seenNumbers.add(song.nummer);

    for (const t of song.themen) {
      if (!canonicalThemes.has(t)) {
        throw new Error(`Song #${song.nummer} references unknown theme '${t}'`);
      }
    }
  }

  for (let num = 1; num <= EXPECTED_SONGS_COUNT; num++) {
    if (!seenNumbers.has(num)) {
      throw new Error(`Missing song number in sequence: ${num}`);
    }
  }
}

export function convertLegacyCatalog(html: string): JsonCatalogOutput {
  const data = extractLegacyData(html);
  validateLegacyInvariants(data);

  const songsByBook = new Map<string, LegacySong[]>();
  for (const bookName of Object.keys(BOOK_VOLUMES)) {
    songsByBook.set(bookName, []);
  }

  for (const song of data.songs) {
    songsByBook.get(song.buch)!.push(song);
  }

  const books = Object.entries(BOOK_VOLUMES).map(([bookName, volume]) => {
    const rawSongs = songsByBook.get(bookName)!;
    rawSongs.sort((a, b) => a.nummer - b.nummer);

    const songs = rawSongs.map((s) => ({
      number: String(s.nummer),
      title: s.titel,
      author: null,
      arranger: null,
      themes: [...s.themen],
    }));

    return {
      title: bookName,
      series: 'Bücher',
      volume,
      songs,
    };
  });

  return {
    format: 'chor-app-library/v1',
    books,
  };
}

export function runCli(): void {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error(
      'Usage: ts-node scripts/convert-legacy-catalog.ts <input-html> <output-json>',
    );
    process.exit(1);
  }

  const [inputPath, outputPath] = args;
  const resolvedInput = path.resolve(process.cwd(), inputPath);
  const resolvedOutput = path.resolve(process.cwd(), outputPath);

  console.log(`Reading legacy HTML from: ${resolvedInput}`);
  const html = fs.readFileSync(resolvedInput, 'utf-8');

  console.log('Converting catalog and verifying invariants...');
  const converted = convertLegacyCatalog(html);

  const outputDir = path.dirname(resolvedOutput);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(resolvedOutput, JSON.stringify(converted, null, 2), 'utf-8');
  console.log(
    `Successfully converted ${converted.books.reduce((acc, b) => acc + b.songs.length, 0)} songs across ${converted.books.length} books.`,
  );
  console.log(`Wrote JSON output to: ${resolvedOutput}`);
}

if (require.main === module) {
  runCli();
}
