// components/WatchlistPanel.tsx
"use client";
import React, { useEffect, useState } from "react";

interface WatchlistItem {
  id: number;
  ticker: string;
  price?: number;
  change?: number;
  changePct?: number;
}

export default function WatchlistPanel({ 
  onSelectTicker, 
  refreshTrigger, 
  priceCache, 
  onRequestPrices 
}: { 
  onSelectTicker?: (ticker: string) => void; 
  refreshTrigger?: number;
  priceCache?: Record<string, any>;
  onRequestPrices?: (tickers: string[]) => Promise<void>;
}) {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [newTicker, setNewTicker] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchWatchlist();
    const interval = setInterval(fetchWatchlistWithPrices, 60000); // refresh prices every 60s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      fetchWatchlistWithPrices();
    }
  }, [refreshTrigger]);

  // Update watchlist with cached prices
  useEffect(() => {
    if (priceCache && Object.keys(priceCache).length > 0) {
      setWatchlist(prev => prev.map(item => {
        const cached = priceCache[item.ticker];
        if (cached && cached.price !== null) {
          return {
            ...item,
            price: cached.price,
            change: cached.change,
            changePct: cached.changePct,
          };
        }
        return item;
      }));
    }
  }, [priceCache]);

  async function fetchWatchlist() {
    try {
      const res = await fetch("/api/watchlist");
      if (res.ok) {
        const json = await res.json();
        setWatchlist(json.watchlist);
        // Fetch prices for each ticker
        fetchPricesForWatchlist(json.watchlist);
      }
    } catch (err) {
      console.error("Watchlist fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchWatchlistWithPrices() {
    const res = await fetch("/api/watchlist");
    if (res.ok) {
      const json = await res.json();
      const tickers = json.watchlist.map((item: any) => item.ticker);
      if (onRequestPrices && tickers.length > 0) {
        // Request price update from parent to update shared cache
        await onRequestPrices(tickers);
      } else {
        // Fallback to individual fetches if no shared cache
        fetchPricesForWatchlist(json.watchlist);
      }
    }
  }

  async function fetchPricesForWatchlist(items: any[]) {
    const updatedItems = await Promise.all(
      items.map(async (item: any) => {
        try {
          const res = await fetch(`/api/stocks?ticker=${item.ticker}&range=1d`);
          if (res.ok) {
            const data = await res.json();
            return {
              ...item,
              price: data.price,
              change: data.change,
              changePct: data.pct,
            };
          }
        } catch (err) {
          // ignore
        }
        return item;
      })
    );
    setWatchlist(updatedItems);
  }

  async function addTicker(e: React.FormEvent) {
    e.preventDefault();
    if (!newTicker.trim() || adding) return;

    setAdding(true);
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: newTicker.trim().toUpperCase() }),
      });

      if (res.ok) {
        setNewTicker("");
        await fetchWatchlist();
      } else {
        const json = await res.json();
        alert(json.error || "Failed to add ticker");
      }
    } catch (err) {
      console.error("Add ticker error:", err);
      alert("Failed to add ticker");
    } finally {
      setAdding(false);
    }
  }

  async function removeTicker(ticker: string) {
    try {
      await fetch("/api/watchlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      fetchWatchlist();
    } catch (err) {
      console.error("Remove ticker error:", err);
    }
  }

  if (loading) {
    return <div className="watchlist-panel">Loading watchlist...</div>;
  }

  return (
    <div className="watchlist-panel">
      <h3 className="watchlist-title">Watchlist</h3>
      
      <form onSubmit={addTicker} className="watchlist-form">
        <input
          type="text"
          placeholder="Add ticker..."
          value={newTicker}
          onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
          className="watchlist-input"
          disabled={adding}
          maxLength={10}
        />
        <button type="submit" className="watchlist-add-btn" disabled={adding || !newTicker.trim()}>
          {adding ? "..." : "+"}
        </button>
      </form>

      <div className="watchlist-items">
        {watchlist.length === 0 ? (
          <div className="watchlist-empty">No tickers in watchlist</div>
        ) : (
          watchlist.map((item) => {
            const hasPrice = item.price != null;
            const isPositive = (item.change || 0) >= 0;

            return (
              <div 
                key={item.id} 
                className="watchlist-item"
                onClick={() => onSelectTicker?.(item.ticker)}
              >
                <div className="watchlist-item-left">
                  <span className="watchlist-ticker">{item.ticker}</span>
                  {hasPrice && (
                    <span className="watchlist-price">${item.price!.toFixed(2)}</span>
                  )}
                </div>
                <div className="watchlist-item-right">
                  {hasPrice && item.changePct != null && (
                    <span className={`watchlist-change ${isPositive ? "positive" : "negative"}`}>
                      {isPositive ? "+" : ""}{item.changePct.toFixed(2)}%
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTicker(item.ticker);
                    }}
                    className="watchlist-remove-btn"
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
