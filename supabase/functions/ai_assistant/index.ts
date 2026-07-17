import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      }
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const authHeader = req.headers.get('Authorization') ?? '';

    // Initialize client with user authorization
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    const { selected, question, machines, tickets, events } = await req.json();

    // Call Gemini API
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI Assistant is not configured. Please contact the administrator.' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    let contextPrompt = `You are TurboFix AI, an expert industrial maintenance assistant.
`;
    if (selected === 'all') {
      contextPrompt += `The plant currently has ${machines?.length || 0} machines.
Here is the list of machines:
${machines?.map((m: any) => `- ${m.machine_name} (ID: ${m.machine_id}) at ${m.location}`).join('\n') || 'None'}

Active open maintenance tickets in the plant:
${tickets?.filter((t: any) => String(t.status || 'Open').toLowerCase() === 'open').map((t: any) => `- Ticket ${t.id || 'N/A'} on Machine ${t.machine_id}: ${t.issue_text} (Urgency: ${t.urgency || 'medium'})`).join('\n') || 'None'}

Recent events/logs:
${events?.slice(0, 10).map((e: any) => `- Machine ${e.machine_id}: ${e.event_type} - ${e.notes || ''}`).join('\n') || 'None'}
`;
    } else {
      const mach = machines?.find((m: any) => m.machine_id === selected);
      contextPrompt += `You are answering questions specifically for the machine: ${mach?.machine_name || selected} (ID: ${selected}).
Location: ${mach?.location || 'Unknown'}

Open tickets for this machine:
${tickets?.filter((t: any) => t.machine_id === selected && String(t.status || 'Open').toLowerCase() === 'open').map((t: any) => `- Ticket ${t.id || 'N/A'}: ${t.issue_text} (Urgency: ${t.urgency || 'medium'})`).join('\n') || 'None'}

Recent events/logs:
${events?.filter((e: any) => e.machine_id === selected).slice(0, 10).map((e: any) => `- ${e.event_type} - ${e.notes || ''}`).join('\n') || 'None'}
`;
    }

    contextPrompt += `
User Question: "${question}"

Provide a highly specific, professional, and actionable maintenance recommendation. Keep it concise (2-4 sentences max) and easy to read.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: contextPrompt }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const resData = await response.json();
    const aiText = resData.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

    return new Response(JSON.stringify({ recommendation: aiText }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
})
