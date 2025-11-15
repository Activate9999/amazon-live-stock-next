// components/RecentTrades.tsx
"use client";
import React, { useEffect, useState } from "react";

interface Trade {
  id: number;
  ticker: string;
  type: string;
  quantity: number;
  price: number;
  total: number;
  fee: number;
  executedAt: string;
}

export default function RecentTrades() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    fetchTrades();
  }, []);

  async function fetchTrades() {
    try {
      const res = await fetch("/api/trades");
      if (res.ok) {
        const json = await res.json();
        setTrades(json.trades || []);
      }
    } catch (err) {
      console.error("Trades fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function clearAllTrades() {
    if (!confirm("Are you sure you want to clear all trade history? This cannot be undone.")) {
      return;
    }

    setClearing(true);
    try {
      const res = await fetch("/api/trades", {
        method: "DELETE",
      });
      if (res.ok) {
        setTrades([]);
      }
    } catch (err) {
      console.error("Clear trades error:", err);
    } finally {
      setClearing(false);
    }
  }

  // Expose refetch for parent components
  React.useImperativeHandle(
    React.useRef(null),
    () => ({ refetch: fetchTrades }),
    []
  );

  if (loading) {
    return <div className="recent-trades">Loading trades...</div>;
  }

  return (
    <div className="recent-trades">
      <div className="trades-header">
        <h3 className="trades-title">Recent Trades</h3>
        {trades.length > 0 && (
          <button
            className="clear-trades-btn"
            onClick={clearAllTrades}
            disabled={clearing}
          >
            {clearing ? "Clearing..." : "Clear All"}
          </button>
        )}
      </div>
      
      {trades.length === 0 ? (
        <div className="trades-empty">No trades yet</div>
      ) : (
        <div className="trades-table-wrapper">
          <table className="trades-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Ticker</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.id}>
                  <td>{new Date(trade.executedAt).toLocaleString()}</td>
                  <td>
                    <span className={`trade-type-badge ${trade.type}`}>
                      {trade.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="font-bold">{trade.ticker}</td>
                  <td>{trade.quantity}</td>
                  <td>${trade.price.toFixed(2)}</td>
                  <td>${trade.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
