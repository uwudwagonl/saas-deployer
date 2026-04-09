// Central registry of all dashboard/manual-step URLs.
// Every URL a user might need to visit is defined here.

export const LINKS = {
  // Stripe
  stripe: {
    signup: "https://dashboard.stripe.com/register",
    apiKeys: "https://dashboard.stripe.com/apikeys",
    testApiKeys: "https://dashboard.stripe.com/test/apikeys",
    webhooks: "https://dashboard.stripe.com/webhooks",
    products: "https://dashboard.stripe.com/products",
    tax: "https://dashboard.stripe.com/settings/tax",
    billingAutomations: "https://dashboard.stripe.com/billing/automations",
    customerPortal:
      "https://dashboard.stripe.com/settings/billing/portal",
    webhookDetail: (id: string) =>
      `https://dashboard.stripe.com/webhooks/${id}`,
  },

  // GitHub
  github: {
    signup: "https://github.com/signup",
    pat: "https://github.com/settings/tokens",
    newRepo: "https://github.com/new",
    installGhCli: "https://cli.github.com",
  },

  // Vercel
  vercel: {
    signup: "https://vercel.com/signup",
    tokens: "https://vercel.com/account/tokens",
    dashboard: "https://vercel.com/dashboard",
  },

  // Supabase
  supabase: {
    signup: "https://supabase.com/dashboard/sign-up",
    dashboard: "https://supabase.com/dashboard",
    newProject: "https://supabase.com/dashboard/new/_",
    apiSettings: (ref: string) =>
      `https://supabase.com/dashboard/project/${ref}/settings/api`,
  },

  // Neon
  neon: {
    signup: "https://console.neon.tech/signup",
    console: "https://console.neon.tech",
    apiKeys: "https://console.neon.tech/app/settings/api-keys",
  },

  // PlanetScale
  planetscale: {
    signup: "https://auth.planetscale.com/sign-up",
    dashboard: "https://app.planetscale.com",
  },

  // Turso
  turso: {
    signup: "https://turso.tech/app",
    dashboard: "https://turso.tech/app",
  },

  // Auth
  clerk: {
    signup: "https://dashboard.clerk.com/sign-up",
    dashboard: "https://dashboard.clerk.com",
    apiKeys: (appId: string) =>
      `https://dashboard.clerk.com/apps/${appId}/instances/default/api-keys`,
  },

  // Email
  resend: {
    signup: "https://resend.com/signup",
    apiKeys: "https://resend.com/api-keys",
  },
  sendgrid: {
    signup: "https://signup.sendgrid.com",
    apiKeys: "https://app.sendgrid.com/settings/api_keys",
  },
  postmark: {
    signup: "https://account.postmarkapp.com/sign_up",
    dashboard: "https://account.postmarkapp.com",
  },

  // Monitoring
  sentry: {
    signup: "https://sentry.io/signup",
    authTokens:
      "https://sentry.io/settings/account/api/auth-tokens/",
  },
  posthog: {
    signup: "https://app.posthog.com/signup",
    projectSettings: "https://app.posthog.com/project/settings",
  },

  // DNS
  cloudflare: {
    signup: "https://dash.cloudflare.com/sign-up",
    apiTokens:
      "https://dash.cloudflare.com/?to=/:account/profile/api-tokens",
    r2: "https://dash.cloudflare.com/?to=/:account/r2/buckets",
  },

  // Queue / Jobs
  upstash: {
    signup: "https://console.upstash.com/login",
    console: "https://console.upstash.com",
  },
  inngest: {
    signup: "https://www.inngest.com/sign-up",
    dashboard: "https://app.inngest.com",
  },
  triggerDev: {
    signup: "https://cloud.trigger.dev/login",
    dashboard: "https://cloud.trigger.dev",
  },

  // Storage
  uploadthing: {
    signup: "https://uploadthing.com/sign-in",
    dashboard: "https://uploadthing.com/dashboard",
  },
} as const;
