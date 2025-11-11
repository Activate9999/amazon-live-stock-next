// components/CandleChart.tsx
"use client";
import dynamic from "next/dynamic";
import React from "react";

const Plot: any = dynamic(() => import("react-plotly.js"), { ssr: false });

function fmtDate(d: Date) {
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CandleChart({ points, ticker }: { points: any[]; ticker: string }) {
  const filtered = (points || []).filter((p) => p && p.close != null);
  const x = filtered.map((p) => new Date(p.time));
  const y = filtered.map((p) => p.close);
  const vol = filtered.map((p) => (p.volume != null ? Number(p.volume) : null));

  if (!x.length) {
    return <div className="w-full h-64 flex items-center justify-center text-gray-400">No chart data</div>;
  }

  const priceTrace: any = {
    x,
    y,
    type: "scatter",
    mode: "lines", // keep markers off to avoid clutter
    line: { color: "#F6C36A", width: 3, shape: "spline" },
    hoverinfo: "text",
    hovertemplate:
      `<span style="font-weight:700">%{customdata[0]}</span><br>` + // formatted date
      `<span style="color:#081018;font-weight:700">Price:</span> $%{y:.2f}<extra></extra>`,
    // pass customdata for formatted date
    customdata: x.map((d) => [fmtDate(new Date(d))]),
    name: ticker,
  };

  const hasVolume = vol.some((v) => v != null);
  const volumeTrace: any = {
    x,
    y: vol,
    type: "bar",
    marker: { color: "rgba(246,195,106,0.16)" },
    yaxis: "y2",
    hoverinfo: "none",
    name: "volume",
  };

  const layout: any = {
    margin: { l: 48, r: 20, t: 8, b: 40 },
    grid: { rows: 2, columns: 1, roworder: "top to bottom", subplots: [["xy"], ["xy2"]] },
    xaxis: {
      domain: [0, 1],
      showgrid: false,
      tickfont: { color: "#9AA4AF" },
      zeroline: false,
      showspikes: false, // explicitly turn off spikelines
    },
    yaxis: {
      domain: [0.22, 1],
      showgrid: true,
      gridcolor: "rgba(255,255,255,0.03)",
      tickfont: { color: "#9AA4AF" },
      zeroline: false,
      showspikes: false,
    },
    yaxis2: {
      domain: [0, 0.18],
      showgrid: false,
      tickfont: { color: "#9AA4AF" },
      zeroline: false,
      anchor: "x",
    },

    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    autosize: true,
    height: 340,
    showlegend: false,

    // IMPORTANT: use closest so there is no vertical "unified" line
    hovermode: "closest",
    hoverdistance: 20, // smaller distance to pick closest point
    hoverlabel: {
      bgcolor: "#F6C36A",
      font: { color: "#081018", size: 12, family: "Montserrat, system-ui" },
      bordercolor: "rgba(0,0,0,0.09)",
      namelength: -1,
    },
  };

  // subtle hover marker: Plotly doesn't show a single moving dot by default without custom overlay.
  // We can add a light, semi-transparent marker overlay for visual emphasis on the line itself (not individual markers).
  // Keep markers off to avoid clutter; the tooltip now appears near the nearest point and is styled.
  return (
    <div className="w-full h-64 rounded-md overflow-hidden">
      <Plot
        data={hasVolume ? [priceTrace, volumeTrace] : [priceTrace]}
        layout={layout}
        config={{
          responsive: true,
          displayModeBar: false,
          scrollZoom: false,
          displaylogo: false,
        }}
        useResizeHandler={true}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
