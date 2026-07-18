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
const bullets = (rows: any[], formatter: (row: any) => string) => rows.length ? rows.map((row) => `- ${formatter(row)}`).join('\n') : '- None recorded'
const normalizePhone = (value: unknown) => String(value || '').replace(/\D/g, '').slice(-10)

async function resolveDirectoryUser(admin: any, authUser: any) {
  const fields = 'id,company_id,role,name,email'
  const linkedId = String(authUser.app_metadata?.directory_user_id || authUser.user_metadata?.user_id || '')
  if (linkedId) {
    const linked = await admin.from('users').select(fields).eq('id', linkedId).maybeSingle()
    if (linked.data) return linked.data
  }
  const direct = await admin.from('users').select(fields).eq('id', authUser.id).maybeSingle()
  if (direct.data) return direct.data
  if (authUser.email) {
    const byEmail = await admin.from('users').select(fields).ilike('email', authUser.email).maybeSingle()
    if (byEmail.data) return byEmail.data
  }
  return null
}

async function buildMachineMarkdown(admin: any, companyId: string, machineId: string) {
  const { data: machine } = await admin.from('machines').select('*').eq('id', machineId).eq('company_id', companyId).maybeSingle()
  if (!machine) throw new Error('Machine was not found in your company.')

  const [tickets, documents, parts, consumables, members] = await Promise.all([
    admin.from('tickets').select('*').eq('machine_id', machineId).order('created_at', { ascending: false }).limit(100),
    admin.from('documents').select('*').eq('machine_id', machineId).limit(100),
    admin.from('parts').select('*').eq('machine_id', machineId).limit(200),
    admin.from('consumables').select('*').eq('machine_id', machineId).limit(200),
    admin.from('users').select('id,name,role,phone').eq('company_id', companyId),
  ])
  const ticketIds = (tickets.data || []).map((ticket: any) => ticket.id)
  const events = ticketIds.length
    ? await admin.from('events').select('*').in('ticket_id', ticketIds).order('created_at', { ascending: false }).limit(100)
    : { data: [], error: null }
  const failed = [tickets, events, documents, parts, consumables, members].find((result) => result.error)
  if (failed?.error) throw new Error('Machine context could not be prepared.')

  const people = members.data || []
  const byId = Object.fromEntries(people.map((person: any) => [person.id, person]))
  const legacyTechnician = people.find((person: any) => normalizePhone(person.phone) && normalizePhone(person.phone) === normalizePhone(machine.assigned_technician_phone))
  const stakeholder = (id: string, fallback?: any) => id ? byId[id] : fallback
  const responseTeam = [
    ['Primary technician', stakeholder(machine.technician_user_id, legacyTechnician)],
    ['Supervisor', stakeholder(machine.supervisor_id)],
    ['Maintenance engineer', stakeholder(machine.engineer_user_id)],
    ['Maintenance head', stakeholder(machine.maintenance_head_user_id)],
  ]
  const fileName = `${text(machine.name).replace(/[^A-Za-z0-9_-]+/g, '_') || 'Machine'}_MachineData.md`
  const now = new Date().toISOString()
  const markdown = `# ${text(machine.name)} — MachineData

> Canonical TurboFix machine context. Generated ${now}. Plant data only; human safety approval remains required.

## Machine identity
- Machine ID: ${machine.id}
- Name: ${text(machine.name)}
- Location: ${text(machine.location) || 'Not recorded'}
- Condition: ${text(machine.status) || 'Not recorded'}
- Last maintenance: ${text(machine.last_maintenance_date) || 'Not recorded'}
- Next maintenance due: ${text(machine.next_maintenance_due) || 'Not scheduled'}
- Maintenance interval: ${machine.maintenance_interval_days || 'Not recorded'} days

## People connected to this machine
${responseTeam.map(([label, person]: any) => `- ${label}: ${person?.name ? `${text(person.name)} (${text(person.role)})` : 'Not assigned'}`).join('\n')}

## Maintenance tickets
${bullets(tickets.data || [], (ticket) => `${text(ticket.created_at)} | ${text(ticket.status)} | ${text(ticket.urgency) || 'Unrated'} | ${text(ticket.issue_text || ticket.description) || 'Issue not described'}${ticket.resolution ? ` | Resolution: ${text(ticket.resolution)}` : ''}`)}

## Maintenance events
${bullets(events.data || [], (event) => `${text(event.created_at)} | ${text(event.event_type)} | ${text(event.message || event.notes) || 'No notes'}`)}

## Technical documents
${bullets(documents.data || [], (document) => `${text(document.title || document.file_name)} | ${text(document.category) || 'Document'}`)}

## Spare parts
${bullets(parts.data || [], (part) => `${text(part.name || part.part_name)}${part.part_number ? ` (${text(part.part_number)})` : ''} | Stock: ${part.stock_qty ?? part.quantity_on_hand ?? 'Unknown'} ${text(part.unit)}`)}

## Consumables
${bullets(consumables.data || [], (item) => `${text(item.name)} | Stock: ${item.stock_qty ?? item.quantity_on_hand ?? 'Unknown'} ${text(item.unit)} | Reorder level: ${item.reorder_level ?? 'Unknown'}`)}
`
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(markdown))
  const contentHash = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
  const { error: storeError } = await admin.from('machine_knowledge_files').upsert({
    machine_id: machine.id, company_id: companyId, file_name: fileName, markdown,
    content_hash: contentHash, dirty: false, generated_at: now, updated_at: now,
  }, { onConflict: 'machine_id' })
  if (storeError) throw new Error('Machine knowledge file could not be updated.')
  return { machine, markdown, fileName, contentHash, generatedAt: now }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })
  if (req.method !== 'POST') return reply(req, { error: 'Method not allowed.' }, 405)
  try {
    const url = Deno.env.get('SUPABASE_URL') || ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const authorization = req.headers.get('Authorization') || ''
    if (!authorization) return reply(req, { error: 'Please sign in again.' }, 401)
    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } })
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: { user }, error: authError } = await caller.auth.getUser()
    if (authError || !user) return reply(req, { error: 'Your session has expired. Please sign in again.' }, 401)
    const directoryUser = await resolveDirectoryUser(admin, user)
    if (!directoryUser) return reply(req, { error: 'Your team profile is not linked to this login.' }, 403)

    const body = await req.json()
    const question = text(body.question)
    const selected = text(body.selected) || 'all'
    if (!question) return reply(req, { error: 'Enter a maintenance question.' }, 400)
    const { data: companyMachines, error: machineError } = await admin.from('machines').select('id,name').eq('company_id', directoryUser.company_id).order('name')
    if (machineError) throw new Error('Machines could not be loaded.')
    const targetIds = selected === 'all' ? (companyMachines || []).map((machine: any) => machine.id) : [selected]
    if (targetIds.length === 0) return reply(req, { error: 'No machines are available in this plant.' }, 400)
    if (targetIds.length > 25) return reply(req, { error: 'Choose one machine for a detailed answer.' }, 400)
    const contexts = await Promise.all(targetIds.map((machineId: string) => buildMachineMarkdown(admin, directoryUser.company_id, machineId)))

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) return reply(req, { error: 'AI Assistant is not configured. Please contact TurboFix support.' }, 503)
    const contextPrompt = `You are TurboFix AI, an industrial maintenance decision-support assistant.
Use only the canonical MachineData Markdown below. If a requested fact is marked Not assigned or Not recorded, say so clearly and do not invent it.
Focus on resolving the machine issue and root cause, not measuring or ranking people. Safety-critical actions require human verification and the approved manual.

${contexts.map((context) => context.markdown).join('\n\n---\n\n')}

User question: ${question}

Answer specifically and directly in plain language. Name connected stakeholders when the question asks who is responsible. Keep routine answers concise; include numbered actions when troubleshooting.`
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: contextPrompt }] }] }),
    })
    if (!response.ok) throw new Error('AI recommendation service is temporarily unavailable.')
    const result = await response.json()
    const recommendation = result.candidates?.[0]?.content?.parts?.[0]?.text
    if (!recommendation) throw new Error('AI did not return a recommendation.')
    return reply(req, {
      recommendation,
      context_files: contexts.map((context) => ({ file_name: context.fileName, content_hash: context.contentHash, generated_at: context.generatedAt })),
    })
  } catch (error) {
    return reply(req, { error: error instanceof Error ? error.message : 'Recommendation could not be generated.' }, 400)
  }
})
