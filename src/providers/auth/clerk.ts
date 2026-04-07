import { log } from "../../ui/logger.js";
import { input, password } from "../../ui/prompts.js";
import { LINKS } from "../links.js";
import { scaffoldFile } from "../../templates/engine.js";
import { clerkMiddlewareNextjs } from "../../templates/auth/middleware.nextjs.js";
import { confirm } from "../../ui/prompts.js";
import type { ProviderContext } from "../types.js";

export interface ClerkResult {
  publishableKey: string;
  secretKey: string;
}

export async function setupClerk(ctx: ProviderContext): Promise<ClerkResult> {
  log.info("Clerk requires an application created in the dashboard:");
  log.link(LINKS.clerk.signup, "Sign up / Log in to Clerk");
  log.link(LINKS.clerk.dashboard, "Clerk Dashboard");
  log.blank();

  const publishableKey = await input({
    message: "Clerk Publishable Key (pk_test_... or pk_live_...):",
    validate: (v) =>
      v.startsWith("pk_test_") || v.startsWith("pk_live_")
        ? true
        : "Must start with pk_test_ or pk_live_",
  });

  const secretKey = await password({
    message: "Clerk Secret Key (sk_test_... or sk_live_...):",
    validate: (v) =>
      v.startsWith("sk_test_") || v.startsWith("sk_live_")
        ? true
        : "Must start with sk_test_ or sk_live_",
  });

  ctx.setCredential("clerk_publishable_key", publishableKey);
  ctx.setCredential("clerk_secret_key", secretKey);

  // Scaffold middleware for Next.js
  if (ctx.config.project.framework === "nextjs") {
    const wantMiddleware = await confirm({
      message: "Scaffold Clerk middleware (middleware.ts)?",
      default: true,
    });
    if (wantMiddleware) {
      await scaffoldFile("middleware.ts", clerkMiddlewareNextjs);
    }
  }

  return { publishableKey, secretKey };
}
