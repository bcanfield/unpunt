import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";

// Resolve un-punt repo root from this file's location.
// Dev: packages/cli/dist/util.js → ../../.. = repo root.
// (npm-published behavior is a Phase 1 launch concern — see docs/11-checklist.md
// Phase 1 Day 6 "Publish to npm".)
export const REPO_ROOT = resolve(new URL("../../..", import.meta.url).pathname);

export const ADAPTER_ROOT = resolve(REPO_ROOT, "adapters/claude-code");
export const CORE_REFERENCE_ROOT = resolve(REPO_ROOT, "core/skill/reference");

const HOME = homedir();
export const CLAUDE_HOME = resolve(HOME, ".claude");
export const CLAUDE_SKILLS_DIR = resolve(CLAUDE_HOME, "skills/un-punt");
export const CLAUDE_SETTINGS_PATH = resolve(CLAUDE_HOME, "settings.json");
export const INSTALL_MANIFEST_PATH = resolve(CLAUDE_HOME, "un-punt-install.json");

export interface InstallManifest {
  // v1 = permissions only (pre-Decision-#21).
  // v2 = permissions + hooks (post-Decision-#21, per Q6.2 in v2-plan).
  version: 1 | 2;
  installed_at: string;
  added_to_settings: {
    "permissions.allow": string[];
    "permissions.ask": string[];
    "permissions.deny": string[];
  };
  // v2+ only. Maps hook event name (e.g., "SessionStart", "PostToolUse") to
  // the command strings we added. On uninstall, find hooks with these
  // commands and remove only those (preserve user's own hooks).
  added_hooks?: { [eventName: string]: string[] };
}

export interface HookCommand {
  type: "command" | "prompt";
  command?: string;
  prompt?: string;
  timeout?: number;
}

export interface HookMatcherEntry {
  matcher?: string;
  hooks: HookCommand[];
}

export interface ClaudeSettings {
  permissions?: {
    allow?: string[];
    ask?: string[];
    deny?: string[];
  };
  hooks?: {
    [eventName: string]: HookMatcherEntry[];
  };
  // Other top-level keys (model, etc.) preserved unchanged.
  [key: string]: unknown;
}

/**
 * Parse `---\n<key: value>\n---` style YAML frontmatter.
 * Tolerant: ignores blank lines, comments, multi-line values.
 */
export function parseFrontmatter(text: string): Record<string, string> {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m?.[1]) return {};
  const out: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([a-zA-Z_][\w-]*)\s*:\s*(.*)$/);
    if (!kv?.[1] || kv[2] == null) continue;
    let v = kv[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[kv[1]] = v;
  }
  return out;
}

/**
 * Atomic-ish JSON write: write to a sibling `.tmp` file, then rename.
 * `rename` is atomic on POSIX within the same filesystem, so a crash
 * mid-write leaves either the old file or the new one — never partial.
 */
export async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  const { writeFile, rename } = await import("node:fs/promises");
  const tmp = `${path}.tmp.${process.pid}`;
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`);
  await rename(tmp, path);
}

export async function ensureDir(path: string): Promise<void> {
  const { mkdir } = await import("node:fs/promises");
  await mkdir(path, { recursive: true });
}

export function fileExists(path: string): boolean {
  return existsSync(path);
}

export { dirname };
