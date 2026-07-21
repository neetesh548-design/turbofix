import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const allowedOrigins = new Set([
  'https://turbofix.co.in', 'https://www.turbofix.co.in',
  'https://neetesh548-design.github.io', 'http://127.0.0.1:5173', 'http://localhost:5173',
])
const cors = (req: Request) => {
  const origin = req.headers.get('Origin') || ''
  return {
    'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : 'https://turbofix.co.in',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}
const reply = (req: Request, body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors(req), 'Content-Type': 'application/json' },
})
const text = (value: unknown) => String(value ?? '').replace(/[\r\n]+/g, ' ').trim()

async function logUsage(
  admin: any,
  opts: {
    userId: string; companyId: string; action: string;
    question?: string; tokensEst?: number; latencyMs?: number;
    status: string; errorMsg?: string; ipAddress?: string;
  }
) {
  try {
    await admin.from('ai_usage_log').insert({
      user_id: opts.userId,
      company_id: opts.companyId,
      action: opts.action,
      question: (opts.question || '').slice(0, 200),
      tokens_est: opts.tokensEst || 0,
      latency_ms: opts.latencyMs || 0,
      status: opts.status,
      error_msg: (opts.errorMsg || '').slice(0, 500),
      ip_address: opts.ipAddress || null,
    })
  } catch {
    // Logging must never block the response
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })
  if (req.method !== 'POST') return reply(req, { error: 'Method not allowed.' }, 405)

  const startTime = Date.now()
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip') || ''

  try {
    const url = Deno.env.get('SUPABASE_URL') || ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

    let body: any = {}
    try {
      body = await req.json()
    } catch {
      return reply(req, { error: 'Invalid JSON request body.' }, 400)
    }

    const audio = text(body.audio)
    const parts = audio.split(';base64,')
    if (parts.length !== 2 || !parts[0].startsWith('data:audio/')) return reply(req, { error: 'The recording could not be read.' }, 400)
    const audioMime = parts[0].replace(/^data:/, '').split(';')[0]
    const audioBase64 = parts[1]
    
    if (audioBase64.length > 14_000_000) return reply(req, { error: 'Recording is too long. Keep it under a minute.' }, 413)
    const transcribeKey = Deno.env.get('GEMINI_API_KEY')
    if (!transcribeKey) return reply(req, { error: 'Voice input is not configured.' }, 503)
    
    const transcribeResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${transcribeKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [
        { text: 'Transcribe this maintenance question verbatim. The speaker may use English, Hindi, or Marathi (or a mix). Return only the transcribed text in its spoken language — no translation, quotes, or commentary.' },
        { inline_data: { mime_type: audioMime, data: audioBase64 } },
      ] }] }),
    })
    
    if (!transcribeResp.ok) {
      await logUsage(admin, {
        userId: 'anonymous', companyId: 'anonymous',
        action: 'transcribe', status: 'error',
        errorMsg: `Gemini returned ${transcribeResp.status}`,
        latencyMs: Date.now() - startTime, ipAddress: clientIp,
      })
      return reply(req, { error: 'Voice transcription is temporarily unavailable.' }, 502)
    }
    
    const transcribeData = await transcribeResp.json()
    const transcript = String(transcribeData.candidates?.[0]?.content?.parts?.[0]?.text || '').trim()
    
    await logUsage(admin, {
      userId: 'anonymous', companyId: 'anonymous',
      action: 'transcribe', status: 'ok',
      latencyMs: Date.now() - startTime, ipAddress: clientIp,
    })
    
    return reply(req, { transcript })

  } catch (err: any) {
    console.error('AI Translation Edge Function error:', err)
    return reply(req, { error: 'An unexpected error occurred during transcription.' }, 500)
  }
})
