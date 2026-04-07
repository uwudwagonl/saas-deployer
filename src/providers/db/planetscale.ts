import { log } from "../../ui/logger.js";
import { input, password } from "../../ui/prompts.js";
import { LINKS } from "../links.js";
import { commandExists, run } from "../../utils/exec.js";
import { confirm } from "../../ui/prompts.js";
import type { ProviderContext } from "../types.js";

export interface PlanetScaleResult {
  connectionString: string;
}

export async function setupPlanetScale(
  ctx: ProviderContext
): Promise<PlanetScaleResult> {
  const hasCli = await commandExists("pscale");

  if (hasCli) {
    const useCli = await confirm({
      message: "PlanetScale CLI detected. Log in via browser?",
      default: true,
    });
    if (useCli) {
      log.info("Opening browser for PlanetScale login...");
      try {
        await run("pscale", ["auth", "login"]);
        log.success("PlanetScale CLI authenticated!");

        const createNew = await confirm({
          message: "Create a new PlanetScale database?",
          default: true,
        });

        if (createNew) {
          const dbName = ctx.config.project.name.replace(/[^a-z0-9-]/g, "-");
          try {
            await run("pscale", ["database", "create", dbName, "main"]);
            log.success(`Database "${dbName}" created!`);

            // Get connection string
            log.info(
              "Get your connection string from the PlanetScale dashboard."
            );
            log.link(LINKS.planetscale.dashboard);
          } catch (e) {
            log.warn("Database creation failed. It may already exist.");
          }
        }
      } catch {
        log.warn("PlanetScale CLI login failed. Continuing with manual setup.");
      }
    }
  } else {
    log.info("PlanetScale CLI not found. Install for auto-setup:");
    log.dim("  https://planetscale.com/docs/cli/getting-started");
  }

  // Get connection string
  log.info("Create a database and get your connection string:");
  log.link(LINKS.planetscale.dashboard);
  log.blank();

  const connectionString = await password({
    message: "PlanetScale connection string (mysql://...):",
    validate: (v) =>
      v.startsWith("mysql://") ? true : "Must be a MySQL connection string",
  });

  ctx.setCredential("database_url", connectionString);

  return { connectionString };
}
