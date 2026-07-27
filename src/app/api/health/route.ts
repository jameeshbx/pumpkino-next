import { NextResponse } from "next/server";
import { prisma } from "@/infrastructure/db/prisma";

export const dynamic = "force-dynamic";

/** Container/uptime health check — verifies DB connectivity. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "degraded" }, { status: 503 });
  }
}
