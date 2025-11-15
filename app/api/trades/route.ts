// app/api/trades/route.ts
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

// GET: Get user's trade history
export async function GET() {
  try {
    const userId = await getUserFromRequest();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const trades = await prisma.trade.findMany({
      where: { userId },
      orderBy: { executedAt: "desc" },
      take: 50, // limit to recent 50 trades
    });

    return NextResponse.json({ trades });
  } catch (error) {
    console.error("Trades GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Execute a trade (buy/sell)
export async function POST(request: Request) {
  try {
    const userId = await getUserFromRequest();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ticker, type, quantity, price } = await request.json();

    if (!ticker || !type || !quantity || !price) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["buy", "sell"].includes(type)) {
      return NextResponse.json({ error: "Invalid trade type" }, { status: 400 });
    }

    const qty = parseFloat(quantity);
    const prc = parseFloat(price);
    const fee = qty * prc * 0.001; // 0.1% fee
    const total = qty * prc + (type === "buy" ? fee : -fee);

    // Get user's current balance
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { cashBalance: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has enough cash for buy order
    if (type === "buy" && user.cashBalance < total) {
      return NextResponse.json({ error: "Insufficient funds" }, { status: 400 });
    }

    // For sell, check if user has enough shares
    if (type === "sell") {
      const holding = await prisma.portfolio.findUnique({
        where: {
          userId_ticker: {
            userId,
            ticker: ticker.toUpperCase(),
          },
        },
      });

      if (!holding || holding.quantity < qty) {
        return NextResponse.json({ error: "Insufficient shares" }, { status: 400 });
      }
    }

    // Execute trade in transaction
    await prisma.$transaction(async (tx) => {
      // Create trade record
      await tx.trade.create({
        data: {
          userId,
          ticker: ticker.toUpperCase(),
          type,
          quantity: qty,
          price: prc,
          total,
          fee,
        },
      });

      // Update cash balance
      const newBalance = type === "buy" 
        ? user.cashBalance - total 
        : user.cashBalance + total;

      await tx.user.update({
        where: { id: userId },
        data: { cashBalance: newBalance },
      });

      // Update portfolio
      const tickerUpper = ticker.toUpperCase();
      const existing = await tx.portfolio.findUnique({
        where: {
          userId_ticker: {
            userId,
            ticker: tickerUpper,
          },
        },
      });

      if (type === "buy") {
        if (existing) {
          // Update existing holding
          const newQty = existing.quantity + qty;
          const newAvg = ((existing.avgBuyPrice * existing.quantity) + (prc * qty)) / newQty;
          
          await tx.portfolio.update({
            where: {
              userId_ticker: {
                userId,
                ticker: tickerUpper,
              },
            },
            data: {
              quantity: newQty,
              avgBuyPrice: newAvg,
              currentPrice: prc,
              lastUpdated: new Date(),
            },
          });
        } else {
          // Create new holding
          await tx.portfolio.create({
            data: {
              userId,
              ticker: tickerUpper,
              quantity: qty,
              avgBuyPrice: prc,
              currentPrice: prc,
            },
          });
        }
      } else {
        // Sell
        if (existing) {
          const newQty = existing.quantity - qty;
          
          if (newQty <= 0) {
            // Remove holding if all shares sold
            await tx.portfolio.delete({
              where: {
                userId_ticker: {
                  userId,
                  ticker: tickerUpper,
                },
              },
            });
          } else {
            // Update quantity
            await tx.portfolio.update({
              where: {
                userId_ticker: {
                  userId,
                  ticker: tickerUpper,
                },
              },
              data: {
                quantity: newQty,
                currentPrice: prc,
                lastUpdated: new Date(),
              },
            });
          }
        }
      }

      // Create notification
      await tx.notification.create({
        data: {
          userId,
          title: `${type.toUpperCase()} Order Executed`,
          message: `${type === "buy" ? "Bought" : "Sold"} ${qty} shares of ${tickerUpper} at $${prc.toFixed(2)}`,
          type: "trade",
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Trade POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Clear all trade history for user
export async function DELETE() {
  try {
    const userId = await getUserFromRequest();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.trade.deleteMany({
      where: { userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Trades DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
