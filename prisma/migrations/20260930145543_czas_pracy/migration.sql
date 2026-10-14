-- CreateEnum
CREATE TYPE "TimeCategory" AS ENUM ('project', 'leave', 'sick', 'other');

-- CreateEnum
CREATE TYPE "TimeSource" AS ENUM ('manual', 'jira');

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectRoleId" TEXT,
    "date" DATE NOT NULL,
    "hours" DECIMAL(5,2) NOT NULL,
    "category" "TimeCategory" NOT NULL DEFAULT 'project',
    "note" TEXT,
    "source" "TimeSource" NOT NULL DEFAULT 'manual',
    "externalId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimeEntry_userId_date_idx" ON "TimeEntry"("userId", "date");

-- CreateIndex
CREATE INDEX "TimeEntry_projectRoleId_idx" ON "TimeEntry"("projectRoleId");

-- CreateIndex
CREATE INDEX "TimeEntry_date_idx" ON "TimeEntry"("date");

-- CreateIndex
CREATE UNIQUE INDEX "TimeEntry_source_externalId_key" ON "TimeEntry"("source", "externalId");

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_projectRoleId_fkey" FOREIGN KEY ("projectRoleId") REFERENCES "ProjectRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
