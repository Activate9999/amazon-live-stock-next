// app/auth/register/page.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password })
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "Registration failed");
        setBusy(false);
        return;
      }
      router.push("/auth/login");
    } catch (err) {
      setError("Network error");
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card" role="main" aria-labelledby="register-heading">
        <div className="auth-left" aria-hidden>
          <div className="logo-badge">A</div>
          <div className="h-title">Create your LiveStocks account</div>
          <div className="h-sub">Sign up to save tickers, customize dashboards, and access real-time charts.</div>
        </div>

        <div className="auth-right">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 id="register-heading" style={{ fontWeight: 700, fontSize: 18 }}>Create account</h2>
            <div className="small muted-link">Already have an account? <a href="/auth/login" className="muted-link">Login</a></div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
            {error && <div role="alert" style={{ color: "#ffb4a2", fontWeight: 600 }}>{error}</div>}

            <input
              className="input"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              aria-label="Full name"
              autoComplete="name"
            />

            <input
              className="input"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-label="Email address"
              autoComplete="email"
            />

            <label className="block">
              <div className="small" style={{ marginBottom: 6 }}>Password</div>

              <div className="input-wrapper">
                <input
                  className="input pr-12"
                  type={showPass ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  aria-label="Password"
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  className="eye-button"
                  aria-pressed={showPass}
                  aria-label={showPass ? "Hide password" : "Show password"}
                  onClick={() => setShowPass((s) => !s)}
                >
                  {showPass ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "#F6C36A" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.58 10.58A3 3 0 1013.42 13.42" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "#F6C36A" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </label>

            <button className="btn" type="submit" disabled={busy} aria-busy={busy}>
              {busy ? "Creating…" : "Create account"}
            </button>

            <div className="small" style={{ textAlign: "center" }}>
              By continuing you agree to our <a className="muted-link" href="#">Terms</a> and <a className="muted-link" href="#">Privacy</a>.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
