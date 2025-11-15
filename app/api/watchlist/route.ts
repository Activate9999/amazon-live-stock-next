// app/api/watchlist/route.ts
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

async function getUserFromRequest() {
  const cookieStore = await cookies();
  const token = cookieStore.get(process.env.AUTH_COOKIE_NAME || "alst_auth")?.value;
  if (!token) return null;
  const payload: any = verifyToken(token);
  if (!payload || typeof payload === "string") return null;
  return payload.sub ? Number(payload.sub) : null;
}

// GET: List user's watchlist
export async function GET() {
  try {
    const userId = await getUserFromRequest();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const watchlist = await prisma.watchlist.findMany({
      where: { userId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ watchlist });
  } catch (error) {
    // Graceful fallback when DB is unreachable (e.g., Prisma P1001)
    console.error("Watchlist GET error:", error);
    return NextResponse.json({ watchlist: [], offline: true }, { status: 200 });
  }
}

// POST: Add ticker to watchlist
export async function POST(request: Request) {
  try {
    const userId = await getUserFromRequest();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ticker } = await request.json();
    if (!ticker || typeof ticker !== "string") {
      return NextResponse.json({ error: "Invalid ticker" }, { status: 400 });
    }

    // Get current max sort order
    const maxOrder = await prisma.watchlist.aggregate({
      where: { userId },
      _max: { sortOrder: true },
    });

    const watchlistItem = await prisma.watchlist.create({
      data: {
        userId,
        ticker: ticker.toUpperCase(),
        sortOrder: (maxOrder._max.sortOrder || 0) + 1,
      },
    });

    return NextResponse.json({ success: true, watchlistItem });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Ticker already in watchlist" }, { status: 400 });
    }
    console.error("Watchlist POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Remove ticker from watchlist
export async function DELETE(request: Request) {
  try {
    const userId = await getUserFromRequest();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ticker } = await request.json();
    if (!ticker || typeof ticker !== "string") {
      return NextResponse.json({ error: "Invalid ticker" }, { status: 400 });
    }

    await prisma.watchlist.deleteMany({
      where: {
        userId,
        ticker: ticker.toUpperCase(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Watchlist DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
