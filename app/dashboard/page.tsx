"use client";

import React, { useEffect, useRef, useState } from "react";
import StockCard from "@/components/StockCard";
import CandleChart from "@/components/CandleChart";
import IntervalSelector, { IntervalType } from "@/components/IntervalSelector";

export default function DashboardPage() {
  const [ticker, setTicker] = useState<string>("AMZN");
  const [interval, setInterval] = useState<IntervalType>("1d");
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    fetchStock(ticker, interval);
    // don't auto-refresh on longer intervals (too slow)
    if (interval === "1d") {
      startInterval();
    }
    return () => stopInterval();
  }, [ticker, interval]);

  function startInterval() {
    stopInterval();
    timerRef.current = window.setInterval(() => fetchStock(ticker, interval), 60_000);
  }

  function stopInterval() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function fetchStock(t: string, range: IntervalType) {
    setLoading(true);
    try {
      const res = await fetch(`/api/stocks?ticker=${encodeURIComponent(t)}&range=${range}`);
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleRefresh(e?: React.FormEvent) {
    if (e) e.preventDefault();
    fetchStock(ticker, interval);
    startInterval();
  }

  return (
    <div className="dashboard-shell">
      <main className="dashboard-inner">
        <div className="dashboard-header">
          <div>
            <h1 className="dash-title">Dashboard</h1>
            <p className="dash-sub">Real-time market overview · Auto-refresh every 60s</p>
          </div>
          <div className="dash-time">
            {lastUpdated ? `Last: ${lastUpdated.toLocaleString()}` : "Last: —"}
          </div>
        </div>

        <div className="dash-card">
          <div className="dash-content">
            <StockCard
              data={{
                ticker: data?.ticker ?? ticker,
                companyName: data?.companyName ?? null,
                price: data?.price ?? null,
                change: data?.change ?? null,
                pct: data?.pct ?? null,
                high: data?.high ?? null,
                low: data?.low ?? null,
                volume: data?.volume ?? null,
                last: lastUpdated,
              }}
            />
            <div className="chart-section">
              <IntervalSelector selected={interval} onChange={setInterval} loading={loading} />
              <CandleChart
                points={data?.points ?? []}
                ticker={data?.ticker ?? ticker}
              />
              <div className="chart-controls">
                <form onSubmit={handleRefresh} className="chart-form">
                  <input
                    className="chart-input"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value)}
                    aria-label="Ticker"
                    title="Ticker (e.g. AMZN)"
                  />
                  <button
                    className="chart-refresh"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? "Loading..." : "Refresh"}
                  </button>
                </form>
                <span className="chart-note">Auto-refresh every 60s</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
