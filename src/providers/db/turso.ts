import { log } from "../../ui/logger.js";
import { input, password } from "../../ui/prompts.js";
import { LINKS } from "../links.js";
import { commandExists, run } from "../../utils/exec.js";
import { confirm } from "../../ui/prompts.js";
import type { ProviderContext } from "../types.js";

export interface TursoResult {
  connectionString: string;
  authToken: string;
}

export async function setupTurso(
  ctx: ProviderContext
): Promise<TursoResult> {
  const hasCli = await commandExists("turso");

  if (hasCli) {
    const useCli = await confirm({
      message: "Turso CLI detected. Log in via browser?",
      default: true,
    });
    if (useCli) {
      log.info("Opening browser for Turso login...");
      try {
        await run("turso", ["auth", "login"]);
        log.success("Turso CLI authenticated!");

        const createNew = await confirm({
          message: "Create a new Turso database?",
          default: true,
        });

        if (createNew) {
          const dbName = ctx.config.project.name.replace(/[^a-z0-9-]/g, "-");
          try {
            await run("turso", ["db", "create", dbName]);
            log.success(`Database "${dbName}" created!`);

            // Get URL
            const urlResult = await run("turso", [
              "db",
              "show",
              dbName,
              "--url",
            ]);
            const dbUrl = urlResult.stdout.trim();

            // Create auth token
            const tokenResult = await run("turso", [
              "db",
              "tokens",
              "create",
              dbName,
            ]);
            const authToken = tokenResult.stdout.trim();

            ctx.setCredential("database_url", dbUrl);
            ctx.setCredential("turso_auth_token", authToken);

            log.success("Database URL and auth token configured!");
            return { connectionString: dbUrl, authToken };
          } catch {
            log.warn("Database creation failed. Falling back to manual setup.");
          }
        }
      } catch {
        log.warn("Turso CLI login failed. Continuing with manual setup.");
      }
    }
  } else {
    log.info("Turso CLI not found. Install for auto-setup:");
    log.dim("  curl -sSfL https://get.tur.so/install.sh | bash");
  }

  // Manual setup
  log.info("Create a database here:");
  log.link(LINKS.turso.dashboard);
  log.blank();

  const connectionString = await input({
    message: "Turso database URL (libsql://...):",
    validate: (v) =>
      v.startsWith("libsql://") ? true : "Must start with libsql://",
  });

  const authToken = await password({
    message: "Turso auth token:",
    validate: (v) => (v.length > 0 ? true : "Required"),
  });

  ctx.setCredential("database_url", connectionString);
  ctx.setCredential("turso_auth_token", authToken);

  return { connectionString, authToken };
}
