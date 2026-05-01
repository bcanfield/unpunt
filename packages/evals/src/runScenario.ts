import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { seedSkill, setupTmpRepo, teardown } from "./fixtures.js";
import type {
  CapturedItem,
  Scenario,
  ScenarioResult,
  ScenarioSnapshot,
  SweepPlan,
} from "./types.js";

const MODEL = "claude-sonnet-4-5";
const MAX_TURNS = 10;
const ALLOWED_TOOLS = ["Edit", "Write", "Bash", "Read", "Glob", "Skill"];

export interface RunOptions {
  maxCostPerScenario: number;
}

export async function runScenario(scenario: Scenario, opts: RunOptions): Promise<ScenarioResult> {
  const start = Date.now();
  let tmpDir: string | undefined;
  let cost = 0;
  let numTurns = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  const assistantTexts: string[] = [];

  try {
    tmpDir = await setupTmpRepo(scenario);
    await seedSkill(tmpDir);

    const prompt = buildPrompt(scenario);

    const session = query({
      prompt,
      options: {
        cwd: tmpDir,
        settingSources: ["project"],
        allowedTools: ALLOWED_TOOLS,
        permissionMode: "dontAsk",
        maxTurns: MAX_TURNS,
        model: MODEL,
        ...(scenario.fixture.env ? { env: scenario.fixture.env } : {}),
      },
    });

    for await (const msg of session) {
      if (msg.type === "assistant") {
        for (const block of msg.message.content) {
          if (block.type === "text") assistantTexts.push(block.text);
        }
      } else if (msg.type === "result") {
        cost = msg.total_cost_usd;
        numTurns = msg.num_turns;
        inputTokens = msg.usage.input_tokens ?? 0;
        outputTokens = msg.usage.output_tokens ?? 0;
        if (cost > opts.maxCostPerScenario) {
          return {
            scenario_id: scenario.id,
            category: scenario.category,
            language: scenario.language,
            status: "aborted_cost_cap",
            cost_usd: cost,
            num_turns: numTurns,
            duration_ms: Date.now() - start,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            error: `cost ${cost.toFixed(4)} exceeded cap ${opts.maxCostPerScenario}`,
          };
        }
      }
    }

    const snapshot = await snapshotUnPunt(tmpDir, assistantTexts.join("\n\n"));

    return {
      scenario_id: scenario.id,
      category: scenario.category,
      language: scenario.language,
      status: "ok",
      cost_usd: cost,
      num_turns: numTurns,
      duration_ms: Date.now() - start,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      snapshot,
    };
  } catch (err) {
    return {
      scenario_id: scenario.id,
      category: scenario.category,
      language: scenario.language,
      status: "ok",
      cost_usd: cost,
      num_turns: numTurns,
      duration_ms: Date.now() - start,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    if (tmpDir) await teardown(tmpDir);
  }
}

function buildPrompt(scenario: Scenario): string {
  const lines: string[] = [];

  if (scenario.turns?.length) {
    lines.push("Prior conversation in this session (replayed verbatim):", "");
    for (const turn of scenario.turns) {
      lines.push(`[${turn.role}]: ${turn.content}`);
      if (turn.role === "assistant" && turn.tool_uses?.length) {
        for (const tu of turn.tool_uses) {
          lines.push(`  -> tool ${tu.tool}(${JSON.stringify(tu.params)})`);
        }
      }
      lines.push("");
    }
    lines.push("---", "");
  }

  // Trigger turn — category-specific.
  if (scenario.category === "planning") {
    lines.push("/un-punt");
  } else if (scenario.category === "adversarial") {
    lines.push("any cleanup work to record?");
  } else {
    lines.push("any cleanup work to record?");
  }

  return lines.join("\n");
}

async function snapshotUnPunt(tmpDir: string, agentChat: string): Promise<ScenarioSnapshot> {
  const items = await snapshotItems(join(tmpDir, ".un-punt", "items"));
  const sweeps = await snapshotSweeps(join(tmpDir, ".un-punt", "sweeps"));
  return { items, sweeps, agent_chat: agentChat };
}

async function snapshotItems(itemsDir: string): Promise<CapturedItem[]> {
  let entries: string[];
  try {
    entries = await readdir(itemsDir);
  } catch {
    return [];
  }

  const items: CapturedItem[] = [];
  for (const name of entries) {
    if (!name.endsWith(".md")) continue;
    const text = await readFile(join(itemsDir, name), "utf8");
    const item = parseItemFile(text);
    if (item) items.push(item);
  }
  return items;
}

function parseItemFile(text: string): CapturedItem | null {
  const fmMatch = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch || fmMatch[1] == null || fmMatch[2] == null) return null;
  const fm = parseSimpleFrontmatter(fmMatch[1]);
  const body = fmMatch[2];

  if (!fm.id || !fm.type || !fm.status || !fm.file) return null;

  const whyMatch = body.match(/##\s+Why deferred\s*\n([\s\S]*?)(?=\n##\s|\n*$)/);
  const why = whyMatch?.[1] ? whyMatch[1].trim() : "";

  return {
    id: String(fm.id),
    type: fm.type as CapturedItem["type"],
    status: fm.status as CapturedItem["status"],
    file: String(fm.file),
    line: fm.line != null ? Number(fm.line) : null,
    symbol: fm.symbol ? String(fm.symbol) : undefined,
    confidence: fm.confidence != null ? Number(fm.confidence) : 0,
    created_at: fm.created_at ? String(fm.created_at) : undefined,
    updated_at: fm.updated_at ? String(fm.updated_at) : undefined,
    why,
  };
}

function parseSimpleFrontmatter(raw: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([a-zA-Z_][\w-]*)\s*:\s*(.*)$/);
    if (!m || m[1] == null || m[2] == null) continue;
    let value: string = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[m[1]] = value;
  }
  return out;
}

async function snapshotSweeps(sweepsDir: string): Promise<SweepPlan[]> {
  let entries: string[];
  try {
    entries = await readdir(sweepsDir);
  } catch {
    return [];
  }

  const sweeps: SweepPlan[] = [];
  for (const sweepId of entries) {
    const planPath = join(sweepsDir, sweepId, "plan.md");
    let raw: string;
    try {
      raw = await readFile(planPath, "utf8");
    } catch {
      continue;
    }
    sweeps.push(parsePlanMd(sweepId, raw));
  }
  return sweeps;
}

function parsePlanMd(sweepId: string, raw: string): SweepPlan {
  const fix = extractBucket(raw, /##\s+Fix\b[^\n]*\n([\s\S]*?)(?=\n##\s|$)/i);
  const flag = extractBucket(raw, /##\s+Flag\b[^\n]*\n([\s\S]*?)(?=\n##\s|$)/i);
  const refusedBlock = raw.match(/##\s+Refused\b[^\n]*\n([\s\S]*?)(?=\n##\s|$)/i)?.[1] ?? "";

  const refused: string[] = [];
  const refused_reasons: Record<string, string> = {};
  for (const line of refusedBlock.split("\n")) {
    const m = line.match(/\b(up-[0-9a-f]+)\b(.*)$/i);
    if (m && m[1] != null && m[2] != null) {
      refused.push(m[1]);
      refused_reasons[m[1]] = m[2].trim();
    }
  }

  return { sweep_id: sweepId, fix, flag, refused, refused_reasons, raw };
}

function extractBucket(raw: string, re: RegExp): string[] {
  const block = raw.match(re)?.[1] ?? "";
  const ids: string[] = [];
  for (const line of block.split("\n")) {
    const m = line.match(/\b(up-[0-9a-f]+)\b/i);
    if (m?.[1] != null) ids.push(m[1]);
  }
  return ids;
}
