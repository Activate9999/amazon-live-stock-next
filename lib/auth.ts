// lib/auth.ts
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "change_this";

export function signToken(payload: object, expiresIn = "7d") {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

export function createAuthCookie(token: string) {
  // HttpOnly cookie string for response
  const cookieName = process.env.AUTH_COOKIE_NAME || "alst_auth";
  // 7 days
  const maxAge = 60 * 60 * 24 * 7;
  return `${cookieName}=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure=${process.env.NODE_ENV === "production"}`;
}
