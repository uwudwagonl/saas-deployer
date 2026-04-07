import { log } from "../../ui/logger.js";
import { input, password } from "../../ui/prompts.js";
import { LINKS } from "../links.js";
import { commandExists, run } from "../../utils/exec.js";
import { confirm } from "../../ui/prompts.js";
import { withSpinner } from "../../ui/spinner.js";
import type { ProviderContext } from "../types.js";

export async function setupSentry(
  ctx: ProviderContext
): Promise<{ dsn: string; envVars: Record<string, string> }> {
  const envVars: Record<string, string> = {};

  const hasCli = await commandExists("sentry-cli");
  if (hasCli) {
    const useCli = await confirm({
      message: "Sentry CLI detected. Log in via browser?",
      default: true,
    });
    if (useCli) {
      try {
        await run("sentry-cli", ["login"]);
        log.success("Sentry CLI authenticated!");
      } catch {
        log.warn("Sentry CLI login failed.");
      }
    }
  }

  log.info("Get your Sentry auth token:");
  log.link(LINKS.sentry.authTokens);
  log.blank();

  const authToken = await password({
    message: "Sentry auth token:",
    validate: (v) => (v.length > 10 ? true : "Token seems too short"),
  });

  const slugPattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

  const org = await input({
    message: "Sentry organization slug:",
    validate: (v) =>
      slugPattern.test(v) ? true : "Must be a valid slug (lowercase alphanumeric and hyphens)",
  });

  const projectName = await input({
    message: "Sentry project name:",
    default: ctx.config.project.name,
    validate: (v) =>
      slugPattern.test(v) ? true : "Must be a valid slug (lowercase alphanumeric and hyphens)",
  });

  // Try to create project via API
  let dsn = "";
  try {
    const result = await withSpinner("Creating Sentry project...", async () => {
      const res = await fetch(
        `https://sentry.io/api/0/teams/${org}/${org}/projects/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: projectName,
            platform: "javascript",
          }),
        }
      );

      if (!res.ok) {
        // Project might already exist
        const listRes = await fetch(
          `https://sentry.io/api/0/projects/${org}/${projectName}/keys/`,
          {
            headers: { Authorization: `Bearer ${authToken}` },
          }
        );
        if (listRes.ok) {
          const keys = (await listRes.json()) as any[];
          return keys[0]?.dsn?.public ?? "";
        }
        return "";
      }

      const data = (await res.json()) as any;
      // Get DSN from keys
      const keysRes = await fetch(
        `https://sentry.io/api/0/projects/${org}/${data.slug}/keys/`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      if (keysRes.ok) {
        const keys = (await keysRes.json()) as any[];
        return keys[0]?.dsn?.public ?? "";
      }
      return "";
    });

    dsn = result;
  } catch {
    log.warn("Could not auto-create Sentry project.");
  }

  if (!dsn) {
    dsn = await input({
      message: "Sentry DSN (https://...@sentry.io/...):",
      validate: (v) =>
        v.includes("sentry.io") ? true : "Must be a Sentry DSN URL",
    });
  } else {
    log.success(`Sentry DSN: ${dsn}`);
  }

  ctx.setCredential("sentry_dsn", dsn);
  ctx.setCredential("sentry_auth_token", authToken);
  envVars["SENTRY_DSN"] = dsn;
  envVars["SENTRY_AUTH_TOKEN"] = authToken;

  log.info("Install Sentry in your project:");
  log.dim("  npx @sentry/wizard@latest -i nextjs");

  return { dsn, envVars };
}
