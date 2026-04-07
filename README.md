# saas-deployer

CLI tool that automates the tedious parts of deploying a SaaS application. Set up Stripe billing, databases, auth, email, monitoring, GitHub repos, and Vercel deployments — all from your terminal.

## Install

```bash
npm install -g saas-deployer
```

Or run directly:

```bash
npx saas-deployer
```

Requires **Node.js 18+**.

## Quick Start

```bash
# Initialize your project
saas init

# Or use a preset to configure everything at once
saas init --preset startup

# Set up individual services
saas stripe      # Stripe products, webhooks, billing portal
saas db          # Database (Supabase, Neon, PlanetScale, Turso)
saas auth        # Authentication (Clerk, NextAuth, Better Auth, Supabase Auth)
saas email       # Transactional email (Resend, SendGrid, Postmark)
saas monitoring  # Error tracking (Sentry) + analytics (PostHog)

# Deploy
saas github      # Create repo, sync secrets, add CI workflows
saas vercel      # Link project, push env vars, deploy
saas domain      # Configure custom domain + DNS

# Or run everything in dependency order
saas deploy
```

## Commands

| Command | Description |
|---------|-------------|
| `saas init` | Initialize project config (`saas.config.json`) |
| `saas status` | Dashboard showing setup progress for all services |
| `saas stripe` | Set up Stripe products, prices, webhooks, and customer portal |
| `saas db` | Provision and configure your database |
| `saas auth` | Set up authentication provider |
| `saas env` | Manage environment variables (`.env.local`, `.env.example`) |
| `saas email` | Configure transactional email |
| `saas monitoring` | Set up error tracking and product analytics |
| `saas github` | Create GitHub repo, sync secrets, add CI workflows |
| `saas vercel` | Deploy to Vercel, push env vars |
| `saas domain` | Configure custom domain and DNS records |
| `saas deploy` | Run all pending services in dependency order |
| `saas add` | Browse and add available services |

## Global Options

```
--no-interactive   Run without prompts (uses env vars / defaults)
--dry-run          Preview changes without applying them
-y, --yes          Auto-confirm all prompts
--verbose          Show detailed output
```

## Frameworks

saas-deployer detects your framework automatically and generates framework-specific code (webhook handlers, middleware, auth config):

- **Next.js** (App Router)
- **Remix**
- **SvelteKit**
- **Nuxt**
- **Astro**

## Presets

Skip the decision fatigue. Presets pre-configure which services and providers to use:

| Preset | Services |
|--------|----------|
| `minimal` | Stripe + Database + Auth |
| `startup` | Stripe + Supabase + Clerk + Resend + GitHub + Vercel |
| `enterprise` | Everything — Stripe, Neon, Clerk, Resend, Sentry, PostHog, GitHub, Vercel, Domain |

```bash
saas init --preset startup
saas deploy
```

## How It Works

1. **`saas init`** creates a `saas.config.json` in your project root tracking which services are configured
2. **Each command** walks you through setup interactively — API keys are stored encrypted on your machine, never in the config file
3. **`saas deploy`** resolves dependencies between services (e.g., Vercel needs GitHub first) and runs them in order, skipping anything already completed
4. **`saas env`** collects all environment variables from configured services and generates `.env.local` and `.env.example`

Everything is **idempotent** — run any command twice and it skips what's already done.

## Non-Interactive / CI Mode

Every prompt falls back to environment variables when `--no-interactive` is set or `stdin` is not a TTY:

```bash
export STRIPE_SECRET_KEY=sk_test_...
export STRIPE_PUBLISHABLE_KEY=pk_test_...
saas stripe --no-interactive
```

## Environment Variables

`saas env` aggregates env vars from all configured services:

```bash
saas env              # Generate .env.local
saas env --example    # Generate .env.example with placeholders
saas env --check      # Validate all required vars are set
saas env --diff       # Compare local vs remote (Vercel)
saas env --sync       # Push to Vercel
```

## Development

```bash
git clone https://github.com/zeldalorddactivatewindows/saas-deployer.git
cd saas-deployer
npm install
npm run build         # Build with tsup
npm run dev           # Run without building (tsx)
npm test              # Run tests (703 tests via Vitest)
node bin/saas.js      # Run the built CLI
```

## Project Structure

```
src/
  cli.ts              # Commander entry point, registers all 13 commands
  commands/            # Thin command wrappers (init, stripe, db, auth, ...)
  providers/           # Service implementations (Stripe SDK, GitHub, Vercel, ...)
  config/              # Zod schema, config store, encrypted credentials, migration
  templates/           # Framework-specific code generators (webhook handlers, middleware)
  deploy/              # Topological sort + orchestrator for `saas deploy`
  presets/             # Preset definitions (minimal, startup, enterprise)
  env/                 # EnvManager — .env.local/.env.example generation
  ui/                  # Logger (chalk), spinner (ora), prompts (inquirer)
  utils/               # exec, fs, validation, context helpers
tests/                 # 703 tests across 31 files
```

## License

MIT
