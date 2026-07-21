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
        
        if (!body.name || !body.organization_id) {
           return Response.json({ error: "name and organization_id are required" }, { status: 400, headers: corsHeaders });
        }

        const { data, error } = await supabase
          .from("machines")
          .insert({
            name: body.name,
            organization_id: body.organization_id,
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
