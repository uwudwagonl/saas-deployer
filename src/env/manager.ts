export type EnvScope = "development" | "preview" | "production";

export interface EnvVar {
  key: string;
  value: string;
  scopes: EnvScope[];
  source: string;
  sensitive: boolean;
  description?: string;
}

export class EnvManager {
  private vars: EnvVar[] = [];

  add(envVar: EnvVar): void {
    // Replace existing var with same key and source
    const idx = this.vars.findIndex(
      (v) => v.key === envVar.key && v.source === envVar.source
    );
    if (idx >= 0) {
      this.vars[idx] = envVar;
    } else {
      this.vars.push(envVar);
    }
  }

  addMany(
    vars: Record<string, string>,
    source: string,
    options?: { sensitive?: boolean; scopes?: EnvScope[] }
  ): void {
    for (const [key, value] of Object.entries(vars)) {
      this.add({
        key,
        value,
        source,
        sensitive: options?.sensitive ?? (key.includes("SECRET") || key.includes("KEY") || key.includes("TOKEN") || key.includes("PASSWORD") || key.includes("URL")),
        scopes: options?.scopes ?? ["development", "preview", "production"],
      });
    }
  }

  getAll(): EnvVar[] {
    return [...this.vars];
  }

  getForScope(scope: EnvScope): Record<string, string> {
    const result: Record<string, string> = {};
    for (const v of this.vars) {
      if (v.scopes.includes(scope)) {
        result[v.key] = v.value;
      }
    }
    return result;
  }

  generateDotEnv(scope: EnvScope = "development"): string {
    const lines: string[] = [];
    let lastSource = "";

    // Group by source
    const sorted = [...this.vars].sort((a, b) =>
      a.source.localeCompare(b.source)
    );

    for (const v of sorted) {
      if (!v.scopes.includes(scope)) continue;

      if (v.source !== lastSource) {
        if (lastSource) lines.push("");
        lines.push(`# === ${v.source.charAt(0).toUpperCase() + v.source.slice(1)} ===`);
        lastSource = v.source;
      }

      lines.push(`${v.key}=${v.value}`);
    }

    return lines.join("\n") + "\n";
  }

  generateDotEnvExample(): string {
    const lines: string[] = [
      "# Environment variables for this project",
      "# Copy this file to .env.local and fill in the values",
      "",
    ];
    let lastSource = "";

    const sorted = [...this.vars].sort((a, b) =>
      a.source.localeCompare(b.source)
    );

    for (const v of sorted) {
      if (v.source !== lastSource) {
        if (lastSource) lines.push("");
        lines.push(`# === ${v.source.charAt(0).toUpperCase() + v.source.slice(1)} ===`);
        lastSource = v.source;
      }

      if (v.description) {
        lines.push(`# ${v.description}`);
      }

      // Show placeholder instead of real value
      const placeholder = v.sensitive ? "" : v.value;
      lines.push(`${v.key}=${placeholder}`);
    }

    return lines.join("\n") + "\n";
  }

  getSources(): string[] {
    return [...new Set(this.vars.map((v) => v.source))];
  }
}
