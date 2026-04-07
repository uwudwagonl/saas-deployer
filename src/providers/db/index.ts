import type {
  Provider,
  ProviderContext,
  ProviderResult,
  PreflightResult,
} from "../types.js";
import { LINKS } from "../links.js";
import { log } from "../../ui/logger.js";
import { select, confirm } from "../../ui/prompts.js";
import { fileExists, projectPath } from "../../utils/fs.js";
import { commandExists, run } from "../../utils/exec.js";
import { setupSupabase } from "./supabase.js";
import { setupNeon } from "./neon.js";
import { setupPlanetScale } from "./planetscale.js";
import { setupTurso } from "./turso.js";
import type { SaasConfig } from "../../config/schema.js";

type DbProvider = NonNullable<SaasConfig["db"]>["provider"];

async function detectOrm(): Promise<"prisma" | "drizzle" | null> {
  if (await fileExists(projectPath("prisma/schema.prisma"))) return "prisma";
  if (await fileExists(projectPath("drizzle.config.ts"))) return "drizzle";
  if (await fileExists(projectPath("drizzle.config.js"))) return "drizzle";
  return null;
}

export const databaseProvider: Provider = {
  name: "database",
  displayName: "Database",
  description: "Database provider setup (Supabase, Neon, PlanetScale, Turso)",
  category: "database",
  requiredCredentialKeys: ["database_url"],
  dependsOn: [],

  async preflight(ctx: ProviderContext): Promise<PreflightResult> {
    const dbUrl = ctx.credential("database_url");
    return {
      ready: true,
      missingCredentials: dbUrl && dbUrl.trim().length > 0
        ? []
        : ["database_url"],
      missingDependencies: [],
      warnings: [],
    };
  },

  async setup(ctx: ProviderContext): Promise<ProviderResult> {
    log.header("Database Setup");

    const envVars: Record<string, string> = {};

    // Select provider
    const provider = await select<DbProvider>({
      message: "Select your database provider:",
      choices: [
        {
          name: "Supabase — Postgres + Auth + Storage + Realtime",
          value: "supabase",
        },
        {
          name: "Neon — Serverless Postgres with branching",
          value: "neon",
        },
        {
          name: "PlanetScale — Serverless MySQL",
          value: "planetscale",
        },
        {
          name: "Turso — Edge SQLite with embedded replicas",
          value: "turso",
        },
      ],
    });

    let connectionString: string;
    let projectId: string | undefined;

    switch (provider) {
      case "supabase": {
        const result = await setupSupabase(ctx);
        connectionString = result.connectionString;
        envVars["NEXT_PUBLIC_SUPABASE_URL"] = result.projectUrl;
        envVars["NEXT_PUBLIC_SUPABASE_ANON_KEY"] = result.anonKey;
        envVars["SUPABASE_SERVICE_ROLE_KEY"] = result.serviceRoleKey;
        break;
      }
      case "neon": {
        const result = await setupNeon(ctx);
        connectionString = result.connectionString;
        projectId = result.projectId;
        break;
      }
      case "planetscale": {
        const result = await setupPlanetScale(ctx);
        connectionString = result.connectionString;
        break;
      }
      case "turso": {
        const result = await setupTurso(ctx);
        connectionString = result.connectionString;
        envVars["TURSO_AUTH_TOKEN"] = result.authToken;
        break;
      }
      default: {
        throw new Error(`Unknown provider: ${provider}`);
      }
    }

    envVars["DATABASE_URL"] = connectionString;

    // ORM detection
    let orm = await detectOrm();

    if (!orm) {
      const wantOrm = await confirm({
        message: "Set up an ORM? (Prisma or Drizzle)",
        default: true,
      });

      if (wantOrm) {
        orm = await select<"prisma" | "drizzle">({
          message: "Which ORM?",
          choices: [
            { name: "Prisma", value: "prisma" },
            { name: "Drizzle", value: "drizzle" },
          ],
        });

        if (orm === "prisma") {
          const hasPrisma = await commandExists("npx");
          if (hasPrisma) {
            const initPrisma = await confirm({
              message: "Run `npx prisma init`?",
              default: true,
            });
            if (initPrisma) {
              log.info("Initializing Prisma...");
              try {
                const dbType =
                  provider === "planetscale"
                    ? "mysql"
                    : provider === "turso"
                      ? "sqlite"
                      : "postgresql";
                await run("npx", [
                  "prisma",
                  "init",
                  "--datasource-provider",
                  dbType,
                ]);
                log.success("Prisma initialized!");
              } catch {
                log.warn("Prisma init failed. You can run it manually.");
              }
            }
          }
        } else {
          log.info("Install Drizzle:");
          log.dim("  npm i drizzle-orm drizzle-kit");
          log.dim("  npx drizzle-kit init");
        }
      }
    } else {
      log.success(`Detected ORM: ${orm}`);
    }

    return {
      success: true,
      configUpdates: {
        db: {
          provider,
          connectionStringEnvVar: "DATABASE_URL",
          projectId,
          orm: orm ?? undefined,
        },
      },
      envVars,
    };
  },
};
