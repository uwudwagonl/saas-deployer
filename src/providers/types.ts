import type { SaasConfig } from "../config/schema.js";

export interface ProviderContext {
  config: SaasConfig;
  credential: (key: string) => string | undefined;
  setCredential: (key: string, value: string) => void;
  interactive: boolean;
  dryRun: boolean;
}

export interface ManualStep {
  description: string;
  url?: string;
  urlLabel?: string;
}

export interface ProviderResult {
  success: boolean;
  configUpdates?: Partial<SaasConfig>;
  envVars?: Record<string, string>;
  manualSteps?: ManualStep[];
}

export interface PreflightResult {
  ready: boolean;
  missingCredentials: string[];
  missingDependencies: string[];
  warnings: string[];
}

export interface Provider {
  name: string;
  displayName: string;
  description: string;
  category:
    | "payments"
    | "database"
    | "auth"
    | "hosting"
    | "email"
    | "monitoring"
    | "analytics"
    | "storage"
    | "jobs";
  requiredCredentialKeys: string[];
  dependsOn: string[];
  cliName?: string; // e.g. "stripe", "gh", "vercel" — for login detection
  loginCommand?: string; // e.g. "stripe login", "gh auth login"
  signupUrl?: string; // direct signup URL if no account exists

  preflight(ctx: ProviderContext): Promise<PreflightResult>;
  setup(ctx: ProviderContext): Promise<ProviderResult>;
  teardown?(ctx: ProviderContext): Promise<void>;
}
