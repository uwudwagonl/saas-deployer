import type { SaasConfig } from "../config/schema.js";

export interface Preset {
  name: string;
  displayName: string;
  description: string;
  services: string[];
  defaults: Partial<SaasConfig>;
}

export const PRESETS: Record<string, Preset> = {
  minimal: {
    name: "minimal",
    displayName: "Minimal",
    description: "Stripe + NextAuth + database — just the essentials",
    services: ["stripe", "db", "auth"],
    defaults: {
      auth: { provider: "nextauth", configured: false },
    },
  },
  startup: {
    name: "startup",
    displayName: "Startup",
    description: "Stripe + Supabase + Clerk + Resend + Vercel — full stack",
    services: ["stripe", "db", "auth", "email", "github", "vercel"],
    defaults: {
      db: {
        provider: "supabase",
        connectionStringEnvVar: "DATABASE_URL",
      },
      auth: { provider: "clerk", configured: false },
      email: { provider: "resend", configured: false },
    },
  },
  enterprise: {
    name: "enterprise",
    displayName: "Enterprise",
    description: "Everything — Stripe, DB, Auth, Email, Monitoring, GitHub, Vercel, Domain",
    services: ["stripe", "db", "auth", "email", "monitoring", "github", "vercel", "domain"],
    defaults: {
      db: {
        provider: "neon",
        connectionStringEnvVar: "DATABASE_URL",
      },
      auth: { provider: "clerk", configured: false },
      email: { provider: "resend", configured: false },
    },
  },
};

export function getPreset(name: string): Preset | undefined {
  return PRESETS[name];
}

export function getPresetNames(): string[] {
  return Object.keys(PRESETS);
}
