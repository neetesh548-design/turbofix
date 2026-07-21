import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyHmacSha256 } from '../_shared/security.ts'
import { downloadMedia, sendTextMessage, sendTemplateMessage, isConfigured as waConfigured } from '../_shared/whatsapp.ts'
import { isEnabled as aiEnabled, transcribeAudio, analyzeImage, summarizeIssue, detectLanguage, extractConsumableUsage } from '../_shared/gemini.ts'

// ─── Environment ────────────────────────────────────────────────────────────────
const WHATSAPP_APP_SECRET       = Deno.env.get('WHATSAPP_APP_SECRET');
const WHATSAPP_VERIFY_TOKEN     = Deno.env.get('WHATSAPP_VERIFY_TOKEN');
const TICKET_TEMPLATE_NAME      = Deno.env.get('WHATSAPP_TICKET_TEMPLATE_NAME') || 'turbofix_new_ticket';
const TICKET_TEMPLATE_LANG      = Deno.env.get('WHATSAPP_TICKET_TEMPLATE_LANGUAGE') || 'en_US';

function getSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

// ─── Session Map (in-memory TTL) ────────────────────────────────────────────────
// Groups multi-part messages (text → photo → voice) for the same ticket.
interface Session {
  ticketId: string;
  machineId: string;
  factoryId: string;
  notified: boolean;
  createdAt: number;
}

const SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes
const sessions = new Map<string, Session>();

function getSession(phone: string): Session | null {
  const s = sessions.get(phone);
  if (!s) return null;
  if (Date.now() - s.createdAt > SESSION_TTL_MS) {
    sessions.delete(phone);
    return null;
  }
  return s;
}

function openSession(phone: string, ticketId: string, machineId: string, factoryId: string) {
  sessions.set(phone, { ticketId, machineId, factoryId, notified: false, createdAt: Date.now() });
}

function markNotified(phone: string) {
  const s = sessions.get(phone);
  if (s) s.notified = true;
}

// ─── Close-command regex ────────────────────────────────────────────────────────
const CLOSE_RE = /(?:close|closed|resolve|resolved|done|fixed|complete|completed)\s+(\S+)/i;

// ─── Event Logger ───────────────────────────────────────────────────────────────
async function logEvent(
  supabase: ReturnType<typeof getSupabase>,
  ticketId: string,
  eventType: string,
  message: string,
) {
  try {
    await supabase.from('events').insert({ ticket_id: ticketId, event_type: eventType, message });
  } catch (e) {
    console.error('event.log_failed', ticketId, e);
  }
}

// ─── Fan-out: Role-tailored notifications ───────────────────────────────────────
async function fanoutTicket(
  supabase: ReturnType<typeof getSupabase>,
  ticketId: string,
  machineId: string,
  factoryId: string,
  roleSummaries?: { ownerSummary: string; supervisorSummary: string; technicianSummary: string },
) {
  if (!waConfigured()) {
    console.log('fanout.skipped', 'WhatsApp not configured');
    return;
  }

  // Fetch machine details for recipient phones
  const { data: machine } = await supabase
    .from('machines')
    .select('name, assigned_technician_phone, informed_phone_1, supervisor_id')
    .eq('id', machineId)
    .single();

  if (!machine) {
    console.warn('fanout.no_machine', machineId);
    return;
  }

  // Fetch the ticket for summary fallback
  const { data: ticket } = await supabase
    .from('tickets')
    .select('issue_text, ai_summary, reporter_phone')
    .eq('id', ticketId)
    .single();

  const defaultSummary = ticket?.ai_summary?.summary || ticket?.issue_text || '(no description)';
  const urgency = ticket?.ai_summary?.urgency || 'medium';

  // Build recipient list with role-appropriate summaries
  const recipients: { phone: string; brief: string }[] = [];

  if (machine.assigned_technician_phone) {
    const phone = machine.assigned_technician_phone.replace('+', '');
    const brief = roleSummaries?.technicianSummary || defaultSummary;
    recipients.push({ phone, brief });
  }

  if (machine.informed_phone_1) {
    const phone = machine.informed_phone_1.replace('+', '');
    const brief = roleSummaries?.ownerSummary || defaultSummary;
    recipients.push({ phone, brief });
  }

  // Fetch supervisor phone if supervisor_id is set
  if (machine.supervisor_id) {
    const { data: supProfile } = await supabase
      .from('profiles')
      .select('phone_e164')
      .eq('user_id', machine.supervisor_id)
      .single();

    if (supProfile?.phone_e164) {
      const phone = supProfile.phone_e164.replace('+', '');
      const brief = roleSummaries?.supervisorSummary || defaultSummary;
      // Don't duplicate if already in the list
      if (!recipients.some(r => r.phone === phone)) {
        recipients.push({ phone, brief });
      }
    }
  }

  for (const { phone, brief } of recipients) {
    try {
      await sendTemplateMessage(phone, TICKET_TEMPLATE_NAME, TICKET_TEMPLATE_LANG, [
        machine.name || 'Unknown Machine',
        ticketId.slice(0, 8),
        brief,
        urgency.charAt(0).toUpperCase() + urgency.slice(1),
        ticket?.reporter_phone || '',
      ]);
      console.log('fanout.sent', ticketId, phone);
    } catch (e) {
      // Fallback to text message if template fails
      try {
        const msg = `🔧 TurboFix Alert\nMachine: ${machine.name}\nIssue: ${brief}\nUrgency: ${urgency}\nReporter: ${ticket?.reporter_phone || 'Unknown'}`;
        await sendTextMessage(phone, msg);
        console.log('fanout.sent_text_fallback', ticketId, phone);
      } catch (e2) {
        console.error('fanout.failed', ticketId, phone, e2);
      }
    }
  }
}

// ─── Fan-out: Closure notification ──────────────────────────────────────────────
async function fanoutClosure(
  supabase: ReturnType<typeof getSupabase>,
  ticketId: string,
  machineId: string,
  closedByPhone: string,
) {
  if (!waConfigured()) return;

  const { data: machine } = await supabase
    .from('machines')
    .select('name, assigned_technician_phone, informed_phone_1, supervisor_id')
    .eq('id', machineId)
    .single();

  if (!machine) return;

  const { data: ticket } = await supabase
    .from('tickets')
    .select('reporter_phone, issue_text, ai_summary')
    .eq('id', ticketId)
    .single();

  const summary = ticket?.ai_summary?.summary || ticket?.issue_text || '(no description)';

  // All stakeholders + reporter
  const phones = new Set<string>();
  if (machine.assigned_technician_phone) phones.add(machine.assigned_technician_phone.replace('+', ''));
  if (machine.informed_phone_1) phones.add(machine.informed_phone_1.replace('+', ''));
  if (ticket?.reporter_phone) phones.add(ticket.reporter_phone.replace('+', ''));

  if (machine.supervisor_id) {
    const { data: supProfile } = await supabase
      .from('profiles')
      .select('phone_e164')
      .eq('user_id', machine.supervisor_id)
      .single();
    if (supProfile?.phone_e164) phones.add(supProfile.phone_e164.replace('+', ''));
  }

  const msg = `✅ TurboFix — Ticket Resolved\nMachine: ${machine.name}\nIssue: ${summary}\nClosed by: ${closedByPhone}\nTicket: ${ticketId.slice(0, 8)}`;

  for (const phone of phones) {
    try {
      await sendTextMessage(phone, msg);
      console.log('closure.sent', ticketId, phone);
    } catch (e) {
      console.error('closure.failed', ticketId, phone, e);
    }
  }
}

// ─── AI Triage Pipeline ─────────────────────────────────────────────────────────
async function triageAndStore(
  supabase: ReturnType<typeof getSupabase>,
  ticketId: string,
  issueText: string,
  machineId: string | null,
) {
  if (!aiEnabled()) {
    console.log('ai.skipped', 'Gemini not configured');
    return undefined;
  }

  // Build machine context if available
  let machineContext: string | undefined;
  if (machineId) {
    const { data: parts } = await supabase
      .from('parts')
      .select('part_name, part_number, stock_qty')
      .eq('machine_id', machineId);

    const { data: consumables } = await supabase
      .from('consumables')
      .select('name, stock_qty, next_due_at')
      .eq('machine_id', machineId);

    const lines: string[] = [];
    if (parts?.length) {
      lines.push('Available spare parts:');
      parts.forEach(p => lines.push(`  - ${p.part_name} (${p.part_number}) — stock: ${p.stock_qty}`));
    }
    if (consumables?.length) {
      lines.push('Consumables:');
      consumables.forEach(c => {
        const due = c.next_due_at ? ` — next due: ${c.next_due_at}` : '';
        lines.push(`  - ${c.name} — stock: ${c.stock_qty}${due}`);
      });
    }
    if (lines.length > 0) machineContext = lines.join('\n');
  }

  try {
    const result = await summarizeIssue(issueText, machineContext);

    await supabase
      .from('tickets')
      .update({
        ai_summary: {
          summary: result.summary,
          urgency: result.urgency,
          owner_summary: result.ownerSummary,
          supervisor_summary: result.supervisorSummary,
          technician_summary: result.technicianSummary,
        },
        urgency: result.urgency,
      })
      .eq('id', ticketId);

    await logEvent(supabase, ticketId, 'ai_summary', result.summary);
    console.log('ai.stored', ticketId, result.urgency);
    return result;
  } catch (e) {
    console.error('ai.triage_failed', ticketId, e);
    return undefined;
  }
}

async function detectAndStoreLanguage(
  supabase: ReturnType<typeof getSupabase>,
  ticketId: string,
  text: string,
): Promise<string> {
  if (!aiEnabled() || !text) return 'en';
  try {
    const lang = await detectLanguage(text);
    // Store language in ai_summary JSONB
    const { data: existing } = await supabase
      .from('tickets')
      .select('ai_summary')
      .eq('id', ticketId)
      .single();
    
    const updatedSummary = { ...(existing?.ai_summary || {}), language: lang };
    await supabase.from('tickets').update({ ai_summary: updatedSummary }).eq('id', ticketId);
    console.log('language.detected', ticketId, lang);
    return lang;
  } catch (e) {
    console.error('language.detect_failed', ticketId, e);
    return 'en';
  }
}

// ─── Gatekeeper: route message to factory ───────────────────────────────────────
interface GatekeeperResult {
  factoryId: string;
  machineId: string | null;
  isUnverified: boolean;
}

async function gatekeeper(
  supabase: ReturnType<typeof getSupabase>,
  phoneE164: string,
  issueText: string,
): Promise<{ result: GatekeeperResult | null; cleanedText: string }> {

  // 1. Check if known user
  const { data: profile } = await supabase
    .from('profiles')
    .select('factory_id, role')
    .eq('phone_e164', phoneE164)
    .single();

  if (profile) {
    return { result: { factoryId: profile.factory_id, machineId: null, isUnverified: false }, cleanedText: issueText };
  }

  // 2. Check for QR token in message
  const tokenMatch = issueText.match(/TF-([a-zA-Z0-9]+)/);
  if (tokenMatch) {
    const token = tokenMatch[1];
    const { data: qrData } = await supabase
      .from('machine_qr_codes')
      .select('factory_id, machine_id')
      .eq('token', token)
      .single();

    if (qrData) {
      const cleanedText = issueText.replace(`TF-${token}`, '').trim();
      return {
        result: { factoryId: qrData.factory_id, machineId: qrData.machine_id, isUnverified: true },
        cleanedText,
      };
    }
  }

  return { result: null, cleanedText: issueText };
}

// ─── Message Handlers ───────────────────────────────────────────────────────────

async function handleTextMessage(
  supabase: ReturnType<typeof getSupabase>,
  from: string,
  text: string,
) {
  const phoneE164 = `+${from.replace('+', '')}`;

  // 1. Check for close command
  const closeMatch = CLOSE_RE.exec(text);
  if (closeMatch) {
    await handleCloseCommand(supabase, phoneE164, closeMatch[1]);
    return;
  }

  // 2. Check for active session — append text to existing ticket
  const session = getSession(phoneE164);
  if (session) {
    // Update the existing ticket's issue text
    const { data: ticket } = await supabase
      .from('tickets')
      .select('issue_text')
      .eq('id', session.ticketId)
      .single();

    const merged = ticket?.issue_text
      ? `${ticket.issue_text} | ${text}`
      : text;

    await supabase.from('tickets').update({ issue_text: merged }).eq('id', session.ticketId);
    await logEvent(supabase, session.ticketId, 'text_added', text);

    // Re-run AI triage with updated text
    const summaries = await triageAndStore(supabase, session.ticketId, merged, session.machineId);
    await detectAndStoreLanguage(supabase, session.ticketId, text);

    // Consumable Deduction Check
    if (aiEnabled()) {
      const consumableData = await extractConsumableUsage(text);
      if (consumableData.used_consumable && consumableData.consumable_name && consumableData.quantity_used) {
        // Try to find the consumable
        const { data: consumable } = await supabase
          .from('consumables')
          .select('id, name')
          .ilike('name', `%${consumableData.consumable_name}%`)
          .eq('machine_id', session.machineId)
          .limit(1)
          .single();

        if (consumable) {
          await supabase.rpc('decrement_consumable', { p_id: consumable.id, qty: consumableData.quantity_used });
          if (waConfigured()) {
            await sendTextMessage(from, `✅ Logged usage: ${consumableData.quantity_used} of ${consumable.name}. Inventory updated.`);
          }
        }
      }
    }

    // Fan out if not already notified
    if (!session.notified) {
      await fanoutTicket(supabase, session.ticketId, session.machineId, session.factoryId, summaries);
      markNotified(phoneE164);
    }
    return;
  }

  // 3. Route via gatekeeper
  const { result: gate, cleanedText } = await gatekeeper(supabase, phoneE164, text);

  if (!gate) {
    // Unknown number, no token — inform the sender
    if (waConfigured()) {
      await sendTextMessage(from, `This number isn't linked to a TurboFix factory. Please scan a machine QR code to register.`);
    }
    return;
  }

  // 4. Create new ticket
  const { data: newTicket, error: insertErr } = await supabase
    .from('tickets')
    .insert({
      factory_id: gate.factoryId,
      machine_id: gate.machineId,
      reporter_phone: phoneE164,
      issue_text: cleanedText || '(no description provided)',
      status: 'open',
      ai_summary: gate.isUnverified ? { flag: 'unverified_reporter' } : null,
    })
    .select('id')
    .single();

  if (insertErr || !newTicket) {
    console.error('ticket.insert_failed', insertErr);
    return;
  }

  const ticketId = newTicket.id;
  console.log('ticket.created', ticketId, phoneE164);

  // Open session for multi-message grouping
  openSession(phoneE164, ticketId, gate.machineId || '', gate.factoryId);

  await logEvent(supabase, ticketId, 'ticket_created', cleanedText || '(text)');

  // 5. AI triage + language detection + fan-out
  const summaries = await triageAndStore(supabase, ticketId, cleanedText, gate.machineId);
  await detectAndStoreLanguage(supabase, ticketId, cleanedText);
  await fanoutTicket(supabase, ticketId, gate.machineId || '', gate.factoryId, summaries);
  markNotified(phoneE164);

  // 6. If unverified reporter, alert supervisors
  if (gate.isUnverified) {
    await alertSupervisors(supabase, gate.factoryId, phoneE164);
  }
}

async function handleAudioMessage(
  supabase: ReturnType<typeof getSupabase>,
  from: string,
  mediaId: string,
) {
  const phoneE164 = `+${from.replace('+', '')}`;
  const session = getSession(phoneE164);

  if (!session) {
    console.warn('audio.no_session', from);
    return;
  }

  let transcript = '';

  try {
    const audioBytes = await downloadMedia(mediaId);

    if (aiEnabled()) {
      transcript = await transcribeAudio(audioBytes, 'audio/ogg');
    }
  } catch (e) {
    console.error('audio.process_failed', session.ticketId, e);
    transcript = '[Audio processing failed]';
  }

  if (transcript) {
    // Merge transcript with existing ticket text
    const { data: ticket } = await supabase
      .from('tickets')
      .select('issue_text')
      .eq('id', session.ticketId)
      .single();

    const existing = ticket?.issue_text || '';
    const merged = !existing || existing === '(no description provided)'
      ? transcript
      : `${existing} | Voice note: ${transcript}`;

    await supabase.from('tickets').update({ issue_text: merged }).eq('id', session.ticketId);

    await logEvent(supabase, session.ticketId, 'voice_note', transcript);

    // Re-triage with updated text
    const summaries = await triageAndStore(supabase, session.ticketId, merged, session.machineId);
    await detectAndStoreLanguage(supabase, session.ticketId, transcript);

    if (!session.notified) {
      await fanoutTicket(supabase, session.ticketId, session.machineId, session.factoryId, summaries);
      markNotified(phoneE164);
    }
  }
}

async function handleImageMessage(
  supabase: ReturnType<typeof getSupabase>,
  from: string,
  mediaId: string,
) {
  const phoneE164 = `+${from.replace('+', '')}`;
  const session = getSession(phoneE164);

  if (!session) {
    console.warn('image.no_session', from);
    return;
  }

  let imageDescription = '';

  try {
    const imageBytes = await downloadMedia(mediaId);

    // Store proof image in storage
    const storagePath = `tickets/${session.ticketId}/${mediaId}.jpg`;
    await supabase.storage
      .from('repair-proofs')
      .upload(storagePath, imageBytes, { contentType: 'image/jpeg', upsert: true });

    const { data: publicUrl } = supabase.storage
      .from('repair-proofs')
      .getPublicUrl(storagePath);

    // Update ticket with proof image URL
    await supabase.from('tickets')
      .update({ proof_image_url: publicUrl.publicUrl })
      .eq('id', session.ticketId);

    if (aiEnabled()) {
      imageDescription = await analyzeImage(imageBytes, 'image/jpeg');
    }
  } catch (e) {
    console.error('image.process_failed', session.ticketId, e);
    imageDescription = '[Image processing failed]';
  }

  if (imageDescription) {
    // Merge image analysis with existing ticket text
    const { data: ticket } = await supabase
      .from('tickets')
      .select('issue_text')
      .eq('id', session.ticketId)
      .single();

    const existing = ticket?.issue_text || '';
    const merged = !existing || existing === '(no description provided)'
      ? `[Photo analysis] ${imageDescription}`
      : `${existing} | [Photo analysis] ${imageDescription}`;

    await supabase.from('tickets').update({ issue_text: merged }).eq('id', session.ticketId);

    await logEvent(supabase, session.ticketId, 'photo', imageDescription);

    // Re-triage
    const summaries = await triageAndStore(supabase, session.ticketId, merged, session.machineId);

    if (!session.notified) {
      await fanoutTicket(supabase, session.ticketId, session.machineId, session.factoryId, summaries);
      markNotified(phoneE164);
    }
  }
}

// ─── Close Command ──────────────────────────────────────────────────────────────
async function handleCloseCommand(
  supabase: ReturnType<typeof getSupabase>,
  phoneE164: string,
  ticketIdInput: string,
) {
  // Find ticket by ID prefix
  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, machine_id, factory_id, status, reporter_phone')
    .ilike('id', `${ticketIdInput}%`)
    .limit(1);

  const ticket = tickets?.[0];
  if (!ticket) {
    console.warn('close.not_found', ticketIdInput, phoneE164);
    if (waConfigured()) {
      await sendTextMessage(phoneE164.replace('+', ''), `Ticket "${ticketIdInput}" not found. Please check the ID and try again.`);
    }
    return;
  }

  if (ticket.status === 'resolved' || ticket.status === 'closed') {
    console.log('close.already_closed', ticket.id);
    if (waConfigured()) {
      await sendTextMessage(phoneE164.replace('+', ''), `Ticket ${ticket.id.slice(0, 8)} is already resolved.`);
    }
    return;
  }

  // Check authorization: reporter or machine stakeholder
  const authorized = await isAuthorizedToClose(supabase, phoneE164, ticket);
  if (!authorized) {
    console.warn('close.unauthorized', ticket.id, phoneE164);
    if (waConfigured()) {
      await sendTextMessage(phoneE164.replace('+', ''), `You are not authorized to close this ticket.`);
    }
    return;
  }

  // Close the ticket
  await supabase
    .from('tickets')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', ticket.id);

  console.log('ticket.closed', ticket.id, phoneE164);
  await logEvent(supabase, ticket.id, 'ticket_closed', `Closed by ${phoneE164}`);

  // Fan-out closure notification
  await fanoutClosure(supabase, ticket.id, ticket.machine_id, phoneE164);

  // Confirm to closer
  if (waConfigured()) {
    await sendTextMessage(phoneE164.replace('+', ''), `✅ Ticket ${ticket.id.slice(0, 8)} has been resolved successfully.`);
  }
}

async function isAuthorizedToClose(
  supabase: ReturnType<typeof getSupabase>,
  phoneE164: string,
  ticket: { reporter_phone: string | null; machine_id: string },
): Promise<boolean> {
  // Reporter can close
  if (ticket.reporter_phone === phoneE164) return true;

  // Machine stakeholders can close
  const { data: machine } = await supabase
    .from('machines')
    .select('assigned_technician_phone, informed_phone_1, supervisor_id')
    .eq('id', ticket.machine_id)
    .single();

  if (!machine) return false;

  if (machine.assigned_technician_phone === phoneE164) return true;
  if (machine.informed_phone_1 === phoneE164) return true;

  // Supervisor check
  if (machine.supervisor_id) {
    const { data: sup } = await supabase
      .from('profiles')
      .select('phone_e164')
      .eq('user_id', machine.supervisor_id)
      .single();
    if (sup?.phone_e164 === phoneE164) return true;
  }

  return false;
}

// ─── Supervisor Alert for Unverified Reporters ──────────────────────────────────
async function alertSupervisors(
  supabase: ReturnType<typeof getSupabase>,
  factoryId: string,
  reporterPhone: string,
) {
  if (!waConfigured()) return;

  const { data: supervisors } = await supabase
    .from('profiles')
    .select('phone_e164')
    .eq('factory_id', factoryId)
    .in('role', ['supervisor', 'owner']);

  if (!supervisors?.length) return;

  const msg = `⚠️ TurboFix: New report from unregistered number ${reporterPhone}. Please verify this person in your TurboFix dashboard.`;

  for (const sup of supervisors) {
    try {
      await sendTextMessage(sup.phone_e164.replace('+', ''), msg);
    } catch (e) {
      console.error('alert.supervisor_failed', sup.phone_e164, e);
    }
  }
}

// ─── Main Handler ───────────────────────────────────────────────────────────────
serve(async (req) => {
  // ── GET: Meta verification handshake ──
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  // ── Only accept POST ──
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // ── Verify webhook signature ──
  const bodyText = await req.text();

  if (WHATSAPP_APP_SECRET) {
    const signatureHeader = req.headers.get('x-hub-signature-256') || '';
    if (!signatureHeader.startsWith('sha256=')) {
      return new Response('Missing signature', { status: 401 });
    }
    const valid = await verifyHmacSha256(
      bodyText,
      signatureHeader.slice('sha256='.length),
      WHATSAPP_APP_SECRET,
    );
    if (!valid) {
      console.warn('webhook.invalid_signature');
      return new Response('Invalid signature', { status: 401 });
    }
  }

  // ── Parse and dispatch ──
  const body = JSON.parse(bodyText);
  if (!body.object) {
    return new Response('Not Found', { status: 404 });
  }

  // Return 200 immediately — process in the same invocation but don't block Meta
  const supabase = getSupabase();

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      for (const message of value.messages || []) {
        const from = message.from; // e.g. 919876543210

        try {
          switch (message.type) {
            case 'text':
              await handleTextMessage(supabase, from, message.text?.body || '');
              break;

            case 'audio':
              await handleAudioMessage(supabase, from, message.audio?.id || '');
              break;

            case 'image':
              await handleImageMessage(supabase, from, message.image?.id || '');
              break;

            case 'interactive':
              // Handle button/list replies as text
              const replyText = message.interactive?.button_reply?.title
                || message.interactive?.list_reply?.title
                || '';
              if (replyText) {
                await handleTextMessage(supabase, from, replyText);
              }
              break;

            default:
              console.log('webhook.unsupported_type', message.type, from);
          }
        } catch (e) {
          console.error('webhook.handler_error', message.type, from, e);
        }
      }
    }
  }

  return new Response('EVENT_RECEIVED', { status: 200 });
})
