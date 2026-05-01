import { execSync } from "node:child_process";
import { access, cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import type { FixtureItem, Scenario } from "./types.js";

const REPO_ROOT = resolve(new URL("../../..", import.meta.url).pathname);

export async function setupTmpRepo(scenario: Scenario): Promise<string> {
  const tmpDir = await mkdtemp(join(tmpdir(), `un-punt-eval-${scenario.id}-`));

  execSync("git init -q -b main", { cwd: tmpDir });
  execSync('git config user.email "eval@un-punt.local"', { cwd: tmpDir });
  execSync('git config user.name "un-punt eval"', { cwd: tmpDir });

  if (scenario.fixture.files) {
    for (const [relPath, content] of Object.entries(scenario.fixture.files)) {
      const absPath = join(tmpDir, relPath);
      await mkdir(dirname(absPath), { recursive: true });
      await writeFile(absPath, content);
    }
  }

  if (scenario.fixture.items?.length) {
    const itemsDir = join(tmpDir, ".un-punt", "items");
    await mkdir(itemsDir, { recursive: true });
    for (const item of scenario.fixture.items) {
      await writeFile(join(itemsDir, `${item.id}.md`), renderFixtureItem(item));
    }
  }

  const contractTarget = join(tmpDir, ".un-punt", "contract.md");
  await mkdir(dirname(contractTarget), { recursive: true });
  const contractSource =
    scenario.fixture.contract && scenario.fixture.contract !== "default"
      ? resolve(REPO_ROOT, scenario.fixture.contract)
      : join(REPO_ROOT, "core/skill/reference/contract-template.md");
  await cp(contractSource, contractTarget);

  // Initial commit so `git status` / `git log` behave naturally.
  execSync("git add -A", { cwd: tmpDir });
  execSync('git commit -q -m "fixture"', { cwd: tmpDir });

  return tmpDir;
}

export async function seedSkill(tmpDir: string): Promise<void> {
  const skillDir = join(tmpDir, ".claude", "skills", "un-punt");
  await mkdir(skillDir, { recursive: true });

  const builtSkill = join(REPO_ROOT, "adapters/claude-code/skills/un-punt");
  await ensureExists(join(builtSkill, "SKILL.md"), "core/build.sh hasn't run yet");

  await cp(join(builtSkill, "SKILL.md"), join(skillDir, "SKILL.md"));
  await cp(join(builtSkill, "reference"), join(skillDir, "reference"), { recursive: true });
  await cp(join(builtSkill, "snippets"), join(skillDir, "snippets"), { recursive: true });
}

export async function teardown(tmpDir: string): Promise<void> {
  await rm(tmpDir, { recursive: true, force: true });
}

function renderFixtureItem(item: FixtureItem): string {
  const now = new Date().toISOString();
  const fm = [
    "---",
    `id: ${item.id}`,
    `type: ${item.type}`,
    `status: ${item.status}`,
    `file: ${item.file}`,
    item.line != null ? `line: ${item.line}` : null,
    item.symbol ? `symbol: ${item.symbol}` : null,
    `confidence: ${item.confidence}`,
    `created_at: ${now}`,
    `updated_at: ${now}`,
    "---",
  ]
    .filter(Boolean)
    .join("\n");

  const why = item.why ?? "Pre-seeded fixture item.";

  return `${fm}

# ${item.id}

## Why deferred
${why}

## Lifecycle
| When                 | Status | Trigger | Reference        |
|----------------------|--------|---------|------------------|
| ${now} | ${item.status}   | capture | fixture-seed     |
`;
}

async function ensureExists(path: string, hint: string): Promise<void> {
  try {
    await access(path);
  } catch {
    throw new Error(`required file missing: ${path} (${hint})`);
  }
}

export async function readFileIfExists(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === "ENOENT") return null;
    throw err;
  }
}

export { REPO_ROOT };
