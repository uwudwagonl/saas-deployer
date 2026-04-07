import { log } from "../../ui/logger.js";
import { input } from "../../ui/prompts.js";
import { withSpinner } from "../../ui/spinner.js";
import { isDomainName } from "../../utils/validation.js";
import { LINKS } from "../links.js";

const VERCEL_API = "https://api.vercel.com";

export interface DomainResult {
  domain: string;
  verified: boolean;
}

export async function addDomain(
  token: string,
  projectId: string
): Promise<DomainResult> {
  const domain = await input({
    message: "Custom domain (e.g. myapp.com):",
    validate: (v) => (isDomainName(v) ? true : "Enter a valid domain name"),
  });

  const result = await withSpinner("Adding domain to Vercel...", async () => {
    const res = await fetch(
      `${VERCEL_API}/v10/projects/${projectId}/domains`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: domain }),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        `Failed to add domain: ${(err as any).error?.message ?? res.statusText}`
      );
    }

    return res.json();
  });

  log.success(`Domain "${domain}" added to Vercel project`);
  log.blank();
  log.info("Configure DNS records at your registrar:");
  log.blank();
  log.dim("  For apex domain (myapp.com):");
  log.dim("    Type: A    Name: @    Value: 76.76.21.21");
  log.dim("");
  log.dim("  For subdomain (www.myapp.com):");
  log.dim("    Type: CNAME    Name: www    Value: cname.vercel-dns.com");
  log.blank();
  log.info("Common registrar DNS settings:");
  log.link(LINKS.cloudflare.signup, "Cloudflare DNS");
  log.dim("  Namecheap: https://ap.www.namecheap.com/Domains/DomainControlPanel/{domain}/advancedns");
  log.dim("  GoDaddy: https://dcc.godaddy.com/manage/{domain}/dns");

  return { domain, verified: false };
}
