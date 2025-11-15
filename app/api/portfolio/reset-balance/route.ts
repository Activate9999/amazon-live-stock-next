// app/api/portfolio/reset-balance/route.ts
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

async function getUserFromRequest() {
  const cookieStore = await cookies();
  const token = cookieStore.get(process.env.AUTH_COOKIE_NAME || "alst_auth")?.value;
  if (!token) return null;
  const payload: any = verifyToken(token);
  if (!payload || typeof payload === "string") return null;
  return payload.sub ? Number(payload.sub) : null;
}

// POST: Reset cash balance to $10,000
export async function POST() {
  try {
    const userId = await getUserFromRequest();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { cashBalance: 10000 },
    });

    return NextResponse.json({ success: true, newBalance: 10000 });
  } catch (error) {
    console.error("Reset balance error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
