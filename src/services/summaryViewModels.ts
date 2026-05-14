import type {
  DailySummaryDto,
  MonthlySummaryDto,
  WeeklySummaryDto,
} from '@/src/services/summaries';
import type { SessionDto } from '@/src/services/sessions';

// ─────────────────────────────────────────────────────────────────────────────
// SHARED UTILS
// ─────────────────────────────────────────────────────────────────────────────

export const utcYmd = (d: Date = new Date()): string => d.toISOString().slice(0, 10);

export const asRecord = (v: unknown): Record<string, unknown> =>
  v != null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};

export const pickStr = (
  row: Record<string, unknown>,
  keys: string[],
  fallback = '',
): string => {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return fallback;
};

export const pickNum = (
  row: Record<string, unknown>,
  keys: string[],
  fallback = 0,
): number => {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return fallback;
};

export const formatLongDateFromIsoUtc = (isoYmd: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoYmd)) return isoYmd;
  const d = new Date(`${isoYmd}T12:00:00.000Z`);
  return d.toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
};

export const formatShortRangeUtc = (startYmd: string, endYmd: string): string => {
  const fmt = (ymd: string) => {
    const d = new Date(`${ymd}T12:00:00.000Z`);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  };
  return `${fmt(startYmd)} – ${fmt(endYmd)}`;
};

export const formatYmdAsCalendar = (ymd: string): string => {
  const d = new Date(`${ymd}T12:00:00.000Z`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
};

export const formatWeekdayShortUtc = (ymd: string): string => {
  const d = new Date(`${ymd}T12:00:00.000Z`);
  return d.toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' });
};

/** UTC midnight → next midnight for `YYYY-MM-DD` (same window as daily summaries). */
export const utcDayBoundsUtcYmd = (ymd: string): { start: Date; end: Date } => {
  const start = new Date(`${ymd}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
};

/**
 * Clock used when intersecting sessions with a UTC calendar day.
 * For past days, cap at that day's exclusive UTC end so open-ended sessions are not
 * treated as running "until now" (which would make them overlap unrelated days).
 */
export const rollupNowMsForUtcYmd = (ymd: string, clockMs: number = Date.now()): number => {
  const { end } = utcDayBoundsUtcYmd(ymd);
  const dayExclusiveEndMs = end.getTime();
  const todayYmd = utcYmd(new Date(clockMs));
  if (ymd >= todayYmd) return clockMs;
  return Math.min(clockMs, dayExclusiveEndMs);
};

/** Per-session % for averaging: `posture_score` when set, else `avg_overall_score`. */
const sessionPercentForDayAverage = (s: SessionDto): number | null => {
  if (typeof s.posture_score === 'number' && Number.isFinite(s.posture_score)) {
    return s.posture_score;
  }
  if (typeof s.avg_overall_score === 'number' && Number.isFinite(s.avg_overall_score)) {
    return s.avg_overall_score;
  }
  return null;
};

/**
 * When a session has no `end_time` and no usable `duration_seconds`, cap unknown span so
 * stale “open” rows do not count as spanning every UTC day.
 */
const OPEN_SESSION_MAX_MS = 36 * 60 * 60 * 1000;

/**
 * Session wall-clock interval. Uses `end_time`, else `start + duration_seconds` (capped to now),
 * else open session: `min(now, start + OPEN_SESSION_MAX_MS)`.
 */
export const sessionTimeRangeMs = (
  session: SessionDto,
  nowMs: number,
): { startMs: number; endMs: number } | null => {
  const startMs = new Date(session.start_time).getTime();
  if (!Number.isFinite(startMs)) return null;

  if (session.end_time) {
    const endMs = new Date(session.end_time).getTime();
    if (!Number.isFinite(endMs) || endMs < startMs) return null;
    return { startMs, endMs };
  }

  const dur = session.duration_seconds;
  if (typeof dur === 'number' && Number.isFinite(dur) && dur > 0) {
    const endMs = Math.min(startMs + dur * 1000, nowMs);
    return { startMs, endMs: Math.max(endMs, startMs) };
  }

  const cappedEnd = Math.min(nowMs, startMs + OPEN_SESSION_MAX_MS);
  return { startMs, endMs: Math.max(cappedEnd, startMs) };
};

const sessionOverlapsUtcDay = (
  session: SessionDto,
  dayStart: Date,
  dayEnd: Date,
  nowMs: number,
): boolean => {
  const r = sessionTimeRangeMs(session, nowMs);
  if (!r) return false;
  return r.endMs > dayStart.getTime() && r.startMs < dayEnd.getTime();
};

/** Seconds of [session interval] ∩ [dayStart, dayEnd) in UTC. */
export const sessionOverlapSecondsUtcDay = (
  session: SessionDto,
  dayStart: Date,
  dayEnd: Date,
  nowMs: number,
): number => {
  const r = sessionTimeRangeMs(session, nowMs);
  if (!r) return 0;
  const d0 = dayStart.getTime();
  const d1 = dayEnd.getTime();
  const lo = Math.max(r.startMs, d0);
  const hi = Math.min(r.endMs, d1);
  return Math.max(0, (hi - lo) / 1000);
};

const sessionsForUtcYmdRollups = (
  sessions: SessionDto[],
  dayStart: Date,
  dayEnd: Date,
  nowMs: number,
): SessionDto[] =>
  sessions.filter((s) => sessionOverlapsUtcDay(s, dayStart, dayEnd, nowMs));

/**
 * Mean session % for sessions overlapping UTC calendar day `ymd`.
 * Returns null if no session has `posture_score` or `avg_overall_score`.
 */
export const averageSessionScorePctForUtcYmd = (
  sessions: SessionDto[],
  ymd: string,
  nowMs: number = Date.now(),
): number | null => {
  const { start, end } = utcDayBoundsUtcYmd(ymd);
  const daySessions = sessionsForUtcYmdRollups(sessions, start, end, nowMs);
  const vals = daySessions
    .map(sessionPercentForDayAverage)
    .filter((p): p is number => p != null);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
};

export type SessionDayAggregates = {
  /** Sessions whose interval intersects the UTC day. */
  sessionCount: number;
  /** Sum of `total_alerts` on those sessions (not used for daily summary UI; daily row is source of truth). */
  totalAlerts: number;
  /** Sum of overlap duration (minutes), whole seconds → minutes rounded. */
  overlapWearMinutes: number;
};

/**
 * Roll up session overlap wear for a UTC calendar day. Also returns session count and summed session alerts for diagnostics.
 * Returns null when no session intersects that calendar day.
 */
export const aggregateSessionDayMetricsForUtcYmd = (
  sessions: SessionDto[],
  ymd: string,
  nowMs: number = Date.now(),
): SessionDayAggregates | null => {
  const { start, end } = utcDayBoundsUtcYmd(ymd);
  const daySessions = sessionsForUtcYmdRollups(sessions, start, end, nowMs);
  if (daySessions.length === 0) return null;

  let overlapSec = 0;
  let totalAlerts = 0;
  for (const s of daySessions) {
    overlapSec += sessionOverlapSecondsUtcDay(s, start, end, nowMs);
    const a = s.total_alerts;
    if (typeof a === 'number' && Number.isFinite(a)) totalAlerts += Math.round(a);
  }
  return {
    sessionCount: daySessions.length,
    totalAlerts,
    overlapWearMinutes: Math.max(0, Math.round(overlapSec / 60)),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// DAILY VIEW
// ─────────────────────────────────────────────────────────────────────────────

const scoreStatus = (pct: number): 'GOOD' | 'WARNING' | 'BAD' => {
  if (pct >= 70) return 'GOOD';
  if (pct >= 50) return 'WARNING';
  return 'BAD';
};

/** Fallback wear time when total_wear_seconds is missing (8h assumption). */
const FALLBACK_WEAR_MINUTES = 8 * 60;

export type DailySummaryView = {
  titleDate: string;
  summaryDate: string;
  scorePct: number;
  ringStatus: 'GOOD' | 'WARNING' | 'BAD';
  scoreHeadline: string;
  goodPosturePct: number;
  /** Total shirt wear time in minutes for the day. */
  totalWearMinutes: number;
  /** True when wear time came from real session data, false when using 8h fallback. */
  wearTimeIsReal: boolean;
  totalAlerts: number;
  totalSessions: number;
  alertsPerSession: number | null;
  avgUpperBack: number | null;
  avgLeftShoulder: number | null;
  avgRightShoulder: number | null;
  avgActionLevel: number | null;
  avgOverallScore: number | null;
  tip: string;
  /** True when total wear minutes used session overlap with this UTC day (not only daily_summary seconds). */
  overlapWearUsed: boolean;
};

export type DailyDtoToViewOptions = {
  /** When present, wear minutes may use session overlap for this UTC day when overlap > 0. Alerts and session counts always come from the daily_summary row (same as Home). */
  sessionDayAggregates?: SessionDayAggregates | null;
};

export const dailyDtoToView = (
  dto: DailySummaryDto,
  opts?: DailyDtoToViewOptions,
): DailySummaryView => {
  const summaryDate = dto.summary_date ?? utcYmd();
  const scorePct = Math.round(Math.min(100, Math.max(0, dto.posture_score ?? 0)));
  const goodPosturePct = Math.min(100, Math.max(0, dto.good_posture_percentage ?? 0));
  const ag = opts?.sessionDayAggregates ?? null;

  const wearSeconds = dto.total_wear_seconds ?? 0;
  const useSessionOverlapWear =
    ag != null && ag.overlapWearMinutes > 0;
  const totalWearMinutes = useSessionOverlapWear
    ? ag.overlapWearMinutes
    : wearSeconds > 0
      ? Math.round(wearSeconds / 60)
      : FALLBACK_WEAR_MINUTES;
  const wearTimeIsReal = useSessionOverlapWear || wearSeconds > 0;

  const totalAlerts = Math.round(dto.total_alerts ?? 0);
  const totalSessions = Math.round(dto.total_sessions ?? 0);

  // ── RULA fields ───────────────────────────────────────────────────────────
  const avgActionLevel   = dto.avg_action_level         ?? null;
  const avgOverallScore  = dto.avg_overall_score        ?? null;
  const avgUpperBack     = dto.avg_upper_back_angle     ?? null;
  const avgLeftShoulder  = dto.avg_left_shoulder_angle  ?? null;
  const avgRightShoulder = dto.avg_right_shoulder_angle ?? null;

  const tip =
    goodPosturePct >= 60
      ? 'Nice work keeping good posture today. Short stretch breaks still help.'
      : 'Try resetting your shoulders and aligning your ears over your shoulders.';

  const ringStatus    = scoreStatus(scorePct);
  const scoreHeadline =
    scorePct >= 80 ? 'Strong day'
    : scorePct >= 65 ? 'Solid progress'
    : scorePct >= 50 ? 'Room to improve'
    : 'Needs attention';

  const alertsPerSession =
    totalSessions > 0 ? Math.round((totalAlerts / totalSessions) * 10) / 10 : null;

  return {
    titleDate: formatLongDateFromIsoUtc(summaryDate),
    summaryDate,
    scorePct,
    ringStatus,
    scoreHeadline,
    goodPosturePct,
    totalWearMinutes,
    wearTimeIsReal,
    totalAlerts,
    totalSessions,
    alertsPerSession,
    avgUpperBack,
    avgLeftShoulder,
    avgRightShoulder,
    avgActionLevel,
    avgOverallScore,
    tip,
    overlapWearUsed: useSessionOverlapWear,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// WEEKLY VIEW
// ─────────────────────────────────────────────────────────────────────────────

export type WeeklyDayBar = { label: string; value: number };

const MON_FIRST_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type DailyRollup = { score: number; goodPct: number; alerts: number; sessions: number };

const dailyRollupsByDate = (dailies: DailySummaryDto[]): Map<string, DailyRollup> => {
  const m = new Map<string, DailyRollup>();
  for (const row of dailies) {
    const d = row.summary_date;
    if (!d) continue;
    m.set(d, {
      score:    Math.round(Math.min(100, Math.max(0, row.posture_score ?? 0))),
      goodPct:  Math.min(100, Math.max(0, row.good_posture_percentage ?? 0)),
      alerts:   Math.round(row.total_alerts   ?? 0),
      sessions: Math.round(row.total_sessions ?? 0),
    });
  }
  return m;
};

export const buildWeeklyBarsFromDailies = (
  weekStartYmd: string,
  dailies: DailySummaryDto[],
): WeeklyDayBar[] => {
  const byDate = new Map<string, number>();
  for (const row of dailies) {
    if (row.summary_date)
      byDate.set(row.summary_date, Math.round(Math.min(100, Math.max(0, row.posture_score ?? 0))));
  }
  const start = new Date(`${weekStartYmd}T00:00:00.000Z`);
  return Array.from({ length: 7 }, (_, i) => {
    const cur = new Date(start);
    cur.setUTCDate(start.getUTCDate() + i);
    const ymd = cur.toISOString().slice(0, 10);
    return { label: MON_FIRST_LABELS[i] ?? '?', value: byDate.get(ymd) ?? 0 };
  });
};

/** Highest / lowest daily `posture_score` within the UTC week among days that have a daily row. */
const weekBestWorstFromByDay = (
  weekStartYmd: string,
  byDay: Map<string, DailyRollup>,
): {
  bestYmd: string | null;
  bestScore: number | null;
  worstYmd: string | null;
  worstScore: number | null;
} => {
  const none = { bestYmd: null, bestScore: null, worstYmd: null, worstScore: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStartYmd)) return none;

  const start = new Date(`${weekStartYmd}T00:00:00.000Z`);
  let bestYmd: string | null = null;
  let bestScore: number | null = null;
  let worstYmd: string | null = null;
  let worstScore: number | null = null;

  for (let i = 0; i < 7; i++) {
    const cur = new Date(start);
    cur.setUTCDate(start.getUTCDate() + i);
    const ymd = cur.toISOString().slice(0, 10);
    const roll = byDay.get(ymd);
    if (roll === undefined) continue;

    if (bestScore === null || roll.score > bestScore) {
      bestScore = roll.score;
      bestYmd = ymd;
    }
    if (worstScore === null || roll.score < worstScore) {
      worstScore = roll.score;
      worstYmd = ymd;
    }
  }

  return { bestYmd, bestScore, worstYmd, worstScore };
};

const weeklyCompareDayLabel = (ymd: string | null): string => {
  if (!ymd) return '—';
  return `${formatWeekdayShortUtc(ymd)}, ${formatYmdAsCalendar(ymd)}`;
};

export type WeeklyDayRow = {
  ymd: string; weekday: string; calendar: string;
  score: number; goodPct: number; alerts: number; sessions: number;
};

export type WeeklySummaryView = {
  rangeLabel: string;
  weekStartYmd: string;
  weekEndYmd: string;
  averageScore: number;
  chartData: WeeklyDayBar[];
  goodPctChart: WeeklyDayBar[];
  improvementPct: number | null;
  bestDayLabel: string;
  worstDayLabel: string;
  bestDayScore: number | null;
  worstDayScore: number | null;
  totalAlerts: number;
  totalSessions: number;
  activeDays: number;
  weekHigh: number;
  weekLow: number;
  avgGoodPosturePct: number | null;
  dayRows: WeeklyDayRow[];
};

export const weeklyDtoToView = (
  dto: WeeklySummaryDto,
  dailies: DailySummaryDto[],
): WeeklySummaryView => {
  const weekStart      = dto.week_start ?? '';
  const weekEnd        = dto.week_end   ?? weekStart;
  const improvementPct = dto.improvement_percentage ?? null;
  const byDay = dailyRollupsByDate(dailies);

  /** Mean of `posture_score` for each UTC day in the week that has a daily_summary row (includes 0%). */
  let avgFromDailyScores: number | null = null;
  if (weekStart && /^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    const start = new Date(`${weekStart}T00:00:00.000Z`);
    let sum = 0;
    let count = 0;
    for (let i = 0; i < 7; i++) {
      const cur = new Date(start);
      cur.setUTCDate(start.getUTCDate() + i);
      const ymd = cur.toISOString().slice(0, 10);
      const roll = byDay.get(ymd);
      if (roll !== undefined) {
        sum += roll.score;
        count += 1;
      }
    }
    if (count > 0) {
      avgFromDailyScores = Math.round(sum / count);
    }
  }

  const chartData = weekStart && /^\d{4}-\d{2}-\d{2}$/.test(weekStart)
    ? buildWeeklyBarsFromDailies(weekStart, dailies)
    : MON_FIRST_LABELS.map((label) => ({ label, value: 0 }));

  const goodPctChart = weekStart && /^\d{4}-\d{2}-\d{2}$/.test(weekStart)
    ? (() => {
        const start = new Date(`${weekStart}T00:00:00.000Z`);
        return Array.from({ length: 7 }, (_, i) => {
          const cur = new Date(start);
          cur.setUTCDate(start.getUTCDate() + i);
          const ymd = cur.toISOString().slice(0, 10);
          return {
            label: MON_FIRST_LABELS[i] ?? '?',
            value: Math.round(byDay.get(ymd)?.goodPct ?? 0),
          };
        });
      })()
    : MON_FIRST_LABELS.map((label) => ({ label, value: 0 }));

  const scoresPositive  = chartData.map((c) => c.value).filter((v) => v > 0);
  const activeDays      = scoresPositive.length;
  const weekHigh        = chartData.length ? Math.max(...chartData.map((c) => c.value)) : 0;
  const weekLow         = scoresPositive.length > 0 ? Math.min(...scoresPositive) : 0;

  const avg =
    avgFromDailyScores != null
      ? avgFromDailyScores
      : Math.round(Math.min(100, Math.max(0, dto.avg_posture_score ?? 0)));

  let sumGoodFixed = 0, goodNFixed = 0;
  for (let i = 0; i < goodPctChart.length; i++) {
    if (chartData[i]?.value > 0) { sumGoodFixed += goodPctChart[i].value; goodNFixed++; }
  }
  const avgGoodPosturePct = goodNFixed > 0
    ? Math.round((sumGoodFixed / goodNFixed) * 10) / 10
    : null;

  const dayRows: WeeklyDayRow[] = [];
  if (weekStart && /^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    const start = new Date(`${weekStart}T00:00:00.000Z`);
    for (let i = 0; i < 7; i++) {
      const cur = new Date(start);
      cur.setUTCDate(start.getUTCDate() + i);
      const ymd  = cur.toISOString().slice(0, 10);
      const roll = byDay.get(ymd);
      dayRows.push({
        ymd,
        weekday:  formatWeekdayShortUtc(ymd),
        calendar: formatYmdAsCalendar(ymd),
        score:    roll?.score    ?? 0,
        goodPct:  roll ? Math.round(roll.goodPct) : 0,
        alerts:   roll?.alerts   ?? 0,
        sessions: roll?.sessions ?? 0,
      });
    }
  }

  const { bestYmd, bestScore: bestDayScore, worstYmd, worstScore: worstDayScore } =
    weekStart && /^\d{4}-\d{2}-\d{2}$/.test(weekStart)
      ? weekBestWorstFromByDay(weekStart, byDay)
      : { bestYmd: null, bestScore: null, worstYmd: null, worstScore: null };

  const bestDayLabel  = weeklyCompareDayLabel(bestYmd);
  const worstDayLabel = weeklyCompareDayLabel(worstYmd);

  /** Match the day-by-day table: sum alerts/sessions across the 7 UTC days (0 when no daily row). */
  const totalAlerts =
    dayRows.length === 7
      ? dayRows.reduce((a, r) => a + r.alerts, 0)
      : Math.round(dto.total_alerts ?? 0);
  const totalSessions =
    dayRows.length === 7
      ? dayRows.reduce((a, r) => a + r.sessions, 0)
      : Math.round(dto.total_sessions ?? 0);

  return {
    rangeLabel:    weekStart && weekEnd ? formatShortRangeUtc(weekStart, weekEnd) : 'This week',
    weekStartYmd:  weekStart,
    weekEndYmd:    weekEnd,
    averageScore:  avg,
    chartData,
    goodPctChart,
    improvementPct,
    bestDayLabel,
    worstDayLabel,
    bestDayScore,
    worstDayScore,
    totalAlerts,
    totalSessions,
    activeDays, weekHigh, weekLow, avgGoodPosturePct, dayRows,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// MONTHLY VIEW
// ─────────────────────────────────────────────────────────────────────────────

export type MonthlyTrendPoint = { label: string; value: number };

export type MonthlySummaryView = {
  title: string;
  month: number;
  year: number;
  averageScore: number;
  improvementPct: number | null;
  trend: MonthlyTrendPoint[];
  bestDayLabel: string;
  bestDayScore: number | null;
  worstDayLabel: string;
  worstDayScore: number | null;
  daysWithData: number;
  daysInMonth: number;
  totalAlerts: number;
  totalSessions: number;
};

export const monthUtcRange = (month1to12: number, year: number) => {
  const start = new Date(Date.UTC(year, month1to12 - 1, 1));
  const end   = new Date(Date.UTC(year, month1to12, 0));
  const toYmd = (d: Date) => d.toISOString().slice(0, 10);
  return { start: toYmd(start), end: toYmd(end) };
};

/** UTC Monday `YYYY-MM-DD` for the week containing `ymd` (Mon–Sun weeks, same as weekly summary). */
export const utcMondayWeekStartYmd = (ymd: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  const d = new Date(`${ymd}T12:00:00.000Z`);
  const dow = d.getUTCDay();
  const delta = (dow + 6) % 7; // Mon=0 … Sun=6
  d.setUTCDate(d.getUTCDate() - delta);
  return d.toISOString().slice(0, 10);
};

export const monthlyDtoAndDailiesToView = (
  dto: MonthlySummaryDto,
  dailies: DailySummaryDto[],
): MonthlySummaryView => {
  const month = dto.month ?? new Date().getUTCMonth() + 1;
  const year  = dto.year  ?? new Date().getUTCFullYear();
  const dtoAvg = Math.round(Math.min(100, Math.max(0, dto.avg_posture_score ?? 0)));
  const improvementPct = dto.improvement_vs_last_month ?? null;

  const sorted = [...dailies]
    .map((row) => ({
      d:     row.summary_date ?? '',
      score: Math.round(Math.min(100, Math.max(0, row.posture_score ?? 0))),
    }))
    .filter((x) => x.d)
    .sort((a, b) => a.d.localeCompare(b.d));

  const scoresByWeek = new Map<string, number[]>();
  for (const x of sorted) {
    const w = utcMondayWeekStartYmd(x.d);
    const arr = scoresByWeek.get(w) ?? [];
    arr.push(x.score);
    scoresByWeek.set(w, arr);
  }
  const weekMeans: number[] = [];
  for (const scores of scoresByWeek.values()) {
    if (scores.length === 0) continue;
    weekMeans.push(scores.reduce((a, b) => a + b, 0) / scores.length);
  }
  const avg =
    weekMeans.length > 0
      ? Math.round(weekMeans.reduce((a, b) => a + b, 0) / weekMeans.length)
      : dtoAvg;

  let best  = { d: '', score: 0 };
  let worst = { d: '', score: 101 };
  for (const x of sorted) {
    if (!best.d  || x.score >= best.score)  best  = x;
    if (sorted.length >= 2 && (!worst.d || x.score < worst.score)) worst = x;
  }

  let trend: MonthlyTrendPoint[] = sorted.map((x) => ({
    label: String(new Date(`${x.d}T12:00:00.000Z`).getUTCDate()),
    value: x.score,
  }));
  if (trend.length === 1) trend = [trend[0], trend[0]];
  if (trend.length === 0) trend = [{ label: '1', value: avg }, { label: '·', value: avg }];

  const monthTitle  = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  });
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  /** Sum daily_summary rows we have for the month (same source as charts); else server monthly DTO. */
  const totalAlerts =
    dailies.length > 0
      ? dailies.reduce((a, r) => a + Math.round(r.total_alerts ?? 0), 0)
      : Math.round(dto.total_alerts ?? 0);
  const totalSessions =
    dailies.length > 0
      ? dailies.reduce((a, r) => a + Math.round(r.total_sessions ?? 0), 0)
      : Math.round(dto.total_sessions ?? 0);

  return {
    title: monthTitle, month, year, averageScore: avg, improvementPct, trend,
    bestDayLabel:  best.d  ? formatYmdAsCalendar(best.d)  : '—',
    bestDayScore:  best.d  ? best.score  : null,
    worstDayLabel: worst.d ? formatYmdAsCalendar(worst.d) : '—',
    worstDayScore: worst.d ? worst.score : null,
    daysWithData:  sorted.length,
    daysInMonth,
    totalAlerts,
    totalSessions,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// HOME SNAPSHOT
// ─────────────────────────────────────────────────────────────────────────────

export type HomeDaySnapshot = {
  total_alerts: number;
  posture_score: number;
  good_posture_percentage: number;
  avg_action_level: number | null;
  avg_overall_score: number | null;
};

export const dtoToHomeDaySnapshot = (dto: DailySummaryDto | null): HomeDaySnapshot | null => {
  if (!dto) return null;
  return {
    total_alerts:            Math.round(dto.total_alerts ?? 0),
    posture_score:           dto.posture_score ?? 0,
    good_posture_percentage: Math.min(100, Math.max(0, dto.good_posture_percentage ?? 0)),
    avg_action_level:        dto.avg_action_level  ?? null,
    avg_overall_score:       dto.avg_overall_score ?? null,
  };
};