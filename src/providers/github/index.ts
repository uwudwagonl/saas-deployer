import type {
  Provider,
  ProviderContext,
  ProviderResult,
  PreflightResult,
} from "../types.js";
import { LINKS } from "../links.js";
import { log } from "../../ui/logger.js";
import { confirm } from "../../ui/prompts.js";
import { setupRepo } from "./repo.js";
import { syncSecrets } from "./secrets.js";
import { scaffoldWorkflows } from "./workflows.js";

export const githubProvider: Provider = {
  name: "github",
  displayName: "GitHub",
  description: "Repository creation, secrets sync, and CI/CD workflows",
  category: "hosting",
  requiredCredentialKeys: [],
  dependsOn: [],
  cliName: "gh",
  loginCommand: "gh auth login",
  signupUrl: LINKS.github.signup,

  async preflight(ctx: ProviderContext): Promise<PreflightResult> {
    return {
      ready: true,
      missingCredentials: [],
      missingDependencies: [],
      warnings: [],
    };
  },

  async setup(ctx: ProviderContext): Promise<ProviderResult> {
    log.header("GitHub Setup");

    // Step 1: Create/link repo
    const { repo, owner } = await setupRepo(ctx);

    // Step 2: Sync secrets
    log.blank();
    const wantSecrets = await confirm({
      message: "Sync stored credentials as GitHub secrets?",
      default: true,
    });

    let secretsConfigured: string[] = [];
    if (wantSecrets) {
      secretsConfigured = await syncSecrets(owner, repo);
      if (secretsConfigured.length > 0) {
        log.success(`Synced ${secretsConfigured.length} secret(s)`);
      } else {
        log.dim("No secrets to sync (configure services first)");
      }
    }

    // Step 3: Scaffold workflows
    log.blank();
    const wantWorkflows = await confirm({
      message: "Set up GitHub workflows and templates?",
      default: true,
    });

    let workflowsAdded: string[] = [];
    if (wantWorkflows) {
      workflowsAdded = await scaffoldWorkflows();
    }

    return {
      success: true,
      configUpdates: {
        github: {
          repo: `${owner}/${repo}`,
          owner,
          secretsConfigured,
          branchProtection: false,
          workflowsAdded,
        },
      },
      envVars: {},
    };
  },
};
