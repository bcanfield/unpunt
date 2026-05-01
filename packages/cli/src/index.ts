#!/usr/bin/env node
import { cac } from "cac";
import chalk from "chalk";
import { install } from "./install.js";
import { status } from "./status.js";
import { uninstall } from "./uninstall.js";

const cli = cac("un-punt");

cli
  .command("install <platform>", "Install the un-punt skill into the platform's skills dir")
  .example("un-punt install claude-code")
  .action(async (platform: string) => {
    try {
      await install(platform);
    } catch (err) {
      console.error(chalk.red(`Install failed: ${err instanceof Error ? err.message : err}`));
      process.exit(1);
    }
  });

cli
  .command("status", "Show the current repo's `.un-punt/` state (counts, hot zones, aging)")
  .option("--share", "Print a one-line share string for pasting into feedback (no network calls)")
  .action(async (opts: { share?: boolean }) => {
    try {
      await status({ share: opts.share });
    } catch (err) {
      console.error(chalk.red(`Status failed: ${err instanceof Error ? err.message : err}`));
      process.exit(1);
    }
  });

cli
  .command("uninstall", "Remove the un-punt skill and reverse the settings.json additions")
  .action(async () => {
    try {
      await uninstall();
    } catch (err) {
      console.error(chalk.red(`Uninstall failed: ${err instanceof Error ? err.message : err}`));
      process.exit(1);
    }
  });

cli.help();
cli.version("0.1.0");
cli.parse();
