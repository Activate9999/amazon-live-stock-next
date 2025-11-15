// app/api/market-movers/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const POPULAR_TICKERS = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "NFLX"];

export async function GET() {
  try {
    // Fetch quotes for popular stocks
    const quotes = await Promise.all(
      POPULAR_TICKERS.map(async (ticker) => {
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
          const res = await fetch(url);
          const data = await res.json();
          
          const result = data.chart?.result?.[0];
          const meta = result?.meta;
          const quote = result?.indicators?.quote?.[0];
          
          if (!meta || !quote) return null;

          const close = quote.close?.[quote.close.length - 1];
          const previousClose = meta.previousClose || meta.chartPreviousClose;
          
          if (!close || !previousClose) return null;

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
          return null;
        }
      })
    );

    const validQuotes = quotes.filter(q => q !== null);
    
    // Sort by absolute change percentage
    const sorted = validQuotes.sort((a, b) => Math.abs(b!.changePct) - Math.abs(a!.changePct));
    
    const gainers = sorted.filter(q => q!.changePct > 0).slice(0, 5);
    const losers = sorted.filter(q => q!.changePct < 0).slice(0, 5);

    return NextResponse.json({ gainers, losers });
  } catch (error) {
    console.error("Market movers error:", error);
    return NextResponse.json({ gainers: [], losers: [] });
  }
}
