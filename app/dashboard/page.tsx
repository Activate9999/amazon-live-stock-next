"use client";

import React, { useEffect, useRef, useState } from "react";
import StockCard from "@/components/StockCard";
import CandleChart from "@/components/CandleChart";
import IntervalSelector, { IntervalType } from "@/components/IntervalSelector";
import PortfolioSummary from "@/components/PortfolioSummary";
import WatchlistPanel from "@/components/WatchlistPanel";
import AlertsPanel from "@/components/AlertsPanel";
import NewsFeed from "@/components/NewsFeed";
import TradingWidget from "@/components/TradingWidget";
import MarketMovers from "@/components/MarketMovers";
import RecentTrades from "@/components/RecentTrades";
import NotificationsPanel from "@/components/NotificationsPanel";

export default function DashboardPage() {
  const [ticker, setTicker] = useState<string>("AMZN");
  const [interval, setInterval] = useState<IntervalType>("1d");
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [priceCache, setPriceCache] = useState<Record<string, any>>({});
  const timerRef = useRef<number | null>(null);
  const alertCheckRef = useRef<number | null>(null);

  useEffect(() => {
    fetchStock(ticker, interval);
    // don't auto-refresh on longer intervals (too slow)
    if (interval === "1d") {
      startInterval();
    }
    
    // Start alert checking every 30 seconds
    startAlertChecking();
    
    return () => {
      stopInterval();
      stopAlertChecking();
    };
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

  function startAlertChecking() {
    stopAlertChecking();
    // Check alerts immediately
    checkAlerts();
    // Update portfolio prices immediately
    updatePortfolioPrices();
    // Then check every 30 seconds
    alertCheckRef.current = window.setInterval(() => {
      checkAlerts();
      updatePortfolioPrices();
    }, 30_000);
  }

  function stopAlertChecking() {
    if (alertCheckRef.current) {
      clearInterval(alertCheckRef.current);
      alertCheckRef.current = null;
    }
  }

  async function checkAlerts() {
    try {
      await fetch("/api/alerts/check", { method: "POST" });
    } catch (err) {
      console.error("Alert check error:", err);
    }
  }

  async function updatePortfolioPrices() {
    try {
      await fetch("/api/portfolio/update-prices", { method: "POST" });
    } catch (err) {
      console.error("Portfolio price update error:", err);
    }
  }

  async function updateSharedPriceCache(tickers: string[]) {
    try {
      const res = await fetch("/api/stock-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickers }),
      });
      if (res.ok) {
        const data = await res.json();
        const newCache: Record<string, any> = {};
        data.prices.forEach((p: any) => {
          newCache[p.ticker] = p;
        });
        setPriceCache(newCache);
      }
    } catch (err) {
      console.error("Price cache update error:", err);
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
    setRefreshKey(prev => prev + 1); // Trigger refresh for all components
    startInterval();
  }

  function handleTickerChange(newTicker: string) {
    setTicker(newTicker);
    setInterval("1d");
  }

  function handleTradeComplete() {
    setRefreshKey(prev => prev + 1); // Force refresh portfolio and trades
  }

  return (
    <div className="dashboard-shell">
      <main className="dashboard-inner">
        {/* Top Bar */}
        <div className="dashboard-header">
          <div>
            <h1 className="dash-title">Dashboard</h1>
            <p className="dash-sub">Real-time market overview · Auto-refresh every 60s</p>
          </div>
          <div className="dash-header-actions">
            <div className="dash-time">
              {lastUpdated ? `Last: ${lastUpdated.toLocaleString()}` : "Last: —"}
            </div>
            <NotificationsPanel key={refreshKey} />
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="dashboard-grid">
          {/* Left Column - Portfolio & Watchlist */}
          <div className="dashboard-left-col">
            <PortfolioSummary key={refreshKey} />
            <WatchlistPanel onSelectTicker={handleTickerChange} refreshTrigger={refreshKey} priceCache={priceCache} onRequestPrices={updateSharedPriceCache} />
            <MarketMovers onSelectTicker={handleTickerChange} refreshTrigger={refreshKey} priceCache={priceCache} onRequestPrices={updateSharedPriceCache} />
          </div>

          {/* Center Column - Chart & Stock Info */}
          <div className="dashboard-center-col">
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
                        onChange={(e) => setTicker(e.target.value.toUpperCase())}
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

            {/* News Feed */}
            <NewsFeed ticker={ticker} />
          </div>

          {/* Right Column - Trading & Alerts */}
          <div className="dashboard-right-col">
            <TradingWidget 
              ticker={ticker} 
              currentPrice={data?.price ?? null}
              onTradeComplete={handleTradeComplete}
            />
            <AlertsPanel />
            
            {/* Recent Trades */}
            <RecentTrades key={refreshKey} />
          </div>
        </div>
      </main>
    </div>
  );
}
