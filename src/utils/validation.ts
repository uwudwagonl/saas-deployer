export function isStripeSecretKey(value: string): boolean {
  return /^sk_(test|live)_[A-Za-z0-9]+$/.test(value);
}

export function isStripePublishableKey(value: string): boolean {
  return /^pk_(test|live)_[A-Za-z0-9]+$/.test(value);
}

export function isGitHubToken(value: string): boolean {
  return /^gh[ps]_[A-Za-z0-9_]+$/.test(value);
}

export function isVercelToken(value: string): boolean {
  return value.length > 10;
}

export function isDomainName(value: string): boolean {
  return /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/.test(
    value
  );
}

export function isNonEmpty(value: string): string | true {
  return value.trim().length > 0 || "This field is required.";
}
