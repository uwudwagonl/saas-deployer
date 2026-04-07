import Conf from "conf";

const store = new Conf({
  projectName: "saas-deployer",
  encryptionKey: "saas-deployer-local-key",
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
