import { log } from "../../ui/logger.js";
import { LINKS } from "../links.js";
import type { ProviderContext } from "../types.js";

export interface SupabaseAuthResult {
  envVars: Record<string, string>;
}

export async function setupSupabaseAuth(
  ctx: ProviderContext
): Promise<SupabaseAuthResult> {
  const envVars: Record<string, string> = {};

  // Check if Supabase DB is already configured
  const supabaseUrl = ctx.credential("supabase_url");
  const anonKey = ctx.credential("supabase_anon_key");

  if (supabaseUrl && anonKey) {
    log.success("Supabase project already configured!");
    log.info("Supabase Auth is built-in — no additional setup needed.");
    envVars["NEXT_PUBLIC_SUPABASE_URL"] = supabaseUrl;
    envVars["NEXT_PUBLIC_SUPABASE_ANON_KEY"] = anonKey;
  } else {
    log.warn('Supabase Auth requires a Supabase project. Run "saas db" first and select Supabase.');
    log.info("Or set up Supabase manually:");
    log.link(LINKS.supabase.dashboard);
  }

  log.blank();
  log.info("Configure auth providers in the Supabase dashboard:");
  log.link(LINKS.supabase.dashboard, "Supabase Dashboard → Authentication → Providers");

  return { envVars };
}
