import type {
  Provider,
  ProviderContext,
  ProviderResult,
  PreflightResult,
} from "../types.js";
import { log } from "../../ui/logger.js";
import { checkbox } from "../../ui/prompts.js";
import { setupSentry } from "./sentry.js";
import { setupPostHog } from "./posthog.js";

export const monitoringProvider: Provider = {
  name: "monitoring",
  displayName: "Monitoring",
  description: "Error tracking (Sentry) and analytics (PostHog)",
  category: "monitoring",
  requiredCredentialKeys: [],
  dependsOn: [],

  async preflight(): Promise<PreflightResult> {
    return {
      ready: true,
      missingCredentials: [],
      missingDependencies: [],
      warnings: [],
    };
  },

  async setup(ctx: ProviderContext): Promise<ProviderResult> {
    log.header("Monitoring Setup");

    const selected = await checkbox({
      message: "What do you want to set up?",
      choices: [
        { name: "Sentry — Error tracking & performance monitoring", value: "sentry" },
        { name: "PostHog — Product analytics & feature flags", value: "posthog" },
      ],
    });

    if (selected.length === 0) {
      log.dim("No monitoring tools selected.");
      return { success: true };
    }

    const envVars: Record<string, string> = {};
    let errorTracking: { provider: "sentry"; dsn: string } | undefined;
    let analytics: { provider: "posthog"; configured: boolean } | undefined;

    if (selected.includes("sentry")) {
      const result = await setupSentry(ctx);
      Object.assign(envVars, result.envVars);
      errorTracking = {
        provider: "sentry" as const,
        dsn: result.dsn,
      };
    }

    if (selected.includes("posthog")) {
      const result = await setupPostHog(ctx);
      Object.assign(envVars, result);
      analytics = {
        provider: "posthog" as const,
        configured: true,
      };
    }

    return {
      success: true,
      configUpdates: {
        monitoring: {
          ...(errorTracking ? { errorTracking } : {}),
          ...(analytics ? { analytics } : {}),
        },
      },
      envVars,
    };
  },
};
