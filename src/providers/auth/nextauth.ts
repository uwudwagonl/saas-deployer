import { randomBytes } from "node:crypto";
import { log } from "../../ui/logger.js";
import { input, confirm, checkbox } from "../../ui/prompts.js";
import { scaffoldFile } from "../../templates/engine.js";
import {
  nextauthConfigNextjs,
  nextauthRouteHandler,
  nextauthMiddleware,
} from "../../templates/auth/auth-config.nextjs.js";
import type { ProviderContext } from "../types.js";

const OAUTH_PROVIDERS = [
  { name: "GitHub", value: "github", idEnv: "AUTH_GITHUB_ID", secretEnv: "AUTH_GITHUB_SECRET", url: "https://github.com/settings/developers" },
  { name: "Google", value: "google", idEnv: "AUTH_GOOGLE_ID", secretEnv: "AUTH_GOOGLE_SECRET", url: "https://console.cloud.google.com/apis/credentials" },
  { name: "Discord", value: "discord", idEnv: "AUTH_DISCORD_ID", secretEnv: "AUTH_DISCORD_SECRET", url: "https://discord.com/developers/applications" },
] as const;

export interface NextAuthResult {
  authSecret: string;
  envVars: Record<string, string>;
}

export async function setupNextAuth(
  ctx: ProviderContext
): Promise<NextAuthResult> {
  const envVars: Record<string, string> = {};

  // Generate AUTH_SECRET
  const authSecret = randomBytes(32).toString("hex");
  envVars["AUTH_SECRET"] = authSecret;
  ctx.setCredential("auth_secret", authSecret);
  log.success("Generated AUTH_SECRET");

  // Auth URL
  const authUrl = await input({
    message: "Auth URL (for production):",
    default: `https://${ctx.config.project.name}.vercel.app`,
  });
  envVars["AUTH_URL"] = authUrl;

  // OAuth providers
  const selectedProviders = await checkbox({
    message: "Which OAuth providers do you want to configure?",
    choices: OAUTH_PROVIDERS.map((p) => ({ name: p.name, value: p.value })),
  });

  for (const providerValue of selectedProviders) {
    const provider = OAUTH_PROVIDERS.find((p) => p.value === providerValue)!;
    log.blank();
    log.info(`Set up ${provider.name} OAuth app:`);
    log.link(provider.url);

    const clientId = await input({
      message: `${provider.name} Client ID:`,
      validate: (v) => (v.length > 0 ? true : "Required"),
    });

    const clientSecret = await input({
      message: `${provider.name} Client Secret:`,
      validate: (v) => (v.length > 0 ? true : "Required"),
    });

    envVars[provider.idEnv] = clientId;
    envVars[provider.secretEnv] = clientSecret;
    ctx.setCredential(provider.idEnv.toLowerCase(), clientId);
    ctx.setCredential(provider.secretEnv.toLowerCase(), clientSecret);
  }

  // Scaffold files for Next.js
  if (ctx.config.project.framework === "nextjs") {
    const wantScaffold = await confirm({
      message: "Scaffold NextAuth config files?",
      default: true,
    });
    if (wantScaffold) {
      await scaffoldFile("auth.ts", nextauthConfigNextjs);
      await scaffoldFile("app/api/auth/[...nextauth]/route.ts", nextauthRouteHandler);
      await scaffoldFile("middleware.ts", nextauthMiddleware);
    }
  }

  return { authSecret, envVars };
}
