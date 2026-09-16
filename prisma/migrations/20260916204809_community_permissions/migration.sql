-- CreateEnum
CREATE TYPE "CommunityPermission" AS ENUM ('PEOPLE_MANAGE');

-- AlterTable
ALTER TABLE "community_memberships" ADD COLUMN     "permissions" "CommunityPermission"[] DEFAULT ARRAY[]::"CommunityPermission"[];
