import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import chalk from "chalk";
import { fileExists, parseFrontmatter } from "./util.js";

interface Item {
  id: string;
  status: string;
  file: string;
  type: string;
  created_at: string;
}

export async function status(opts: { share?: boolean }): Promise<void> {
  const itemsDir = resolve(process.cwd(), ".un-punt/items");
  if (!fileExists(itemsDir)) {
    console.log(
      chalk.dim(
        `No \`.un-punt/items/\` in ${process.cwd()}. Either no captures yet, or you're not in an un-punt-tracked repo.`,
      ),
    );
    return;
  }

  const items: Item[] = [];
  for (const name of await readdir(itemsDir)) {
    if (!name.endsWith(".md")) continue;
    const text = await readFile(resolve(itemsDir, name), "utf8");
    const fm = parseFrontmatter(text);
    if (fm.id && fm.status && fm.file) {
      items.push({
        id: fm.id,
        status: fm.status,
        file: fm.file,
        type: fm.type ?? "?",
        created_at: fm.created_at ?? "",
      });
    }
  }

  if (items.length === 0) {
    console.log(chalk.dim(`\`.un-punt/items/\` exists but contains no items.`));
    return;
  }

  // By status
  const byStatus = countBy(items, (i) => i.status);
  // By type
  const byType = countBy(items, (i) => i.type);
  // Hot zones (top 3 dirs by item count)
  const dirCounts = countBy(items, (i) => i.file.split("/").slice(0, 1)[0] ?? "<root>");
  const hotZones = Object.entries(dirCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  // Aging — oldest 3 open items by created_at
  const aging = items
    .filter((i) => i.status === "open" && i.created_at)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(0, 3);

  console.log(chalk.bold(`un-punt status — ${items.length} items in .un-punt/`));
  console.log("");
  console.log("  By status:");
  for (const [s, n] of Object.entries(byStatus).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${s.padEnd(11)} ${n}`);
  }
  console.log("");
  console.log("  By type:");
  for (const [t, n] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${t.padEnd(25)} ${n}`);
  }
  console.log("");
  console.log("  Hot zones (top 3):");
  for (const [dir, n] of hotZones) {
    console.log(`    ${dir.padEnd(25)} ${n}`);
  }
  if (aging.length > 0) {
    console.log("");
    console.log("  Oldest open:");
    for (const item of aging) {
      console.log(`    ${item.id}  ${item.created_at}  ${item.file}`);
    }
  }

  if (opts.share) {
    console.log("");
    console.log(chalk.bold("Share line (paste into feedback / DM):"));
    // For Phase 0d, we don't yet write the sweep counter (Phase 1 Day 6
    // checklist item). Print a self-contained string that's still useful.
    const repo = resolve(process.cwd()).split("/").slice(-1)[0];
    console.log(
      `  un-punt repo=${repo} items=${items.length} ` +
        `open=${byStatus.open ?? 0} planned=${byStatus.planned ?? 0} ` +
        `resolved=${byStatus.resolved ?? 0} dismissed=${byStatus.dismissed ?? 0}`,
    );
    console.log(
      chalk.dim(
        "  (sweep_count tracking requires a state.toml — added in Phase 1 sweep-execution work)",
      ),
    );
  }
}

function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}
