import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { timingSafeEqualString } from '../_shared/security.ts'

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

  // Inbound-parse providers (SendGrid/Mailgun) don't share a single
  // signature scheme, so this uses a shared secret configured as a query
  // param on the webhook URL itself (e.g. .../inbound_email_receiver?token=…)
  // — the same value both this function and the provider's dashboard are
  // configured with. Previously had no verification at all: authorization
  // was based purely on the email's spoofable `From:` header. Fails closed
  // if the secret isn't configured.
  const webhookSecret = Deno.env.get('INBOUND_EMAIL_WEBHOOK_SECRET') ?? ''
  if (!webhookSecret) return reply({ error: 'Inbound email webhook is not configured' }, 503)
  const providedToken = new URL(req.url).searchParams.get('token') ?? ''
  if (!providedToken || !(await timingSafeEqualString(providedToken, webhookSecret))) {
    return reply({ error: 'Unauthorized' }, 401)
  }

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
      .select('id, name, phone, role, company_id')
      .ilike('email', cleanEmail)
      .maybeSingle()

    if (userErr || !user) {
      console.warn(`Email sender ${cleanEmail} not found in user directory.`);
      return reply({ error: 'Sender not authorized' }, 403)
    }

    // Parse the subject line to resolve machine — scoped to the sender's own
    // company throughout. Previously searched every machine on the platform
    // with no company filter, so a sender at Company A could get a ticket
    // filed against Company B's machine on a name/id collision.
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
        .eq('company_id', user.company_id)
        .maybeSingle()
      if (mach) {
        resolvedMachineId = mach.id
        resolvedMachineName = mach.name
        resolvedFactoryId = mach.factory_id
      }
    }

    // 2. Fallback: search machines within the sender's own company only
    if (!resolvedMachineId) {
      const { data: companyMachines } = await supabaseAdmin
        .from('machines')
        .select('id, name, factory_id')
        .eq('company_id', user.company_id)
      if (companyMachines) {
        for (const m of companyMachines) {
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
