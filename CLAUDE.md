# SaaSDeployer

Read the full agent context: [docs/CLAUDE.md](docs/CLAUDE.md)
Read the contributing guide: [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)

## Quick Reference

```
npm run build      # tsup -> dist/cli.js (ESM, Node 18+)
npm test           # vitest (703 tests)
npm run dev        # tsx src/cli.ts (no build needed)
```

## Project Layout

```
src/
  cli.ts                  # Entry — Commander, 13 commands, global flags
  commands/               # Thin wrappers: load config, call provider, persist
  providers/              # Service implementations (Provider interface)
    types.ts              # Provider/ProviderResult/PreflightResult interfaces
    links.ts              # ALL dashboard URLs — never hardcode elsewhere
  config/                 # Zod schema, store, credentials, migration
  templates/              # Framework-specific code generators (5 frameworks)
  deploy/                 # Topological sort + orchestrator
  presets/                # minimal, startup, enterprise
  env/                    # .env.local/.env.example generation
  ui/                     # Logger, spinner, prompts (with non-interactive fallback)
  utils/                  # exec, fs, validation, context
tests/
  config/                 # Schema, migration, store tests
  providers/              # Provider interface, secrets, webhooks
  deploy/                 # Resolver, orchestrator tests
  env/                    # EnvManager, dotenv tests
  templates/              # Template content, engine tests
  cli/                    # CLI binary, command, prompt tests
  utils/                  # Validation, exec, fs, context tests
  presets/                # Preset tests
docs/                     # Full agent context files + contributing guide
```

## Hard Rules

- ESM only (`.js` extensions in imports, no require)
- No default exports
- Providers return data, never mutate config
- All URLs in `src/providers/links.ts`
- Secrets via stdin, never CLI args
- Native fetch, no axios
- Build before CLI tests
