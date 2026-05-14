import type { SessionDto } from '@/src/services/sessions';

export type TimelineTone = 'good' | 'warn' | 'bad' | 'neutral';

export type TimelineSegment = {
  leftPct: number;
  widthPct: number;
  tone: TimelineTone;
};

export function localDayBounds(d = new Date()): { start: Date; end: Date } {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/** Five labels for local midnight → next midnight (0, 6, 12, 18, 24h). */
export function formatLocalDayTicks(): string[] {
  const { start } = localDayBounds();
  const hours = [0, 6, 12, 18, 24];
  return hours.map((h) => {
    const t = new Date(start);
    if (h === 24) {
      t.setDate(t.getDate() + 1);
    } else {
      t.setHours(h, 0, 0, 0);
    }
    return t.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: undefined,
    });
  });
}

function sessionScore(session: SessionDto): number | null {
  const a = session.avg_overall_score;
  const b = session.posture_score;
  const v =
    a != null && Number.isFinite(Number(a)) ? Number(a) : Number(b ?? NaN);
  return Number.isFinite(v) ? v : null;
}

export function scoreToTimelineTone(score: number | null): TimelineTone {
  if (score == null || !Number.isFinite(score)) return 'neutral';
  if (score >= 70) return 'good';
  if (score >= 50) return 'warn';
  return 'bad';
}

export function sessionsIntersectingDay(
  sessions: SessionDto[],
  dayStart: Date,
  dayEnd: Date,
): SessionDto[] {
  const d0 = dayStart.getTime();
  const d1 = dayEnd.getTime();
  return sessions.filter((session) => {
    const s = new Date(session.start_time).getTime();
    const e = session.end_time
      ? new Date(session.end_time).getTime()
      : Date.now();
    return e > d0 && s < d1;
  });
}

export function startOfHour(d: Date): Date {
  const x = new Date(d);
  x.setMinutes(0, 0, 0);
  return x;
}

/** Left edge of timeline: start of the hour when monitoring first began today. */
export function earliestMonitoringStartMs(
  sessionsInDay: SessionDto[],
  currentSessionStartMs: number | null,
  dayStartMs: number,
  dayEndMs: number,
): number | null {
  const starts: number[] = [];
  for (const s of sessionsInDay) {
    const t = new Date(s.start_time).getTime();
    if (t >= dayStartMs && t < dayEndMs) starts.push(t);
  }
  if (
    currentSessionStartMs != null &&
    currentSessionStartMs >= dayStartMs &&
    currentSessionStartMs < dayEndMs
  ) {
    starts.push(currentSessionStartMs);
  }
  if (starts.length === 0) return null;
  return Math.min(...starts);
}

/**
 * Timeline spans from the hour you first started monitoring today through the
 * latest session end (or now). Returns null when there is no monitoring today.
 */
export function monitoringWindowBounds(
  sessionsInDay: SessionDto[],
  currentSessionStartMs: number | null,
  dayStart: Date,
  dayEnd: Date,
): { windowStart: Date; windowEnd: Date } | null {
  const d0 = dayStart.getTime();
  const d1 = dayEnd.getTime();
  const now = Date.now();

  const ems = earliestMonitoringStartMs(
    sessionsInDay,
    currentSessionStartMs,
    d0,
    d1,
  );
  if (ems == null) return null;

  let maxEnd = ems;
  for (const s of sessionsInDay) {
    const e = s.end_time ? new Date(s.end_time).getTime() : now;
    maxEnd = Math.max(maxEnd, Math.min(e, d1));
  }
  if (
    currentSessionStartMs != null &&
    currentSessionStartMs >= d0 &&
    currentSessionStartMs < d1
  ) {
    maxEnd = Math.max(maxEnd, Math.min(now, d1));
  }

  const windowStart = startOfHour(new Date(ems));
  let windowEndMs = Math.min(d1, Math.max(maxEnd, now));

  if (windowEndMs <= windowStart.getTime()) {
    windowEndMs = Math.min(d1, windowStart.getTime() + 60 * 60 * 1000);
  }

  return { windowStart, windowEnd: new Date(windowEndMs) };
}

export function sessionsToTimelineSegments(
  sessions: SessionDto[],
  windowStart: Date,
  windowEnd: Date,
): TimelineSegment[] {
  const dayMs = windowEnd.getTime() - windowStart.getTime();
  if (dayMs <= 0) return [];

  const sorted = [...sessions].sort(
    (a, b) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  );

  const segments: TimelineSegment[] = [];
  for (const session of sorted) {
    const sRaw = new Date(session.start_time).getTime();
    const eRaw = session.end_time
      ? new Date(session.end_time).getTime()
      : Date.now();
    const s = Math.max(sRaw, windowStart.getTime());
    const e = Math.min(eRaw, windowEnd.getTime());
    if (e <= s) continue;
    const leftPct = ((s - windowStart.getTime()) / dayMs) * 100;
    const widthPct = ((e - s) / dayMs) * 100;
    segments.push({
      leftPct,
      widthPct,
      tone: scoreToTimelineTone(sessionScore(session)),
    });
  }
  return segments;
}

/** When the app is monitoring but the open session is not in `listSessions` yet. */
export function appendOngoingLocalSessionSegment(
  segments: TimelineSegment[],
  windowStart: Date,
  windowEnd: Date,
  sessionStartedAtMs: number,
  tone: TimelineTone,
): TimelineSegment[] {
  const ws = windowStart.getTime();
  const we = windowEnd.getTime();
  const s0 = Math.max(sessionStartedAtMs, ws);
  const e0 = Math.min(Date.now(), we);
  if (e0 <= s0) return segments;
  const span = we - ws;
  if (span <= 0) return segments;
  const leftPct = ((s0 - ws) / span) * 100;
  const widthPct = ((e0 - s0) / span) * 100;
  return [...segments, { leftPct, widthPct, tone }];
}

const TICK_COUNT = 5;

export function formatWindowTicks(
  windowStart: Date,
  windowEnd: Date,
): string[] {
  const a = windowStart.getTime();
  const b = windowEnd.getTime();
  const span = Math.max(b - a, 60_000);
  const showMinutes = span < 3 * 60 * 60 * 1000;
  const out: string[] = [];
  const n = TICK_COUNT;
  for (let i = 0; i < n; i++) {
    const t = i === n - 1 ? b : a + (span * i) / (n - 1);
    out.push(
      new Date(t).toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: showMinutes ? '2-digit' : undefined,
      }),
    );
  }
  return out;
}

/** When there are no session spans, approximate the day bar from daily summary %. */
export function goodPostureFallbackSegments(
  goodPosturePct: number,
): TimelineSegment[] {
  const g = Math.min(100, Math.max(0, goodPosturePct));
  const segs: TimelineSegment[] = [];
  if (g > 0) {
    segs.push({ leftPct: 0, widthPct: g, tone: 'good' });
  }
  if (g < 100) {
    segs.push({ leftPct: g, widthPct: 100 - g, tone: 'bad' });
  }
  return segs;
}
