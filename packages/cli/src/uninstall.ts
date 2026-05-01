import { readFile, rm } from "node:fs/promises";
import chalk from "chalk";
import {
  CLAUDE_SETTINGS_PATH,
  CLAUDE_SKILLS_DIR,
  type ClaudeSettings,
  fileExists,
  INSTALL_MANIFEST_PATH,
  type InstallManifest,
  writeJsonAtomic,
} from "./util.js";

export async function uninstall(): Promise<void> {
  if (!fileExists(INSTALL_MANIFEST_PATH)) {
    console.error(
      chalk.red(
        `No install manifest at ${INSTALL_MANIFEST_PATH}. ` +
          `un-punt was either never installed via this CLI, or installed by an older version. ` +
          `Manual cleanup: \`rm -rf ${CLAUDE_SKILLS_DIR}\` and edit ${CLAUDE_SETTINGS_PATH} by hand.`,
      ),
    );
    process.exit(1);
  }

  const manifest = JSON.parse(await readFile(INSTALL_MANIFEST_PATH, "utf8")) as InstallManifest;
  if (manifest.version !== 1) {
    console.error(
      chalk.red(
        `Install manifest version ${manifest.version} unsupported (this CLI handles version 1).`,
      ),
    );
    process.exit(1);
  }

  // 1. Reverse settings.json — remove ONLY the entries we added.
  if (fileExists(CLAUDE_SETTINGS_PATH)) {
    const userSettings = JSON.parse(await readFile(CLAUDE_SETTINGS_PATH, "utf8")) as ClaudeSettings;
    if (userSettings.permissions) {
      let totalRemoved = 0;
      for (const key of ["allow", "ask", "deny"] as const) {
        const ours = new Set(manifest.added_to_settings[`permissions.${key}` as const]);
        if (ours.size === 0) continue;
        const before = userSettings.permissions[key] ?? [];
        const after = before.filter((s) => !ours.has(s));
        userSettings.permissions[key] = after;
        totalRemoved += before.length - after.length;
      }
      await writeJsonAtomic(CLAUDE_SETTINGS_PATH, userSettings);
      console.log(
        chalk.green(`✓ Reversed permissions in ${CLAUDE_SETTINGS_PATH} (${totalRemoved} entries)`),
      );
    }
  }

  // 2. Remove the skill dir.
  if (fileExists(CLAUDE_SKILLS_DIR)) {
    await rm(CLAUDE_SKILLS_DIR, { recursive: true });
    console.log(chalk.green(`✓ Removed ${CLAUDE_SKILLS_DIR}`));
  }

  // 3. Remove the manifest itself.
  await rm(INSTALL_MANIFEST_PATH);

  console.log("");
  console.log(chalk.cyan("Uninstalled."));
  console.log("  • <cwd>/.un-punt/ left intact (your data, not ours to delete).");
  console.log("  • Restart Claude Code to ensure the skill is no longer loaded.");
}
