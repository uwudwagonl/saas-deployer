import { log } from "../../ui/logger.js";
import { input, password } from "../../ui/prompts.js";
import { LINKS } from "../links.js";
import { commandExists, run } from "../../utils/exec.js";
import { confirm } from "../../ui/prompts.js";
import type { ProviderContext } from "../types.js";

export interface NeonResult {
  connectionString: string;
  projectId: string;
}

export async function setupNeon(ctx: ProviderContext): Promise<NeonResult> {
  const hasCli = await commandExists("neonctl");

  if (hasCli) {
    const useCli = await confirm({
      message: "Neon CLI detected. Log in via browser?",
      default: true,
    });
    if (useCli) {
      log.info("Opening browser for Neon login...");
      try {
        await run("neonctl", ["auth"]);
        log.success("Neon CLI authenticated!");

        // Try to list projects
        const createNew = await confirm({
          message: "Create a new Neon project?",
          default: true,
        });

        if (createNew) {
          const projectName = ctx.config.project.name;
          log.info(`Creating Neon project "${projectName}"...`);
          try {
            const result = await run("neonctl", [
              "projects",
              "create",
              "--name",
              projectName,
              "--output",
              "json",
            ]);
            const project = JSON.parse(result.stdout);
            const connStr =
              project.connection_uris?.[0]?.connection_uri ??
              project.connection_uri;
            const projectId = project.project?.id ?? project.id;

            if (connStr) {
              ctx.setCredential("database_url", connStr);
              log.success("Neon project created!");
              return { connectionString: connStr, projectId };
            }
          } catch (e) {
            log.warn("Auto-creation failed. Falling back to manual setup.");
          }
        }
      } catch {
        log.warn("Neon CLI login failed. Continuing with manual setup.");
      }
    }
  } else {
    log.info("Neon CLI not found. Install for auto-setup:");
    log.dim("  npm i -g neonctl");
  }

  // Manual setup
  log.info("Create a Neon project here:");
  log.link(LINKS.neon.console);
  log.blank();

  const projectId = await input({
    message: "Neon project ID:",
    validate: (v) => (v.length > 0 ? true : "Required"),
  });

  log.info("Get your connection string from the Neon dashboard.");
  log.blank();

  const connectionString = await password({
    message: "Neon connection string (postgresql://...):",
    validate: (v) =>
      v.startsWith("postgresql://") || v.startsWith("postgres://")
        ? true
        : "Must be a PostgreSQL connection string",
  });

  ctx.setCredential("database_url", connectionString);

  return { connectionString, projectId };
}
