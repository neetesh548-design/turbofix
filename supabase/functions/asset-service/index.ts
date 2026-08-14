import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, PATCH, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req, ctx) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    try {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");
      const supabase = ctx.supabase;

      if (req.method === "GET") {
        if (!id) {
          // List all machines user has access to
          const { data, error } = await supabase.from("machines").select("*");
          if (error) throw error;
          return Response.json({ data }, { headers: corsHeaders });
        }

        // Get detailed asset profile
        const { data: machine, error: machineErr } = await supabase
          .from("machines")
          .select("*, organizations(name, domain), tickets(*)")
          .eq("id", id)
          .single();

        if (machineErr) throw machineErr;

        return Response.json({ data: machine }, { headers: corsHeaders });
      } else if (req.method === "POST") {
        // Asset creation
        const body = await req.json();

        if (!body.name) {
           return Response.json({ error: "name is required" }, { status: 400, headers: corsHeaders });
        }

        // Previously inserted a client-supplied `organization_id` directly —
        // besides trusting a value the caller could set to any company
        // (RLS's WITH CHECK would reject a mismatch, but the app layer
        // shouldn't ask for it at all), `machines` doesn't even have an
        // organization_id column (it's company_id — see
        // supabase/migrations/20260711131850_init_schema.sql), so every call
        // to this endpoint failed outright before this fix. Resolved from
        // the caller's own session instead of trusted client input.
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const { data: callerRow, error: callerErr } = await supabase
          .from("users")
          .select("company_id")
          .eq("id", authUser?.id)
          .maybeSingle();
        if (callerErr || !callerRow?.company_id) {
          return Response.json({ error: "Could not resolve your company from this session." }, { status: 403, headers: corsHeaders });
        }

        const { data, error } = await supabase
          .from("machines")
          .insert({
            name: body.name,
            company_id: callerRow.company_id,
            location: body.location,
            status: body.status || "healthy"
          })
          .select()
          .single();

        if (error) throw error;

        return Response.json({ data }, { status: 201, headers: corsHeaders });
      }

      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    } catch (err: any) {
      console.error("Asset Service Error:", err);
      return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
    }
  }),
};
