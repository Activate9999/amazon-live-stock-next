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
          console.log(`[stock-prices] Fetching ${ticker} from ${url}`);
          
          const res = await fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "application/json",
              "Accept-Language": "en-US,en;q=0.9",
            },
            cache: 'no-store',
          });
          
          console.log(`[stock-prices] ${ticker} response status: ${res.status}`);
          
          if (!res.ok) {
            console.error(`[stock-prices] Error fetching ${ticker}: ${res.status}`);
            return { ticker, price: null, change: null, changePct: null };
          }
          
          const data = await res.json();
          
          const result = data.chart?.result?.[0];
          const meta = result?.meta;
          const quote = result?.indicators?.quote?.[0];
          
          if (!meta || !quote) {
            console.error(`[stock-prices] Invalid data structure for ${ticker}`);
            return { ticker, price: null, change: null, changePct: null };
          }

          const close = quote.close?.[quote.close.length - 1];
          const previousClose = meta.previousClose || meta.chartPreviousClose;
          
          if (!close || !previousClose) {
            console.error(`[stock-prices] Missing price data for ${ticker}: close=${close}, previousClose=${previousClose}`);
            return { ticker, price: null, change: null, changePct: null };
          }

          const change = close - previousClose;
          const changePct = (change / previousClose) * 100;

          console.log(`[stock-prices] Successfully fetched ${ticker}: price=${close}, change=${change}`);
          
          return {
            ticker,
            name: meta.longName || meta.shortName || ticker,
            price: close,
            change,
            changePct,
          };
        } catch (err) {
          console.error(`[stock-prices] Exception fetching ${ticker}:`, err);
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
