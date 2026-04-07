# Copilot Instructions for saas-deployer

## What This Project Is

A TypeScript CLI tool (`saas-deployer`) that automates SaaS deployment: Stripe billing, databases, auth, email, monitoring, GitHub repos, and Vercel deployments. ESM-only, Node 18+, built with Commander.js.

## Build & Test

```bash
npm run build      # tsup -> dist/cli.js
npm test           # vitest (703 tests)
npm run dev        # tsx src/cli.ts (no build)
npx tsc --noEmit   # typecheck
```

## Key Architecture

- **Entry**: `src/cli.ts` — registers 13 commands + global flags
- **Commands** (`src/commands/`): thin wrappers that call `provider.setup()` and persist results
- **Providers** (`src/providers/`): implement `Provider` interface from `src/providers/types.ts`. Return `{ success, configUpdates, envVars, manualSteps }` — never mutate config
- **Config**: `saas.config.json` validated by Zod schema (`src/config/schema.ts`). Credentials encrypted in OS config dir
- **Templates**: TypeScript string exports for 5 frameworks (Next.js, Remix, SvelteKit, Nuxt, Astro)
- **Deploy**: topological sort on provider `dependsOn` arrays, runs in dependency order

## Rules

- ESM with `.js` import extensions, no default exports
- All dashboard URLs in `src/providers/links.ts` — never hardcode elsewhere
- Providers are pure functions — return data, don't write config
- Use native `fetch`, not axios
- Prefer CLI-based auth (gh, vercel CLI) over API key pasting
- All prompts support non-interactive mode via env var fallback (`src/ui/prompts.ts`)
- Never pass secrets via CLI args — use stdin
- Build before running CLI tests (`tests/cli-commands.test.ts` needs `dist/`)

## Adding a Provider

1. `src/providers/<name>/index.ts` — implement `Provider` interface
2. `src/commands/<name>.ts` — thin command wrapper
3. Register in `src/cli.ts`
4. URLs in `src/providers/links.ts`
5. Schema fields in `src/config/schema.ts`
6. Tests in `tests/`
