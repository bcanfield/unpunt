import { execSync } from "node:child_process";
import { access, cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
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

  if (scenario.fixture.symlinks) {
    for (const [linkRel, target] of Object.entries(scenario.fixture.symlinks)) {
      const linkAbs = join(tmpDir, linkRel);
      await mkdir(dirname(linkAbs), { recursive: true });
      await symlink(target, linkAbs);
    }
  }

  const contractTarget = join(tmpDir, ".un-punt", "contract.md");
  await mkdir(dirname(contractTarget), { recursive: true });
  // Three cases:
  // 1. contract === "default" or unset → copy from core/skill/reference/contract-template.md
  // 2. contract starts with ".un-punt/" → already written by fixture.files into tmpDir; skip the cp
  // 3. otherwise → resolve relative to REPO_ROOT and copy from there
  const contractValue = scenario.fixture.contract;
  if (!contractValue || contractValue === "default") {
    await cp(join(REPO_ROOT, "core/skill/reference/contract-template.md"), contractTarget);
  } else if (contractValue.startsWith(".un-punt/")) {
    // Already in tmpDir via fixture.files; verify it landed at the canonical path.
    if (contractValue !== ".un-punt/contract.md") {
      // Move/rename into place.
      await cp(join(tmpDir, contractValue), contractTarget);
    }
    // else: file is already at .un-punt/contract.md — nothing to do.
  } else {
    await cp(resolve(REPO_ROOT, contractValue), contractTarget);
  }

  // Initial commit so `git status` / `git log` behave naturally.
  // BACKDATE both AuthorDate and CommitterDate to outside the 24h-human-touch
  // window. Without this, the skill's categorical refusal #11 ("files modified
  // by humans in last 24h") trips on every fixture file and refuses all
  // planning items as "in-flight human work".
  const oldDate = "2026-01-01T00:00:00Z";
  execSync("git add -A", { cwd: tmpDir });
  execSync(`git commit -q -m "fixture"`, {
    cwd: tmpDir,
    env: { ...process.env, GIT_AUTHOR_DATE: oldDate, GIT_COMMITTER_DATE: oldDate },
  });

  // Switch to a feature branch — the skill's pre-flight check refuses to
  // sweep on protected branches (main/master/develop/trunk/release/*).
  // Without this, every planning scenario short-circuits at pre-flight and
  // never produces a plan.md.
  execSync("git checkout -q -b eval-feature-branch", { cwd: tmpDir });

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
