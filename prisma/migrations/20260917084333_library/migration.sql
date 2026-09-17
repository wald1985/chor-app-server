-- CreateTable
CREATE TABLE "library_series" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleKey" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_books" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleKey" TEXT NOT NULL,
    "volume" INTEGER,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "seriesId" TEXT,

    CONSTRAINT "library_books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_songs" (
    "id" TEXT NOT NULL,
    "numberScopeId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "numberKey" TEXT NOT NULL,
    "sortKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "arranger" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bookId" TEXT NOT NULL,

    CONSTRAINT "library_songs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_themes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_song_themes" (
    "songId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,

    CONSTRAINT "library_song_themes_pkey" PRIMARY KEY ("songId","themeId")
);

-- CreateIndex
CREATE UNIQUE INDEX "library_series_titleKey_key" ON "library_series"("titleKey");

-- CreateIndex
CREATE UNIQUE INDEX "library_books_titleKey_key" ON "library_books"("titleKey");

-- CreateIndex
CREATE UNIQUE INDEX "library_books_seriesId_volume_key" ON "library_books"("seriesId", "volume");

-- CreateIndex
CREATE INDEX "library_songs_bookId_archivedAt_sortKey_idx" ON "library_songs"("bookId", "archivedAt", "sortKey");

-- CreateIndex
CREATE UNIQUE INDEX "library_songs_numberScopeId_numberKey_key" ON "library_songs"("numberScopeId", "numberKey");

-- CreateIndex
CREATE UNIQUE INDEX "library_themes_nameKey_key" ON "library_themes"("nameKey");

-- CreateIndex
CREATE INDEX "library_song_themes_themeId_idx" ON "library_song_themes"("themeId");

-- AddForeignKey
ALTER TABLE "library_books" ADD CONSTRAINT "library_books_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "library_series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_songs" ADD CONSTRAINT "library_songs_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "library_books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_song_themes" ADD CONSTRAINT "library_song_themes_songId_fkey" FOREIGN KEY ("songId") REFERENCES "library_songs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_song_themes" ADD CONSTRAINT "library_song_themes_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "library_themes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
