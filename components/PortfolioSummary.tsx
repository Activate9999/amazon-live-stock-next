// components/PortfolioSummary.tsx
"use client";
import React, { useEffect, useState } from "react";

interface PortfolioData {
  portfolio: any[];
  cashBalance: number;
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPct: number;
}

export default function PortfolioSummary() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    fetchPortfolio();
    const interval = setInterval(fetchPortfolio, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  async function fetchPortfolio() {
    try {
      const res = await fetch("/api/portfolio");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setError(null);
      } else {
        const errorData = await res.json();
        setError(errorData.error || "Failed to load portfolio");
      }
    } catch (err) {
      console.error("Portfolio fetch error:", err);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function resetBalance() {
    if (!confirm("Reset your cash balance to $10,000?")) {
      return;
    }

    setResetting(true);
    try {
      const res = await fetch("/api/portfolio/reset-balance", {
        method: "POST",
      });
      if (res.ok) {
        await fetchPortfolio(); // Refresh portfolio data
      }
    } catch (err) {
      console.error("Reset balance error:", err);
    } finally {
      setResetting(false);
    }
  }

  if (loading) {
    return (
      <div className="portfolio-summary">
        <h3 className="portfolio-title">Portfolio Summary</h3>
        <div className="portfolio-loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="portfolio-summary">
        <h3 className="portfolio-title">Portfolio Summary</h3>
        <div className="portfolio-error">{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="portfolio-summary">
        <h3 className="portfolio-title">Portfolio Summary</h3>
        <div className="portfolio-error">No data available</div>
      </div>
    );
  }

  const totalAccountValue = data.totalValue + data.cashBalance;
  const isPositive = data.totalGainLoss >= 0;

  return (
    <div className="portfolio-summary">
      <div className="portfolio-header">
        <h3 className="portfolio-title">Portfolio Summary</h3>
        {data && (
          <button
            className="reset-balance-btn"
            onClick={resetBalance}
            disabled={resetting}
          >
            {resetting ? "Resetting..." : "Reset Cash"}
          </button>
        )}
      </div>
      <div className="portfolio-grid">
        <div className="portfolio-stat">
          <span className="stat-label">Total Value</span>
          <span className="stat-value">${totalAccountValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="portfolio-stat">
          <span className="stat-label">Cash Balance</span>
          <span className="stat-value">${data.cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="portfolio-stat">
          <span className="stat-label">Holdings Value</span>
          <span className="stat-value">${data.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="portfolio-stat">
          <span className="stat-label">Total Gain/Loss</span>
          <span className={`stat-value ${isPositive ? "text-green" : "text-red"}`}>
            {isPositive ? "+" : ""}${data.totalGainLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="stat-pct"> ({isPositive ? "+" : ""}{data.totalGainLossPct.toFixed(2)}%)</span>
          </span>
        </div>
      </div>

      {data.portfolio.length > 0 && (
        <div className="holdings-table-wrapper">
          <table className="holdings-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Qty</th>
                <th>Avg Cost</th>
                <th>Current</th>
                <th>Value</th>
                <th>Gain/Loss</th>
              </tr>
            </thead>
            <tbody>
              {data.portfolio.map((holding: any) => {
                const currentPrice = holding.currentPrice || holding.avgBuyPrice;
                const value = currentPrice * holding.quantity;
                const cost = holding.avgBuyPrice * holding.quantity;
                const gainLoss = value - cost;
                const gainLossPct = (gainLoss / cost) * 100;
                const isPos = gainLoss >= 0;

                return (
                  <tr key={holding.id}>
                    <td className="font-bold">{holding.ticker}</td>
                    <td>{holding.quantity}</td>
                    <td>${holding.avgBuyPrice.toFixed(2)}</td>
                    <td>${currentPrice.toFixed(2)}</td>
                    <td>${value.toFixed(2)}</td>
                    <td className={isPos ? "text-green" : "text-red"}>
                      {isPos ? "+" : ""}${gainLoss.toFixed(2)} ({isPos ? "+" : ""}{gainLossPct.toFixed(2)}%)
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
