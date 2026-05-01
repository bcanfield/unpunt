// Types for un-punt golden-set scenarios + scoring + reporting.
// Shape mirrors docs/10-eval-harness.md §Scenario format and §Scoring.

export type Language = "typescript" | "python" | "go" | "rust" | "java" | "mixed";

export type ItemType =
  | "deferred-implementation"
  | "type-loosened"
  | "skipped-test"
  | "hack-workaround"
  | "duplicated-code"
  | "other";

export type ItemStatus = "open" | "planned" | "resolved" | "dismissed";

// ---------- Scenario fixture ----------

export interface FixtureItem {
  id: string;
  type: ItemType;
  file: string;
  line?: number | null;
  symbol?: string;
  confidence: number;
  status: ItemStatus;
  why?: string;
}

export interface ScenarioFixture {
  files?: Record<string, string>;
  items?: FixtureItem[];
  contract?: "default" | string;
  /**
   * Symlinks to create in the tmp repo. Map of `link_path → target_path`.
   * Targets may point outside the repo root — used by adversarial scenarios
   * (CVE-class containment tests) to verify the skill refuses to follow them.
   */
  symlinks?: Record<string, string>;
  /**
   * Extra environment variables passed through to the Agent SDK process.
   * Used for adversarial scenarios that depend on env-var state — e.g.
   * `CLAUDE_DANGEROUSLY_SKIP_PERMISSIONS=1` to test the skill's
   * bypass-mode refusal.
   */
  env?: Record<string, string>;
}

export interface ScenarioTurn {
  role: "user" | "assistant";
  content: string;
  tool_uses?: Array<{
    tool: "Edit" | "Write" | "Bash" | "Read" | "Glob";
    params: Record<string, unknown>;
  }>;
}

// ---------- Per-category expected ----------

export interface ExpectedItem {
  type: ItemType;
  file: string;
  confidence_min?: number;
  why_must_contain?: string[];
}

export interface ForbiddenItem {
  type: ItemType;
  file: string;
}

export interface CaptureExpected {
  items: ExpectedItem[];
  forbidden_items?: ForbiddenItem[];
}

export interface NonCaptureExpected {
  items?: ExpectedItem[]; // usually empty
  forbidden_items: ForbiddenItem[];
}

export interface AdversarialExpected {
  refused: true;
  refused_reason_must_contain: string[];
  forbidden_items?: ForbiddenItem[];
}

export interface PlanningExpected {
  plan: {
    fix: string[];
    flag: string[];
    refused: string[];
  };
  refused_reasons?: Record<string, string>;
}

// ---------- Scenario (discriminated union by category) ----------

interface ScenarioCommon {
  id: string;
  description: string;
  language?: Language;
  fixture: ScenarioFixture;
  turns?: ScenarioTurn[];
}

export interface CaptureScenario extends ScenarioCommon {
  category: "capture";
  expected: CaptureExpected;
}

export interface NonCaptureScenario extends ScenarioCommon {
  category: "non-capture";
  expected: NonCaptureExpected;
}

export interface AdversarialScenario extends ScenarioCommon {
  category: "adversarial";
  expected: AdversarialExpected;
}

export interface PlanningScenario extends ScenarioCommon {
  category: "planning";
  expected: PlanningExpected;
}

export type Scenario =
  | CaptureScenario
  | NonCaptureScenario
  | AdversarialScenario
  | PlanningScenario;

// ---------- Snapshot of .un-punt/ after a run ----------

export interface CapturedItem {
  id: string;
  type: ItemType;
  status: ItemStatus;
  file: string;
  line?: number | null;
  symbol?: string;
  confidence: number;
  created_at?: string;
  updated_at?: string;
  why: string;
}

export interface SweepPlan {
  sweep_id: string;
  fix: string[];
  flag: string[];
  refused: string[];
  refused_reasons: Record<string, string>;
  raw: string;
}

export interface ScenarioSnapshot {
  items: CapturedItem[];
  sweeps: SweepPlan[];
  agent_chat: string; // concatenated assistant text for adversarial reason matching
}

// ---------- Per-scenario scoring result ----------

export interface ScoreCapture {
  kind: "capture";
  recall_local: number;
  precision_local: number;
  matched: number;
  total_expected: number;
  total_captured: number;
  false_positives: ExpectedItem[];
  matched_items: Array<{ expected: ExpectedItem; confidence: number }>;
  pass: boolean;
}

export interface ScoreNonCapture {
  kind: "non-capture";
  pass: boolean;
  violating_items: CapturedItem[];
}

export interface ScoreAdversarial {
  kind: "adversarial";
  pass: boolean;
  reasons_matched: string[];
  reasons_missing: string[];
  captured_forbidden: CapturedItem[];
}

export interface ScorePlanning {
  kind: "planning";
  pass: boolean;
  score: number; // 0, 1/3, 2/3, or 1.0
  fix_match: boolean;
  flag_match: boolean;
  refused_match: boolean;
}

export type ScenarioScore = ScoreCapture | ScoreNonCapture | ScoreAdversarial | ScorePlanning;

// ---------- Per-scenario run result ----------

export type RunStatus = "ok" | "timeout" | "aborted_cost_cap" | "invalid";

export interface ScenarioResult {
  scenario_id: string;
  category: Scenario["category"];
  language?: Language;
  status: RunStatus;
  cost_usd: number;
  num_turns: number;
  duration_ms: number;
  input_tokens: number;
  output_tokens: number;
  snapshot?: ScenarioSnapshot;
  score?: ScenarioScore;
  error?: string;
}

// ---------- Aggregate report ----------

export type Verdict = "PASS" | "FAIL_CLEAN" | "FAIL_HARD";

export interface CalibrationBin {
  range: [number, number];
  midpoint: number;
  n: number;
  observed_correctness: number;
  gap: number;
}

export interface ReportEntry {
  version: string;
  iso_timestamp: string;
  results: ScenarioResult[];
  aggregate: {
    recall_trace_bearing: number;
    recall_trace_less: number;
    precision: number;
    adversarial_pass_rate: number;
    calibration_ece: number;
    per_language_recall: Partial<Record<Language, number>>;
    planning_score: number;
    cost_usd: number;
    wall_time_ms: number;
    verdict: Verdict;
  };
  calibration_bins: CalibrationBin[];
  suggested_changes: string[];
}
