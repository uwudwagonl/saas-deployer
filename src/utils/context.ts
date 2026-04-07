export interface CLIContext {
  interactive: boolean;
  dryRun: boolean;
  verbose: boolean;
  yes: boolean;
}

export function createContext(options: Record<string, unknown>): CLIContext {
  const isCI =
    !!process.env.CI ||
    !!process.env.GITHUB_ACTIONS ||
    !!process.env.GITLAB_CI;

  return {
    interactive:
      !isCI &&
      !options.noInteractive &&
      process.stdin.isTTY !== false,
    dryRun: !!options.dryRun,
    verbose: !!options.verbose,
    yes: !!options.yes || isCI,
  };
}

export function isInteractive(): boolean {
  if (process.env.CI) return false;
  if (process.env.SAAS_INTERACTIVE === "false") return false;
  if (process.env.SAAS_YES === "true") return false;
  if (!process.stdin.isTTY) return false;
  return true;
}

export function isDryRun(): boolean {
  return process.env.SAAS_DRY_RUN === "true";
}

export function isVerbose(): boolean {
  return process.env.SAAS_VERBOSE === "true" || !!process.env.DEBUG;
}
