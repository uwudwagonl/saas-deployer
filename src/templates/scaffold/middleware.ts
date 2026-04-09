export const correlationIdMiddlewareNextjs = `import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { randomUUID } from "crypto";

export function middleware(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();

  const response = NextResponse.next();
  response.headers.set("x-request-id", requestId);

  // TODO: Pass requestId to your logger for correlation
  // e.g., logger.child({ requestId })

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
`;

export const rateLimiterTemplate = `import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Create a rate limiter that allows 10 requests per 10 seconds
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
});

export async function checkRateLimit(identifier: string) {
  const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

  return {
    success,
    headers: {
      "X-RateLimit-Limit": limit.toString(),
      "X-RateLimit-Remaining": remaining.toString(),
      "X-RateLimit-Reset": reset.toString(),
    },
  };
}
`;
