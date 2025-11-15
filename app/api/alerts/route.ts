// app/api/alerts/route.ts
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

// GET: List user's alerts
export async function GET() {
  try {
    const userId = await getUserFromRequest();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const alerts = await prisma.alert.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("Alerts GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Create new alert
export async function POST(request: Request) {
  try {
    const userId = await getUserFromRequest();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ticker, condition, targetPrice } = await request.json();
    
    if (!ticker || !condition || !targetPrice) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["above", "below"].includes(condition)) {
      return NextResponse.json({ error: "Invalid condition" }, { status: 400 });
    }

    const alert = await prisma.alert.create({
      data: {
        userId,
        ticker: ticker.toUpperCase(),
        condition,
        targetPrice: parseFloat(targetPrice),
      },
    });

    // Check immediately if the alert should trigger
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker.toUpperCase()}?interval=1d&range=1d`;
      const res = await fetch(url);
      const data = await res.json();
      
      const result = data.chart?.result?.[0];
      const quote = result?.indicators?.quote?.[0];
      const currentPrice = quote?.close?.[quote.close.length - 1];
      
      if (currentPrice) {
        let shouldTrigger = false;
        
        if (condition === "above" && currentPrice >= parseFloat(targetPrice)) {
          shouldTrigger = true;
        } else if (condition === "below" && currentPrice <= parseFloat(targetPrice)) {
          shouldTrigger = true;
        }
        
        if (shouldTrigger) {
          // Update alert as triggered
          await prisma.alert.update({
            where: { id: alert.id },
            data: {
              triggered: true,
              triggeredAt: new Date(),
              isActive: false,
            },
          });
          
          // Create notification
          await prisma.notification.create({
            data: {
              userId,
              title: `Price Alert Triggered: ${ticker.toUpperCase()}`,
              message: `${ticker.toUpperCase()} is now ${condition} $${parseFloat(targetPrice).toFixed(2)}. Current price: $${currentPrice.toFixed(2)}`,
              type: "alert",
            },
          });
        }
      }
    } catch (checkError) {
      console.error("Error checking alert immediately:", checkError);
      // Don't fail the creation if the check fails
    }

    return NextResponse.json({ success: true, alert });
  } catch (error) {
    console.error("Alert POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Remove alert
export async function DELETE(request: Request) {
  try {
    const userId = await getUserFromRequest();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { alertId } = await request.json();
    
    await prisma.alert.deleteMany({
      where: {
        id: parseInt(alertId),
        userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Alert DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH: Toggle alert active status
export async function PATCH(request: Request) {
  try {
    const userId = await getUserFromRequest();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { alertId, isActive } = await request.json();

    const alert = await prisma.alert.updateMany({
      where: {
        id: parseInt(alertId),
        userId,
      },
      data: {
        isActive: Boolean(isActive),
      },
    });

    return NextResponse.json({ success: true, alert });
  } catch (error) {
    console.error("Alert PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
