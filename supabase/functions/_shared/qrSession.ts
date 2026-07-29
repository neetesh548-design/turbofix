const SESSION_DAYS = 30
const IDLE_DAYS = 7

export const normalizePhone = (value: unknown) => String(value ?? '').replace(/\D/g, '').slice(-10)

export const hashToken = async (token: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export const newSessionToken = () => {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export const createQrSession = async (admin: any, phone: string, reporterName = '') => {
  const token = newSessionToken()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 86400000).toISOString()
  const idleExpiresAt = new Date(now.getTime() + IDLE_DAYS * 86400000).toISOString()
  const phoneVariants = [phone, `+91${phone}`, `91${phone}`]
  const { data: user } = await admin
    .from('users')
    .select('id, name, company_id')
    .in('phone', phoneVariants)
    .limit(1)
    .maybeSingle()

  const { data: session, error } = await admin.from('qr_gateway_sessions').insert({
    token_hash: await hashToken(token),
    phone,
    user_id: user?.id || null,
    company_id: user?.company_id || null,
    reporter_name: user?.name || String(reporterName || '').trim() || null,
    expires_at: expiresAt,
    idle_expires_at: idleExpiresAt,
  }).select('id, phone, user_id, reporter_name, expires_at, idle_expires_at').single()
  if (error) throw error
  return { token, session }
}

export const validateQrSession = async (admin: any, tokenValue: unknown, touch = true) => {
  const token = String(tokenValue ?? '').trim()
  if (!/^[a-f0-9]{64}$/.test(token)) return null

  const { data: session } = await admin
    .from('qr_gateway_sessions')
    .select('id, phone, user_id, company_id, reporter_name, expires_at, idle_expires_at, revoked_at')
    .eq('token_hash', await hashToken(token))
    .maybeSingle()
  if (!session || session.revoked_at) return null

  const now = Date.now()
  if (new Date(session.expires_at).getTime() <= now || new Date(session.idle_expires_at).getTime() <= now) {
    await admin.from('qr_gateway_sessions').delete().eq('id', session.id)
    return null
  }

  if (touch) {
    await admin.from('qr_gateway_sessions').update({
      last_seen_at: new Date(now).toISOString(),
      idle_expires_at: new Date(now + IDLE_DAYS * 86400000).toISOString(),
    }).eq('id', session.id)
  }
  return session
}
