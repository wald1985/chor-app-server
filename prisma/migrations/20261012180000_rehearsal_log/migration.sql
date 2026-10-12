-- CreateTable
CREATE TABLE "rehearsals" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "warmUpLeaderId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rehearsals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rehearsal_entries" (
    "id" TEXT NOT NULL,
    "rehearsalId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "pianistId" TEXT,
    "conductorId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rehearsal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rehearsals_communityId_date_key" ON "rehearsals"("communityId", "date");

-- CreateIndex
CREATE INDEX "rehearsal_entries_rehearsalId_createdAt_idx" ON "rehearsal_entries"("rehearsalId", "createdAt");

-- AddForeignKey
ALTER TABLE "rehearsals" ADD CONSTRAINT "rehearsals_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rehearsal_entries" ADD CONSTRAINT "rehearsal_entries_rehearsalId_fkey" FOREIGN KEY ("rehearsalId") REFERENCES "rehearsals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

