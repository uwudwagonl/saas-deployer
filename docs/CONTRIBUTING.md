# Contributing to saas-deployer

## Setup

```bash
git clone https://github.com/uwudwagonl/saas-deployer.git
cd saas-deployer
npm install
npm run build
npm test
```

## Development Workflow

```bash
npm run dev          # Run CLI without building (uses tsx)
npm run build        # Build with tsup -> dist/cli.js
npm test             # Run all 703 tests
npm run test:watch   # Watch mode
npx tsc --noEmit     # Typecheck without emitting
```

**Important**: Always run `npm run build` before running CLI integration tests — `tests/cli-commands.test.ts` invokes the built `bin/saas.js` binary.

## Architecture

### How the CLI works

1. `src/cli.ts` registers 13 commands with Commander.js and sets up global flags
2. Each command in `src/commands/` is a thin wrapper that:
   - Loads config from `saas.config.json`
   - Creates a `ProviderContext` with credentials and config
   - Calls `provider.setup(ctx)`
   - Persists `configUpdates` from the result
   - Calls `markStepCompleted()`
3. Providers in `src/providers/` do the actual work — API calls, scaffolding, etc.

### Provider interface

Every provider implements this interface from `src/providers/types.ts`:

```typescript
interface Provider {
  name: string;
  displayName: string;
  description: string;
  category: string;
  requiredCredentialKeys: string[];
  dependsOn: string[];                              // for deploy orchestrator
  preflight(ctx: ProviderContext): Promise<PreflightResult>;
  setup(ctx: ProviderContext): Promise<ProviderResult>;
}

interface ProviderResult {
  success: boolean;
  configUpdates?: Partial<SaasConfig>;  // merged into config by command layer
  envVars?: Record<string, string>;     // collected by env manager
  manualSteps?: ManualStep[];           // shown to user with dashboard URLs
}
```

**Providers are pure** — they return data, they don't write config files or mutate state.

### Config system

- **`saas.config.json`** — project config, committed to repo, no secrets. Validated by Zod schema in `src/config/schema.ts`.
- **Credentials** — encrypted via `conf` library in the OS config directory (`~/.config/saas-deployer` or equivalent). Per-machine encryption key derived from hostname + username.
- **Migration** — `src/config/migrate.ts` handles schema version upgrades. Runs automatically in `loadConfig()` before Zod validation.
- **Step tracking** — `completedSteps` array. `markStepCompleted()` is idempotent. Commands check this to skip already-done work.

### Templates

Templates live in `src/templates/` as TypeScript string exports (not separate .hbs or .ejs files). Each template is a function or string constant that generates framework-specific code. Supported frameworks:

- Next.js (App Router)
- Remix
- SvelteKit
- Nuxt
- Astro

### Deploy orchestrator

`saas deploy` runs all pending providers in dependency order using topological sort (Kahn's algorithm, ~30 lines in `src/deploy/resolver.ts`). Provider `dependsOn` arrays define the graph.

## Adding a New Provider

1. **Provider implementation** — Create `src/providers/<name>/index.ts`:
   ```typescript
   import type { Provider, ProviderContext, ProviderResult, PreflightResult } from "../types.js";

   export const myProvider: Provider = {
     name: "my-service",
     displayName: "My Service",
     description: "What it does",
     category: "category",
     requiredCredentialKeys: ["my_api_key"],
     dependsOn: [],
     async preflight(ctx) { /* check readiness */ },
     async setup(ctx) { /* do the work, return ProviderResult */ },
   };
   ```

2. **Command wrapper** — Create `src/commands/<name>.ts`:
   ```typescript
   import type { Command } from "commander";
   import { myProvider } from "../providers/<name>/index.js";
   // ... load config, create context, call setup, persist results
   ```

3. **Register** — Add to `src/cli.ts`

4. **Dashboard URLs** — Add any URLs to `src/providers/links.ts`

5. **Schema** — Add config fields to `src/config/schema.ts` if needed

6. **Tests** — Add `tests/<name>.test.ts`

7. **Deploy graph** — If the provider has dependencies, update `src/deploy/resolver.ts`

## Code Style

- **ESM only** — `"type": "module"` in package.json, `.js` extensions in all imports
- **No default exports** — use named exports everywhere
- **No axios** — use native `fetch` for REST APIs
- **No shell: true** — the `run()` helper in `src/utils/exec.ts` passes args as arrays
- **Secrets via stdin** — never pass secrets as CLI arguments (visible in `ps`). Use the `stdin` option on `run()`
- **URLs centralized** — every dashboard URL in `src/providers/links.ts`, nowhere else
- **CLI-first auth** — check for CLI tools (gh, vercel, sentry-cli) before falling back to manual key entry
- **Non-interactive support** — all prompts check `isInteractive()` and fall back to env vars or defaults

## Testing

Tests are in `tests/` using Vitest. Key test categories:

| Category | Files | What it tests |
|----------|-------|---------------|
| Schema | `schema.test.ts`, `schema-integration.test.ts` | Zod validation, enum values, kitchen-sink configs |
| Migration | `migrate.test.ts`, `migrate-advanced.test.ts` | v1->v2 upgrade, edge cases |
| Templates | `templates.test.ts`, `webhook-routes.test.ts` | All 5 frameworks, security patterns |
| Deploy | `resolver.test.ts`, `resolver-advanced.test.ts`, `deploy-orchestrator.test.ts` | Topo sort, cycles, diamond deps |
| Env | `env-manager.test.ts`, `env-manager-advanced.test.ts`, `dotenv.test.ts`, `dotenv-advanced.test.ts`, `env-collect.test.ts` | Scope filtering, sensitivity, .env generation |
| Providers | `provider-types.test.ts` | Interface compliance for all 7 providers |
| CLI | `cli-commands.test.ts` | Binary invocation, all commands, help output |
| Presets | `presets.test.ts`, `presets-integration.test.ts` | Escalation, defaults, schema validity |
| Utils | `validation.test.ts`, `validation-edge-cases.test.ts`, `exec.test.ts`, `fs.test.ts`, `context.test.ts` | Input validation, file helpers |

## PR Checklist

- [ ] `npm test` passes (703 tests)
- [ ] `npm run build` succeeds
- [ ] `npx tsc --noEmit` — no type errors
- [ ] `node bin/saas.js --help` shows all commands
- [ ] New provider? Added tests, registered command, added URLs to links.ts
