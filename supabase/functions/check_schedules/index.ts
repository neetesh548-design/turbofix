import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireServiceRole } from '../_shared/security.ts'

const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

serve(async (req) => {
  const authError = requireServiceRole(req);
  if (authError) return authError;
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get all active factories
    const { data: factories, error: factoriesError } = await supabase
      .from('factories')
      .select('id, name');

    if (factoriesError) throw factoriesError;

    const today = new Date();
    let totalChecked = 0;

    // Loop PER FACTORY to ensure strict tenant isolation
    for (const factory of factories) {
      
      const { data: consumables, error } = await supabase
        .from('consumables')
        .select('*, machines(name, assigned_technician_phone, informed_phone_1)')
        .eq('factory_id', factory.id) // <--- Mandatory Tenant Filter
        .not('next_due_at', 'is', null);

      if (error) continue;
      
      for (const item of consumables) {
        totalChecked++;
        const nextDue = new Date(item.next_due_at);
        const totalLeadTime = (item.lead_time_days || 0) + (item.buffer_days || 0);
        
        const orderByDate = new Date(nextDue);
        orderByDate.setDate(orderByDate.getDate() - totalLeadTime);

        if (today >= orderByDate) {
          // Idempotency: Check if an open Preventative ticket already exists for this item
          const { data: existingTicket } = await supabase
            .from('tickets')
            .select('id')
            .eq('factory_id', factory.id) // <--- Mandatory Tenant Filter
            .eq('machine_id', item.machine_id)
            .eq('type', 'preventive')
            .eq('status', 'open')
            .contains('ai_summary', { consumable_id: item.id })
            .single();

          if (existingTicket) continue; 

          let message = "";
          
          if (item.stock_qty >= 1) {
            if (today < nextDue) continue; 
            message = `[${factory.name}] Reminder: Perform scheduled replacement for ${item.name} on ${item.machines.name} today. You have ${item.stock_qty} in stock.`;
          } else {
            message = `[${factory.name}] URGENT ORDER REQUIRED: Order [${item.name}] for [${item.machines.name}] today. Supplier lead time is ${item.lead_time_days} days. Due for replacement on ${nextDue.toLocaleDateString()}.`;
          }

          // Create the PM Ticket
          await supabase.from('tickets').insert({
            factory_id: factory.id, // <--- Mandatory Tenant Value
            machine_id: item.machine_id,
            issue_text: message,
            status: 'open',
            type: 'preventive',
            ai_summary: { consumable_id: item.id }
          });

          // Fire WhatsApp Alert to SUPERVISORS of THIS FACTORY ONLY
          const { data: supervisors } = await supabase
            .from('profiles')
            .select('phone_e164')
            .eq('factory_id', factory.id) // <--- Mandatory Tenant Filter
            .eq('role', 'supervisor');

          if (supervisors && WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID) {
            for (const sup of supervisors) {
              await fetch(`https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  messaging_product: "whatsapp",
                  to: sup.phone_e164.replace("+", ""),
                  type: "text",
                  text: { body: message }
                })
              });
            }
          }
        }
      }

      // --- Preventive Maintenance reminders (roadmap §3.5) ---
      // Isolated so a PM failure can never disrupt consumable reminders above.
      try {
        const { data: pmDue } = await supabase
          .from('pm_schedules')
          .select('*, machines(name)')
          .eq('factory_id', factory.id)
          .eq('active', true)
          .not('next_due_at', 'is', null)
          .lte('next_due_at', today.toISOString());

        for (const pm of (pmDue || [])) {
          totalChecked++;
          const { data: existingPmTicket } = await supabase
            .from('tickets')
            .select('id')
            .eq('factory_id', factory.id)
            .eq('machine_id', pm.machine_id)
            .eq('type', 'preventive')
            .eq('status', 'open')
            .contains('ai_summary', { pm_schedule_id: pm.id })
            .maybeSingle();
          if (existingPmTicket) continue;

          const dueDate = new Date(pm.next_due_at);
          const overdue = today > dueDate;
          const pmMessage = `[${factory.name}] ${overdue ? 'OVERDUE PM' : 'PM due'}: "${pm.title}" on ${pm.machines?.name || 'machine'}${overdue ? ` (was due ${dueDate.toLocaleDateString()})` : ' today'}.`;

          await supabase.from('tickets').insert({
            factory_id: factory.id,
            machine_id: pm.machine_id,
            issue_text: pmMessage,
            status: 'open',
            type: 'preventive',
            urgency: overdue ? 'high' : 'medium',
            lifecycle_stage: 'reported',
            ai_summary: { pm_schedule_id: pm.id, summary: pmMessage },
          });

          const { data: pmSupervisors } = await supabase
            .from('profiles')
            .select('phone_e164')
            .eq('factory_id', factory.id)
            .eq('role', 'supervisor');
          if (pmSupervisors && WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID) {
            for (const sup of pmSupervisors) {
              await fetch(`https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ messaging_product: "whatsapp", to: sup.phone_e164.replace("+", ""), type: "text", text: { body: pmMessage } }),
              });
            }
          }
        }
      } catch (pmErr) {
        console.error(`PM schedule check failed for factory ${factory.id}:`, pmErr?.message || pmErr);
      }
    }

    return new Response(JSON.stringify({ status: "success", checked: totalChecked }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
})
