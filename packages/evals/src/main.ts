#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { cac } from "cac";
import chalk from "chalk";
import { config as loadDotenv } from "dotenv";
import yaml from "js-yaml";
import { REPO_ROOT } from "./fixtures.js";
import { buildReport, renderReportMarkdown, writeReportFile } from "./report.js";
import { runScenario } from "./runScenario.js";
import { scoreScenario } from "./score.js";
import type { Scenario, ScenarioResult } from "./types.js";

// Load env from <repo-root>/.env (does not override existing process.env values).
loadDotenv({ path: resolve(REPO_ROOT, ".env"), quiet: true });

const SCENARIO_DIR = join(REPO_ROOT, "core", "golden-set");
const REPORT_DIR = join(REPO_ROOT, "packages", "evals", "reports");

interface RunOpts {
  workers: number;
  maxCostPerScenario: number;
  maxTotalCost: number;
  versionTag?: string;
  keepTmp?: boolean;
}

const cli = cac("un-punt-evals");

cli
  .command("all", "Run every scenario in core/golden-set/")
  .option("--workers <n>", "Concurrent scenarios", { default: 5 })
  .option("--max-cost-per-scenario <usd>", "Per-scenario abort threshold", { default: 1 })
  .option("--max-total-cost <usd>", "Whole-run abort threshold", { default: 25 })
  .option("--version-tag <v>", "Skill version label in the report")
  .option("--keep-tmp", "Don't rm -rf tmp dirs after each run; print paths")
  .action(async (opts) => {
    const scenarios = await loadAllScenarios();
    await runAndReport(scenarios, normalizeOpts(opts));
  });

cli
  .command("one <id>", "Run a single scenario by id")
  .option("--max-cost-per-scenario <usd>", "Per-scenario abort threshold", { default: 1 })
  .option("--max-total-cost <usd>", "Whole-run abort threshold", { default: 25 })
  .option("--version-tag <v>", "Skill version label in the report")
  .option("--keep-tmp", "Don't rm -rf the tmp dir after run; print path")
  .action(async (id: string, opts) => {
    const scenarios = (await loadAllScenarios()).filter((s) => s.id === id);
    if (scenarios.length === 0) {
      console.error(chalk.red(`No scenario with id "${id}" in ${SCENARIO_DIR}`));
      process.exit(2);
    }
    await runAndReport(scenarios, normalizeOpts({ ...opts, workers: 1 }));
  });

cli
  .command("category <name>", "Run all scenarios in a category")
  .option("--workers <n>", "Concurrent scenarios", { default: 5 })
  .option("--max-cost-per-scenario <usd>", "Per-scenario abort threshold", { default: 1 })
  .option("--max-total-cost <usd>", "Whole-run abort threshold", { default: 25 })
  .option("--version-tag <v>", "Skill version label in the report")
  .option("--keep-tmp", "Don't rm -rf tmp dirs after each run; print paths")
  .action(async (name: string, opts) => {
    const valid = ["capture", "non-capture", "adversarial", "planning"];
    if (!valid.includes(name)) {
      console.error(chalk.red(`category must be one of: ${valid.join(", ")}`));
      process.exit(2);
    }
    const scenarios = (await loadAllScenarios()).filter((s) => s.category === name);
    if (scenarios.length === 0) {
      console.error(chalk.red(`No scenarios found in category "${name}"`));
      process.exit(2);
    }
    await runAndReport(scenarios, normalizeOpts(opts));
  });

cli.command("validate", "Parse every scenario yaml and report shape errors").action(async () => {
  const errors: string[] = [];
  const files = await listScenarioFiles();
  for (const f of files) {
    try {
      await loadScenario(f);
    } catch (err) {
      errors.push(`${basename(f)}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (errors.length === 0) {
    console.log(chalk.green(`OK — ${files.length} scenarios parse cleanly`));
  } else {
    for (const e of errors) console.error(chalk.red(`✗ ${e}`));
    process.exit(1);
  }
});

cli.help();
cli.version("0.0.0");
cli.parse();

// ---------- helpers ----------

function normalizeOpts(opts: Record<string, unknown>): RunOpts {
  return {
    workers: Number(opts.workers ?? 5),
    maxCostPerScenario: Number(opts.maxCostPerScenario ?? 1),
    maxTotalCost: Number(opts.maxTotalCost ?? 25),
    versionTag: opts.versionTag ? String(opts.versionTag) : undefined,
    keepTmp: Boolean(opts.keepTmp),
  };
}

async function listScenarioFiles(): Promise<string[]> {
  const entries = await readdir(SCENARIO_DIR);
  return entries
    .filter((n) => n.endsWith(".yaml") || n.endsWith(".yml"))
    .map((n) => join(SCENARIO_DIR, n));
}

async function loadAllScenarios(): Promise<Scenario[]> {
  const files = await listScenarioFiles();
  const out: Scenario[] = [];
  for (const f of files) out.push(await loadScenario(f));
  return out;
}

async function loadScenario(path: string): Promise<Scenario> {
  const raw = await readFile(path, "utf8");
  const parsed = yaml.load(raw) as unknown;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("yaml did not parse to an object");
  }
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.id !== "string") throw new Error("missing string field `id`");
  if (typeof obj.category !== "string") throw new Error("missing string field `category`");
  const cat = obj.category;
  if (!["capture", "non-capture", "adversarial", "planning"].includes(cat)) {
    throw new Error(`invalid category: ${cat}`);
  }
  if (typeof obj.fixture !== "object" || obj.fixture === null) {
    throw new Error("missing object field `fixture`");
  }
  return parsed as Scenario;
}

async function runAndReport(scenarios: Scenario[], opts: RunOpts): Promise<void> {
  const startMs = Date.now();
  const results: ScenarioResult[] = [];
  let cumulativeCost = 0;
  let aborted = false;

  console.log(
    chalk.cyan(`Running ${scenarios.length} scenario(s) with ${opts.workers} worker(s)…`),
  );

  // Bounded-concurrency scheduler.
  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (true) {
      if (aborted) return;
      const i = cursor++;
      const sc = scenarios[i];
      if (!sc) return;
      const result = await runScenario(sc, {
        maxCostPerScenario: opts.maxCostPerScenario,
        keepTmp: opts.keepTmp,
      });
      if (result.snapshot && result.status === "ok") {
        result.score = scoreScenario(sc, result.snapshot);
      }
      results.push(result);
      cumulativeCost += result.cost_usd;
      logResult(result);
      if (cumulativeCost > opts.maxTotalCost) {
        console.error(
          chalk.red(
            `✗ Aborting: cumulative cost $${cumulativeCost.toFixed(2)} exceeded $${opts.maxTotalCost.toFixed(2)}`,
          ),
        );
        aborted = true;
      }
    }
  };
  await Promise.all(Array.from({ length: opts.workers }, () => worker()));

  results.sort((a, b) => a.scenario_id.localeCompare(b.scenario_id));

  const version = opts.versionTag ?? (await nextVersionTag());
  const report = buildReport({ version, results, wallTimeMs: Date.now() - startMs });
  const outPath = await writeReportFile(report, REPORT_DIR);

  console.log("");
  console.log(renderReportMarkdown(report));
  console.log(chalk.cyan(`\nReport written to ${outPath}`));

  if (report.aggregate.verdict !== "PASS") {
    process.exit(1);
  }
}

function logResult(r: ScenarioResult): void {
  const pass = r.score?.pass ?? false;
  const symbol = pass ? chalk.green("✓") : chalk.red("✗");
  const detail = r.error ? chalk.red(r.error) : `$${r.cost_usd.toFixed(3)} ${r.num_turns} turns`;
  console.log(`${symbol} ${r.scenario_id} (${r.category}) ${detail}`);
}

async function nextVersionTag(): Promise<string> {
  try {
    const entries = await readdir(REPORT_DIR);
    const versions = entries
      .map((n) => /^v(\d+)-/.exec(n)?.[1])
      .filter((s): s is string => !!s)
      .map((s) => Number(s));
    const next = versions.length === 0 ? 1 : Math.max(...versions) + 1;
    return `v${next}`;
  } catch {
    return "v1";
  }
}

export { resolve };
