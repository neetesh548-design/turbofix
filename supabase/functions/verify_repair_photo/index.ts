import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
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
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'You are an industrial auditor. Does this image clearly show a broken mechanical part next to a newly replaced part? Respond strictly in JSON: {"is_valid": true/false, "reason": "brief explanation"}' },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        max_tokens: 300
      })
    });

    const aiData = await aiResponse.json();
    const aiText = aiData.choices?.[0]?.message?.content || "{}";
    
    let isVerified = 'rejected';
    try {
      const parsed = JSON.parse(aiText);
      if (parsed.is_valid) isVerified = 'verified';
    } catch (e) {
      console.error("AI parse failed");
    }

    // Update ticket status
    await supabase
      .from('tickets')
      .update({ ai_verification_status: isVerified })
      .eq('id', ticket_id);

    return new Response(JSON.stringify({ status: "success", verification: isVerified }), { 
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
})
