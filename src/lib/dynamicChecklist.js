const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'from', 'this', 'that', 'machine', 'issue', 'problem']);

function text(value) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') return [value.summary, value.issue, value.root_cause].filter(Boolean).join(' ');
  return '';
}

function tokens(value) {
  return new Set(text(value).toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2 && !STOP_WORDS.has(word)));
}

function similarity(left, right) {
  const a = tokens(left);
  const b = tokens(right);
  if (!a.size || !b.size) return 0;
  return [...a].filter((word) => b.has(word)).length / Math.min(a.size, b.size);
}

function step(id, label, source, mandatory = false) {
  return { id, label, source, mandatory };
}

export function generateChecklist({ ticket, machine = {}, history = [], documents = [], parts = [] }) {
  const issue = `${text(ticket.issue_text || ticket.description)} ${text(ticket.ai_summary)}`.toLowerCase();
  const machineLabel = machine.name || machine.machine_name || ticket.machine_id || 'this machine';
  const result = [step('safe', 'Make the machine safe and apply the company isolation procedure', `Company safety rule · ${machineLabel}`, true)];

  if (/electric|voltage|current|motor|panel|short|shock/.test(issue)) {
    result.push(step('isolate-electrical', 'Isolate electrical power and verify zero energy before inspection', 'Electrical safety rule', true));
  } else if (/hydraulic|pressure|oil leak|pneumatic|air leak/.test(issue)) {
    result.push(step('release-pressure', 'Release stored pressure and confirm the system is depressurised', 'Pressure-system safety rule', true));
  } else if (/hot|heat|temperature|overheat|steam/.test(issue)) {
    result.push(step('temperature-safe', 'Allow hot surfaces to reach a safe temperature before inspection', 'Thermal safety rule', true));
  }

  result.push(step('confirm', `Confirm the reported symptom${ticket.issue_text ? `: ${ticket.issue_text.slice(0, 90)}` : ''}`, 'Current ticket'));

  const machineDocs = documents.filter((doc) => doc.machine_id === ticket.machine_id);
  if (machineDocs.length) {
    const preferred = machineDocs.find((doc) => /sop|manual|checklist/i.test(`${doc.category} ${doc.title}`)) || machineDocs[0];
    result.push(step('machine-guidance', `Check the approved ${preferred.title || preferred.category || 'machine guidance'} before repair`, 'Approved machine data'));
  }

  const similar = history
    .filter((item) => item.id !== ticket.id && item.machine_id === ticket.machine_id && ['resolved', 'closed'].includes(String(item.status || '').toLowerCase()))
    .map((item) => ({ item, score: similarity(`${ticket.issue_text || ''} ${text(ticket.ai_summary)}`, `${item.issue_text || ''} ${text(item.ai_summary)}`) }))
    .filter(({ score }) => score >= 0.25)
    .sort((a, b) => b.score - a.score)[0]?.item;
  if (similar) {
    const resolution = similar.resolution || similar.closure_notes || text(similar.ai_summary) || 'the previous approved repair';
    result.push(step('history', `Compare with the previous successful repair: ${resolution.slice(0, 110)}`, 'Machine repair history'));
  }

  const availablePart = parts.find((part) => part.machine_id === ticket.machine_id && Number(part.stock_qty ?? part.quantity_on_hand ?? 0) > 0
    && [...tokens(issue)].some((word) => `${part.name || part.part_name || ''} ${part.part_number || ''}`.toLowerCase().includes(word)));
  if (availablePart) {
    result.push(step('spare', `If replacement is required, ${availablePart.name || availablePart.part_name} is available in stock`, 'Live spare inventory'));
  }

  result.push(step('verify', 'Test the repair safely and confirm the original symptom is resolved', 'Closure verification', true));
  result.push(step('evidence', 'Add a photo or voice update as repair evidence', 'Automatic maintenance record'));
  return result.slice(0, 7);
}
