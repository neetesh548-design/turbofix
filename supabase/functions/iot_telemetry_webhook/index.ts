import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Edge function to ingest IoT telemetry data and generate Preventive tickets based on power signatures.
// Poka-Yoke Overlay: If amperage exceeds normal bounds, alert the primary technician.

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const payload = await req.json();
    const { machine_id, amperage, timestamp, threshold } = payload;

    if (!machine_id || amperage === undefined) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const checkThreshold = threshold || 25.0; // Default 25 Amps

    if (amperage > checkThreshold) {
      // Fetch machine details to get primary technician and location
      const { data: machine } = await supabase
        .from('machines')
        .select('name, location, factory_id')
        .eq('id', machine_id)
        .single();
      
      // Check if there is already an open preventive ticket for this machine today to avoid spam
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const { data: existingTicket } = await supabase
        .from('tickets')
        .select('id')
        .eq('machine_id', machine_id)
        .eq('type', 'preventive')
        .eq('status', 'open')
        .gte('created_at', today.toISOString())
        .limit(1);

      if (!existingTicket || existingTicket.length === 0) {
        // Create a Preventive ticket
        await supabase
          .from('tickets')
          .insert({
            machine_id,
            factory_id: machine?.factory_id,
            type: 'preventive',
            issue_text: `IoT Alert: Abnormal power signature detected. Amperage spike to ${amperage}A (Threshold: ${checkThreshold}A).`,
            status: 'open',
            urgency: 'high',
            reported_by: 'IoT Sensor Gateway',
            source: 'telemetry_webhook',
            ai_summary: {
              summary: 'Abnormal power signature (amperage spike) detected by IoT sensor.',
              urgency: 'high',
              tags: ['IoT', 'Power Spike', 'Preventive']
            }
          });
      }
    }

    return new Response(JSON.stringify({ status: "success", received: true }), { 
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
})
