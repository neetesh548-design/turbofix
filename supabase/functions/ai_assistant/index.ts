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
type GraphNode = { id: string; type: string; label: string; properties: Record<string, unknown> }
type GraphEdge = { from: string; to: string; type: string }

const compactProperties = (properties: Record<string, unknown>) => Object.fromEntries(
  Object.entries(properties).filter(([, value]) => value !== null && value !== undefined && value !== ''),
)

const parsedExtraction = (value: unknown) => {
  try {
    return typeof value === 'string' ? JSON.parse(value) : (value || {})
  } catch {
    return {}
  }
}

const compactExtraction = (record: any) => {
  const data: any = parsedExtraction(record.extracted_json)
  const facts: string[] = []
  if (data.summary) facts.push(`Summary: ${text(data.summary)}`)
  const identity = data.machine_identity && typeof data.machine_identity === 'object' ? data.machine_identity : {}
  Object.entries(identity).forEach(([key, field]: any) => {
    if (field?.value) facts.push(`${key.replaceAll('_', ' ')}: ${text(field.value)} (source: ${text(field.source) || 'not stated'})`)
  })
  ;['specifications', 'maintenance_tasks', 'spare_parts', 'consumables', 'service_history', 'risks'].forEach((section) => {
    const items = Array.isArray(data[section]) ? data[section].slice(0, 25) : []
    items.forEach((item: any) => {
      const detail = Object.entries(item)
        .filter(([key, value]) => !['confidence'].includes(key) && value !== null && value !== undefined && value !== '')
        .map(([key, value]) => `${key.replaceAll('_', ' ')}=${text(value)}`)
        .join(', ')
      if (detail) facts.push(`${section.replaceAll('_', ' ')}: ${detail}`)
    })
  })
  return facts.join(' | ').slice(0, 12000)
}

function retrieveSubgraph(nodes: GraphNode[], edges: GraphEdge[], question: string, plantWide: boolean) {
  const query = question.toLowerCase()
  const wantsPeople = /who|technician|supervisor|engineer|head|assigned|responsib|stakeholder|contact/.test(query)
  const wantsIssues = /issue|problem|fault|failure|breakdown|ticket|risk|urgent|priority|repair|resolve|root cause/.test(query)
  const wantsHistory = /history|previous|recent|repeat|past|event|maintenance/.test(query)
  const wantsParts = /part|spare|inventory|stock|replace/.test(query)
  const wantsConsumables = /consumable|oil|lubric|coolant|filter|fluid/.test(query)
  const wantsDocuments = /manual|document|diagram|procedure|instruction|drawing/.test(query)
  const requestedTypes = new Set(['machine'])
  if (wantsPeople) requestedTypes.add('stakeholder')
  if (wantsIssues || wantsHistory) { requestedTypes.add('ticket'); requestedTypes.add('event') }
  if (wantsParts) requestedTypes.add('part')
  if (wantsConsumables) requestedTypes.add('consumable')
  if (wantsDocuments) requestedTypes.add('document')
  requestedTypes.add('record')
  if (requestedTypes.size === 2) { requestedTypes.add('ticket'); requestedTypes.add('stakeholder') }

  const limits: Record<string, number> = plantWide
    ? { machine: 1, stakeholder: wantsPeople ? 4 : 1, ticket: 5, event: 2, part: 3, consumable: 3, document: 2, record: 4 }
    : { machine: 1, stakeholder: 4, ticket: 20, event: 15, part: 20, consumable: 20, document: 12, record: 12 }
  const counts: Record<string, number> = {}
  const selectedNodes = nodes.filter((node) => {
    if (!requestedTypes.has(node.type)) return false
    if (node.type === 'ticket' && !wantsHistory && node.properties.status && !['open', 'in_progress', 'submitted'].includes(String(node.properties.status).toLowerCase())) return false
    counts[node.type] = (counts[node.type] || 0) + 1
    return counts[node.type] <= (limits[node.type] || 5)
  })
  const selectedIds = new Set(selectedNodes.map((node) => node.id))
  const selectedEdges = edges.filter((edge) => selectedIds.has(edge.from) && selectedIds.has(edge.to))
  const lines = selectedNodes.map((node) => {
    const facts = Object.entries(node.properties).map(([key, value]) => `${key}=${text(value)}`).join(' | ')
    return `${node.type.toUpperCase()} | ${node.label}${facts ? ` | ${facts}` : ''}`
  })
  if (selectedEdges.length) lines.push(`RELATIONSHIPS | ${selectedEdges.map((edge) => `${edge.from} -[${edge.type}]-> ${edge.to}`).join('; ')}`)
  const context = lines.join('\n')
  return { context, nodeCount: selectedNodes.length, edgeCount: selectedEdges.length, estimatedTokens: Math.ceil(context.length / 4) }
}

async function resolveDirectoryUser(admin: any, authUser: any) {
  const fields = 'id,company_id,role,name,email'
  const linkedId = String(authUser.app_metadata?.directory_user_id || '')
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

  const [tickets, documents, parts, consumables, members, records] = await Promise.all([
    admin.from('tickets').select('*').eq('machine_id', machineId).order('created_at', { ascending: false }).limit(100),
    admin.from('documents').select('*').eq('machine_id', machineId).limit(100),
    admin.from('parts').select('*').eq('machine_id', machineId).limit(200),
    admin.from('consumables').select('*').eq('machine_id', machineId).limit(200),
    admin.from('users').select('id,name,role,phone').eq('company_id', companyId),
    admin.from('machine_records').select('record_id,document_id,title,record_type,status,overall_confidence,extracted_json,approved_by,approved_at').eq('machine_id', machineId).limit(200),
  ])
  const ticketIds = (tickets.data || []).map((ticket: any) => ticket.id)
  const events = ticketIds.length
    ? await admin.from('events').select('*').in('ticket_id', ticketIds).order('created_at', { ascending: false }).limit(100)
    : { data: [], error: null }
  const failed = [tickets, events, documents, parts, consumables, members, records].find((result) => result.error)
  if (failed?.error) throw new Error('Machine context could not be prepared.')

  const allRecords = records.data || []
  const approvedRecords = allRecords.filter((record: any) => record.status === 'approved')
  const recordDocumentIds = new Set(allRecords.map((record: any) => record.document_id).filter(Boolean))
  const approvedDocumentIds = new Set(approvedRecords.map((record: any) => record.document_id).filter(Boolean))
  const technicalDocuments = (documents.data || []).filter((document: any) => !recordDocumentIds.has(document.id) || approvedDocumentIds.has(document.id))

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
  const machineNodeId = `machine:${machine.id}`
  const nodes: GraphNode[] = [{
    id: machineNodeId, type: 'machine', label: text(machine.name),
    properties: compactProperties({ location: machine.location, condition: machine.status, last_maintenance: machine.last_maintenance_date, next_maintenance: machine.next_maintenance_due, interval_days: machine.maintenance_interval_days }),
  }]
  const edges: GraphEdge[] = []
  responseTeam.forEach(([responsibility, person]: any) => {
    if (!person?.id) return
    const nodeId = `stakeholder:${person.id}:${String(responsibility).toLowerCase().replace(/\s+/g, '_')}`
    nodes.push({ id: nodeId, type: 'stakeholder', label: text(person.name), properties: compactProperties({ responsibility, role: person.role }) })
    edges.push({ from: machineNodeId, to: nodeId, type: 'ASSIGNED_TO' })
  })
  ;(tickets.data || []).forEach((ticket: any) => {
    const nodeId = `ticket:${ticket.id}`
    nodes.push({ id: nodeId, type: 'ticket', label: text(ticket.issue_text || ticket.description) || 'Maintenance issue', properties: compactProperties({ status: ticket.status, urgency: ticket.urgency, created_at: ticket.created_at, resolution: ticket.resolution }) })
    edges.push({ from: machineNodeId, to: nodeId, type: 'HAS_TICKET' })
  })
  ;(events.data || []).forEach((event: any) => {
    const nodeId = `event:${event.id}`
    const ticketNodeId = `ticket:${event.ticket_id}`
    nodes.push({ id: nodeId, type: 'event', label: text(event.event_type) || 'Maintenance event', properties: compactProperties({ message: event.message || event.notes, created_at: event.created_at }) })
    edges.push({ from: ticketNodeId, to: nodeId, type: 'HAS_EVENT' })
  })
  ;technicalDocuments.forEach((document: any) => {
    const nodeId = `document:${document.id}`
    nodes.push({ id: nodeId, type: 'document', label: text(document.title || document.file_name) || 'Technical document', properties: compactProperties({ category: document.category }) })
    edges.push({ from: machineNodeId, to: nodeId, type: 'DOCUMENTED_BY' })
  })
  ;(parts.data || []).forEach((part: any) => {
    const nodeId = `part:${part.id}`
    nodes.push({ id: nodeId, type: 'part', label: text(part.name || part.part_name) || 'Spare part', properties: compactProperties({ part_number: part.part_number, stock: part.stock_qty ?? part.quantity_on_hand, unit: part.unit, reorder_level: part.reorder_level }) })
    edges.push({ from: machineNodeId, to: nodeId, type: 'USES_PART' })
  })
  ;(consumables.data || []).forEach((item: any) => {
    const nodeId = `consumable:${item.id}`
    nodes.push({ id: nodeId, type: 'consumable', label: text(item.name) || 'Consumable', properties: compactProperties({ stock: item.stock_qty ?? item.quantity_on_hand, unit: item.unit, reorder_level: item.reorder_level, replacement_days: item.frequency_days }) })
    edges.push({ from: machineNodeId, to: nodeId, type: 'USES_CONSUMABLE' })
  })
  approvedRecords.forEach((record: any) => {
    const nodeId = `record:${record.record_id}`
    nodes.push({
      id: nodeId,
      type: 'record',
      label: text(record.title || record.record_type) || 'Approved machine record',
      properties: compactProperties({
        record_type: record.record_type,
        confidence: record.overall_confidence,
        approved_at: record.approved_at,
        verified_knowledge: compactExtraction(record),
      }),
    })
    edges.push({ from: machineNodeId, to: nodeId, type: 'HAS_APPROVED_RECORD' })
  })
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
${bullets(technicalDocuments, (document) => `${text(document.title || document.file_name)} | ${text(document.category) || 'Document'}`)}

## Maintenance Head approved records
${bullets(approvedRecords, (record) => `${text(record.title || record.record_type)} | Confidence: ${record.overall_confidence ?? 0}% | Approved: ${text(record.approved_at) || 'Recorded'} | ${compactExtraction(record)}`)}

## Spare parts
${bullets(parts.data || [], (part) => `${text(part.name || part.part_name)}${part.part_number ? ` (${text(part.part_number)})` : ''} | Stock: ${part.stock_qty ?? part.quantity_on_hand ?? 'Unknown'} ${text(part.unit)}`)}

## Consumables
${bullets(consumables.data || [], (item) => `${text(item.name)} | Stock: ${item.stock_qty ?? item.quantity_on_hand ?? 'Unknown'} ${text(item.unit)} | Reorder level: ${item.reorder_level ?? 'Unknown'}`)}
`
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(markdown))
  const contentHash = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
  const graphJson = JSON.stringify({ nodes, edges })
  const graphDigest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(graphJson))
  const graphHash = Array.from(new Uint8Array(graphDigest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
  const { error: storeError } = await admin.from('machine_knowledge_files').upsert({
    machine_id: machine.id, company_id: companyId, file_name: fileName, markdown,
    content_hash: contentHash, dirty: false, generated_at: now, updated_at: now,
  }, { onConflict: 'machine_id' })
  if (storeError) throw new Error('Machine knowledge file could not be updated.')
  const { error: graphStoreError } = await admin.from('machine_knowledge_graphs').upsert({
    machine_id: machine.id, company_id: companyId, nodes, edges, graph_hash: graphHash,
    dirty: false, generated_at: now, updated_at: now,
  }, { onConflict: 'machine_id' })
  if (graphStoreError) throw new Error('Machine knowledge graph could not be updated.')
  return { machine, markdown, fileName, contentHash, graphHash, nodes, edges, generatedAt: now }
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
    const retrievals = contexts.map((context) => ({
      machineId: context.machine.id,
      ...retrieveSubgraph(context.nodes, context.edges, question, selected === 'all'),
    }))
    const retrievedContext = retrievals.map((result) => result.context).filter(Boolean).join('\n\n--- MACHINE BOUNDARY ---\n\n')
    const retrievedTokens = retrievals.reduce((total, result) => total + result.estimatedTokens, 0)
    const fullMarkdownTokens = contexts.reduce((total, context) => total + Math.ceil(context.markdown.length / 4), 0)

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) return reply(req, { error: 'AI Assistant is not configured. Please contact TurboFix support.' }, 503)
    const contextPrompt = `You are TurboFix AI, an industrial maintenance decision-support assistant.
Use only the machine-isolated knowledge subgraph below. It was derived from the canonical MachineData Markdown and live Supabase sources immediately before this query. If a requested fact is absent, say it is not recorded and do not invent it.
Focus on resolving the machine issue and root cause, not measuring or ranking people. Safety-critical actions require human verification and the approved manual.

${retrievedContext}

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
      context_files: contexts.map((context) => ({ file_name: context.fileName, content_hash: context.contentHash, graph_hash: context.graphHash, generated_at: context.generatedAt })),
      retrieval: {
        nodes_used: retrievals.reduce((total, result) => total + result.nodeCount, 0),
        edges_used: retrievals.reduce((total, result) => total + result.edgeCount, 0),
        estimated_tokens: retrievedTokens,
        full_markdown_estimated_tokens: fullMarkdownTokens,
        estimated_tokens_saved: Math.max(0, fullMarkdownTokens - retrievedTokens),
      },
    })
  } catch (error) {
    return reply(req, { error: error instanceof Error ? error.message : 'Recommendation could not be generated.' }, 400)
  }
})
