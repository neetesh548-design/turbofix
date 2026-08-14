import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, PATCH, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// PATCH previously applied the raw request body to .update() with no field
// allow-list — any caller who could touch a ticket at all (RLS-permitted)
// could set any column on it, including identity/structural fields like
// machine_id/factory_id that should never change via a status-update API.
const PATCHABLE_TICKET_FIELDS = new Set([
  "status", "urgency", "issue_text", "root_cause", "repair_action", "ai_summary",
]);

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req, ctx) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    try {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");

      if (ctx.authMode === "secret") {
        // Internal privileged calls if needed
      }

      // We use the authenticated supabase client for user-level actions (RLS applies)
      const supabase = ctx.supabase; 

      if (req.method === "POST") {
        // Ticket Creation logic
        const body = await req.json();
        
        // 1. Basic validation
        if (!body.machine_id || !body.issue_text) {
          return Response.json({ error: "machine_id and issue_text are required" }, { status: 400, headers: corsHeaders });
        }

        // 2. Create the ticket
        const { data, error } = await supabase
          .from("tickets")
          .insert({
            machine_id: body.machine_id,
            issue_text: body.issue_text,
            urgency: body.urgency || "medium",
            type: body.type || "corrective",
            reporter_phone: body.reporter_phone || null
          })
          .select()
          .single();

        if (error) throw error;

        // 3. Log event
        await ctx.supabaseAdmin
          .from("events")
          .insert({
            ticket_id: data.id,
            event_type: "ticket_created",
            message: "Ticket created via API."
          });

        return Response.json({ data }, { status: 201, headers: corsHeaders });

      } else if (req.method === "PATCH") {
        // Ticket Update / State Machine logic
        if (!id) {
          return Response.json({ error: "Missing ticket id" }, { status: 400, headers: corsHeaders });
        }

        const body = await req.json();
        
        // Ensure state transitions are tracked
        if (body.status) {
          // Fetch old status
          const { data: oldTicket, error: fetchError } = await supabase
            .from("tickets")
            .select("status")
            .eq("id", id)
            .single();

          if (fetchError) throw fetchError;

          if (oldTicket.status !== body.status) {
            // Get user_id for audit logs
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
               await ctx.supabaseAdmin.from("status_history").insert({
                 ticket_id: id,
                 changed_by: user.id,
                 old_status: oldTicket.status,
                 new_status: body.status
               });
            }
          }
        }

        const safeUpdate: Record<string, unknown> = {};
        for (const key of Object.keys(body)) {
          if (PATCHABLE_TICKET_FIELDS.has(key)) safeUpdate[key] = body[key];
        }

        const { data, error } = await supabase
          .from("tickets")
          .update(safeUpdate)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;

        return Response.json({ data }, { headers: corsHeaders });

      } else if (req.method === "GET") {
        let query = supabase.from("tickets").select("*");
        if (id) {
          query = query.eq("id", id).single();
        }
        
        const { data, error } = await query;
        if (error) throw error;

        return Response.json({ data }, { headers: corsHeaders });
      }

      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    } catch (err: any) {
      console.error("Ticket Service Error:", err);
      return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
    }
  }),
};
