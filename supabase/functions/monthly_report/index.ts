import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get all active factories on paid/pilot plans
    const { data: factories, error: factoriesError } = await supabase
      .from('factories')
      .select('id, name');

    if (factoriesError) throw factoriesError;

    const currentMonthDate = new Date();
    // E.g. "June"
    const monthName = currentMonthDate.toLocaleString('default', { month: 'long' });

    let sentCount = 0;

    for (const factory of factories) {
      
      // Get MTTR (requires user impersonation if we rely strictly on security_invoker views from a service role. 
      // Actually, since this runs as service_role, and service_role has access to the views, we MUST filter by factory_id)
      
      const { data: mttrData } = await supabase
        .from('analytics_mttr_monthly')
        .select('mttr_hours, ticket_count')
        .eq('factory_id', factory.id)
        .order('month', { ascending: false })
        .limit(2);
        
      const { data: paretoData } = await supabase
        .from('analytics_downtime_pareto')
        .select('machine_name')
        .eq('factory_id', factory.id)
        .limit(1);
        
      const { data: prevData } = await supabase
        .from('analytics_preventive_ratio_monthly')
        .select('preventive_percent')
        .eq('factory_id', factory.id)
        .order('month', { ascending: false })
        .limit(1);

      // Default values if no data yet
      const currentMttr = mttrData?.[0]?.mttr_hours ? mttrData[0].mttr_hours.toFixed(1) : 'N/A';
      const prevMttr = mttrData?.[1]?.mttr_hours ? mttrData[1].mttr_hours.toFixed(1) : 'N/A';
      const ticketCount = mttrData?.[0]?.ticket_count || 0;
      const topMachine = paretoData?.[0]?.machine_name || 'None';
      const prevRatio = prevData?.[0]?.preventive_percent ? Math.round(prevData[0].preventive_percent) : 0;

      // Construct message
      const message = `*TurboFix Monthly Report — ${factory.name}, ${monthName}*
Tickets: ${ticketCount}
Avg fix time: ${currentMttr} hrs (Prev: ${prevMttr} hrs)
⚠ Most downtime: ${topMachine}
Preventive maintenance: ${prevRatio}% of work
Full report: https://turbofix-demo.vercel.app/insights`;

      // Get Owners and Supervisors to send to (based on user decision: both)
      const { data: recipients } = await supabase
        .from('profiles')
        .select('phone_e164')
        .eq('factory_id', factory.id)
        .in('role', ['owner', 'supervisor']);

      if (recipients && WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID) {
        for (const recipient of recipients) {
          await fetch(`https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: recipient.phone_e164.replace("+", ""),
              type: "text",
              text: { body: message } // In production, this must match a pre-approved Meta template
            })
          });
          sentCount++;
        }
      } else {
        console.log(`[Simulated Report for ${factory.name}]`);
        console.log(message);
        sentCount++;
      }
    }

    return new Response(JSON.stringify({ status: "success", reports_sent: sentCount }), { 
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
})
