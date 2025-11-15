// components/NewsFeed.tsx
"use client";
import React, { useEffect, useState } from "react";

interface NewsItem {
  title: string;
  publisher: string;
  link: string;
  providerPublishTime: number;
  thumbnail: string | null;
}

export default function NewsFeed({ ticker }: { ticker: string }) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNews();
  }, [ticker]);

  async function fetchNews() {
    setLoading(true);
    try {
      const res = await fetch(`/api/news?ticker=${encodeURIComponent(ticker)}`);
      if (res.ok) {
        const json = await res.json();
        setNews(json.news || []);
      }
    } catch (err) {
      console.error("News fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="news-feed">Loading news...</div>;
  }

  return (
    <div className="news-feed">
      <h3 className="news-title">Latest News - {ticker}</h3>
      <div className="news-items">
        {news.length === 0 ? (
          <div className="news-empty">No news available</div>
        ) : (
          news.slice(0, 8).map((item, idx) => (
            <a
              key={idx}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="news-item"
            >
              {item.thumbnail && (
                <img src={item.thumbnail} alt="" className="news-thumbnail" />
              )}
              <div className="news-content">
                <h4 className="news-item-title">{item.title}</h4>
                <div className="news-meta">
                  <span className="news-publisher">{item.publisher}</span>
                  <span className="news-time">
                    {new Date(item.providerPublishTime * 1000).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
