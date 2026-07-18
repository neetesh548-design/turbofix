import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const reply = (body: Record<string, unknown>, status = 200) => new Response(
  JSON.stringify(body),
  { status, headers: { ...cors, 'Content-Type': 'application/json' } },
)

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const authorization = req.headers.get('Authorization') ?? ''
  if (!authorization) return reply({ error: 'Please sign in again.' }, 401)

  const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } })
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: { user }, error: userError } = await callerClient.auth.getUser()
  if (userError || !user) return reply({ error: 'Your session has expired. Please sign in again.' }, 401)

  const ownerFields = 'id,company_id,role,name,email'
  const protectedOwnerId = String(user.app_metadata?.directory_user_id ?? '')
  let owner = null
  if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(protectedOwnerId)) {
    const linked = await admin.from('users').select(ownerFields).eq('id', protectedOwnerId).maybeSingle()
    owner = linked.data
  }
  if (!owner) {
    const direct = await admin.from('users').select(ownerFields).eq('id', user.id).maybeSingle()
    owner = direct.data
  }

  // Some early TurboFix accounts were migrated into Supabase Auth after their
  // directory profile was created, so their auth UUID can differ from users.id.
  // Resolve those owners by the verified Auth email instead of blocking them.
  if (!owner && user.email) {
    const result = await admin
      .from('users').select(ownerFields).ilike('email', user.email).maybeSingle()
    owner = result.data
  }
  if (!owner) {
    const legacyUserId = String(user.user_metadata?.user_id ?? '')
    if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(legacyUserId)) {
      const result = await admin.from('users').select(ownerFields).eq('id', legacyUserId).maybeSingle()
      owner = result.data
    }
  }
  if (!owner) {
    const legacyCompanyId = String(user.user_metadata?.company_id ?? '')
    const legacyRole = String(user.user_metadata?.role ?? '')
    const loginName = String(user.user_metadata?.name ?? user.user_metadata?.full_name ?? '').trim().toLowerCase()
    if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(legacyCompanyId) && legacyRole === 'owner' && loginName) {
      const result = await admin.from('users').select(ownerFields)
        .eq('company_id', legacyCompanyId).eq('role', 'owner').limit(2)
      const candidates = result.data ?? []
      owner = candidates.length === 1 && String(candidates[0].name ?? '').trim().toLowerCase() === loginName
        ? candidates[0]
        : null
    }
  }
  if (!owner) return reply({ error: 'Your owner profile is not linked to this login. Please contact TurboFix support.' }, 403)
  if (owner.role !== 'owner') return reply({ error: 'Only the company owner can onboard team members.' }, 403)

  if (user.app_metadata?.directory_user_id !== owner.id) {
    await admin.auth.admin.updateUserById(user.id, {
      app_metadata: { ...user.app_metadata, directory_user_id: owner.id },
    })
  }

  const body = await req.json()
  const name = String(body.name ?? '').trim()
  const phone = String(body.phone ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  const role = String(body.role ?? 'maintenance_technician')
  const portalAccess = body.portal_access !== false
  if (!name) return reply({ error: 'Full name is required.' }, 400)
  if (role === 'owner') return reply({ error: 'Another owner cannot be created here.' }, 400)
  if (portalAccess && !email && !phone) return reply({ error: 'Email or mobile number is required for portal access.' }, 400)
  if (portalAccess && password.length < 8) return reply({ error: 'Password must be at least 8 characters.' }, 400)

  let memberId = crypto.randomUUID()
  let authCreated = false
  if (portalAccess) {
    const loginEmail = email || `${phone.replace(/\D/g, '')}@phone.turbofix.co.in`
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: loginEmail, password, email_confirm: true,
      user_metadata: { name, role, company_id: owner.company_id },
    })
    if (createError || !created.user) return reply({ error: createError?.message || 'Portal account could not be created.' }, 400)
    memberId = created.user.id
    authCreated = true
  }

  const { error: insertError } = await admin.from('users').insert({
    id: memberId, company_id: owner.company_id, name, phone, email, role,
  })
  if (insertError) {
    if (authCreated) await admin.auth.admin.deleteUser(memberId)
    return reply({ error: insertError.message }, 400)
  }

  return reply({ status: 'created', user_id: memberId, name, role }, 201)
})
