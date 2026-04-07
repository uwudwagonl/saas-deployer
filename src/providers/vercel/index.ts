import type {
  Provider,
  ProviderContext,
  ProviderResult,
  PreflightResult,
} from "../types.js";
import { LINKS } from "../links.js";
import { log } from "../../ui/logger.js";
import { password, confirm } from "../../ui/prompts.js";
import { commandExists, run } from "../../utils/exec.js";
import { createProject } from "./project.js";
import { pushEnvVars } from "./env.js";
import { addDomain } from "./domain.js";

export const vercelProvider: Provider = {
  name: "vercel",
  displayName: "Vercel",
  description: "Deploy to Vercel with env vars and custom domain",
  category: "hosting",
  requiredCredentialKeys: ["vercel_token"],
  dependsOn: [],
  cliName: "vercel",
  loginCommand: "vercel login",
  signupUrl: LINKS.vercel.signup,

  async preflight(ctx: ProviderContext): Promise<PreflightResult> {
    return {
      ready: true,
      missingCredentials: ctx.credential("vercel_token")
        ? []
        : ["vercel_token"],
      missingDependencies: [],
      warnings: [],
    };
  },

  async setup(ctx: ProviderContext): Promise<ProviderResult> {
    log.header("Vercel Setup");

    // Step 1: Auth
    let token = ctx.credential("vercel_token");

    if (!token) {
      const hasVercelCli = await commandExists("vercel");

      if (hasVercelCli) {
        const useCli = await confirm({
          message: "Vercel CLI detected. Log in via browser?",
          default: true,
        });
        if (useCli) {
          try {
            await run("vercel", ["login"]);
            log.success("Vercel CLI authenticated!");
          } catch {
            log.warn("Vercel CLI login failed.");
          }
        }
      }

      log.info("You need a Vercel token for API access:");
      log.link(LINKS.vercel.tokens);
      log.blank();

      token = await password({
        message: "Vercel token:",
        validate: (v) => (v.length > 10 ? true : "Token seems too short"),
      });
      ctx.setCredential("vercel_token", token);
    } else {
      log.success("Using stored Vercel token");
    }

    // Step 2: Create project
    const githubRepo = ctx.config.github?.repo;
    const { projectId, projectName } = await createProject(
      token,
      ctx.config.project.name,
      ctx.config.project.framework,
      githubRepo
    );

    // Step 3: Push env vars
    const wantEnv = await confirm({
      message: "Push environment variables to Vercel?",
      default: true,
    });

    const envScopes: ("development" | "preview" | "production")[] = [];
    if (wantEnv) {
      const pushed = await pushEnvVars(token, projectId);
      if (pushed.length > 0) {
        log.success(`Pushed ${pushed.length} env vars to Vercel`);
        envScopes.push("development", "preview", "production");
      } else {
        log.dim("No env vars to push (configure services first)");
      }
    }

    // Step 4: Custom domain
    let domain: string | undefined;
    const wantDomain = await confirm({
      message: "Add a custom domain?",
      default: false,
    });
    if (wantDomain) {
      const result = await addDomain(token, projectId);
      domain = result.domain;
    }

    // Step 5: Deployment info
    log.blank();
    if (githubRepo) {
      log.info("Vercel will auto-deploy on push to GitHub.");
    } else {
      log.info("Deploy manually:");
      log.dim("  npx vercel --prod");
    }

    return {
      success: true,
      configUpdates: {
        vercel: {
          projectId,
          projectName,
          domain,
          envScopes,
        },
      },
      envVars: {},
    };
  },
};
