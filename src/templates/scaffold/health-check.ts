export const healthCheckNextjs = `import { NextResponse } from "next/server";

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {};

  // Database check
  try {
    // Replace with your DB client (prisma, drizzle, etc.)
    // await prisma.$queryRaw\`SELECT 1\`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  // Queue check (if using Redis/BullMQ)
  // try {
  //   await redis.ping();
  //   checks.queue = "ok";
  // } catch {
  //   checks.queue = "error";
  // }

  // Storage check (if using S3/R2)
  // try {
  //   await s3.headBucket({ Bucket: process.env.S3_BUCKET_NAME! });
  //   checks.storage = "ok";
  // } catch {
  //   checks.storage = "error";
  // }

  const allHealthy = Object.values(checks).every((s) => s === "ok");

  return NextResponse.json(
    { status: allHealthy ? "healthy" : "degraded", checks, timestamp: new Date().toISOString() },
    { status: allHealthy ? 200 : 503 }
  );
}
`;

export const healthCheckRemix = `import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {
  const checks: Record<string, "ok" | "error"> = {};

  try {
    // await prisma.$queryRaw\`SELECT 1\`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  const allHealthy = Object.values(checks).every((s) => s === "ok");

  return json(
    { status: allHealthy ? "healthy" : "degraded", checks, timestamp: new Date().toISOString() },
    { status: allHealthy ? 200 : 503 }
  );
}
`;

export const healthCheckSveltekit = `import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async () => {
  const checks: Record<string, "ok" | "error"> = {};

  try {
    // await prisma.$queryRaw\`SELECT 1\`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  const allHealthy = Object.values(checks).every((s) => s === "ok");

  return json(
    { status: allHealthy ? "healthy" : "degraded", checks, timestamp: new Date().toISOString() },
    { status: allHealthy ? 200 : 503 }
  );
};
`;

export const healthCheckNuxt = `export default defineEventHandler(async () => {
  const checks: Record<string, "ok" | "error"> = {};

  try {
    // await prisma.$queryRaw\`SELECT 1\`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  const allHealthy = Object.values(checks).every((s) => s === "ok");

  setResponseStatus(useEvent(), allHealthy ? 200 : 503);
  return { status: allHealthy ? "healthy" : "degraded", checks, timestamp: new Date().toISOString() };
});
`;

export const healthCheckAstro = `import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  const checks: Record<string, "ok" | "error"> = {};

  try {
    // await prisma.$queryRaw\`SELECT 1\`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  const allHealthy = Object.values(checks).every((s) => s === "ok");

  return new Response(
    JSON.stringify({ status: allHealthy ? "healthy" : "degraded", checks, timestamp: new Date().toISOString() }),
    { status: allHealthy ? 200 : 503, headers: { "Content-Type": "application/json" } }
  );
};
`;

export const HEALTH_CHECK_ROUTES: Record<string, { path: string; template: string }> = {
  nextjs: { path: "app/api/health/route.ts", template: healthCheckNextjs },
  remix: { path: "app/routes/api.health.ts", template: healthCheckRemix },
  sveltekit: { path: "src/routes/api/health/+server.ts", template: healthCheckSveltekit },
  nuxt: { path: "server/api/health.get.ts", template: healthCheckNuxt },
  astro: { path: "src/pages/api/health.ts", template: healthCheckAstro },
};
