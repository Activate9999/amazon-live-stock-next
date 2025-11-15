// app/api/portfolio/route.ts
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

// GET: Get user's portfolio holdings
export async function GET() {
  try {
    const userId = await getUserFromRequest();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const portfolio = await prisma.portfolio.findMany({
      where: { userId },
      orderBy: { lastUpdated: "desc" },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { cashBalance: true },
    });

    // Calculate total portfolio value
    const totalValue = portfolio.reduce((sum, holding) => {
      const currentValue = (holding.currentPrice || holding.avgBuyPrice) * holding.quantity;
      return sum + currentValue;
    }, 0);

    const totalCost = portfolio.reduce((sum, holding) => {
      return sum + (holding.avgBuyPrice * holding.quantity);
    }, 0);

    return NextResponse.json({
      portfolio,
      cashBalance: user?.cashBalance || 0,
      totalValue,
      totalCost,
      totalGainLoss: totalValue - totalCost,
      totalGainLossPct: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
    });
  } catch (error) {
    // Graceful fallback when DB is unreachable (e.g., Prisma P1001)
    console.error("Portfolio GET error:", error);
    return NextResponse.json({
      portfolio: [],
      cashBalance: 0,
      totalValue: 0,
      totalCost: 0,
      totalGainLoss: 0,
      totalGainLossPct: 0,
      offline: true,
    }, { status: 200 });
  }
}

// POST: Update current prices for portfolio holdings
export async function POST(request: Request) {
  try {
    const userId = await getUserFromRequest();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ticker, currentPrice } = await request.json();

    if (!ticker || !currentPrice) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await prisma.portfolio.updateMany({
      where: {
        userId,
        ticker: ticker.toUpperCase(),
      },
      data: {
        currentPrice: parseFloat(currentPrice),
        lastUpdated: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Portfolio POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
