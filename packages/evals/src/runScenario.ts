import { readdir, readFile, writeFile } from "node:fs/promises";
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
// Bumped from spec's 10 → 30: SDK's num_turns counts tool sub-calls, so
// realistic planning sessions on 8-item fixtures see 20-30 turns. Real
// sessions are unbounded; the eval bounds cost via maxCostPerScenario
// (default $1 — actual scenarios run $0.20-0.30).
const MAX_TURNS = 30;
const ALLOWED_TOOLS = ["Edit", "Write", "Bash", "Read", "Glob", "Skill"];

export interface RunOptions {
  maxCostPerScenario: number;
  /**
   * If true, do not rm -rf the tmp dir at the end. Used by `--keep-tmp` to
   * inspect post-run state. The harness logs the tmp dir path so the user
   * can find it after the run.
   */
  keepTmp?: boolean;
  /**
   * Number of retries on rate-limit (HTTP 429). Default 3. Backoff is
   * 30s × 2^attempt.
   */
  rateLimitRetries?: number;
}

export async function runScenario(scenario: Scenario, opts: RunOptions): Promise<ScenarioResult> {
  const start = Date.now();
  let tmpDir: string | undefined;
  const maxRetries = opts.rateLimitRetries ?? 3;

  try {
    tmpDir = await setupTmpRepo(scenario);
    await seedSkill(tmpDir);

    const prompt = buildPrompt(scenario);

    // Merge fixture.env on top of process.env — replacing it would strip
    // ANTHROPIC_API_KEY and the SDK would fail with "Not logged in".
    const mergedEnv = scenario.fixture.env
      ? { ...process.env, ...scenario.fixture.env }
      : undefined;

    let attempt = 0;
    let lastError: Error | undefined;
    while (attempt <= maxRetries) {
      const collectedChat: string[] = [];
      try {
        const result = await driveSession(
          scenario,
          tmpDir,
          prompt,
          mergedEnv,
          opts,
          start,
          collectedChat,
        );
        if (opts.keepTmp) {
          await writeFile(join(tmpDir, "_agent_chat.txt"), collectedChat.join("\n\n"));
          await writeFile(join(tmpDir, "_prompt.txt"), prompt);
          console.log(`[keep-tmp] ${scenario.id}: ${tmpDir}`);
        }
        return result;
      } catch (err) {
        if (opts.keepTmp && tmpDir) {
          await writeFile(join(tmpDir, "_agent_chat.txt"), collectedChat.join("\n\n"));
          await writeFile(join(tmpDir, "_prompt.txt"), prompt);
          console.log(`[keep-tmp] ${scenario.id}: ${tmpDir} (errored)`);
        }
        lastError = err instanceof Error ? err : new Error(String(err));
        if (!isRateLimitError(lastError) || attempt === maxRetries) break;
        const backoffMs = 30_000 * 2 ** attempt;
        console.warn(
          `${scenario.id}: rate-limited (attempt ${attempt + 1}/${maxRetries + 1}); sleeping ${backoffMs / 1000}s`,
        );
        await sleep(backoffMs);
        attempt++;
      }
    }

    return {
      scenario_id: scenario.id,
      category: scenario.category,
      language: scenario.language,
      status: "ok",
      cost_usd: 0,
      num_turns: 0,
      duration_ms: Date.now() - start,
      input_tokens: 0,
      output_tokens: 0,
      error: lastError?.message ?? "unknown error",
    };
  } finally {
    if (tmpDir && !opts.keepTmp) await teardown(tmpDir);
  }
}

async function driveSession(
  scenario: Scenario,
  tmpDir: string,
  prompt: string,
  mergedEnv: Record<string, string | undefined> | undefined,
  opts: RunOptions,
  start: number,
  collectedChat: string[],
): Promise<ScenarioResult> {
  let cost = 0;
  let numTurns = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  const assistantTexts: string[] = collectedChat;

  const session = query({
    prompt,
    options: {
      cwd: tmpDir,
      settingSources: ["project"],
      allowedTools: ALLOWED_TOOLS,
      permissionMode: "dontAsk",
      maxTurns: MAX_TURNS,
      model: MODEL,
      ...(mergedEnv ? { env: mergedEnv } : {}),
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
      if (msg.subtype !== "success") {
        // SDK returned an error result. If it's a rate-limit, throw so the
        // outer loop can retry. Other errors propagate as a failed scenario
        // (no retry — would burn budget on the same failure).
        const errMsg = msg.errors?.join("; ") ?? `SDK error: ${msg.subtype}`;
        if (isRateLimitMessage(errMsg)) {
          throw new RateLimitError(errMsg);
        }
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
          error: errMsg,
        };
      }
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
}

class RateLimitError extends Error {}

function isRateLimitError(err: Error): boolean {
  return err instanceof RateLimitError || isRateLimitMessage(err.message);
}

function isRateLimitMessage(msg: string): boolean {
  return /\b429\b|rate.?limit|rate_limit/i.test(msg);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
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
