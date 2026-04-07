import { randomBytes } from "node:crypto";
import { log } from "../../ui/logger.js";
import { confirm } from "../../ui/prompts.js";
import { scaffoldFile } from "../../templates/engine.js";
import {
  betterAuthConfig,
  betterAuthClient,
} from "../../templates/auth/better-auth-config.js";
import type { ProviderContext } from "../types.js";

export interface BetterAuthResult {
  envVars: Record<string, string>;
}

export async function setupBetterAuth(
  ctx: ProviderContext
): Promise<BetterAuthResult> {
  const envVars: Record<string, string> = {};

  // Generate secret
  const secret = randomBytes(32).toString("hex");
  envVars["BETTER_AUTH_SECRET"] = secret;
  ctx.setCredential("better_auth_secret", secret);
  log.success("Generated BETTER_AUTH_SECRET");

  const baseUrl = `https://${ctx.config.project.name}.vercel.app`;
  envVars["BETTER_AUTH_URL"] = baseUrl;

  if (!ctx.credential("database_url")) {
    log.warn('No DATABASE_URL found. Run "saas db" first for full auth setup.');
  }

  // Scaffold config
  const wantScaffold = await confirm({
    message: "Scaffold Better Auth config files?",
    default: true,
  });
  if (wantScaffold) {
    await scaffoldFile("lib/auth.ts", betterAuthConfig);
    await scaffoldFile("lib/auth-client.ts", betterAuthClient);

    if (ctx.config.project.framework === "nextjs") {
      await scaffoldFile(
        "app/api/auth/[...all]/route.ts",
        `import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth.handler);
`
      );
    }
  }

  log.info("Install better-auth in your project:");
  log.dim("  npm i better-auth");

  return { envVars };
}
