import type { Provider, ProviderContext, ProviderResult, PreflightResult } from "../types.js";
import { log } from "../../ui/logger.js";
import { select, input, password, confirm } from "../../ui/prompts.js";
import { LINKS } from "../links.js";
import type { SaasConfig } from "../../config/schema.js";

type QueueProvider = "upstash" | "redis" | "inngest" | "trigger-dev";

export const queueProvider: Provider = {
  name: "queue",
  displayName: "Background Jobs & Queues",
  description: "Set up background job processing (Upstash, Redis/BullMQ, Inngest, Trigger.dev)",
  category: "jobs",
  requiredCredentialKeys: [],
  dependsOn: [],

  async preflight(): Promise<PreflightResult> {
    return { ready: true, missingCredentials: [], missingDependencies: [], warnings: [] };
  },

  async setup(ctx: ProviderContext): Promise<ProviderResult> {
    log.header("Background Jobs & Queue Setup");
    const envVars: Record<string, string> = {};

    const provider = await select<QueueProvider>({
      message: "Select your queue/jobs provider:",
      choices: [
        { name: "Upstash Redis — Serverless Redis with built-in queue (recommended)", value: "upstash" },
        { name: "Redis + BullMQ — Self-hosted or managed Redis with BullMQ", value: "redis" },
        { name: "Inngest — Event-driven background functions", value: "inngest" },
        { name: "Trigger.dev — Background jobs with retries & scheduling", value: "trigger-dev" },
      ],
    });

    switch (provider) {
      case "upstash": {
        log.info("Create a Redis database at Upstash:");
        log.link(LINKS.upstash.console);
        log.blank();
        const url = await password({ message: "Upstash Redis REST URL:" });
        const token = await password({ message: "Upstash Redis REST Token:" });
        envVars["UPSTASH_REDIS_REST_URL"] = url;
        envVars["UPSTASH_REDIS_REST_TOKEN"] = token;
        ctx.setCredential("upstash_redis_url", url);
        ctx.setCredential("upstash_redis_token", token);
        log.blank();
        log.info("Install the SDK:");
        log.dim("  npm i @upstash/redis @upstash/qstash");
        break;
      }
      case "redis": {
        const connectionUrl = await input({
          message: "Redis connection URL (redis://...):",
          validate: (v) => v.startsWith("redis") ? true : "Must start with redis:// or rediss://",
        });
        envVars["REDIS_URL"] = connectionUrl;
        ctx.setCredential("redis_url", connectionUrl);
        log.blank();
        log.info("Install BullMQ:");
        log.dim("  npm i bullmq");
        break;
      }
      case "inngest": {
        log.info("Sign up at Inngest:");
        log.link(LINKS.inngest.signup);
        log.blank();
        const eventKey = await password({ message: "Inngest Event Key:" });
        const signingKey = await password({ message: "Inngest Signing Key:" });
        envVars["INNGEST_EVENT_KEY"] = eventKey;
        envVars["INNGEST_SIGNING_KEY"] = signingKey;
        ctx.setCredential("inngest_event_key", eventKey);
        ctx.setCredential("inngest_signing_key", signingKey);
        log.blank();
        log.info("Install the SDK:");
        log.dim("  npm i inngest");
        break;
      }
      case "trigger-dev": {
        log.info("Sign up at Trigger.dev:");
        log.link(LINKS.triggerDev.signup);
        log.blank();
        const apiKey = await password({ message: "Trigger.dev API Key:" });
        envVars["TRIGGER_API_KEY"] = apiKey;
        ctx.setCredential("trigger_api_key", apiKey);
        log.blank();
        log.info("Install the SDK:");
        log.dim("  npx @trigger.dev/cli@latest init");
        break;
      }
    }

    log.blank();
    log.success(`${provider} configured for background jobs!`);

    return {
      success: true,
      configUpdates: {
        jobs: { provider: provider === "redis" ? "other" : provider === "upstash" ? "other" : provider as any, configured: true },
      },
      envVars,
    };
  },
};
