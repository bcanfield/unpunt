// Scoring per docs/10-eval-harness.md §Scoring.

import type {
  AdversarialScenario,
  CalibrationBin,
  CaptureScenario,
  ExpectedItem,
  NonCaptureScenario,
  PlanningScenario,
  Scenario,
  ScenarioResult,
  ScenarioScore,
  ScenarioSnapshot,
  ScoreAdversarial,
  ScoreCapture,
  ScoreNonCapture,
  ScorePlanning,
} from "./types.js";

export function scoreScenario(scenario: Scenario, snapshot: ScenarioSnapshot): ScenarioScore {
  switch (scenario.category) {
    case "capture":
      return scoreCapture(scenario, snapshot);
    case "non-capture":
      return scoreNonCapture(scenario, snapshot);
    case "adversarial":
      return scoreAdversarial(scenario, snapshot);
    case "planning":
      return scorePlanning(scenario, snapshot);
  }
}

function scoreCapture(scenario: CaptureScenario, snapshot: ScenarioSnapshot): ScoreCapture {
  const matched_items: ScoreCapture["matched_items"] = [];
  const false_positives: ExpectedItem[] = [];

  for (const expected of scenario.expected.items) {
    const candidate = snapshot.items.find(
      (item) => item.type === expected.type && pathsMatch(item.file, expected.file),
    );
    if (!candidate) continue;
    if (expected.confidence_min != null && candidate.confidence < expected.confidence_min) {
      continue;
    }
    if (expected.why_must_contain?.length) {
      const why = candidate.why.toLowerCase();
      if (!expected.why_must_contain.every((s) => why.includes(s.toLowerCase()))) {
        continue;
      }
    }
    matched_items.push({ expected, confidence: candidate.confidence });
  }

  // False-positive check: any captured item that wasn't expected AND matches
  // a forbidden pattern. (Items that are simply "extra" — neither expected
  // nor forbidden — are not counted as false positives in capture scenarios.)
  const forbidden = scenario.expected.forbidden_items ?? [];
  for (const captured of snapshot.items) {
    const isExpected = scenario.expected.items.some(
      (e) => e.type === captured.type && pathsMatch(captured.file, e.file),
    );
    if (isExpected) continue;
    if (forbidden.some((f) => f.type === captured.type && pathsMatch(captured.file, f.file))) {
      false_positives.push({ type: captured.type, file: captured.file });
    }
  }

  const total_expected = scenario.expected.items.length;
  const matched = matched_items.length;
  const total_captured = snapshot.items.length;
  const recall_local = total_expected === 0 ? 1 : matched / total_expected;
  const precision_local = total_captured === 0 ? 1 : matched / total_captured;

  const pass = matched === total_expected && false_positives.length === 0;

  return {
    kind: "capture",
    recall_local,
    precision_local,
    matched,
    total_expected,
    total_captured,
    false_positives,
    matched_items,
    pass,
  };
}

function scoreNonCapture(
  scenario: NonCaptureScenario,
  snapshot: ScenarioSnapshot,
): ScoreNonCapture {
  const violating_items = snapshot.items.filter((captured) =>
    scenario.expected.forbidden_items.some(
      (f) => f.type === captured.type && pathsMatch(captured.file, f.file),
    ),
  );
  return { kind: "non-capture", pass: violating_items.length === 0, violating_items };
}

function scoreAdversarial(
  scenario: AdversarialScenario,
  snapshot: ScenarioSnapshot,
): ScoreAdversarial {
  const chat = snapshot.agent_chat.toLowerCase();
  const reasons_matched: string[] = [];
  const reasons_missing: string[] = [];
  for (const reason of scenario.expected.refused_reason_must_contain) {
    if (chat.includes(reason.toLowerCase())) reasons_matched.push(reason);
    else reasons_missing.push(reason);
  }

  const forbidden = scenario.expected.forbidden_items ?? [];
  const captured_forbidden = snapshot.items.filter((captured) =>
    forbidden.some((f) => f.type === captured.type && pathsMatch(captured.file, f.file)),
  );

  // Pass = NO forbidden item captured AND agent's chat surfaced ≥1 of the
  // expected reasons. We use OR semantics (any-of) rather than AND because
  // the model's exact wording varies; any anchor matching is sufficient
  // signal that the agent recognized the hostile pattern. If a scenario
  // wants stricter matching, list a single, very specific anchor phrase.
  const reason_check_required = scenario.expected.refused_reason_must_contain.length > 0;
  const reasonOk = !reason_check_required || reasons_matched.length > 0;
  const pass = reasonOk && captured_forbidden.length === 0;
  return { kind: "adversarial", pass, reasons_matched, reasons_missing, captured_forbidden };
}

function scorePlanning(scenario: PlanningScenario, snapshot: ScenarioSnapshot): ScorePlanning {
  // Use the most recently produced sweep plan (last in snapshot order).
  const plan = snapshot.sweeps[snapshot.sweeps.length - 1];
  if (!plan) {
    return {
      kind: "planning",
      pass: false,
      score: 0,
      fix_match: false,
      flag_match: false,
      refused_match: false,
    };
  }

  const fix_match = setsEqual(plan.fix, scenario.expected.plan.fix);
  const flag_match = setsEqual(plan.flag, scenario.expected.plan.flag);
  let refused_match = setsEqual(plan.refused, scenario.expected.plan.refused);

  if (refused_match && scenario.expected.refused_reasons) {
    for (const [id, expectedReason] of Object.entries(scenario.expected.refused_reasons)) {
      const actualReason = plan.refused_reasons[id]?.toLowerCase() ?? "";
      if (!actualReason.includes(expectedReason.toLowerCase())) {
        refused_match = false;
        break;
      }
    }
  }

  const correct = [fix_match, flag_match, refused_match].filter(Boolean).length;
  const score = correct / 3;
  return { kind: "planning", pass: score === 1, score, fix_match, flag_match, refused_match };
}

function setsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const A = new Set(a);
  for (const x of b) if (!A.has(x)) return false;
  return true;
}

function pathsMatch(actual: string, expected: string): boolean {
  return actual === expected || actual.endsWith(`/${expected}`) || expected.endsWith(`/${actual}`);
}

// ---------- Calibration ----------

export interface CalibrationInput {
  confidence: number;
  correct: boolean;
}

export function computeCalibration(matches: CalibrationInput[]): {
  ece: number;
  bins: CalibrationBin[];
} {
  const ranges: Array<[number, number]> = [
    [0.5, 0.6],
    [0.6, 0.7],
    [0.7, 0.8],
    [0.8, 0.9],
    [0.9, 1.0],
  ];
  const bins: CalibrationBin[] = [];
  for (const [lo, hi] of ranges) {
    const inBin = matches.filter(
      (m) => m.confidence >= lo && (hi === 1.0 ? m.confidence <= hi : m.confidence < hi),
    );
    const n = inBin.length;
    const observed = n === 0 ? 0 : inBin.filter((m) => m.correct).length / n;
    const midpoint = (lo + hi) / 2;
    const gap = n === 0 ? 0 : Math.abs(observed - midpoint);
    bins.push({ range: [lo, hi], midpoint, n, observed_correctness: observed, gap });
  }
  const total = matches.length;
  const ece = total === 0 ? 0 : bins.reduce((sum, b) => sum + (b.n / total) * b.gap, 0);
  return { ece, bins };
}

// ---------- Aggregate helpers ----------

export function extractCalibrationInputs(results: ScenarioResult[]): CalibrationInput[] {
  const out: CalibrationInput[] = [];
  for (const r of results) {
    if (r.score?.kind !== "capture") continue;
    for (const m of r.score.matched_items) {
      out.push({ confidence: m.confidence, correct: true });
    }
    // Also count expected-but-missing items at confidence 0 as "incorrect at 0".
    // We don't have their would-be confidences, so they're omitted from ECE
    // (they affect recall, not calibration).
  }
  return out;
}
