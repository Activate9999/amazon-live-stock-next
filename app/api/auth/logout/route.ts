// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const cookieName = process.env.AUTH_COOKIE_NAME || "alst_auth";
  const res = NextResponse.json({ ok: true });
  // set expired cookie
  res.headers.append("Set-Cookie", `${cookieName}=deleted; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure=${process.env.NODE_ENV === "production"}`);
  return res;
}
