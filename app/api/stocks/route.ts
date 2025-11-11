// /app/api/stocks/route.ts
import { NextResponse } from "next/server";

type YahooChartResponse = any;
const YAHOO_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const DEFAULT_SYMBOL = "AMZN";

/**
 * helper: convert Yahoo's timestamps+quote arrays into points array
 * Yahoo `timestamp` array are seconds (UNIX epoch in seconds).
 */
function buildPoints(result: YahooChartResponse["chart"]["result"][0]) {
  const tsArr: number[] = result.timestamp || [];
  const quote = result.indicators?.quote?.[0];
  if (!quote || !tsArr || tsArr.length === 0) return [];

  const opens = quote.open || [];
  const highs = quote.high || [];
  const lows = quote.low || [];
  const closes = quote.close || [];
  const volumes = quote.volume || [];

  const pts: Array<Record<string, any>> = [];
  for (let i = 0; i < tsArr.length; i++) {
    const tsSec = tsArr[i];
    const open = opens[i] ?? null;
    const high = highs[i] ?? null;
    const low = lows[i] ?? null;
    const close = closes[i] ?? null;
    const volume = volumes[i] ?? 0;

    // ignore entirely null datapoints (pre/post or missing close)
    if (close === null || close === undefined) continue;

    pts.push({
      time: tsSec * 1000, // convert to ms for JS Date
      open,
      high,
      low,
      close,
      volume,
    });
  }

  return pts;
}

/**
 * Compute high/low/volume across available points (non-null).
 */
function aggFromPoints(points: Array<any>) {
  if (!points || points.length === 0) {
    return { high: null, low: null, volume: null };
  }
  let high = -Infinity;
  let low = Infinity;
  let volSum = 0;
  for (const p of points) {
    if (p.high != null && p.high > high) high = p.high;
    if (p.low != null && p.low < low) low = p.low;
    if (p.volume != null) volSum += Number(p.volume) || 0;
  }
  return {
    high: isFinite(high) ? high : null,
    low: isFinite(low) ? low : null,
    volume: volSum || null,
  };
}

/** choose best company name from Yahoo meta */
function pickCompanyName(meta: any, jsonResult: any) {
  // check meta fields used by Yahoo responses
  const candidates = [
    meta?.longName,
    meta?.shortName,
    meta?.instrumentName,
    meta?.name,
    jsonResult?.quote?.longName,
    jsonResult?.quote?.shortName,
    jsonResult?.meta?.longName,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length) return c.trim();
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const symbol = (url.searchParams.get("ticker") || DEFAULT_SYMBOL).toUpperCase();
    const range = url.searchParams.get("range") || "1d"; // default to 1d
    
    // Map range to appropriate interval
    let interval = "1m"; // default
    if (["5d", "1mo", "3mo", "6mo"].includes(range)) {
      interval = "1d"; // daily candles for longer ranges
    } else if (["1y", "5y", "max"].includes(range)) {
      interval = "1wk"; // weekly candles for very long ranges
    }

    const yahooUrl = `${YAHOO_BASE}/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}&includePrePost=true`;

    // Use a common browser UA. Yahoo sometimes blocks/no-ops for missing UA.
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      Accept: "application/json, text/javascript, */*; q=0.01",
    };

    // no-store to reduce stale caching and get near-live
    const res = await fetch(yahooUrl, { headers, cache: "no-store" });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Yahoo API returned ${res.status}`, fromCache: false },
        { status: 502 }
      );
    }

    const json: YahooChartResponse = await res.json();
    const result = json?.chart?.result?.[0];

    if (!result) {
      return NextResponse.json({ error: "No result from Yahoo", fromCache: false }, { status: 502 });
    }

    const points = buildPoints(result);

    // Choose most recent valid point
    const lastPoint = points.length ? points[points.length - 1] : null;

    // previous close: try meta.previousClose, fallback to second-last close
    const meta = result.meta || {};
    const prevClose =
      typeof meta.previousClose === "number"
        ? meta.previousClose
        : points.length >= 2
        ? points[points.length - 2].close
        : null;

    const price = lastPoint ? lastPoint.close : meta?.regularMarketPrice ?? null;
    const change = price != null && prevClose != null ? Number(price) - Number(prevClose) : null;
    const pct = change != null && prevClose
      ? (Number(change) / Number(prevClose)) * 100
      : null;

    const { high, low, volume } = aggFromPoints(points);
    // If aggregation didn't yield volume (null or 0), try common meta fields as a fallback
    const metaVolumeFallback = typeof meta?.regularMarketVolume === 'number'
      ? meta.regularMarketVolume
      : typeof meta?.volume === 'number'
      ? meta.volume
      : null;
    const volumeOut = volume != null ? Number(volume) : metaVolumeFallback != null ? Number(metaVolumeFallback) : null;

    // timestamp as ISO in UTC of the latest datapoint (or now if missing)
    const timestampIso = lastPoint ? new Date(lastPoint.time).toISOString() : new Date().toISOString();

    // pick company name (if available)
    const companyName = pickCompanyName(meta, result) || null;
    const shortName = meta?.shortName ?? null;

    const out = {
      symbol,
      companyName,      // <-- full company name (may be null)
      shortName,        // <-- short name if available
      price: price != null ? Number(price) : null,
      change: change != null ? Number(Number(change).toFixed(4)) : null,
      pct: pct != null ? Number(Number(pct).toFixed(4)) : null,
      high: high != null ? Number(Number(high).toFixed(4)) : null,
      low: low != null ? Number(Number(low).toFixed(4)) : null,
  volume: volumeOut != null ? Number(volumeOut) : null,
      timestamp: timestampIso,
      fromCache: false,
      _meta: {
        yahooMeta: {
          exchange: meta?.exchange ?? null,
          currency: meta?.currency ?? null,
          timezone: meta?.exchangeTimezoneName ?? meta?.timezone ?? null,
          regularMarketTime: meta?.regularMarketTime ?? null,
          longName: meta?.longName ?? null,
          shortName: meta?.shortName ?? null,
        },
        pointsCount: points.length,
      },
      points, // include points for frontend charting (time in ms)
    };

    return NextResponse.json(out, { status: 200 });
  } catch (err: any) {
    console.error("stocks route error:", err);
    return NextResponse.json({ error: String(err), fromCache: false }, { status: 500 });
  }
}
