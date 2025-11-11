// app/layout.tsx
import "./globals.css";
import React from "react";
import NavBar from "@/components/NavBar";

export const metadata = {
  title: "Live Stocks — Login",
  description: "Professional live stock dashboard"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
