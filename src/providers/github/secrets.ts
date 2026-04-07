import { log } from "../../ui/logger.js";
import { commandExists, run } from "../../utils/exec.js";
import { withSpinner } from "../../ui/spinner.js";
import { getCredential, hasCredential } from "../../config/credentials.js";

const SECRET_MAPPINGS: { credKey: string; ghName: string; label: string }[] = [
  { credKey: "stripe_secret_key", ghName: "STRIPE_SECRET_KEY", label: "Stripe Secret Key" },
  { credKey: "stripe_webhook_secret", ghName: "STRIPE_WEBHOOK_SECRET", label: "Stripe Webhook Secret" },
  { credKey: "database_url", ghName: "DATABASE_URL", label: "Database URL" },
  { credKey: "supabase_service_role_key", ghName: "SUPABASE_SERVICE_ROLE_KEY", label: "Supabase Service Role Key" },
  { credKey: "clerk_secret_key", ghName: "CLERK_SECRET_KEY", label: "Clerk Secret Key" },
  { credKey: "auth_secret", ghName: "AUTH_SECRET", label: "Auth Secret" },
  { credKey: "better_auth_secret", ghName: "BETTER_AUTH_SECRET", label: "Better Auth Secret" },
  { credKey: "turso_auth_token", ghName: "TURSO_AUTH_TOKEN", label: "Turso Auth Token" },
];

export async function syncSecrets(
  owner: string,
  repo: string
): Promise<string[]> {
  const hasGh = await commandExists("gh");
  if (!hasGh) {
    log.warn("GitHub CLI not available. Cannot sync secrets automatically.");
    log.info("Set secrets manually at:");
    log.link(`https://github.com/${owner}/${repo}/settings/secrets/actions`);
    return [];
  }

  const synced: string[] = [];

  await withSpinner("Syncing secrets to GitHub...", async () => {
    for (const mapping of SECRET_MAPPINGS) {
      if (!hasCredential(mapping.credKey)) continue;

      const value = getCredential(mapping.credKey);
      if (!value) continue;

      try {
        await run("gh", [
          "secret",
          "set",
          mapping.ghName,
          "--repo",
          `${owner}/${repo}`,
        ], { stdin: value });
        synced.push(mapping.ghName);
      } catch {
        log.warn(`Failed to set ${mapping.ghName}`);
      }
    }
  });

  return synced;
}
