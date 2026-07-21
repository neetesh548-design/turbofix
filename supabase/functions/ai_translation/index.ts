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

const mimeToExtension = (mimeType: string) => {
  if (mimeType.includes('webm')) return 'webm'
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a'
  if (mimeType.includes('wav')) return 'wav'
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3'
  if (mimeType.includes('aac')) return 'aac'
  if (mimeType.includes('flac')) return 'flac'
  return 'audio'
}

async function transcribeWithSarvam(audioBase64: string, audioMime: string) {
  const sarvamKey = Deno.env.get('SARVAM_API_KEY')
  if (!sarvamKey) return { error: 'Voice input is not configured.' as const }

  const audioBytes = Uint8Array.from(atob(audioBase64), (char) => char.charCodeAt(0))
  const form = new FormData()
  form.append(
    'file',
    new Blob([audioBytes], { type: audioMime }),
    `voice.${mimeToExtension(audioMime)}`
  )

  const response = await fetch('https://api.sarvam.ai/speech-to-text', {
    method: 'POST',
    headers: {
      'api-subscription-key': sarvamKey,
    },
    body: form,
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    return { error: `Sarvam returned ${response.status}${detail ? `: ${detail}` : ''}` }
  }

  const data = await response.json().catch(() => ({}))
  return {
    transcript: String(data?.transcript || '').trim(),
    languageCode: String(data?.language_code || '').trim() || null,
  }
}

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
    const sarvam = await transcribeWithSarvam(audioBase64, audioMime)
    if ('error' in sarvam && sarvam.error) {
      await logUsage(admin, {
        userId: 'anonymous', companyId: 'anonymous',
        action: 'transcribe', status: 'error',
        errorMsg: sarvam.error,
        latencyMs: Date.now() - startTime, ipAddress: clientIp,
      })
      return reply(req, { error: 'Voice transcription is temporarily unavailable.' }, 502)
    }

    const transcript = sarvam.transcript
    if (!transcript) {
      await logUsage(admin, {
        userId: 'anonymous', companyId: 'anonymous',
        action: 'transcribe', status: 'error',
        errorMsg: 'Sarvam returned an empty transcript',
        latencyMs: Date.now() - startTime, ipAddress: clientIp,
      })
      return reply(req, { error: 'Voice transcription did not return any text.' }, 502)
    }
    
    await logUsage(admin, {
      userId: 'anonymous', companyId: 'anonymous',
      action: 'transcribe', status: 'ok',
      latencyMs: Date.now() - startTime, ipAddress: clientIp,
    })
    
    return reply(req, { transcript, language_code: sarvam.languageCode })

  } catch (err: any) {
    console.error('AI Translation Edge Function error:', err)
    return reply(req, { error: 'An unexpected error occurred during transcription.' }, 500)
  }
})
