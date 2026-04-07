import { log } from "../../ui/logger.js";
import { input, password } from "../../ui/prompts.js";
import { LINKS } from "../links.js";
import { commandExists, run } from "../../utils/exec.js";
import { confirm } from "../../ui/prompts.js";
import { withSpinner } from "../../ui/spinner.js";
import type { ProviderContext } from "../types.js";

export interface SupabaseResult {
  projectUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  connectionString: string;
}

export async function setupSupabase(
  ctx: ProviderContext
): Promise<SupabaseResult> {
  const hasCli = await commandExists("supabase");

  // Try CLI login first
  if (hasCli) {
    const useCli = await confirm({
      message: "Supabase CLI detected. Log in via browser?",
      default: true,
    });
    if (useCli) {
      log.info("Opening browser for Supabase login...");
      try {
        await run("supabase", ["login"]);
        log.success("Supabase CLI authenticated!");
      } catch {
        log.warn("Supabase CLI login failed. Continuing with manual setup.");
      }
    }
  } else {
    log.info("Supabase CLI not found. Install it for a better experience:");
    log.link("https://supabase.com/docs/guides/cli/getting-started");
  }

  // Check if user has a project already
  log.info("You need a Supabase project. Create one here if you don't have one:");
  log.link(LINKS.supabase.newProject);
  log.blank();

  const projectUrl = await input({
    message: "Supabase project URL (https://xxx.supabase.co):",
    validate: (v) =>
      v.includes(".supabase.co") ? true : "Must be a Supabase project URL",
  });

  const ref = projectUrl.replace("https://", "").replace(".supabase.co", "");

  log.info("Get your API keys here:");
  log.link(LINKS.supabase.apiSettings(ref));
  log.blank();

  const anonKey = await input({
    message: "Supabase anon (public) key:",
    validate: (v) => (v.startsWith("eyJ") ? true : "Should start with eyJ"),
  });

  const serviceRoleKey = await password({
    message: "Supabase service role key (secret):",
    validate: (v) => (v.startsWith("eyJ") ? true : "Should start with eyJ"),
  });

  // Build connection string
  const dbPassword = await password({
    message: "Database password (set during project creation):",
    validate: (v) => (v.length > 0 ? true : "Required"),
  });

  const connectionString = `postgresql://postgres.${ref}:${dbPassword}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

  // Validate connection
  await withSpinner("Validating Supabase connection...", async () => {
    const res = await fetch(`${projectUrl}/rest/v1/`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });
    if (!res.ok) throw new Error(`Supabase health check failed: ${res.status}`);
  });

  log.success("Supabase connection validated!");

  // Store credentials
  ctx.setCredential("supabase_url", projectUrl);
  ctx.setCredential("supabase_anon_key", anonKey);
  ctx.setCredential("supabase_service_role_key", serviceRoleKey);
  ctx.setCredential("database_url", connectionString);

  return { projectUrl, anonKey, serviceRoleKey, connectionString };
}
