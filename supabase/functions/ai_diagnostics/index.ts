import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireServiceRole } from '../_shared/security.ts'

// You would store your OpenAI API key in Supabase Secrets
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  const authError = requireServiceRole(req);
  if (authError) return authError;
  try {
    const { ticket_id } = await req.json();
    if (!ticket_id) throw new Error("Missing ticket_id");

    // Initialize Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch the ticket and machine details
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*, machines(name, location)')
      .eq('id', ticket_id)
      .single();
      
    if (ticketError || !ticket) throw new Error("Ticket not found");

    // 2. Fetch the inventory (parts) specific to this machine
    const { data: parts } = await supabase
      .from('parts')
      .select('part_name, part_number, qty_on_hand')
      .eq('machine_id', ticket.machine_id);

    const partsList = parts?.map(p => `- ${p.part_name} (PN: ${p.part_number}) - In Stock: ${p.qty_on_hand}`).join('\n') || "No parts mapped.";

    // 3. Construct the Predictive AI Prompt
    const prompt = `
      You are an expert industrial maintenance AI.
      A breakdown has been reported for a machine: ${ticket.machines.name}.
      
      The operator reported this issue: "${ticket.issue_text}"
      
      Based on this description, predict the most likely mechanical or electrical failure. 
      Then, cross-reference your prediction with the following list of available spare parts in our inventory for this exact machine:
      ${partsList}
      
      Respond in pure JSON format:
      {
        "predicted_issue": "Short description of the failure",
        "recommended_action": "What the technician should do",
        "suggested_parts": ["part_number_1", "part_number_2"],
        "parts_in_stock": true/false
      }
    `;

    // 4. Call OpenAI API (or Gemini)
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'system', content: prompt }],
        temperature: 0.2
      })
    });

    const aiData = await aiResponse.json();
    const aiSummaryText = aiData.choices?.[0]?.message?.content || "{}";
    
    // Parse the JSON out of the AI response
    let aiSummary = {};
    try {
      aiSummary = JSON.parse(aiSummaryText);
    } catch {
      aiSummary = { raw: aiSummaryText };
    }

    // 5. Update the Ticket with the Predictive AI Summary
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ ai_summary: aiSummary })
      .eq('id', ticket_id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ 
      status: "success", 
      message: "Predictive AI Diagnostics Complete",
      diagnostics: aiSummary
    }), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
})
