import { log } from "../../ui/logger.js";
import { input } from "../../ui/prompts.js";
import { LINKS } from "../links.js";
import { commandExists, run } from "../../utils/exec.js";
import { confirm } from "../../ui/prompts.js";
import type { ProviderContext } from "../types.js";

export async function setupPostHog(
  ctx: ProviderContext
): Promise<Record<string, string>> {
  const envVars: Record<string, string> = {};

  const hasCli = await commandExists("posthog");
  if (hasCli) {
    const useCli = await confirm({
      message: "PostHog CLI detected. Log in via browser?",
      default: true,
    });
    if (useCli) {
      try {
        await run("posthog", ["login"]);
        log.success("PostHog CLI authenticated!");
      } catch {
        log.warn("PostHog CLI login failed.");
      }
    }
  }

  log.info("Get your PostHog project API key:");
  log.link(LINKS.posthog.projectSettings);
  log.blank();

  const apiKey = await input({
    message: "PostHog project API key (phc_...):",
    validate: (v) =>
      v.startsWith("phc_") ? true : "Should start with phc_",
  });

  const host = await input({
    message: "PostHog host:",
    default: "https://us.i.posthog.com",
  });

  ctx.setCredential("posthog_key", apiKey);
  envVars["NEXT_PUBLIC_POSTHOG_KEY"] = apiKey;
  envVars["NEXT_PUBLIC_POSTHOG_HOST"] = host;

  log.success("PostHog configured!");
  log.info("Install: npm i posthog-js posthog-node");

  return envVars;
}
