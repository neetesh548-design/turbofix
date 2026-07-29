import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendTextMessage, isConfigured as whatsappConfigured } from '../_shared/whatsapp.ts'

const allowedOrigins = new Set([
  'https://turbofix.co.in',
  'https://www.turbofix.co.in',
  'https://neetesh548-design.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])

const cors = (req: Request) => ({
  'Access-Control-Allow-Origin': allowedOrigins.has(req.headers.get('Origin') || '')
    ? req.headers.get('Origin') || 'https://turbofix.co.in'
    : 'https://turbofix.co.in',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
})

const reply = (req: Request, body: Record<string, unknown>, status = 200) => new Response(
  JSON.stringify(body),
  { status, headers: { ...cors(req), 'Content-Type': 'application/json' } },
)

const normalizePhone = (value: unknown) => String(value ?? '').replace(/\D/g, '')
const hashOtp = async (phone: string, otp: string) => {
  const bytes = new TextEncoder().encode(`${phone}:${otp}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

const generateOtp = () => {
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  return String(100000 + (bytes[0] % 900000))
}

const getAdmin = () => createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  { auth: { persistSession: false, autoRefreshToken: false } },
)

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })
  if (req.method !== 'POST') return reply(req, { detail: 'Method not allowed.' }, 405)

  let body: any
  try {
    body = await req.json()
  } catch {
    return reply(req, { detail: 'Invalid JSON request body.' }, 400)
  }

  const phone = normalizePhone(body.phone)
  if (phone.length !== 10) {
    return reply(req, { detail: 'Please enter a valid 10-digit mobile number.' }, 400)
  }

  const admin = getAdmin()
  const now = Date.now()

  if (body.action === 'send') {
    const { data: existing } = await admin.from('otp_challenges').select('resend_at').eq('phone', phone).maybeSingle()
    if (existing && new Date(existing.resend_at).getTime() > now) {
      const retryAfter = Math.max(1, Math.ceil((new Date(existing.resend_at).getTime() - now) / 1000))
      return reply(req, { detail: `Please wait ${retryAfter} seconds before requesting another OTP.` }, 429)
    }
    if (!whatsappConfigured()) {
      return reply(req, { detail: 'WhatsApp delivery is not configured.' }, 503)
    }

    const otp = generateOtp()
    const expiresAt = new Date(now + 5 * 60 * 1000).toISOString()
    const resendAt = new Date(now + 30 * 1000).toISOString()
    const { error: upsertError } = await admin.from('otp_challenges').upsert({
      phone,
      otp_hash: await hashOtp(phone, otp),
      expires_at: expiresAt,
      resend_at: resendAt,
      attempts: 0,
    })
    if (upsertError) return reply(req, { detail: 'Could not create OTP challenge.' }, 500)

    try {
      await sendTextMessage(`91${phone}`, `🔐 TURBOFIX VERIFICATION CODE\n\nYour 6-digit OTP to log your breakdown report is: ${otp}\n\nValid for 5 minutes. Do not share this code with anyone.`)
    } catch (error) {
      await admin.from('otp_challenges').delete().eq('phone', phone)
      console.error('otp.send_failed', error)
      return reply(req, { detail: 'Could not send OTP via WhatsApp.' }, 502)
    }

    return reply(req, { status: 'sent', message: 'OTP sent to your WhatsApp number.' })
  }

  if (body.action === 'verify') {
    const otp = String(body.otp ?? '').trim()
    if (!/^\d{6}$/.test(otp)) return reply(req, { detail: 'Enter the 6-digit OTP code.' }, 400)
    const { data: challenge } = await admin.from('otp_challenges').select('*').eq('phone', phone).maybeSingle()
    if (!challenge) return reply(req, { detail: 'No active OTP found. Please request a new OTP code.' }, 400)
    if (new Date(challenge.expires_at).getTime() <= now) {
      await admin.from('otp_challenges').delete().eq('phone', phone)
      return reply(req, { detail: 'OTP code has expired. Please request a new code.' }, 400)
    }
    if (challenge.attempts >= 5) {
      await admin.from('otp_challenges').delete().eq('phone', phone)
      return reply(req, { detail: 'Too many incorrect OTP attempts. Please request a new code.' }, 400)
    }
    if (await hashOtp(phone, otp) !== challenge.otp_hash) {
      const attempts = challenge.attempts + 1
      if (attempts >= 5) await admin.from('otp_challenges').delete().eq('phone', phone)
      else await admin.from('otp_challenges').update({ attempts }).eq('phone', phone)
      return reply(req, { detail: attempts >= 5 ? 'Too many incorrect OTP attempts. Please request a new code.' : 'Incorrect OTP code. Please check your WhatsApp and try again.' }, 400)
    }
    await admin.from('otp_challenges').delete().eq('phone', phone)
    return reply(req, { verified: true, phone })
  }

  return reply(req, { detail: 'Unsupported OTP action.' }, 400)
})
