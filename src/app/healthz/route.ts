import { NextResponse } from "next/server";

/**
 * GET /healthz
 *
 * Kubernetes readiness probe endpoint — required by the velobase-cloud platform.
 * Referenced in:
 *   - k8s-workload.ts  (healthPath: "/healthz")
 *   - web/start.ts     (waitForPort polls /healthz)
 *   - health-check/processor.ts  (probes https://{subdomain}.velobase.app/healthz)
 *
 * Returns 200 as long as the Next.js process is alive.
 * Deep dependency checks (DB, Redis) are handled by /api/ready.
 */
export function GET() {
  return NextResponse.json(
    { status: "ok", timestamp: new Date().toISOString() },
    { status: 200 },
  );
}
