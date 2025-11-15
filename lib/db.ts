// lib/db.ts
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// If DATABASE_URL is not set (e.g. quick dev-style deploy on Vercel),
// fall back to a local sqlite file. This makes the app usable immediately
// after deploy for testing, but note the file system on Vercel is ephemeral.
// Use /tmp on production (Vercel) so the path is absolute and works regardless
// of the working directory at runtime. On local dev, use ./dev.sqlite.
const fallbackSqliteUrl =
  process.env.DATABASE_URL ??
  (process.env.NODE_ENV === "production"
    ? "file:/tmp/dev.sqlite"
    : "file:./dev.sqlite");

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: ["query"],
    // Allow overriding the datasource at runtime when DATABASE_URL isn't provided
    datasources: {
      db: {
        url: fallbackSqliteUrl,
      },
    },
  });

if (process.env.NODE_ENV !== "production") global.prisma = prisma;

// If we're using the local sqlite fallback, ensure the minimal schema exists so
// auth routes (login/register) don't fail with a missing-table error.
// This runs once on module import; it's cheap and safe for a dev fallback.
if ((process.env.DATABASE_URL ?? "").startsWith("file:") || !process.env.DATABASE_URL) {
  (async () => {
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "User" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          "email" TEXT NOT NULL,
          "name" TEXT,
          "password" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");`);
      // eslint-disable-next-line no-console
      console.log("SQLite fallback: ensured User table exists");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to ensure sqlite schema:", e);
    }
  })();
}
