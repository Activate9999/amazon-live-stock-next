// app/api/news/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Simple news aggregator - uses Yahoo Finance news
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const ticker = url.searchParams.get("ticker") || "AMZN";

    // Yahoo Finance news endpoint
    const newsUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(ticker)}&quotesCount=0&newsCount=10`;
    
    const response = await fetch(newsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      return NextResponse.json({ news: [] });
    }

    const data = await response.json();
    const news = (data.news || []).map((item: any) => ({
      title: item.title,
      publisher: item.publisher,
      link: item.link,
      providerPublishTime: item.providerPublishTime,
      thumbnail: item.thumbnail?.resolutions?.[0]?.url || null,
    }));

    return NextResponse.json({ news });
  } catch (error) {
    console.error("News API error:", error);
    return NextResponse.json({ news: [] });
  }
}
