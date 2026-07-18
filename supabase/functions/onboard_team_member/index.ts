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

const maskPhone = (value: string) => value ? `${'*'.repeat(Math.max(0, value.length - 4))}${value.slice(-4)}` : ''
const maskEmail = (value: string) => {
  if (!value || !value.includes('@')) return ''
  const [local, domain] = value.split('@')
  return `${local.slice(0, 1)}***@${domain}`
}

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
  if (!owner) return reply({ error: 'Your team profile is not linked to this login. Please contact TurboFix support.' }, 403)

  const body = await req.json()
  const readOnlyActions = ['list', 'reveal_contact']
  if (owner.role !== 'owner' && !readOnlyActions.includes(String(body.action ?? ''))) {
    return reply({ error: 'Only the company owner can manage team and machine assignments.' }, 403)
  }

  if (user.app_metadata?.directory_user_id !== owner.id) {
    await admin.auth.admin.updateUserById(user.id, {
      app_metadata: { ...user.app_metadata, directory_user_id: owner.id },
    })
  }

  if (body.action === 'update_machine') {
    const machineId = String(body.machine_id ?? '')
    const name = String(body.name ?? '').trim()
    const location = String(body.location ?? '').trim()
    const status = String(body.status ?? 'healthy').toLowerCase()
    if (!name) return reply({ error: 'Machine name is required.' }, 400)
    if (!['healthy', 'down', 'maintenance'].includes(status)) return reply({ error: 'Select a valid machine condition.' }, 400)
    const stakeholderFields = {
      technician_user_id: String(body.technician_user_id ?? '').trim() || null,
      supervisor_id: String(body.supervisor_id ?? '').trim() || null,
      engineer_user_id: String(body.engineer_user_id ?? '').trim() || null,
      maintenance_head_user_id: String(body.maintenance_head_user_id ?? '').trim() || null,
    }
    const stakeholderIds = [...new Set(Object.values(stakeholderFields).filter(Boolean))]
    if (stakeholderIds.length) {
      const { data: validStakeholders, error: stakeholderError } = await admin.from('users')
        .select('id,role').eq('company_id', owner.company_id).in('id', stakeholderIds)
      if (stakeholderError || (validStakeholders?.length ?? 0) !== stakeholderIds.length) {
        return reply({ error: 'One or more selected stakeholders are not part of your company.' }, 400)
      }
      const rolesById = Object.fromEntries((validStakeholders ?? []).map((member) => [member.id, member.role]))
      const allowedRoles: Record<string, string[]> = {
        technician_user_id: ['technician', 'maintenance_technician'],
        supervisor_id: ['supervisor'],
        engineer_user_id: ['maintenance_engineer'],
        maintenance_head_user_id: ['maintenance_head'],
      }
      for (const [field, stakeholderId] of Object.entries(stakeholderFields)) {
        if (stakeholderId && !allowedRoles[field].includes(rolesById[stakeholderId])) {
          return reply({ error: 'A selected stakeholder does not match the required responsibility.' }, 400)
        }
      }
    }
    const technician = stakeholderFields.technician_user_id
      ? await admin.from('users').select('phone').eq('id', stakeholderFields.technician_user_id).maybeSingle()
      : { data: null }
    const { data: updated, error: updateError } = await admin.from('machines').update({
      name,
      location,
      status,
      hourly_downtime_cost: Math.max(0, Number(body.hourly_downtime_cost) || 0),
      maintenance_interval_days: Math.max(1, Number(body.maintenance_interval_days) || 90),
      last_maintenance_date: body.last_maintenance_date || null,
      ...stakeholderFields,
      assigned_technician_phone: technician.data?.phone || '',
    }).eq('id', machineId).eq('company_id', owner.company_id).select('*').maybeSingle()
    if (updateError) return reply({ error: updateError.message }, 400)
    if (!updated) return reply({ error: 'Machine was not found in your company.' }, 404)
    return reply({ machine: updated })
  }

  if (body.action === 'update_team_member') {
    const targetId = String(body.user_id ?? '')
    const name = String(body.name ?? '').trim()
    const role = String(body.role ?? '')
    const email = String(body.email ?? '').trim().toLowerCase()
    const phone = String(body.phone ?? '').trim()
    const managerUserId = String(body.manager_user_id ?? '').trim() || null
    if (!name) return reply({ error: 'Team member name is required.' }, 400)
    const { data: target } = await admin.from('users').select('id,company_id,role').eq('id', targetId).eq('company_id', owner.company_id).maybeSingle()
    if (!target) return reply({ error: 'Team member was not found in your company.' }, 404)
    if (target.role === 'owner' && role !== 'owner') return reply({ error: 'The company owner role cannot be changed here.' }, 400)
    if (target.role !== 'owner' && role === 'owner') return reply({ error: 'Another owner cannot be created here.' }, 400)
    if (managerUserId) {
      const { data: manager } = await admin.from('users').select('id').eq('id', managerUserId).eq('company_id', owner.company_id).maybeSingle()
      if (!manager || manager.id === targetId) return reply({ error: 'Select a valid reporting manager.' }, 400)
    }
    const patch = {
      name, role, email, phone,
      manager_user_id: target.role === 'owner' ? null : managerUserId,
      department: String(body.department ?? '').trim(),
      plant_location: String(body.plant_location ?? '').trim(),
      shift: String(body.shift ?? '').trim(),
      portal_access: body.portal_access !== false,
    }
    const { error: updateError } = await admin.from('users').update(patch).eq('id', targetId)
    if (updateError) return reply({ error: updateError.message }, 400)
    if (targetId !== owner.id) {
      await admin.auth.admin.updateUserById(targetId, { user_metadata: { name, role } }).catch(() => {})
    }
    return reply({ status: 'updated' })
  }

  if (body.action === 'create_machine_photo_upload') {
    const machineId = String(body.machine_id ?? '')
    const extension = String(body.extension ?? 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg'
    const { data: machine } = await admin.from('machines').select('id,company_id')
      .eq('id', machineId).eq('company_id', owner.company_id).maybeSingle()
    if (!machine) return reply({ error: 'Machine was not found in your company.' }, 404)
    const path = `machine-photos/${owner.company_id}/${machineId}/${crypto.randomUUID()}.${extension}`
    const { data: signed, error: signedError } = await admin.storage.from('machine-documents').createSignedUploadUrl(path)
    if (signedError || !signed) return reply({ error: signedError?.message || 'Photo upload could not be prepared.' }, 400)
    return reply({ path, token: signed.token })
  }

  if (body.action === 'commit_machine_photo') {
    const machineId = String(body.machine_id ?? '')
    const path = String(body.path ?? '')
    const requiredPrefix = `machine-photos/${owner.company_id}/${machineId}/`
    if (!path.startsWith(requiredPrefix)) return reply({ error: 'Invalid machine photo path.' }, 400)
    const { data: machine } = await admin.from('machines').select('id').eq('id', machineId).eq('company_id', owner.company_id).maybeSingle()
    if (!machine) return reply({ error: 'Machine was not found in your company.' }, 404)
    const { data: publicData } = admin.storage.from('machine-documents').getPublicUrl(path)
    const { error: updateError } = await admin.from('machines').update({ image_url: publicData.publicUrl }).eq('id', machineId)
    if (updateError) return reply({ error: updateError.message }, 400)
    return reply({ image_url: publicData.publicUrl })
  }

  if (body.action === 'adopt_legacy_machine_photo') {
    const machineId = String(body.machine_id ?? '')
    const imageUrl = String(body.image_url ?? '')
    const publicPrefix = `${url}/storage/v1/object/public/machine-documents/machine-photos/`
    if (!imageUrl.startsWith(publicPrefix)) return reply({ error: 'Invalid legacy machine photo URL.' }, 400)
    const { data: machine } = await admin.from('machines').select('id').eq('id', machineId).eq('company_id', owner.company_id).maybeSingle()
    if (!machine) return reply({ error: 'Machine was not found in your company.' }, 404)
    const { error: updateError } = await admin.from('machines').update({ image_url: imageUrl }).eq('id', machineId)
    if (updateError) return reply({ error: updateError.message }, 400)
    return reply({ image_url: imageUrl })
  }

  if (body.action === 'reveal_contact') {
    const targetId = String(body.user_id ?? '')
    const { data: target, error: targetError } = await admin.from('users')
      .select('id,company_id,phone,email').eq('id', targetId).eq('company_id', owner.company_id).maybeSingle()
    if (targetError) return reply({ error: targetError.message }, 400)
    if (!target) return reply({ error: 'Team member was not found in your company.' }, 404)
    return reply({
      phone: target.phone || (target.id === owner.id ? user.phone || '' : ''),
      email: target.email || (target.id === owner.id ? user.email || '' : ''),
    })
  }

  if (body.action === 'list') {
    const { data: members, error: listError } = await admin.from('users')
      .select('id,name,role,email,phone,created_at,manager_user_id,department,plant_location,shift,portal_access')
      .eq('company_id', owner.company_id)
      .order('created_at', { ascending: true })
    if (listError) return reply({ error: listError.message }, 400)
    return reply({
      members: (members ?? []).map((member) => {
        const email = member.email || (member.id === owner.id ? user.email || '' : '')
        const phone = member.phone || (member.id === owner.id ? user.phone || '' : '')
        return ({
        user_id: member.id,
        name: member.name,
        role: member.role,
        manager_user_id: member.manager_user_id,
        department: member.department,
        plant_location: member.plant_location,
        shift: member.shift,
        email_masked: maskEmail(email),
        phone_masked: maskPhone(phone),
        has_email: Boolean(email),
        has_phone: Boolean(phone),
        has_contact: Boolean(email || phone),
        can_reveal_contact: true,
        portal_access: member.id === owner.id || member.portal_access !== false,
        can_receive_alerts: Boolean(phone),
      })}),
    })
  }

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
    manager_user_id: body.manager_user_id || null,
    department: String(body.department ?? '').trim(),
    plant_location: String(body.plant_location ?? '').trim(),
    shift: String(body.shift ?? '').trim(),
    portal_access: portalAccess,
  })
  if (insertError) {
    if (authCreated) await admin.auth.admin.deleteUser(memberId)
    return reply({ error: insertError.message }, 400)
  }

  return reply({ status: 'created', user_id: memberId, name, role }, 201)
})
