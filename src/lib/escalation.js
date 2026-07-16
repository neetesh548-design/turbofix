export function getElapsedHours(reportedAtStr) {
  if (!reportedAtStr) return 0;
  try {
    const reported = new Date(reportedAtStr.replace(' ', 'T'));
    return Math.max(0, (Date.now() - reported.getTime()) / (1000 * 60 * 60));
  } catch {
    return 0;
  }
}

export function getCurrentEscalationLevel(ticket, escalationPath) {
  if (ticket.status !== 'Open' || escalationPath.length === 0) return null;
  const elapsed = getElapsedHours(ticket.reported_at);

  let accumulated = 0;
  for (let i = 0; i < escalationPath.length; i++) {
    const step = escalationPath[i];
    const isLast = i === escalationPath.length - 1;

    if (isLast || elapsed < accumulated + (step.threshold_hours || 0)) {
      return {
        level: i,
        label: step.label,
        role: step.role,
        hoursLeft: isLast ? null : Math.max(0, (accumulated + (step.threshold_hours || 0)) - elapsed)
      };
    }
    accumulated += (step.threshold_hours || 0);
  }
  return null;
}
