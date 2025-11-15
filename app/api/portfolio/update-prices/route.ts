// app/api/portfolio/update-prices/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// This endpoint updates current prices for all portfolio holdings
export async function POST() {
  try {
    // Get all unique tickers from all portfolios
    const portfolios = await prisma.portfolio.findMany({
      select: {
        ticker: true,
      },
      distinct: ['ticker'],
    });

    if (portfolios.length === 0) {
      return NextResponse.json({ updated: 0 });
    }

    const tickers = portfolios.map(p => p.ticker);
    const priceMap: Record<string, number> = {};

    // Fetch current prices for all tickers
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

    // Update all portfolios with current prices
    let updatedCount = 0;
    for (const [ticker, price] of Object.entries(priceMap)) {
      await prisma.portfolio.updateMany({
        where: { ticker },
        data: {
          currentPrice: price,
          lastUpdated: new Date(),
        },
      });
      updatedCount++;
    }

    return NextResponse.json({
      updated: updatedCount,
      prices: priceMap,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Portfolio price update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
