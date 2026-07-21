import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireServiceRole } from '../_shared/security.ts'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  const authError = requireServiceRole(req);
  if (authError) return authError;
  try {
    const body = await req.json();
    const { record } = body; // This is a webhook payload from Supabase Storage or Database

    if (!record || !record.proof_image_url) {
      return new Response("Missing proof_image_url", { status: 400 });
    }

    const ticket_id = record.id;
    const imageUrl = record.proof_image_url;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Call OpenAI Vision API
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'You are an industrial auditor. Look at this image of a replaced part. Does it clearly show a broken mechanical part next to a newly replaced part? Also, extract any part number or barcode if visible. Respond strictly in JSON: {"is_valid": true/false, "reason": "brief explanation", "part_number_extracted": "extracted string or null"}' },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        max_tokens: 300,
        response_format: { type: "json_object" }
      })
    });

    const aiData = await aiResponse.json();
    const aiText = aiData.choices?.[0]?.message?.content || "{}";
    
    let isVerified = 'rejected';
    let partNumber = null;
    let deductionApplied = false;

    try {
      const parsed = JSON.parse(aiText);
      if (parsed.is_valid) isVerified = 'verified';
      if (parsed.part_number_extracted) partNumber = parsed.part_number_extracted;
    } catch {
      console.error("AI parse failed");
    }

    // Auto-deduct inventory if a part number was found
    if (partNumber) {
      const { data: part } = await supabase
        .from('inventory')
        .select('id, cost')
        .eq('part_number', partNumber)
        .single();
      
      if (part) {
        // Stage the deduction (e.g. create a work_order_part entry)
        const { error: insertError } = await supabase
          .from('work_order_parts')
          .insert({
            ticket_id: ticket_id,
            machine_id: record.machine_id,
            part_id: part.id,
            quantity: 1,
            unit_cost: part.cost || 0,
            total_cost: part.cost || 0
          });
        
        if (!insertError) {
          deductionApplied = true;
          // Decrement inventory quantity
          await supabase.rpc('decrement_inventory', { p_id: part.id, qty: 1 });
        }
      }
    }

    // Update ticket status
    await supabase
      .from('tickets')
      .update({ 
        ai_verification_status: isVerified,
        ai_summary: {
          ...record.ai_summary,
          extracted_part: partNumber,
          deduction_applied: deductionApplied
        }
      })
      .eq('id', ticket_id);

    return new Response(JSON.stringify({ status: "success", verification: isVerified }), { 
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
})
