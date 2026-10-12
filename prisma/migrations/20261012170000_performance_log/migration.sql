-- AlterEnum
ALTER TYPE "CommunityPermission" ADD VALUE 'SINGING_LOG_MANAGE';

-- CreateTable
CREATE TABLE "performances" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "songId" TEXT NOT NULL,
    "pianistId" TEXT,
    "conductorId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "performances_communityId_date_idx" ON "performances"("communityId", "date");

-- AddForeignKey
ALTER TABLE "performances" ADD CONSTRAINT "performances_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

