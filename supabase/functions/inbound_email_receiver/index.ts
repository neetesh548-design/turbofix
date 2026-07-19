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
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabaseAdmin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

  try {
    // Webhook body could be JSON or Form Data depending on webhook provider (SendGrid Inbound Parse is multipart/form-data)
    let fromEmail = ''
    let subject = ''
    let textBody = ''

    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await req.json()
      fromEmail = body.from || body.sender || ''
      subject = body.subject || ''
      textBody = body.text || body.body || body.html || ''
    } else {
      // Handle form-data (standard for Mailgun/Sendgrid inbound parse)
      const formData = await req.formData()
      fromEmail = (formData.get('from') as string) || (formData.get('sender') as string) || ''
      subject = (formData.get('subject') as string) || ''
      textBody = (formData.get('text') as string) || (formData.get('body-plain') as string) || ''
    }

    // Clean up sender email: e.g. "Anil Sharma <anil@company.com>" -> "anil@company.com"
    const emailMatch = fromEmail.match(/<([^>]+)>/)
    const cleanEmail = emailMatch ? emailMatch[1].trim().toLowerCase() : fromEmail.trim().toLowerCase()

    if (!cleanEmail) {
      return reply({ error: 'Sender email missing' }, 400)
    }

    // Look up the reporter user in Supabase directory
    const { data: user, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id, name, phone, role')
      .ilike('email', cleanEmail)
      .maybeSingle()

    if (userErr || !user) {
      console.warn(`Email sender ${cleanEmail} not found in user directory.`);
      return reply({ error: 'Sender not authorized' }, 403)
    }

    // Parse the subject line to resolve machine
    let resolvedMachineId = ''
    let resolvedFactoryId = ''
    let resolvedMachineName = ''

    // 1. Check for specific UUID pattern or machine prefix in subject
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
    const uuidMatch = subject.match(uuidRegex)
    if (uuidMatch) {
      const machineIdCandidate = uuidMatch[0]
      const { data: mach } = await supabaseAdmin
        .from('machines')
        .select('id, name, factory_id')
        .eq('id', machineIdCandidate)
        .maybeSingle()
      if (mach) {
        resolvedMachineId = mach.id
        resolvedMachineName = mach.name
        resolvedFactoryId = mach.factory_id
      }
    }

    // 2. Fallback: Search all machines in the factory to see if any name matches or is referenced
    if (!resolvedMachineId) {
      const { data: allMachines } = await supabaseAdmin.from('machines').select('id, name, factory_id')
      if (allMachines) {
        for (const m of allMachines) {
          const cleanName = m.name.toLowerCase()
          const cleanSubject = subject.toLowerCase()
          if (cleanSubject.includes(cleanName) || cleanSubject.includes(m.id.toLowerCase())) {
            resolvedMachineId = m.id
            resolvedMachineName = m.name
            resolvedFactoryId = m.factory_id
            break
          }
        }
      }
    }

    if (!resolvedMachineId) {
      return reply({ error: 'Could not resolve machine from email subject' }, 400)
    }

    // Detect urgency
    let urgency = 'medium'
    const normalizedBody = (subject + ' ' + textBody).toLowerCase()
    if (normalizedBody.includes('critical') || normalizedBody.includes('emergency')) {
      urgency = 'critical'
    } else if (normalizedBody.includes('urgent') || normalizedBody.includes('high')) {
      urgency = 'high'
    } else if (normalizedBody.includes('low') || normalizedBody.includes('minor')) {
      urgency = 'low'
    }

    // Insert new ticket
    const ticketPayload = {
      machine_id: resolvedMachineId,
      status: 'open',
      issue_text: textBody.trim() || `Breakdown reported via email: ${subject}`,
      urgency,
      type: 'breakdown',
      reporter_phone: user.phone || null,
      factory_id: resolvedFactoryId || null
    }

    const { data: ticket, error: ticketErr } = await supabaseAdmin
      .from('tickets')
      .insert(ticketPayload)
      .select('id')
      .single()

    if (ticketErr) {
      throw ticketErr
    }

    return reply({
      success: true,
      message: `Ticket successfully logged for ${resolvedMachineName}`,
      ticket_id: ticket.id
    })

  } catch (err) {
    console.error('Error logging issue via email:', err)
    return reply({ error: err.message || 'Internal server error' }, 500)
  }
})
