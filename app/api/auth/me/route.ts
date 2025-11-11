// app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

// This route depends on request headers (cookies) so it must run as a
// dynamic server route. Prevent Next from trying to render it statically.
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const cookieName = process.env.AUTH_COOKIE_NAME || "alst_auth";
    const cookie = (req.headers.get("cookie") || "").split("; ").find(Boolean)?.split("=");

    // simpler cookie parsing:
    const raw = (req.headers.get("cookie") || "")
      .split(";")
      .map(c => c.trim())
      .find(c => c.startsWith(cookieName + "="));

    if (!raw) return NextResponse.json({ user: null });

    const token = raw.split("=")[1];
    const data = verifyToken(token);
    if (!data || typeof data === "string") return NextResponse.json({ user: null });

    // @ts-ignore
    const userId = (data as any).sub;
    const user = await prisma.user.findUnique({ where: { id: Number(userId) }});
    if (!user) return NextResponse.json({ user: null });

    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name }});
  } catch (err) {
    console.error(err);
    return NextResponse.json({ user: null });
  }
}
