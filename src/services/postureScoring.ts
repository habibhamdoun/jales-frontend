/**
 * RULA-derived scores and UI colors. Lives in its own module (no import from
 * `posture.ts`) so Metro/Hermes never sees a half-initialized posture module
 * when consumers import these helpers.
 */

export type ActionLevel = 1 | 2 | 3 | 4;

/** Minimal shape for worst-of-part RULA and per-part color mapping. */
type EvalScores = {
  trunkScore: number;
  leftShoulderScore: number;
  rightShoulderScore: number;
  actionLevel: ActionLevel;
};

export const BADGE_COLORS = {
  good: '#14B8A6',
  warn: '#F59E0B',
  bad: '#EF4444',
  none: '#9CA3AF',
} as const;

export const scoreToColor = (score: number | null | undefined): string => {
  if (score == null || !Number.isFinite(score)) return BADGE_COLORS.none;
  if (score <= 2) return BADGE_COLORS.good;
  if (score === 3) return BADGE_COLORS.warn;
  return BADGE_COLORS.bad;
};

export const overallScoreFromEvaluation = (
  evaluation: EvalScores | null | undefined,
): number | null => {
  if (!evaluation) return null;
  return Math.max(
    evaluation.trunkScore,
    evaluation.leftShoulderScore,
    evaluation.rightShoulderScore,
  );
};

const isActionLevel = (n: number): n is ActionLevel =>
  n === 1 || n === 2 || n === 3 || n === 4;

/**
 * Prefer `action_level` from the API — it is not the same as max(part scores)
 * (e.g. all part scores can be 2 while the server still emits action_level 1).
 * If `action_level` is missing, approximate backend `getActionLevel(worst)`:
 * worst part score ≤2 → 1, ===3 → 3, else → 4 (no separate “2” band).
 */
export const rulaOverallActionLevel = (
  evaluation: EvalScores | null | undefined,
): ActionLevel | null => {
  if (!evaluation) return null;
  if (isActionLevel(evaluation.actionLevel)) return evaluation.actionLevel;
  const worst = overallScoreFromEvaluation(evaluation);
  if (worst == null || !Number.isFinite(worst)) return null;
  if (worst <= 2) return 1;
  if (worst === 3) return 3;
  return 4;
};

export const rulaOverallToDisplayPercent = (overall: ActionLevel): number =>
  Math.max(0, Math.min(100, Math.round(((5 - overall) / 4) * 100)));
