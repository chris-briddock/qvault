import { NextResponse } from "next/server";
import { checkDbHealth } from "@/lib/db";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, { healthy: boolean; latencyMs: number; error?: string }> = {};

  // Database health check
  checks.database = await checkDbHealth();

  const allHealthy = Object.values(checks).every((c) => c.healthy);
  const totalLatency = Date.now() - startTime;

  const status = allHealthy ? 200 : 503;

  logger.info("Health check", {
    healthy: allHealthy,
    totalLatencyMs: totalLatency,
    checks,
  });

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      latencyMs: totalLatency,
      checks,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Content-Type": "application/json",
      },
    }
  );
}
