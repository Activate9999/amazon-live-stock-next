// app/api/stock-prices/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Centralized stock price fetching endpoint - used by all components
export async function POST(request: Request) {
  try {
    const { tickers } = await request.json();
    
    if (!Array.isArray(tickers) || tickers.length === 0) {
      return NextResponse.json({ error: "Invalid tickers array" }, { status: 400 });
    }

    const prices = await Promise.all(
      tickers.map(async (ticker: string) => {
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
          const res = await fetch(url);
          const data = await res.json();
          
          const result = data.chart?.result?.[0];
          const meta = result?.meta;
          const quote = result?.indicators?.quote?.[0];
          
          if (!meta || !quote) return { ticker, price: null, change: null, changePct: null };

          const close = quote.close?.[quote.close.length - 1];
          const previousClose = meta.previousClose || meta.chartPreviousClose;
          
          if (!close || !previousClose) return { ticker, price: null, change: null, changePct: null };

          const change = close - previousClose;
          const changePct = (change / previousClose) * 100;

          return {
            ticker,
            name: meta.longName || meta.shortName || ticker,
            price: close,
            change,
            changePct,
          };
        } catch (err) {
          return { ticker, price: null, change: null, changePct: null };
        }
      })
    );

    return NextResponse.json({ prices, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("Stock prices error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
