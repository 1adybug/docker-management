-- Better Auth 1.7 identifies external accounts by issuer + accountId.
-- OAuth rows intentionally receive a canonical synthetic issuer first; the
-- post-deploy finalizer replaces it only after resolving a trusted issuer.
ALTER TABLE "account" ADD COLUMN "issuer" TEXT;

UPDATE "account"
SET "issuer" = 'local:credential',
    "accountId" = "userId"
WHERE "providerId" = 'credential';

-- Match JavaScript encodeURIComponent(providerId) byte-for-byte, including
-- UTF-8 provider IDs, so the finalizer can safely recognize every placeholder.
WITH RECURSIVE
"oauth_provider_bytes"("id", "providerHex") AS (
    SELECT "id", hex(CAST("providerId" AS BLOB))
    FROM "account"
    WHERE "providerId" <> 'credential'
),
"oauth_provider_encodings"("id", "providerHex", "position", "encodedProviderId") AS (
    SELECT "id", "providerHex", 1, ''
    FROM "oauth_provider_bytes"

    UNION ALL

    SELECT
        "id",
        "providerHex",
        "position" + 2,
        "encodedProviderId" ||
            CASE
                WHEN
                    (
                        (instr('0123456789ABCDEF', substr("providerHex", "position", 1)) - 1) * 16 +
                        (instr('0123456789ABCDEF', substr("providerHex", "position" + 1, 1)) - 1)
                    ) BETWEEN 48 AND 57
                    OR (
                        (instr('0123456789ABCDEF', substr("providerHex", "position", 1)) - 1) * 16 +
                        (instr('0123456789ABCDEF', substr("providerHex", "position" + 1, 1)) - 1)
                    ) BETWEEN 65 AND 90
                    OR (
                        (instr('0123456789ABCDEF', substr("providerHex", "position", 1)) - 1) * 16 +
                        (instr('0123456789ABCDEF', substr("providerHex", "position" + 1, 1)) - 1)
                    ) BETWEEN 97 AND 122
                    OR (
                        (instr('0123456789ABCDEF', substr("providerHex", "position", 1)) - 1) * 16 +
                        (instr('0123456789ABCDEF', substr("providerHex", "position" + 1, 1)) - 1)
                    ) IN (33, 39, 40, 41, 42, 45, 46, 95, 126)
                THEN char(
                    (instr('0123456789ABCDEF', substr("providerHex", "position", 1)) - 1) * 16 +
                    (instr('0123456789ABCDEF', substr("providerHex", "position" + 1, 1)) - 1
                )
                ELSE '%' || substr("providerHex", "position", 2)
            END
    FROM "oauth_provider_encodings"
    WHERE "position" <= length("providerHex")
)
UPDATE "account"
SET "issuer" = 'local:oauth:' || (
    SELECT "encodedProviderId"
    FROM "oauth_provider_encodings"
    WHERE "oauth_provider_encodings"."id" = "account"."id"
      AND "position" > length("providerHex")
)
WHERE "providerId" <> 'credential';

-- Abort before rebuilding the table if any required identity is missing or if
-- the new issuer + accountId identity would collide. No record is guessed,
-- deleted, or merged automatically.
CREATE TEMP TABLE "_better_auth_1_7_identity_guard" (
    "safe" INTEGER NOT NULL CHECK ("safe" = 1)
);

INSERT INTO "_better_auth_1_7_identity_guard" ("safe")
SELECT CASE
    WHEN EXISTS (
        SELECT 1
        FROM "account"
        WHERE "id" = ''
           OR "providerId" = ''
           OR "userId" = ''
           OR "issuer" IS NULL
           OR "issuer" = ''
           OR "accountId" = ''
    ) THEN 0
    WHEN EXISTS (
        SELECT 1
        FROM "account"
        GROUP BY "issuer", "accountId"
        HAVING COUNT(*) > 1
    ) THEN 0
    ELSE 1
END;

DROP TABLE "_better_auth_1_7_identity_guard";

PRAGMA foreign_keys=OFF;

CREATE TABLE "new_account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issuer" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" DATETIME,
    "refreshTokenExpiresAt" DATETIME,
    "scope" TEXT,
    "password" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_account" (
    "id",
    "issuer",
    "accountId",
    "providerId",
    "userId",
    "accessToken",
    "refreshToken",
    "idToken",
    "accessTokenExpiresAt",
    "refreshTokenExpiresAt",
    "scope",
    "password",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "issuer",
    "accountId",
    "providerId",
    "userId",
    "accessToken",
    "refreshToken",
    "idToken",
    "accessTokenExpiresAt",
    "refreshTokenExpiresAt",
    "scope",
    "password",
    "createdAt",
    "updatedAt"
FROM "account";

DROP TABLE "account";
ALTER TABLE "new_account" RENAME TO "account";

CREATE UNIQUE INDEX "account_issuer_accountId_key" ON "account"("issuer", "accountId");
CREATE UNIQUE INDEX "account_userId_providerId_key" ON "account"("userId", "providerId");
CREATE INDEX "account_userId_idx" ON "account"("userId");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
