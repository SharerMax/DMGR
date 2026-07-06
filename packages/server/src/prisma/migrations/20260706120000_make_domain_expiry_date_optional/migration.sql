-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Domain" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "providerId" INTEGER,
    "userId" INTEGER NOT NULL,
    "expiryDate" DATETIME,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "autoRenewDays" INTEGER,
    "renewalPrice" REAL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Domain_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Domain_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Domain" ("autoRenew", "autoRenewDays", "createdAt", "expiryDate", "id", "name", "notes", "providerId", "renewalPrice", "status", "updatedAt", "userId") SELECT "autoRenew", "autoRenewDays", "createdAt", "expiryDate", "id", "name", "notes", "providerId", "renewalPrice", "status", "updatedAt", "userId" FROM "Domain";
DROP TABLE "Domain";
ALTER TABLE "new_Domain" RENAME TO "Domain";
CREATE INDEX "Domain_userId_idx" ON "Domain"("userId");
CREATE INDEX "Domain_providerId_idx" ON "Domain"("providerId");
CREATE INDEX "Domain_expiryDate_idx" ON "Domain"("expiryDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
