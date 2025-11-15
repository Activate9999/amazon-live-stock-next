// components/TradingWidget.tsx
"use client";
import React, { useState } from "react";

export default function TradingWidget({ 
  ticker, 
  currentPrice,
  onTradeComplete 
}: { 
  ticker: string; 
  currentPrice: number | null;
  onTradeComplete?: () => void;
}) {
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cashBalance, setCashBalance] = useState<number>(0);
  const [holdings, setHoldings] = useState<any[]>([]);

  React.useEffect(() => {
    fetchCashBalance();
  }, [ticker]); // Re-fetch when ticker changes

  async function fetchCashBalance() {
    try {
      const res = await fetch("/api/portfolio");
      if (res.ok) {
        const data = await res.json();
        setCashBalance(data.cashBalance || 0);
        setHoldings(data.portfolio || []);
      }
    } catch (err) {
      console.error("Failed to fetch cash balance:", err);
    }
  }

  function setMaxQuantity() {
    if (!currentPrice || currentPrice <= 0) return;
    
    if (tradeType === "buy") {
      const fee = 0.001; // 0.1% fee
      const maxAffordable = cashBalance / (currentPrice * (1 + fee));
      const rounded = Math.floor(maxAffordable * 100) / 100; // Round down to 2 decimals
      setQuantity(rounded > 0 ? rounded.toString() : "0");
    } else {
      // Sell: find holdings for this ticker
      const holding = holdings.find(h => h.ticker === ticker);
      if (holding && holding.quantity > 0) {
        setQuantity(holding.quantity.toString());
      } else {
        setQuantity("0");
      }
    }
  }

  async function executeTrade(e: React.FormEvent) {
    e.preventDefault();
    
    setError(null);
    setSuccess(null);
    
    if (!currentPrice || !quantity) {
      setError("Invalid trade parameters");
      return;
    }

    const qty = parseFloat(quantity);
    if (qty <= 0) {
      setError("Quantity must be positive");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker,
          type: tradeType,
          quantity: qty,
          price: currentPrice,
        }),
      });

      if (res.ok) {
        const message = `${tradeType === "buy" ? "Bought" : "Sold"} ${qty} shares of ${ticker} at $${currentPrice.toFixed(2)}`;
        setSuccess(message);
        setQuantity("");
        fetchCashBalance(); // Refresh cash balance
        onTradeComplete?.();
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const json = await res.json();
        setError(json.error || "Trade failed");
      }
    } catch (err) {
      console.error("Trade error:", err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const total = currentPrice && quantity ? parseFloat(quantity) * currentPrice : 0;
  const fee = total * 0.001; // 0.1% fee

  return (
    <div className="trading-widget">
      <h3 className="trading-title">Trade {ticker}</h3>
      
      {!currentPrice ? (
        <div className="trading-no-price">Loading price...</div>
      ) : (
        <>
          <div className="trading-price">
            Current Price: <span className="font-bold">${currentPrice.toFixed(2)}</span>
          </div>

          <div className="trading-tabs">
            <button
              className={`trading-tab ${tradeType === "buy" ? "active buy" : ""}`}
              onClick={() => setTradeType("buy")}
            >
              Buy
            </button>
            <button
              className={`trading-tab ${tradeType === "sell" ? "active sell" : ""}`}
              onClick={() => setTradeType("sell")}
            >
              Sell
            </button>
          </div>

          <form onSubmit={executeTrade} className="trading-form">
            {error && <div className="trading-error">{error}</div>}
            {success && <div className="trading-success">{success}</div>}
            
            <div className="trading-input-group">
              <label className="trading-label">Quantity</label>
              <div className="trading-input-with-max">
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  step="0.01"
                  min="0.01"
                  required
                  className="trading-input"
                  placeholder="0"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={setMaxQuantity}
                  className="trading-max-btn"
                  disabled={loading || !currentPrice}
                >
                  MAX
                </button>
              </div>
              {tradeType === "buy" ? (
                <div className="trading-balance-hint">Available: ${cashBalance.toFixed(2)}</div>
              ) : (
                <div className="trading-balance-hint">
                  Available: {holdings.find(h => h.ticker === ticker)?.quantity || 0} shares
                </div>
              )}
            </div>

            {quantity && (
              <div className="trading-summary">
                <div className="trading-summary-row">
                  <span>Subtotal:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="trading-summary-row">
                  <span>Fee (0.1%):</span>
                  <span>${fee.toFixed(2)}</span>
                </div>
                <div className="trading-summary-row total">
                  <span>Total:</span>
                  <span>${(tradeType === "buy" ? total + fee : total - fee).toFixed(2)}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !quantity}
              className={`trading-submit-btn ${tradeType}`}
            >
              {loading ? "Processing..." : tradeType === "buy" ? "Buy Shares" : "Sell Shares"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
