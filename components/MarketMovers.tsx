// components/MarketMovers.tsx
"use client";
import React, { useEffect, useState } from "react";

interface Mover {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
}

export default function MarketMovers({ 
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
  const [gainers, setGainers] = useState<Mover[]>([]);
  const [losers, setLosers] = useState<Mover[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMovers();
    const interval = setInterval(fetchMovers, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      fetchMovers();
    }
  }, [refreshTrigger]);

  // Update movers with cached prices
  useEffect(() => {
    if (priceCache && Object.keys(priceCache).length > 0) {
      updateMoversWithCache();
    }
  }, [priceCache]);

  async function fetchMovers() {
    try {
      const res = await fetch("/api/market-movers");
      if (res.ok) {
        const json = await res.json();
        const allTickers = [...json.gainers, ...json.losers].map((m: Mover) => m.ticker);
        setGainers(json.gainers || []);
        setLosers(json.losers || []);
        // Request price update for all movers
        if (onRequestPrices && allTickers.length > 0) {
          await onRequestPrices(allTickers);
        }
      }
    } catch (err) {
      console.error("Market movers fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  function updateMoversWithCache() {
    if (!priceCache) return;
    
    setGainers(prev => prev.map(mover => {
      const cached = priceCache[mover.ticker];
      if (cached && cached.price !== null) {
        return {
          ...mover,
          price: cached.price,
          change: cached.change,
          changePct: cached.changePct,
        };
      }
      return mover;
    }));
    
    setLosers(prev => prev.map(mover => {
      const cached = priceCache[mover.ticker];
      if (cached && cached.price !== null) {
        return {
          ...mover,
          price: cached.price,
          change: cached.change,
          changePct: cached.changePct,
        };
      }
      return mover;
    }));
  }

  if (loading) {
    return <div className="market-movers">Loading market movers...</div>;
  }

  return (
    <div className="market-movers">
      <h3 className="movers-title">Market Movers</h3>
      
      <div className="movers-section">
        <h4 className="movers-subtitle gainers">Top Gainers</h4>
        <div className="movers-list">
          {gainers.length === 0 ? (
            <div className="movers-empty">No data</div>
          ) : (
            gainers.map((mover) => (
              <div 
                key={mover.ticker} 
                className="mover-item"
                onClick={() => onSelectTicker?.(mover.ticker)}
              >
                <div className="mover-left">
                  <span className="mover-ticker">{mover.ticker}</span>
                  <span className="mover-name">{mover.name}</span>
                </div>
                <div className="mover-right">
                  <span className="mover-price">${mover.price.toFixed(2)}</span>
                  <span className="mover-change positive">
                    +{mover.changePct.toFixed(2)}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="movers-section">
        <h4 className="movers-subtitle losers">Top Losers</h4>
        <div className="movers-list">
          {losers.length === 0 ? (
            <div className="movers-empty">No data</div>
          ) : (
            losers.map((mover) => (
              <div 
                key={mover.ticker} 
                className="mover-item"
                onClick={() => onSelectTicker?.(mover.ticker)}
              >
                <div className="mover-left">
                  <span className="mover-ticker">{mover.ticker}</span>
                  <span className="mover-name">{mover.name}</span>
                </div>
                <div className="mover-right">
                  <span className="mover-price">${mover.price.toFixed(2)}</span>
                  <span className="mover-change negative">
                    {mover.changePct.toFixed(2)}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
