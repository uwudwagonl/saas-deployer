import { log } from "../../ui/logger.js";
import { withSpinner } from "../../ui/spinner.js";
import { getCredential, hasCredential } from "../../config/credentials.js";

const VERCEL_API = "https://api.vercel.com";

type VercelTarget = "development" | "preview" | "production";

interface EnvVarPayload {
  key: string;
  value: string;
  target: VercelTarget[];
  type: "encrypted" | "plain";
}

// Collect all env vars from credentials store
function collectAllEnvVars(): EnvVarPayload[] {
  const vars: EnvVarPayload[] = [];

  const mappings: { credKey: string; envKey: string; public?: boolean }[] = [
    { credKey: "stripe_secret_key", envKey: "STRIPE_SECRET_KEY" },
    { credKey: "stripe_publishable_key", envKey: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", public: true },
    { credKey: "stripe_webhook_secret", envKey: "STRIPE_WEBHOOK_SECRET" },
    { credKey: "database_url", envKey: "DATABASE_URL" },
    { credKey: "supabase_url", envKey: "NEXT_PUBLIC_SUPABASE_URL", public: true },
    { credKey: "supabase_anon_key", envKey: "NEXT_PUBLIC_SUPABASE_ANON_KEY", public: true },
    { credKey: "supabase_service_role_key", envKey: "SUPABASE_SERVICE_ROLE_KEY" },
    { credKey: "turso_auth_token", envKey: "TURSO_AUTH_TOKEN" },
    { credKey: "clerk_publishable_key", envKey: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", public: true },
    { credKey: "clerk_secret_key", envKey: "CLERK_SECRET_KEY" },
    { credKey: "auth_secret", envKey: "AUTH_SECRET" },
    { credKey: "better_auth_secret", envKey: "BETTER_AUTH_SECRET" },
  ];

  for (const m of mappings) {
    if (!hasCredential(m.credKey)) continue;
    const value = getCredential(m.credKey);
    if (!value) continue;

    vars.push({
      key: m.envKey,
      value,
      target: ["development", "preview", "production"],
      type: m.public ? "plain" : "encrypted",
    });
  }

  return vars;
}

export async function pushEnvVars(
  token: string,
  projectId: string
): Promise<string[]> {
  const vars = collectAllEnvVars();
  if (vars.length === 0) return [];

  const pushed: string[] = [];

  await withSpinner(
    `Pushing ${vars.length} env vars to Vercel...`,
    async () => {
      for (const envVar of vars) {
        const res = await fetch(
          `${VERCEL_API}/v10/projects/${projectId}/env`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(envVar),
          }
        );

        if (res.ok) {
          pushed.push(envVar.key);
        } else {
          // Might already exist — try update
          const existing = await fetch(
            `${VERCEL_API}/v10/projects/${projectId}/env?key=${envVar.key}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (existing.ok) {
            pushed.push(envVar.key); // Already set
          }
        }
      }
    }
  );

  return pushed;
}
