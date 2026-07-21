import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { transcribeAudio as geminiTranscribe, isEnabled as isGeminiEnabled } from '../_shared/gemini.ts'

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
    if (!isGeminiEnabled()) {
      await logUsage(admin, {
        userId: 'anonymous', companyId: 'anonymous',
        action: 'transcribe', status: 'error',
        errorMsg: 'GEMINI_API_KEY is missing',
        latencyMs: Date.now() - startTime, ipAddress: clientIp,
      })
      return reply(req, { error: 'Voice transcription is not configured.' }, 503)
    }

    const audioBytes = Uint8Array.from(atob(audioBase64), (char) => char.charCodeAt(0))
    let transcript = ''
    try {
      transcript = String(await geminiTranscribe(audioBytes, audioMime)).trim()
    } catch (err: any) {
      await logUsage(admin, {
        userId: 'anonymous', companyId: 'anonymous',
        action: 'transcribe', status: 'error',
        errorMsg: String(err?.message || err || 'Gemini transcription failed'),
        latencyMs: Date.now() - startTime, ipAddress: clientIp,
      })
      return reply(req, { error: 'Voice transcription is temporarily unavailable.' }, 502)
    }
    if (!transcript) {
      await logUsage(admin, {
        userId: 'anonymous', companyId: 'anonymous',
        action: 'transcribe', status: 'error',
        errorMsg: 'Gemini returned an empty transcript',
        latencyMs: Date.now() - startTime, ipAddress: clientIp,
      })
      return reply(req, { error: 'Voice transcription did not return any text.' }, 502)
    }
    
    await logUsage(admin, {
      userId: 'anonymous', companyId: 'anonymous',
      action: 'transcribe', status: 'ok',
      latencyMs: Date.now() - startTime, ipAddress: clientIp,
    })
    
    return reply(req, { transcript, language_code: null, provider: 'gemini' })

  } catch (err: any) {
    console.error('AI Translation Edge Function error:', err)
    return reply(req, { error: 'An unexpected error occurred during transcription.' }, 500)
  }
})
