"use client";
import React from "react";

export type IntervalType = "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "5y" | "max";

interface IntervalSelectorProps {
  selected: IntervalType;
  onChange: (interval: IntervalType) => void;
  loading?: boolean;
}

const INTERVALS: { label: string; value: IntervalType }[] = [
  { label: "1D", value: "1d" },
  { label: "5D", value: "5d" },
  { label: "1M", value: "1mo" },
  { label: "3M", value: "3mo" },
  { label: "6M", value: "6mo" },
  { label: "1Y", value: "1y" },
  { label: "5Y", value: "5y" },
  { label: "MAX", value: "max" },
];

export default function IntervalSelector({ selected, onChange, loading }: IntervalSelectorProps) {
  return (
    <div style={styles.container}>
      {INTERVALS.map((interval) => (
        <button
          key={interval.value}
          onClick={() => onChange(interval.value)}
          disabled={loading}
          style={{
            ...styles.button,
            ...(selected === interval.value ? styles.buttonActive : styles.buttonInactive),
            ...(loading ? styles.buttonDisabled : {}),
          }}
        >
          {interval.label}
        </button>
      ))}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
    padding: "12px 0",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    marginBottom: "16px",
  },
  button: {
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: 600,
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  buttonActive: {
    background: "linear-gradient(135deg, #FFC107 0%, #FFB300 100%)",
    color: "#081226",
    border: "1px solid #FFB300",
    boxShadow: "0 4px 12px rgba(255, 193, 7, 0.3)",
  },
  buttonInactive: {
    background: "rgba(255,255,255,0.02)",
    color: "rgba(230,238,246,0.7)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
};
