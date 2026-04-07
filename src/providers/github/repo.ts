import { log } from "../../ui/logger.js";
import { input, select, confirm } from "../../ui/prompts.js";
import { commandExists, run } from "../../utils/exec.js";
import { LINKS } from "../links.js";
import type { ProviderContext } from "../types.js";

export interface RepoResult {
  repo: string;
  owner: string;
}

export async function setupRepo(ctx: ProviderContext): Promise<RepoResult> {
  const hasGh = await commandExists("gh");

  if (!hasGh) {
    log.warn("GitHub CLI (gh) not found. Install it for the best experience:");
    log.link(LINKS.github.installGhCli);
    log.blank();
    log.info("Without gh CLI, you'll need to create the repo manually:");
    log.link(LINKS.github.newRepo);

    const repoFull = await input({
      message: "GitHub repo (owner/name):",
      default: `username/${ctx.config.project.name}`,
      validate: (v) => (v.includes("/") ? true : "Format: owner/name"),
    });
    const [owner, name] = repoFull.split("/");
    return { repo: name, owner };
  }

  // Check gh auth
  try {
    await run("gh", ["auth", "status"]);
    log.success("GitHub CLI authenticated!");
  } catch {
    log.info("Logging in to GitHub via browser...");
    try {
      await run("gh", ["auth", "login", "--web"]);
      log.success("GitHub CLI authenticated!");
    } catch {
      log.error("GitHub authentication failed.");
      throw new Error("gh auth login failed");
    }
  }

  // Create or link repo
  const action = await select<"create" | "existing">({
    message: "Create a new repo or link an existing one?",
    choices: [
      { name: "Create a new repository", value: "create" },
      { name: "Link an existing repository", value: "existing" },
    ],
  });

  if (action === "create") {
    const repoName = await input({
      message: "Repository name:",
      default: ctx.config.project.name,
    });

    const visibility = await select<"public" | "private">({
      message: "Visibility:",
      choices: [
        { name: "Private", value: "private" },
        { name: "Public", value: "public" },
      ],
    });

    const description = await input({
      message: "Description (optional):",
      default: "",
    });

    log.info("Creating repository...");
    const args = [
      "repo",
      "create",
      repoName,
      `--${visibility}`,
      "--source=.",
      "--push",
    ];
    if (description) args.push(`--description=${description}`);

    try {
      const result = await run("gh", args);
      log.success("Repository created and code pushed!");

      // Parse owner from output
      const match = result.stdout.match(
        /github\.com\/([^/]+)\/([^/\s]+)/
      );
      const owner = match?.[1] ?? "unknown";

      return { repo: repoName, owner };
    } catch (e: any) {
      // Might fail if git isn't initialized locally
      log.warn("Auto-push failed. Creating remote repo only...");
      try {
        await run("gh", [
          "repo",
          "create",
          repoName,
          `--${visibility}`,
          ...(description ? [`--description=${description}`] : []),
        ]);

        // Get owner
        const whoami = await run("gh", ["api", "user", "-q", ".login"]);
        const owner = whoami.stdout.trim();

        log.success(`Repository created: ${owner}/${repoName}`);
        log.info("Push your code with:");
        log.dim(`  git remote add origin https://github.com/${owner}/${repoName}.git`);
        log.dim("  git push -u origin main");

        return { repo: repoName, owner };
      } catch {
        throw new Error("Failed to create repository");
      }
    }
  } else {
    // Link existing
    const repoFull = await input({
      message: "GitHub repo (owner/name):",
      validate: (v) => (v.includes("/") ? true : "Format: owner/name"),
    });
    const [owner, repo] = repoFull.split("/");
    return { repo, owner };
  }
}
