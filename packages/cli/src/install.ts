import { cp, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import chalk from "chalk";
import {
  ADAPTER_ROOT,
  CLAUDE_HOME,
  CLAUDE_SETTINGS_PATH,
  CLAUDE_SKILLS_DIR,
  type ClaudeSettings,
  CORE_REFERENCE_ROOT,
  ensureDir,
  fileExists,
  INSTALL_MANIFEST_PATH,
  type InstallManifest,
  writeJsonAtomic,
} from "./util.js";

const SUPPORTED_PLATFORMS = ["claude-code"] as const;
type Platform = (typeof SUPPORTED_PLATFORMS)[number];

export async function install(rawPlatform: string): Promise<void> {
  if (!SUPPORTED_PLATFORMS.includes(rawPlatform as Platform)) {
    console.error(
      chalk.red(
        `Unsupported platform "${rawPlatform}" — must be one of: ${SUPPORTED_PLATFORMS.join(", ")}`,
      ),
    );
    process.exit(2);
  }

  // Node version check (Anthropic Agent SDK requires ≥18; we go with ≥20 to
  // match repo-root engines.node).
  const major = Number(process.version.slice(1).split(".")[0]);
  if (Number.isNaN(major) || major < 18) {
    console.error(chalk.red(`Node ≥18 required (you have ${process.version}).`));
    process.exit(2);
  }

  // 1. Copy the built adapter skill into ~/.claude/skills/un-punt/
  const adapterSkillSrc = resolve(ADAPTER_ROOT, "skills/un-punt");
  if (!fileExists(resolve(adapterSkillSrc, "SKILL.md"))) {
    console.error(
      chalk.red(
        `Built skill missing at ${adapterSkillSrc}/SKILL.md. Run \`./core/build.sh\` from the repo root first.`,
      ),
    );
    process.exit(1);
  }
  await ensureDir(CLAUDE_HOME);
  await cp(adapterSkillSrc, CLAUDE_SKILLS_DIR, { recursive: true, force: true });
  console.log(chalk.green(`✓ Skill installed → ${CLAUDE_SKILLS_DIR}`));

  // 2. Merge settings.json per docs/09-adapters.md §4.4.1.
  const adapterSettings = JSON.parse(
    await readFile(resolve(ADAPTER_ROOT, "settings.json"), "utf8"),
  ) as ClaudeSettings;

  let userSettings: ClaudeSettings = {};
  if (fileExists(CLAUDE_SETTINGS_PATH)) {
    const raw = await readFile(CLAUDE_SETTINGS_PATH, "utf8");
    if (raw.trim().length > 0) {
      userSettings = JSON.parse(raw) as ClaudeSettings;
    }
  }

  userSettings.permissions ??= {};

  // Read prior manifest if present — re-running install must not lose track
  // of what previous runs added (otherwise uninstall has nothing to remove).
  let priorManifest: InstallManifest | null = null;
  if (fileExists(INSTALL_MANIFEST_PATH)) {
    priorManifest = JSON.parse(await readFile(INSTALL_MANIFEST_PATH, "utf8")) as InstallManifest;
  }

  const ourEntries: InstallManifest["added_to_settings"] = {
    "permissions.allow": [...(priorManifest?.added_to_settings["permissions.allow"] ?? [])],
    "permissions.ask": [...(priorManifest?.added_to_settings["permissions.ask"] ?? [])],
    "permissions.deny": [...(priorManifest?.added_to_settings["permissions.deny"] ?? [])],
  };

  let totalNewlyAdded = 0;
  for (const key of ["allow", "ask", "deny"] as const) {
    const adapterEntries = adapterSettings.permissions?.[key] ?? [];
    const existing = new Set(userSettings.permissions[key] ?? []);
    const toAdd = adapterEntries.filter((s) => !existing.has(s));
    userSettings.permissions[key] = [...(userSettings.permissions[key] ?? []), ...toAdd];
    totalNewlyAdded += toAdd.length;

    // Track everything we own across all install runs (deduplicated). Newly
    // added entries are obviously ours. We also reclaim any adapter entry
    // that's currently in user settings — handles the "user manually deleted
    // our entry then re-installed" case correctly.
    const ours = new Set(ourEntries[`permissions.${key}` as const]);
    for (const e of toAdd) ours.add(e);
    for (const e of adapterEntries) {
      if ((userSettings.permissions[key] ?? []).includes(e)) ours.add(e);
    }
    ourEntries[`permissions.${key}` as const] = [...ours];
  }

  await writeJsonAtomic(CLAUDE_SETTINGS_PATH, userSettings);
  if (totalNewlyAdded > 0) {
    console.log(
      chalk.green(
        `✓ Permissions merged → ${CLAUDE_SETTINGS_PATH} (${totalNewlyAdded} entries added)`,
      ),
    );
  } else {
    console.log(chalk.dim(`• Permissions already up-to-date in ${CLAUDE_SETTINGS_PATH}`));
  }

  // 3. Update install manifest. Cumulative — preserves the record of every
  // entry we own across re-installs so uninstall can fully reverse.
  const manifest: InstallManifest = {
    version: 1,
    installed_at: priorManifest?.installed_at ?? new Date().toISOString(),
    added_to_settings: ourEntries,
  };
  await writeJsonAtomic(INSTALL_MANIFEST_PATH, manifest);

  // 4. Copy contract template into <cwd>/.un-punt/contract.md if not present.
  const cwdContract = resolve(process.cwd(), ".un-punt/contract.md");
  if (!fileExists(cwdContract)) {
    await ensureDir(resolve(process.cwd(), ".un-punt"));
    await cp(resolve(CORE_REFERENCE_ROOT, "contract-template.md"), cwdContract);
    console.log(chalk.green(`✓ Contract template → ${cwdContract}`));
  } else {
    console.log(chalk.dim(`• Contract already exists at ${cwdContract} — left intact`));
  }

  // 5. Success guidance (3 lines).
  console.log("");
  console.log(chalk.cyan("Installed."));
  console.log("  • Restart Claude Code (or open a new session) to load the skill.");
  console.log(
    "  • Capture is silent — no /un-punt needed; the skill triggers on deferral signals.",
  );
  console.log("  • Run `un-punt status` to see this repo's `.un-punt/` state.");
}
