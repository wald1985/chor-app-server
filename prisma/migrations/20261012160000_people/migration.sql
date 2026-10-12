-- CreateEnum
CREATE TYPE "PersonRole" AS ENUM ('PIANIST', 'CONDUCTOR');

-- CreateTable
CREATE TABLE "people" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "roles" "PersonRole"[],
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "people_communityId_idx" ON "people"("communityId");

-- CreateIndex
CREATE UNIQUE INDEX "people_communityId_nameKey_key" ON "people"("communityId", "nameKey");

-- AddForeignKey
ALTER TABLE "people" ADD CONSTRAINT "people_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

