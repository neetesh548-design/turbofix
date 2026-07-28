function localParts(date, timezone = 'Asia/Kolkata') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday),
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function minutesOf(value) {
  const [hour = 0, minute = 0] = String(value || '00:00').split(':').map(Number);
  return (hour * 60) + minute;
}

function isInsideShift(roster, now = new Date()) {
  if (!roster?.enabled) return false;
  const parts = localParts(now, roster.timezone);
  const activeDays = roster.active_days || [1, 2, 3, 4, 5, 6];

  const start = minutesOf(roster.start_time);
  const end = minutesOf(roster.end_time);
  if (start > end && parts.minutes < end) {
    const previousWeekday = (parts.weekday + 6) % 7;
    return activeDays.includes(previousWeekday);
  }
  if (!activeDays.includes(parts.weekday)) return false;
  if (start === end) return true;
  if (start < end) return parts.minutes >= start && parts.minutes < end;
  return parts.minutes >= start;
}

function isEffective(assignment, now = new Date(), timezone = 'Asia/Kolkata') {
  const { date } = localParts(now, timezone);
  return (!assignment.effective_from || assignment.effective_from <= date)
    && (!assignment.effective_to || assignment.effective_to >= date);
}

function rosterScore(roster, machine) {
  if (roster.machine_id && String(roster.machine_id) === String(machine?.id || machine?.machine_id)) return 3;
  if (roster.department && roster.department === machine?.department) return 2;
  if (roster.factory_id && String(roster.factory_id) === String(machine?.factory_id)) return 1;
  return 0;
}

function staticAssignment(machine) {
  return {
    technician_user_id: machine?.technician_user_id || machine?.assignments?.technician?.user_id || null,
    supervisor_id: machine?.supervisor_id || machine?.assignments?.supervisor?.user_id || null,
    engineer_user_id: machine?.engineer_user_id || machine?.assignments?.engineer?.user_id || null,
    source: 'machine_default',
  };
}

export function resolveCurrentMachineAssignment(machine, rosters = [], assignments = [], now = new Date()) {
  const machineKey = machine?.id || machine?.machine_id;
  const byRosterId = Object.fromEntries((rosters || []).map((roster) => [roster.id, roster]));
  const candidates = (assignments || [])
    .filter((assignment) => String(assignment.machine_id) === String(machineKey))
    .map((assignment) => ({ assignment, roster: byRosterId[assignment.shift_roster_id] }))
    .filter(({ assignment, roster }) => roster && isInsideShift(roster, now) && isEffective(assignment, now, roster.timezone))
    .sort((a, b) => rosterScore(b.roster, machine) - rosterScore(a.roster, machine));

  if (!candidates.length) return { ...staticAssignment(machine), active_shift: null };

  const { assignment, roster } = candidates[0];
  return {
    active_shift: roster,
    technician_user_id: assignment.technician_user_id || null,
    supervisor_id: assignment.supervisor_id || null,
    engineer_user_id: assignment.engineer_user_id || staticAssignment(machine).engineer_user_id,
    source: 'shift_roster',
  };
}

export function applyCurrentShiftAssignments(machines = [], rosters = [], assignments = [], now = new Date()) {
  return (machines || []).map((machine) => {
    const current = resolveCurrentMachineAssignment(machine, rosters, assignments, now);
    return {
      ...machine,
      technician_user_id: current.technician_user_id,
      supervisor_id: current.supervisor_id,
      engineer_user_id: current.engineer_user_id,
      active_shift: current.active_shift,
      assignment_source: current.source,
    };
  });
}
