import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireServiceRole } from '../_shared/security.ts'
import { sendTextMessage, sendTemplateMessage, isConfigured } from '../_shared/whatsapp.ts'

/**
 * Send Notifications Edge Function
 *
 * Dispatches WhatsApp notifications for various TurboFix events.
 * Called by database triggers, cron jobs, or other edge functions.
 *
 * Supported event types:
 *   - ticket_created      → Fan-out to machine stakeholders
 *   - ticket_resolved     → Closure notice to all parties
 *   - schedule_due        → Preventive maintenance reminder
 *   - low_stock_alert     → Parts/consumables reorder warning
 *   - custom              → Freeform text message to specified phones
 */

interface NotificationPayload {
  event_type: string;
  ticket_id?: string;
  machine_id?: string;
  factory_id?: string;
  phones?: string[];
  message?: string;
  template_name?: string;
  template_lang?: string;
  template_params?: string[];
}

serve(async (req) => {
  // Only service-role calls allowed
  const authError = requireServiceRole(req);
  if (authError) return authError;

  if (!isConfigured()) {
    return new Response(
      JSON.stringify({ status: 'skipped', message: 'WhatsApp not configured' }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  let payload: NotificationPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const results: { phone: string; status: string; error?: string }[] = [];

  try {
    switch (payload.event_type) {

      // ── Ticket Created → Fan-out to machine stakeholders ──
      case 'ticket_created': {
        if (!payload.ticket_id || !payload.machine_id) {
          return new Response(JSON.stringify({ error: 'ticket_id and machine_id required' }), { status: 400 });
        }

        const { data: machine } = await supabase
          .from('machines')
          .select('name, assigned_technician_phone, informed_phone_1, supervisor_id')
          .eq('id', payload.machine_id)
          .single();

        const { data: ticket } = await supabase
          .from('tickets')
          .select('issue_text, ai_summary, reporter_phone')
          .eq('id', payload.ticket_id)
          .single();

        if (!machine || !ticket) {
          return new Response(JSON.stringify({ error: 'Machine or ticket not found' }), { status: 404 });
        }

        const summary = ticket.ai_summary?.summary || ticket.issue_text || '(no description)';
        const urgency = ticket.ai_summary?.urgency || 'medium';

        const phones = new Set<string>();
        if (machine.assigned_technician_phone) phones.add(machine.assigned_technician_phone.replace('+', ''));
        if (machine.informed_phone_1) phones.add(machine.informed_phone_1.replace('+', ''));

        if (machine.supervisor_id) {
          const { data: sup } = await supabase
            .from('profiles')
            .select('phone_e164')
            .eq('user_id', machine.supervisor_id)
            .single();
          if (sup?.phone_e164) phones.add(sup.phone_e164.replace('+', ''));
        }

        const msg = `🔧 TurboFix Alert\nMachine: ${machine.name}\nIssue: ${summary}\nUrgency: ${urgency}\nReporter: ${ticket.reporter_phone || 'Unknown'}`;

        for (const phone of phones) {
          try {
            await sendTextMessage(phone, msg);
            results.push({ phone, status: 'sent' });
          } catch (e) {
            results.push({ phone, status: 'failed', error: String(e) });
          }
        }
        break;
      }

      // ── Ticket Resolved → Closure notification ──
      case 'ticket_resolved': {
        if (!payload.ticket_id) {
          return new Response(JSON.stringify({ error: 'ticket_id required' }), { status: 400 });
        }

        const { data: ticket } = await supabase
          .from('tickets')
          .select('machine_id, issue_text, ai_summary, reporter_phone')
          .eq('id', payload.ticket_id)
          .single();

        if (!ticket) {
          return new Response(JSON.stringify({ error: 'Ticket not found' }), { status: 404 });
        }

        const { data: machine } = await supabase
          .from('machines')
          .select('name, assigned_technician_phone, informed_phone_1, supervisor_id')
          .eq('id', ticket.machine_id)
          .single();

        if (!machine) break;

        const summary = ticket.ai_summary?.summary || ticket.issue_text || '(no description)';
        const phones = new Set<string>();
        if (machine.assigned_technician_phone) phones.add(machine.assigned_technician_phone.replace('+', ''));
        if (machine.informed_phone_1) phones.add(machine.informed_phone_1.replace('+', ''));
        if (ticket.reporter_phone) phones.add(ticket.reporter_phone.replace('+', ''));

        if (machine.supervisor_id) {
          const { data: sup } = await supabase
            .from('profiles')
            .select('phone_e164')
            .eq('user_id', machine.supervisor_id)
            .single();
          if (sup?.phone_e164) phones.add(sup.phone_e164.replace('+', ''));
        }

        const msg = `✅ TurboFix — Ticket Resolved\nMachine: ${machine.name}\nIssue: ${summary}\nTicket: ${payload.ticket_id.slice(0, 8)}`;

        for (const phone of phones) {
          try {
            await sendTextMessage(phone, msg);
            results.push({ phone, status: 'sent' });
          } catch (e) {
            results.push({ phone, status: 'failed', error: String(e) });
          }
        }
        break;
      }

      // ── Schedule Due → Preventive maintenance reminder ──
      case 'schedule_due': {
        if (!payload.machine_id || !payload.message) {
          return new Response(JSON.stringify({ error: 'machine_id and message required' }), { status: 400 });
        }

        const { data: machine } = await supabase
          .from('machines')
          .select('name, assigned_technician_phone, informed_phone_1')
          .eq('id', payload.machine_id)
          .single();

        if (!machine) break;

        const phones = new Set<string>();
        if (machine.assigned_technician_phone) phones.add(machine.assigned_technician_phone.replace('+', ''));
        if (machine.informed_phone_1) phones.add(machine.informed_phone_1.replace('+', ''));

        const msg = `🗓️ TurboFix Reminder\nMachine: ${machine.name}\n${payload.message}`;

        for (const phone of phones) {
          try {
            await sendTextMessage(phone, msg);
            results.push({ phone, status: 'sent' });
          } catch (e) {
            results.push({ phone, status: 'failed', error: String(e) });
          }
        }
        break;
      }

      // ── Low Stock Alert → Reorder warning ──
      case 'low_stock_alert': {
        if (!payload.factory_id || !payload.message) {
          return new Response(JSON.stringify({ error: 'factory_id and message required' }), { status: 400 });
        }

        // Alert all owners and supervisors in the factory
        const { data: managers } = await supabase
          .from('profiles')
          .select('phone_e164')
          .eq('factory_id', payload.factory_id)
          .in('role', ['owner', 'supervisor']);

        if (!managers?.length) break;

        const msg = `📦 TurboFix Stock Alert\n${payload.message}`;

        for (const mgr of managers) {
          const phone = mgr.phone_e164.replace('+', '');
          try {
            await sendTextMessage(phone, msg);
            results.push({ phone, status: 'sent' });
          } catch (e) {
            results.push({ phone, status: 'failed', error: String(e) });
          }
        }
        break;
      }

      // ── Custom → Freeform to specified phone numbers ──
      case 'custom': {
        if (!payload.phones?.length) {
          return new Response(JSON.stringify({ error: 'phones array required' }), { status: 400 });
        }

        if (payload.template_name) {
          // Send template message
          for (const phone of payload.phones) {
            try {
              await sendTemplateMessage(
                phone.replace('+', ''),
                payload.template_name,
                payload.template_lang || 'en_US',
                payload.template_params || [],
              );
              results.push({ phone, status: 'sent' });
            } catch (e) {
              results.push({ phone, status: 'failed', error: String(e) });
            }
          }
        } else if (payload.message) {
          // Send text message
          for (const phone of payload.phones) {
            try {
              await sendTextMessage(phone.replace('+', ''), payload.message);
              results.push({ phone, status: 'sent' });
            } catch (e) {
              results.push({ phone, status: 'failed', error: String(e) });
            }
          }
        } else {
          return new Response(JSON.stringify({ error: 'message or template_name required' }), { status: 400 });
        }
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown event_type: ${payload.event_type}` }),
          { status: 400 },
        );
    }
  } catch (e) {
    console.error('notification.error', payload.event_type, e);
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return new Response(
    JSON.stringify({
      status: 'success',
      event_type: payload.event_type,
      results,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
})
