import { apiFetch, ApiError } from '@/src/services/api';

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

// ─────────────────────────────────────────────────────────────────────────────
// DTO TYPES — match daily_summary / weekly_summary / monthly_summary DB schema
// ─────────────────────────────────────────────────────────────────────────────

export type DailySummaryDto = {
  id?: string;
  user_id?: string;
  summary_date: string;

  // Averaged angles
  avg_neck_angle?: number | null;
  avg_upper_back_angle?: number | null;
  avg_left_shoulder_angle?: number | null;
  avg_right_shoulder_angle?: number | null;

  // RULA averages
  avg_action_level?: number | null;
  avg_overall_score?: number | null;

  // Summary stats
  total_alerts?: number | null;
  total_sessions?: number | null;
  /** From `daily_summary` (seconds); client converts to minutes for display. */
  total_wear_seconds?: number | null;
  good_posture_percentage?: number | null;  // % of readings with action_level <= 2
  posture_score?: number | null;            // 100 - (bad_readings / total * 100)

  created_at?: string;
  updated_at?: string;
};

export type WeeklySummaryDto = {
  id?: string;
  user_id?: string;
  week_start: string;
  week_end: string;
  avg_posture_score?: number | null;
  avg_action_level?: number | null;
  total_alerts?: number | null;
  total_sessions?: number | null;
  best_day?: string | null;
  worst_day?: string | null;
  improvement_percentage?: number | null;
  created_at?: string;
  updated_at?: string;
};

export type MonthlySummaryDto = {
  id?: string;
  user_id?: string;
  month: number;
  year: number;
  avg_posture_score?: number | null;
  avg_action_level?: number | null;
  total_alerts?: number | null;
  total_sessions?: number | null;
  improvement_vs_last_month?: number | null;
  created_at?: string;
  updated_at?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

type UnknownRecord = Record<string, unknown>;

const unwrapEnvelope = (raw: unknown): UnknownRecord => {
  const obj = (raw ?? {}) as UnknownRecord;
  const nested = obj.data;
  if (nested && typeof nested === 'object' && !Array.isArray(nested))
    return nested as UnknownRecord;
  return obj;
};

const buildQuery = (params: Record<string, string | number | undefined>) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    sp.set(k, String(v));
  }
  const q = sp.toString();
  return q ? `?${q}` : '';
};

// ─────────────────────────────────────────────────────────────────────────────
// DAILY — HTTP (mounted at app root, e.g. `${API_BASE_URL}/summaries/daily`)
//
// GET  /summaries/daily           ?date=YYYY-MM-DD (UTC); omit date → today
// POST /summaries/daily/generate  ?date=YYYY-MM-DD (UTC); omit date → today (recompute + upsert)
//
// Wear on the wire is `total_wear_seconds` on the daily_summary row (client → minutes).
// There is no `wear_minutes` route; that name may appear only in server logs.
// ─────────────────────────────────────────────────────────────────────────────

export type GenerateDailySummaryResult =
  | { kind: 'summary'; summary: DailySummaryDto }
  | { kind: 'empty'; message: string; summary_date: string };

export const generateDailySummary = async (
  token: string,
  /** UTC calendar day `YYYY-MM-DD`; omit for today. */
  date?: string,
): Promise<GenerateDailySummaryResult> => {
  const q = buildQuery({ date });
  const { data } = await apiFetch<unknown>(`/summaries/daily/generate${q}`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  const root = unwrapEnvelope(data);
  const summary = root.summary;
  if (summary && typeof summary === 'object' && !Array.isArray(summary))
    return { kind: 'summary', summary: summary as DailySummaryDto };
  const message =
    typeof root.message === 'string'
      ? root.message
      : date
        ? 'No readings for this day'
        : 'No readings for today';
  const summary_date =
    typeof root.summary_date === 'string' ? root.summary_date : date ?? '';
  return { kind: 'empty', message, summary_date };
};

export const getDailySummary = async (
  token: string,
  date?: string,
): Promise<DailySummaryDto> => {
  const q = buildQuery({ date });
  const { data } = await apiFetch<unknown>(`/summaries/daily${q}`, {
    method: 'GET',
    headers: authHeaders(token),
  });
  const root = unwrapEnvelope(data);
  const summary = root.summary;
  if (!summary || typeof summary !== 'object' || Array.isArray(summary))
    throw new Error('Invalid daily summary response');
  return summary as DailySummaryDto;
};

/** Inclusive UTC calendar days from `start` through `end` (`YYYY-MM-DD`). */
const utcYmdRangeInclusive = (start: string, end: string): string[] => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end)
    return [];
  const out: string[] = [];
  const d = new Date(`${start}T00:00:00.000Z`);
  const endMs = new Date(`${end}T00:00:00.000Z`).getTime();
  while (d.getTime() <= endMs) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
};

/**
 * Load daily rows for each UTC day in [start, end]. Uses only GET /summaries/daily?date=
 * (no batch route). Days with no row (404) are omitted.
 */
export const getDailySummaryRange = async (
  token: string,
  start: string,
  end: string,
): Promise<DailySummaryDto[]> => {
  const days = utcYmdRangeInclusive(start, end);
  const rows = await Promise.all(
    days.map(async (date) => {
      try {
        return await getDailySummary(token, date);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    }),
  );
  return rows.filter((r): r is DailySummaryDto => r != null);
};

// ─────────────────────────────────────────────────────────────────────────────
// WEEKLY
// ─────────────────────────────────────────────────────────────────────────────

export const generateWeeklySummary = async (
  token: string,
): Promise<WeeklySummaryDto> => {
  const { data } = await apiFetch<unknown>('/summaries/weekly/generate', {
    method: 'POST',
    headers: authHeaders(token),
  });
  const root = unwrapEnvelope(data);
  const summary = root.summary;
  if (!summary || typeof summary !== 'object' || Array.isArray(summary))
    throw new Error('Invalid weekly summary response');
  return summary as WeeklySummaryDto;
};

export const getWeeklySummary = async (
  token: string,
  weekStart?: string,
): Promise<WeeklySummaryDto> => {
  const q = buildQuery({ week_start: weekStart });
  const { data } = await apiFetch<unknown>(`/summaries/weekly${q}`, {
    method: 'GET',
    headers: authHeaders(token),
  });
  const root = unwrapEnvelope(data);
  const summary = root.summary;
  if (!summary || typeof summary !== 'object' || Array.isArray(summary))
    throw new Error('Invalid weekly summary response');
  return summary as WeeklySummaryDto;
};

// ─────────────────────────────────────────────────────────────────────────────
// MONTHLY
// ─────────────────────────────────────────────────────────────────────────────

export const generateMonthlySummary = async (
  token: string,
  month?: number,
  year?: number,
): Promise<MonthlySummaryDto> => {
  const q = buildQuery({ month, year });
  const { data } = await apiFetch<unknown>(`/summaries/monthly/generate${q}`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  const root = unwrapEnvelope(data);
  const summary = root.summary;
  if (!summary || typeof summary !== 'object' || Array.isArray(summary))
    throw new Error('Invalid monthly summary response');
  return summary as MonthlySummaryDto;
};

export const getMonthlySummary = async (
  token: string,
  month?: number,
  year?: number,
): Promise<MonthlySummaryDto> => {
  const q = buildQuery({ month, year });
  const { data } = await apiFetch<unknown>(`/summaries/monthly${q}`, {
    method: 'GET',
    headers: authHeaders(token),
  });
  const root = unwrapEnvelope(data);
  const summary = root.summary;
  if (!summary || typeof summary !== 'object' || Array.isArray(summary))
    throw new Error('Invalid monthly summary response');
  return summary as MonthlySummaryDto;
};

// ─────────────────────────────────────────────────────────────────────────────
// ENSURE HELPERS (GET → auto-generate on 404)
// ─────────────────────────────────────────────────────────────────────────────

const utcYmd = (): string => new Date().toISOString().slice(0, 10);

export const ensureDailySummary = async (
  token: string,
  date?: string,
): Promise<DailySummaryDto | null> => {
  const target = date ?? utcYmd();
  try {
    return await getDailySummary(token, target);
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 404) throw e;
  }
  const gen = await generateDailySummary(token, target);
  if (gen.kind === 'summary') return gen.summary;
  return null;
};

export const ensureWeeklySummary = async (
  token: string,
  weekStart?: string,
): Promise<WeeklySummaryDto> => {
  try {
    return await getWeeklySummary(token, weekStart);
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 404) throw e;
  }
  await generateWeeklySummary(token);
  return getWeeklySummary(token, weekStart);
};

export const ensureMonthlySummary = async (
  token: string,
  month?: number,
  year?: number,
): Promise<MonthlySummaryDto> => {
  try {
    return await getMonthlySummary(token, month, year);
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 404) throw e;
  }
  await generateMonthlySummary(token, month, year);
  return getMonthlySummary(token, month, year);
};