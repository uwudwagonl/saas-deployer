const LATEST_VERSION = 2;

export function migrateConfig(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid config: expected an object");
  }

  const obj = raw as Record<string, unknown>;
  let version = (obj.version as number) ?? 1;

  // v1 → v2
  if (version === 1) {
    obj.version = 2;

    // Rename lucia → better-auth
    const auth = obj.auth as Record<string, unknown> | undefined;
    if (auth?.provider === "lucia") {
      auth.provider = "better-auth";
    }

    version = 2;
  }

  if (version !== LATEST_VERSION) {
    throw new Error(
      `Unknown config version ${version}. Expected ${LATEST_VERSION}.`
    );
  }

  return obj;
}
