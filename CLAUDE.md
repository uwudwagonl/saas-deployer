# SaaSDeployer

CLI tool that automates SaaS deployment setup: Stripe billing, database provisioning, auth, email, monitoring, GitHub repo, Vercel deploy, and more.

## Commands

```
npm run build      # tsup → dist/cli.js (ESM, Node 18+)
npm test           # vitest run (703 tests)
npm run dev        # tsx src/cli.ts (no build needed)
node bin/saas.js   # run built CLI
```

## Architecture

- **Entry**: `src/cli.ts` — Commander program, registers all 13 commands, global flags (--no-interactive, --dry-run, -y, --verbose)
- **Commands** (`src/commands/`): Thin wrappers that create a `ProviderContext`, call `provider.setup()`, persist config updates, mark step complete
- **Providers** (`src/providers/`): Each service (stripe, db, auth, etc.) implements the `Provider` interface from `src/providers/types.ts`. Providers return `{ success, configUpdates, envVars, manualSteps }` — they never mutate config directly
- **Config**: `saas.config.json` (Zod v2 schema in `src/config/schema.ts`), credentials encrypted via `conf` in OS config dir
- **Templates** (`src/templates/`): TypeScript string exports, not separate files. Framework-specific (Next.js, Remix, SvelteKit, Nuxt, Astro)
- **Deploy orchestrator** (`src/deploy/`): Topological sort (Kahn's algorithm) on provider `dependsOn` arrays, runs in dependency order, skips completed steps
- **Presets** (`src/presets/`): minimal, startup, enterprise — define default providers and service lists
- **Env manager** (`src/env/`): Collects env vars from all providers, generates `.env.local` and `.env.example`, auto-detects sensitive keys

## Key patterns

- Every dashboard URL lives in `src/providers/links.ts` — never hardcode URLs elsewhere
- CLI login (browser OAuth) is preferred over API key pasting — check for CLI tool first, fall back to manual
- `completedSteps` array in config tracks progress; `markStepCompleted()` is idempotent
- Schema migration in `src/config/migrate.ts` runs transparently in `loadConfig()` before Zod parse
- Non-interactive mode: prompts in `src/ui/prompts.ts` check `isInteractive()` and fall back to env vars / defaults

## Testing

Tests are in `tests/`. Run `npm test`. Key areas:
- Schema validation (all enum values, kitchen-sink configs)
- Migration (v1→v2, lucia→better-auth)
- Template content (all 5 frameworks, webhook events, security patterns)
- Topological sort (diamond deps, cycles, deep chains)
- Env manager (scope filtering, sensitivity detection, .env generation)
- Provider interface compliance (all 7 providers)
- CLI binary (all commands registered, help output, non-interactive mode)
- Presets (escalation, schema validity, default providers)

## Style

- ESM throughout (`"type": "module"` in package.json, `.js` extensions in imports)
- No default exports
- Providers are pure — return data, don't mutate
- Use `native fetch` for REST APIs (no axios)
- Inline topological sort (~30 lines) instead of dependency
