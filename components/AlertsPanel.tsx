// components/AlertsPanel.tsx
"use client";
import React, { useEffect, useState } from "react";

interface Alert {
  id: number;
  ticker: string;
  condition: string;
  targetPrice: number;
  isActive: boolean;
  triggered: boolean;
  createdAt: string;
}

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    ticker: "",
    condition: "above",
    targetPrice: "",
  });

  useEffect(() => {
    fetchAlerts();
  }, []);

  async function fetchAlerts() {
    try {
      const res = await fetch("/api/alerts");
      if (res.ok) {
        const json = await res.json();
        setAlerts(json.alerts);
      }
    } catch (err) {
      console.error("Alerts fetch error:", err);
    }
  }

  async function createAlert(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setFormData({ ticker: "", condition: "above", targetPrice: "" });
        setShowForm(false);
        fetchAlerts();
      } else {
        const json = await res.json();
        alert(json.error || "Failed to create alert");
      }
    } catch (err) {
      console.error("Create alert error:", err);
    }
  }

  async function deleteAlert(alertId: number) {
    try {
      await fetch("/api/alerts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId }),
      });
      fetchAlerts();
    } catch (err) {
      console.error("Delete alert error:", err);
    }
  }

  async function toggleAlert(alertId: number, isActive: boolean) {
    try {
      await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId, isActive }),
      });
      fetchAlerts();
    } catch (err) {
      console.error("Toggle alert error:", err);
    }
  }

  return (
    <div className="alerts-panel">
      <div className="alerts-header">
        <h3 className="alerts-title">Price Alerts</h3>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="alerts-add-btn"
        >
          {showForm ? "Cancel" : "+ New Alert"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createAlert} className="alerts-form">
          <input
            type="text"
            placeholder="Ticker"
            value={formData.ticker}
            onChange={(e) => setFormData({ ...formData, ticker: e.target.value.toUpperCase() })}
            required
            className="alerts-input"
          />
          <select
            value={formData.condition}
            onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
            className="alerts-select"
          >
            <option value="above">Above</option>
            <option value="below">Below</option>
          </select>
          <input
            type="number"
            placeholder="Target Price"
            value={formData.targetPrice}
            onChange={(e) => setFormData({ ...formData, targetPrice: e.target.value })}
            step="0.01"
            required
            className="alerts-input"
          />
          <button type="submit" className="alerts-submit-btn">Create</button>
        </form>
      )}

      <div className="alerts-list">
        {alerts.length === 0 ? (
          <div className="alerts-empty">No alerts set</div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className={`alert-item ${alert.triggered ? "triggered" : ""} ${!alert.isActive ? "inactive" : ""}`}>
              <div className="alert-info">
                <span className="alert-ticker">{alert.ticker}</span>
                <span className="alert-condition">
                  {alert.condition === "above" ? "≥" : "≤"} ${alert.targetPrice.toFixed(2)}
                </span>
                {alert.triggered && <span className="alert-badge">Triggered</span>}
                {!alert.isActive && <span className="alert-badge inactive">Inactive</span>}
              </div>
              <div className="alert-actions">
                <button
                  onClick={() => toggleAlert(alert.id, !alert.isActive)}
                  className="alert-toggle-btn"
                  title={alert.isActive ? "Deactivate" : "Activate"}
                >
                  {alert.isActive ? "⏸" : "▶"}
                </button>
                <button
                  onClick={() => deleteAlert(alert.id)}
                  className="alert-delete-btn"
                  title="Delete"
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
