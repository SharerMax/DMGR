-- CreateTable
CREATE TABLE "SyncLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "providerId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "domainsSynced" INTEGER NOT NULL DEFAULT 0,
    "dnsInserted" INTEGER NOT NULL DEFAULT 0,
    "dnsDeleted" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SyncLog_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SyncLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SyncLog_providerId_idx" ON "SyncLog"("providerId");

-- CreateIndex
CREATE INDEX "SyncLog_userId_idx" ON "SyncLog"("userId");

-- CreateIndex
CREATE INDEX "SyncLog_createdAt_idx" ON "SyncLog"("createdAt");
