import type { ThresholdStep } from "./types";

/**
 * Resolve the applicable threshold at a given period-end from a step schedule.
 * Steps take effect on/after their `effective` date; the latest effective step
 * at-or-before periodEnd wins. Falls back to `fallback` if no step qualifies.
 * Resolution is keyed on periodEnd (the tested period), never the test date.
 */
export function resolveThreshold(
  schedule: ThresholdStep[] | null | undefined,
  periodEnd: Date,
  fallback: number,
): number {
  if (!schedule || schedule.length === 0) return fallback;
  const sorted = [...schedule].sort(
    (a, b) => +new Date(a.effective) - +new Date(b.effective),
  );
  let applied = fallback;
  let matched = false;
  for (const step of sorted) {
    if (+new Date(step.effective) <= +periodEnd) {
      applied = step.value;
      matched = true;
    }
  }
  // If periodEnd precedes the first step, use the first step's value
  // (covenants are set at close; pre-schedule periods use the opening level).
  if (!matched) return sorted[0].value;
  return applied;
}
