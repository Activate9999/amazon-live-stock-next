// lib/db.ts
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Ensure DATABASE_URL is set before Prisma schema validation runs.
// If DATABASE_URL is not provided (e.g. in Vercel without env vars set),
// fall back to a local SQLite file for quick testing. On local dev, use ./dev.sqlite.
// On production (Vercel), use /tmp/dev.sqlite (absolute path, ephemeral but works).
if (!process.env.DATABASE_URL) {
  if (process.env.NODE_ENV === "production") {
    process.env.DATABASE_URL = "file:/tmp/dev.sqlite";
  } else {
    process.env.DATABASE_URL = "file:./dev.sqlite";
  }
  // eslint-disable-next-line no-console
  console.warn("⚠️  DATABASE_URL not set; using fallback SQLite:", process.env.DATABASE_URL);
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: ["query"],
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
        );
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
