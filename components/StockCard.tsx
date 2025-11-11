// components/StockCard.tsx
"use client";
import React from "react";

/**
 * StockCard:
 * - Accepts `data` shaped like your API JSON.
 * - Computes change & pct if missing:
 *    1) tries common previousClose fields
 *    2) if absent, falls back to last two non-null `close` values in data.points
 */

function formatNumber(n: number) {
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (a >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (a >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}

function safeNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** find last two valid close values from points array */
function findLastTwoCloses(points: any[] = []) : { last: number | null, prev: number | null } {
  if (!Array.isArray(points) || points.length === 0) return { last: null, prev: null };
  let last: number | null = null;
  let prev: number | null = null;

  // iterate from end to start to find last & previous non-null close
  for (let i = points.length - 1; i >= 0; i--) {
    const c = safeNum(points[i]?.close);
    if (c === null) continue;
    if (last === null) {
      last = c;
    } else if (prev === null) {
      prev = c;
      break;
    }
  }
  return { last, prev };
}

export default function StockCard({ data }: { data: any }) {
  // helpful debug — remove when done
  console.debug("StockCard data:", data);

  const price = safeNum(data?.price ?? data?.regularMarketPrice ?? null);
  let change = safeNum(data?.change ?? data?.regularMarketChange ?? null);
  let pct = safeNum(data?.pct ?? data?.percentage ?? data?.regularMarketChangePercent ?? null);

  // try typical previousClose fields
  const prevCandidates = [
    data?.prevClose,
    data?.previousClose,
    data?.previous_close,
    data?.regularMarketPreviousClose,
    data?.meta?.previousClose,
    data?.meta?.chartPreviousClose,
    data?.previousClosePrice,
  ];
  const prevFromApi = prevCandidates.map(safeNum).find((x) => x !== null) ?? null;

  // If change or pct missing and previous close available, compute them
  if ((change === null || pct === null) && prevFromApi !== null && price !== null) {
    if (change === null) change = Number((price - prevFromApi).toFixed(8));
    if (pct === null && prevFromApi !== 0) pct = Number(((change! / prevFromApi) * 100).toFixed(6));
  }

  // If still missing, fallback to using points array: find last two closes
  if ((change === null || pct === null) && Array.isArray(data?.points) && data.points.length) {
    const { last, prev } = findLastTwoCloses(data.points);
    if (last !== null && prev !== null) {
      // last is the final close, prev is the previous close
      const computedChange = Number((last - prev).toFixed(8));
      const computedPct = prev === 0 ? null : Number(((computedChange / prev) * 100).toFixed(6));
      // only set if missing to avoid overwriting a real API value
      if (change === null) change = computedChange;
      if (pct === null && computedPct !== null) pct = computedPct;
      // if price is missing, adopt last as price
      if (price === null) {
        // NOTE: price variable is const - we won't modify it here; instead we'll read from last when rendering price
      }
    }
  }

  // Last timestamp (accept Date or string or last point time)
  let lastDate: Date | null = null;
  if (data?.last instanceof Date) lastDate = data.last;
  else if (typeof data?.last === "string") {
    const d = new Date(data.last);
    if (!Number.isNaN(d.getTime())) lastDate = d;
  } else if (Array.isArray(data?.points) && data.points.length) {
    // try last point timestamp (ms)
    for (let i = data.points.length - 1; i >= 0; i--) {
      const t = safeNum(data.points[i]?.time) ?? safeNum(data.points[i]?.timestamp);
      if (t !== null) {
        lastDate = new Date(Number(t));
        break;
      }
    }
  }

  // volume/high/low
  const volume = safeNum(data?.volume ?? data?.regularMarketVolume ?? null);
  const high = safeNum(data?.high ?? data?.dayHigh ?? data?.regularMarketDayHigh ?? null);
  const low = safeNum(data?.low ?? data?.dayLow ?? data?.regularMarketDayLow ?? null);

  // display change text
  let changeText = "—";
  if (typeof change === "number") {
    const sign = change > 0 ? "+" : change < 0 ? "−" : "";
    const pctPart = typeof pct === "number" ? ` (${sign}${Math.abs(pct).toFixed(2)}%)` : "";
    changeText = `${sign}$${Math.abs(change).toFixed(2)}${pctPart}`;
  }

  const changeClass =
    typeof change === "number"
      ? change > 0
        ? "price-diff-up"
        : change < 0
        ? "price-diff-down"
        : "price-diff-neutral"
      : "price-diff-neutral";

  // choose price to display: prefer data.price, fall back to last close in points if available
  let displayPrice: number | null = price;
  if (displayPrice === null && Array.isArray(data?.points) && data.points.length) {
    // find last non-null close
    for (let i = data.points.length - 1; i >= 0; i--) {
      const c = safeNum(data.points[i]?.close);
      if (c !== null) {
        displayPrice = c;
        break;
      }
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontSize: 13, color: "rgba(230,238,246,0.75)", marginBottom: 6 }}>
          {data?.companyName || data?.ticker || "Stock"}{" "}
          <span style={{ fontWeight: 700, color: "rgba(230,238,246,0.9)" }}>
            ({data?.ticker ?? "AMZN"})
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
          <div>
            <div className="price-value">{displayPrice !== null ? `$${Number(displayPrice).toFixed(2)}` : "--"}</div>

            <div style={{ marginTop: 8 }} className={changeClass}>
              {changeText}
            </div>

            <div style={{ marginTop: 10, color: "rgba(230,238,246,0.6)", fontSize: 13 }}>
              {lastDate ? `Last: ${lastDate.toLocaleTimeString()}` : "Last: —"}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.02)", paddingTop: 14, display: "flex", gap: 40 }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(170,180,190,0.7)", textTransform: "uppercase", letterSpacing: "1px" }}>High</div>
            <div style={{ marginTop: 8, fontWeight: 700 }}>{high !== null ? `$${Number(high).toFixed(2)}` : "—"}</div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: "rgba(170,180,190,0.7)", textTransform: "uppercase", letterSpacing: "1px" }}>Low</div>
            <div style={{ marginTop: 8, fontWeight: 700 }}>{low !== null ? `$${Number(low).toFixed(2)}` : "—"}</div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: "rgba(170,180,190,0.7)", textTransform: "uppercase", letterSpacing: "1px" }}>Volume</div>
            <div style={{ marginTop: 8, fontWeight: 700 }}>
              {volume != null && Number(volume) > 0 ? formatNumber(Number(volume)) : "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
