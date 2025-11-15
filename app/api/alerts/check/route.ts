// app/api/alerts/check/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// This endpoint checks all active alerts and triggers them if conditions are met
export async function POST() {
  try {
    // Get all active, non-triggered alerts
    const alerts = await prisma.alert.findMany({
      where: {
        isActive: true,
        triggered: false,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (alerts.length === 0) {
      return NextResponse.json({ checked: 0, triggered: 0 });
    }

    // Get unique tickers
    const tickers = [...new Set(alerts.map(a => a.ticker))];
    
    // Fetch current prices for all tickers
    const priceMap: Record<string, number> = {};
    await Promise.all(
      tickers.map(async (ticker) => {
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
          const res = await fetch(url);
          const data = await res.json();
          
          const result = data.chart?.result?.[0];
          const quote = result?.indicators?.quote?.[0];
          const close = quote?.close?.[quote.close.length - 1];
          
          if (close) {
            priceMap[ticker] = close;
          }
        } catch (err) {
          console.error(`Error fetching price for ${ticker}:`, err);
        }
      })
    );

    let triggeredCount = 0;

    // Check each alert
    for (const alert of alerts) {
      const currentPrice = priceMap[alert.ticker];
      if (!currentPrice) continue;

      let shouldTrigger = false;

      if (alert.condition === "above" && currentPrice >= alert.targetPrice) {
        shouldTrigger = true;
      } else if (alert.condition === "below" && currentPrice <= alert.targetPrice) {
        shouldTrigger = true;
      }

      if (shouldTrigger) {
        // Update alert as triggered
        await prisma.alert.update({
          where: { id: alert.id },
          data: {
            triggered: true,
            triggeredAt: new Date(),
            isActive: false, // Deactivate after triggering
          },
        });

        // Create notification
        await prisma.notification.create({
          data: {
            userId: alert.userId,
            title: `Price Alert Triggered: ${alert.ticker}`,
            message: `${alert.ticker} is now ${alert.condition} $${alert.targetPrice.toFixed(2)}. Current price: $${currentPrice.toFixed(2)}`,
            type: "alert",
          },
        });

        triggeredCount++;
      }
    }

    return NextResponse.json({
      checked: alerts.length,
      triggered: triggeredCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Alert check error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
