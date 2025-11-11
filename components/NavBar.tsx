// components/NavBar.tsx
"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

export default function NavBar() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // fetch user on mount and whenever the route changes so NavBar updates after login redirects
  useEffect(() => {
    let mounted = true;
    async function fetchMe() {
      try {
        const r = await fetch("/api/auth/me");
        const j = await r.json();
        if (!mounted) return;
        if (j && j.user && j.user.email) setUserEmail(j.user.email);
        else setUserEmail(null);
      } catch (err) {
        if (!mounted) return;
        setUserEmail(null);
      }
    }
    fetchMe();
    return () => { mounted = false; };
  }, [pathname]);

  async function handleLogout() {
    try {
      // call logout endpoint (POST)
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error(e);
    } finally {
      router.push("/auth/login");
      setTimeout(() => location.reload(), 80);
    }
  }

  // simple toast state for friendly in-UI messages (replaces alert)
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  function handleDashboardClick(e?: React.MouseEvent) {
    // if not logged in or on auth pages, prevent navigation and show toast
    if ((pathname && pathname.startsWith("/auth")) || !userEmail) {
      e?.preventDefault?.();
      setToast("Please login first to access the dashboard");
      return;
    }
    // allow normal Link behavior (we'll navigate programmatically to be safe)
    e?.preventDefault?.();
    router.push("/dashboard");
  }

  async function handleHomeClick(e?: React.MouseEvent) {
    // when logged in, ask the user if they want to logout before going home
    if (!userEmail) {
      // let the Link act normally for unauthenticated users (navigate to home)
      return;
    }
    e?.preventDefault?.();
    const ok = confirm("Do you want to logout?");
    if (ok) {
      // User confirmed logout
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch (err) {
        console.error(err);
      }
      // Immediately clear user state so NavBar updates
      setUserEmail(null);
      router.push("/auth/login");
      // No reload needed - auth state is already cleared
    }
    // If user cancels, do nothing - stay on current page
  }

  return (
    <header>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className="logo-badge">A</div>
        <div style={{ color: "rgba(230,238,246,0.95)", fontWeight: 800 }}>
          LiveStocks
          <div style={{ fontSize: 12, fontWeight: 500, color: "rgba(230,238,246,0.75)" }}>Real-time dashboard</div>
        </div>
      </div>

      <nav className="nav-links" style={{ alignItems: "center", position: "relative" }}>
  <Link href="/" className="nav-link" onClick={handleHomeClick}>Home</Link>
        <Link href="/dashboard" className="nav-link" onClick={handleDashboardClick}>Dashboard</Link>

        {userEmail ? (
          <>
            <div className="user-chip" title={userEmail}>
              <span className="user-avatar">A</span>
              <span className="user-email">{userEmail}</span>
            </div>

            <button
              onClick={handleLogout}
              className="nav-logout"
              title="Logout"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/auth/login" className="nav-link">Login</Link>
            <Link href="/auth/register" className="nav-cta">Get started</Link>
          </>
        )}
        {/* toast */}
        {toast && (
          <div style={{ position: "absolute", right: 0, top: "110%", background: "rgba(255,180,60,0.95)", color: "#081226", padding: "8px 12px", borderRadius: 8, boxShadow: "0 6px 18px rgba(0,0,0,0.4)", zIndex: 60 }}>
            {toast}
          </div>
        )}
      </nav>
    </header>
  );
}
