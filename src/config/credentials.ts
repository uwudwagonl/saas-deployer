import Conf from "conf";
import { createHash } from "node:crypto";
import { hostname, userInfo } from "node:os";

function deriveEncryptionKey(): string {
  const machine = `${hostname()}-${userInfo().username}-saas-deployer`;
  return createHash("sha256").update(machine).digest("hex");
}

const store = new Conf({
  projectName: "saas-deployer",
  encryptionKey: deriveEncryptionKey(),
});

export function getCredential(key: string): string | undefined {
  return store.get(key) as string | undefined;
}

export function setCredential(key: string, value: string): void {
  store.set(key, value);
}

export function deleteCredential(key: string): void {
  store.delete(key);
}

export function clearAllCredentials(): void {
  store.clear();
}

export function hasCredential(key: string): boolean {
  return store.has(key);
}
