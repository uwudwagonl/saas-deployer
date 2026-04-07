import type { Command } from "commander";
import { writeFile } from "node:fs/promises";
import chalk from "chalk";
import { log } from "../ui/logger.js";
import { configExists, loadConfig } from "../config/store.js";
import { getCredential } from "../config/credentials.js";
import { EnvManager } from "../env/manager.js";
import { readDotEnvFile, diffEnv } from "../env/dotenv.js";
import { projectPath, fileExists } from "../utils/fs.js";
import { confirm } from "../ui/prompts.js";

function collectEnvVars(
  config: Awaited<ReturnType<typeof loadConfig>>,
  credential: (key: string) => string | undefined
): EnvManager {
  const mgr = new EnvManager();

  // Stripe
  const stripeSecret = credential("stripe_secret_key");
  const stripePk = credential("stripe_publishable_key");
  const stripeWebhookSecret = credential("stripe_webhook_secret");

  if (stripeSecret) {
    mgr.addMany(
      {
        STRIPE_SECRET_KEY: stripeSecret,
        ...(stripePk
          ? { NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: stripePk }
          : {}),
        ...(stripeWebhookSecret
          ? { STRIPE_WEBHOOK_SECRET: stripeWebhookSecret }
          : {}),
      },
      "stripe"
    );
  }

  // Database
  const dbUrl = credential("database_url");
  if (dbUrl) {
    mgr.addMany({ DATABASE_URL: dbUrl }, "database");
  }

  // Supabase extras
  const supabaseUrl = credential("supabase_url");
  const supabaseAnon = credential("supabase_anon_key");
  const supabaseServiceRole = credential("supabase_service_role_key");
  if (supabaseUrl && supabaseAnon) {
    mgr.addMany(
      {
        NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnon,
        ...(supabaseServiceRole
          ? { SUPABASE_SERVICE_ROLE_KEY: supabaseServiceRole }
          : {}),
      },
      "supabase"
    );
  }

  // Turso extras
  const tursoAuth = credential("turso_auth_token");
  if (tursoAuth) {
    mgr.addMany({ TURSO_AUTH_TOKEN: tursoAuth }, "turso");
  }

  // Auth - Clerk
  const clerkPk = credential("clerk_publishable_key");
  const clerkSk = credential("clerk_secret_key");
  if (clerkPk && clerkSk) {
    mgr.addMany(
      {
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: clerkPk,
        CLERK_SECRET_KEY: clerkSk,
      },
      "clerk"
    );
  }

  // Auth - NextAuth
  const authSecret = credential("auth_secret");
  if (authSecret) {
    mgr.addMany({ AUTH_SECRET: authSecret }, "nextauth");
  }

  // Auth - Better Auth
  const betterAuthSecret = credential("better_auth_secret");
  if (betterAuthSecret) {
    mgr.addMany({ BETTER_AUTH_SECRET: betterAuthSecret }, "better-auth");
  }

  // OAuth providers
  const oauthKeys = [
    "auth_github_id", "auth_github_secret",
    "auth_google_id", "auth_google_secret",
    "auth_discord_id", "auth_discord_secret",
  ];
  for (const key of oauthKeys) {
    const val = credential(key);
    if (val) {
      mgr.add({
        key: key.toUpperCase(),
        value: val,
        source: "oauth",
        sensitive: key.includes("secret"),
        scopes: ["development", "preview", "production"],
      });
    }
  }

  return mgr;
}

export function registerEnvCommand(program: Command) {
  program
    .command("env")
    .description("Generate and manage environment variables")
    .option("--example", "Generate .env.example file")
    .option("--check", "Check if all required env vars are set")
    .option("--list", "List all env vars (names only)")
    .action(async (options) => {
      if (!(await configExists())) {
        log.error('No saas.config.json found. Run "saas init" first.');
        process.exit(1);
      }

      const config = await loadConfig();
      const mgr = collectEnvVars(config, getCredential);
      const allVars = mgr.getAll();

      if (allVars.length === 0) {
        log.warn("No environment variables configured yet.");
        log.info("Run saas stripe, saas db, or saas auth first.");
        return;
      }

      // --list mode
      if (options.list) {
        log.header("Environment Variables");
        for (const v of allVars) {
          const icon = v.sensitive ? chalk.yellow("●") : chalk.green("●");
          console.log(
            `  ${icon} ${v.key} ${chalk.dim(`(${v.source})`)}`
          );
        }
        console.log();
        console.log(
          `  ${allVars.length} variable${allVars.length !== 1 ? "s" : ""} across ${mgr.getSources().length} service${mgr.getSources().length !== 1 ? "s" : ""}`
        );
        return;
      }

      // --example mode
      if (options.example) {
        const content = mgr.generateDotEnvExample();
        const examplePath = projectPath(".env.example");
        await writeFile(examplePath, content, "utf-8");
        log.success("Generated .env.example");
        return;
      }

      // --check mode
      if (options.check) {
        log.header("Environment Check");
        const envFile = await readDotEnvFile(projectPath(".env.local"));
        if (!envFile) {
          log.error('No .env.local found. Run "saas env" to generate it.');
          return;
        }

        let allGood = true;
        for (const v of allVars) {
          if (envFile[v.key]) {
            console.log(`  ${chalk.green("●")} ${v.key}`);
          } else {
            console.log(`  ${chalk.red("○")} ${v.key} ${chalk.red("MISSING")}`);
            allGood = false;
          }
        }

        if (allGood) {
          log.blank();
          log.success("All environment variables are set!");
        } else {
          log.blank();
          log.warn('Some variables are missing. Run "saas env" to regenerate.');
        }
        return;
      }

      // Default: generate .env.local
      const envLocalPath = projectPath(".env.local");
      const content = mgr.generateDotEnv("development");

      if (await fileExists(envLocalPath)) {
        const existing = await readDotEnvFile(envLocalPath);
        if (existing) {
          const newVars = mgr.getForScope("development");
          const diff = diffEnv(newVars, existing);

          if (diff.added.length > 0) {
            log.info(`New variables to add: ${diff.added.join(", ")}`);
          }
          if (diff.changed.length > 0) {
            log.info(`Changed variables: ${diff.changed.join(", ")}`);
          }

          const overwrite = await confirm({
            message: ".env.local already exists. Overwrite?",
            default: false,
          });
          if (!overwrite) {
            log.dim("Skipped.");
            return;
          }
        }
      }

      await writeFile(envLocalPath, content, "utf-8");
      log.success("Generated .env.local");
      log.dim(`  ${allVars.length} variables from ${mgr.getSources().join(", ")}`);

      // Also generate .env.example
      const wantExample = await confirm({
        message: "Also generate .env.example (safe to commit)?",
        default: true,
      });
      if (wantExample) {
        const exampleContent = mgr.generateDotEnvExample();
        await writeFile(projectPath(".env.example"), exampleContent, "utf-8");
        log.success("Generated .env.example");
      }
    });
}
