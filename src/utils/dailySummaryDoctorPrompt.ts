import type { DailySummaryView } from '@/src/services/summaryViewModels';

/** User message sent to Doctor AI with full daily context for evaluation + tips. */
export const buildDailyCoachPrompt = (view: DailySummaryView): string => {
  const angleLine = [
    view.avgUpperBack != null
      ? `Upper back avg: ${view.avgUpperBack.toFixed(1)}°`
      : null,
    view.avgLeftShoulder != null
      ? `Left shoulder avg: ${view.avgLeftShoulder.toFixed(1)}°`
      : null,
    view.avgRightShoulder != null
      ? `Right shoulder avg: ${view.avgRightShoulder.toFixed(1)}°`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  const fmtWear = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const wearNote =
    view.overlapWearUsed && view.wearTimeIsReal
      ? `Total wearing time: ${view.totalWearMinutes} min from session overlap with this UTC day. Corrections, session count, and alerts per session match the daily summary row (same source as Home).`
      : view.wearTimeIsReal
        ? `Total wearing time: ${view.totalWearMinutes} min from daily summary (UTC day). Corrections and session count match that same daily summary row.`
        : `Wear time not provided; displayed minutes use an 8h placeholder for this day. Corrections and session count still reflect the daily summary row when present.`;

  const alertsPerSess =
    view.alertsPerSession != null ? String(view.alertsPerSession) : 'n/a (no sessions)';

  return [
    'Please give me a full evaluation of my posture day and practical tips based ONLY on the summary data below (UTC day from my JALES app).',
    '',
    '--- Daily summary data ---',
    `Calendar label: ${view.titleDate}`,
    `UTC summary date: ${view.summaryDate}`,
    `Day posture score (daily_summary.posture_score): ${view.scorePct}%`,
    `Total wearing time: ${fmtWear(view.totalWearMinutes)}`,
    wearNote,
    `Corrections / alerts: ${view.totalAlerts}`,
    `Sessions logged: ${view.totalSessions}`,
    `Alerts per session: ${alertsPerSess}`,
    `Estimated good-posture share of modeled day: ${Math.round(view.goodPosturePct)}%`,
    angleLine ? `Angle / reading averages:\n${angleLine}` : 'Angle averages: not provided for this day.',
    '',
    'Coach note already shown in app:',
    view.tip,
    '',
    '--- What I need from you ---',
    '1) Brief interpretation of what this day suggests about my desk habits, breaks, and consistency.',
    '2) Strengths vs risks in plain language (no medical diagnosis).',
    '3) 5–7 specific, ordered tips (ergonomics, micro-breaks, stretches, phone height, chair, stress).',
    '4) One single priority to focus on tomorrow.',
    '5) If data is sparse (e.g. zero sessions), say so and give safe general guidance instead of inventing numbers.',
    '',
    'Keep the tone supportive and concise but substantive.',
  ].join('\n');
};
