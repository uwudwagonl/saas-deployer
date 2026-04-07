import { confirm } from "../../ui/prompts.js";
import { scaffoldFile } from "../../templates/engine.js";

const ciWorkflow = `name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint --if-present
      - run: npm run typecheck --if-present
      - run: npm test --if-present
`;

const dependabotConfig = `version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 10
`;

const prTemplate = `## What does this PR do?

<!-- Brief description of the changes -->

## Checklist

- [ ] Tests pass
- [ ] Types pass
- [ ] Linting passes
- [ ] Tested locally
`;

export async function scaffoldWorkflows(): Promise<string[]> {
  const added: string[] = [];

  const wantCi = await confirm({
    message: "Add CI workflow (lint + typecheck + test on PR)?",
    default: true,
  });
  if (wantCi) {
    const created = await scaffoldFile(".github/workflows/ci.yml", ciWorkflow);
    if (created) added.push("ci.yml");
  }

  const wantDependabot = await confirm({
    message: "Add Dependabot config (weekly dependency updates)?",
    default: true,
  });
  if (wantDependabot) {
    const created = await scaffoldFile(
      ".github/dependabot.yml",
      dependabotConfig
    );
    if (created) added.push("dependabot.yml");
  }

  const wantPrTemplate = await confirm({
    message: "Add PR template?",
    default: true,
  });
  if (wantPrTemplate) {
    const created = await scaffoldFile(
      ".github/pull_request_template.md",
      prTemplate
    );
    if (created) added.push("pull_request_template.md");
  }

  return added;
}
