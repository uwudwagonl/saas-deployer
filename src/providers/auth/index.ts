import type {
  Provider,
  ProviderContext,
  ProviderResult,
  PreflightResult,
} from "../types.js";
import { log } from "../../ui/logger.js";
import { select } from "../../ui/prompts.js";
import { setupClerk } from "./clerk.js";
import { setupNextAuth } from "./nextauth.js";
import { setupBetterAuth } from "./better-auth.js";
import { setupSupabaseAuth } from "./supabase-auth.js";
import type { SaasConfig } from "../../config/schema.js";

type AuthProvider = NonNullable<SaasConfig["auth"]>["provider"];

export const authProvider: Provider = {
  name: "auth",
  displayName: "Authentication",
  description: "Set up authentication (Clerk, NextAuth, Better Auth, Supabase Auth)",
  category: "auth",
  requiredCredentialKeys: [],
  dependsOn: [],

  async preflight(ctx: ProviderContext): Promise<PreflightResult> {
    const warnings: string[] = [];
    if (
      !ctx.credential("database_url") &&
      ctx.config.auth?.provider !== "clerk"
    ) {
      warnings.push(
        "No database configured. Some auth providers need a database."
      );
    }
    return {
      ready: true,
      missingCredentials: [],
      missingDependencies: [],
      warnings,
    };
  },

  async setup(ctx: ProviderContext): Promise<ProviderResult> {
    log.header("Authentication Setup");

    const envVars: Record<string, string> = {};

    const provider = await select<AuthProvider>({
      message: "Select your auth provider:",
      choices: [
        {
          name: "Clerk — Managed auth with UI components",
          value: "clerk",
        },
        {
          name: "NextAuth (Auth.js) — Open-source, self-hosted",
          value: "nextauth",
        },
        {
          name: "Better Auth — Modern Lucia successor",
          value: "better-auth",
        },
        {
          name: "Supabase Auth — Built into Supabase",
          value: "supabase",
        },
      ],
    });

    switch (provider) {
      case "clerk": {
        const result = await setupClerk(ctx);
        envVars["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"] = result.publishableKey;
        envVars["CLERK_SECRET_KEY"] = result.secretKey;
        break;
      }
      case "nextauth": {
        const result = await setupNextAuth(ctx);
        Object.assign(envVars, result.envVars);
        break;
      }
      case "better-auth": {
        const result = await setupBetterAuth(ctx);
        Object.assign(envVars, result.envVars);
        break;
      }
      case "supabase": {
        const result = await setupSupabaseAuth(ctx);
        Object.assign(envVars, result.envVars);
        break;
      }
    }

    return {
      success: true,
      configUpdates: {
        auth: {
          provider,
          configured: true,
        },
      },
      envVars,
    };
  },
};
