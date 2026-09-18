-- CreateEnum
CREATE TYPE "ThemeSource" AS ENUM ('LIBRARY', 'COMMUNITY');

-- AlterEnum
ALTER TYPE "CommunityPermission" ADD VALUE 'REPERTOIRE_MANAGE';

-- CreateTable
CREATE TABLE "folders" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleKey" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folder_songs" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "numberKey" TEXT NOT NULL,
    "sortKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "arranger" TEXT,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "folder_songs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_attachments" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "libraryBookId" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "themes" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "song_theme_assignments" (
    "communityId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "themeSource" "ThemeSource" NOT NULL,
    "themeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "song_theme_assignments_pkey" PRIMARY KEY ("communityId","songId","themeId")
);

-- CreateIndex
CREATE INDEX "folders_communityId_archivedAt_idx" ON "folders"("communityId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "folders_communityId_titleKey_key" ON "folders"("communityId", "titleKey");

-- CreateIndex
CREATE INDEX "folder_songs_folderId_archivedAt_sortKey_idx" ON "folder_songs"("folderId", "archivedAt", "sortKey");

-- CreateIndex
CREATE INDEX "folder_songs_communityId_archivedAt_idx" ON "folder_songs"("communityId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "folder_songs_folderId_numberKey_key" ON "folder_songs"("folderId", "numberKey");

-- CreateIndex
CREATE INDEX "book_attachments_communityId_archivedAt_idx" ON "book_attachments"("communityId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "book_attachments_communityId_libraryBookId_key" ON "book_attachments"("communityId", "libraryBookId");

-- CreateIndex
CREATE INDEX "themes_communityId_archivedAt_idx" ON "themes"("communityId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "themes_communityId_nameKey_key" ON "themes"("communityId", "nameKey");

-- CreateIndex
CREATE INDEX "song_theme_assignments_communityId_songId_idx" ON "song_theme_assignments"("communityId", "songId");

-- CreateIndex
CREATE INDEX "song_theme_assignments_communityId_themeId_idx" ON "song_theme_assignments"("communityId", "themeId");

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folder_songs" ADD CONSTRAINT "folder_songs_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folder_songs" ADD CONSTRAINT "folder_songs_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_attachments" ADD CONSTRAINT "book_attachments_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "themes" ADD CONSTRAINT "themes_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "song_theme_assignments" ADD CONSTRAINT "song_theme_assignments_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
