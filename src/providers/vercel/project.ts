import { log } from "../../ui/logger.js";
import { input } from "../../ui/prompts.js";
import { withSpinner } from "../../ui/spinner.js";

const VERCEL_API = "https://api.vercel.com";

export interface VercelProjectResult {
  projectId: string;
  projectName: string;
}

export async function createProject(
  token: string,
  name: string,
  framework: string,
  githubRepo?: string
): Promise<VercelProjectResult> {
  const body: Record<string, unknown> = {
    name,
    framework: framework === "nextjs" ? "nextjs" : framework === "sveltekit" ? "sveltekit" : framework === "nuxt" ? "nuxtjs" : framework,
  };

  if (githubRepo) {
    const [owner, repo] = githubRepo.split("/");
    body.gitRepository = {
      type: "github",
      repo: githubRepo,
    };
  }

  const result = await withSpinner("Creating Vercel project...", async () => {
    const res = await fetch(`${VERCEL_API}/v11/projects`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        `Vercel API error: ${res.status} — ${(err as any).error?.message ?? res.statusText}`
      );
    }

    return res.json() as Promise<{ id: string; name: string }>;
  });

  log.success(`Vercel project created: ${result.name}`);
  return { projectId: result.id, projectName: result.name };
}
