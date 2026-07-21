import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing environment variables.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const payload = await req.json();

    // Check if this is a ticket creation event
    if (payload.type === 'INSERT' && payload.table === 'tickets') {
      const ticket = payload.record;
      
      // Get the machine details to find who to notify
      if (ticket.machine_id) {
        const { data: machine, error } = await supabase
          .from('machines')
          .select('name, technician_user_id, supervisor_id, engineer_user_id, maintenance_head_user_id')
          .eq('id', ticket.machine_id)
          .single();
          
        if (machine) {
          const notifications = [];
          const usersToNotify = new Set([
            machine.technician_user_id,
            machine.supervisor_id,
          ].filter(Boolean));

          for (const userId of usersToNotify) {
            notifications.push({
              user_id: userId,
              title: `New Ticket: ${machine.name || 'Machine'}`,
              message: ticket.issue_text || ticket.description || 'New breakdown reported.',
              type: ticket.urgency === 'High' ? 'error' : 'warning',
              link: `/tickets.html?ticket=${ticket.id}`
            });
          }

          if (notifications.length > 0) {
            const { error: insertError } = await supabase
              .from('notifications')
              .insert(notifications);
              
            if (insertError) {
              console.error('Error inserting notifications:', insertError);
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error in notification-service:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
