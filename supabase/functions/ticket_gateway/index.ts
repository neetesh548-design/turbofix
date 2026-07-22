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

const uploadDataUrl = async (
  admin: any,
  dataUrl: string,
  bucket: string,
  machineId: string,
  prefix: string
) => {
  const raw = text(dataUrl)
  const parts = raw.split(';base64,')
  if (parts.length !== 2 || !parts[0].startsWith('data:')) return null
  const mime = parts[0].replace(/^data:/, '').split(';')[0]
  const base64 = parts[1]
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const fileExt = mimeToExtension(mime)
  const fileName = `${prefix}-${machineId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`
  const filePath = `${machineId}/${fileName}`
  const { error: upErr } = await admin.storage.from(bucket).upload(filePath, bytes, { contentType: mime })
  if (upErr) throw new Error(upErr.message)
  return { bucket, path: filePath, mime, size: bytes.length }
}

const optionalTicketColumns = [
  'raw_audio_bucket',
  'raw_audio_path',
  'ai_output_snapshot',
  'review_snapshot',
  'final_submission_snapshot',
  'voice_language',
]

const withoutOptionalTicketColumns = (payload: Record<string, unknown>) => {
  const clean = { ...payload }
  for (const key of optionalTicketColumns) delete clean[key]
  return clean
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) })
  if (req.method !== 'POST') return reply(req, { error: 'Method not allowed.' }, 405)

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

    const action = text(body.action)

    // Public Machine Details Lookup (bypasses RLS for anonymous QR Gateway operators)
    if (action === 'get_machine_details') {
      const { machine_id } = body;
      if (!machine_id) return reply(req, { error: 'Invalid machine ID.' }, 400);

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(machine_id));
      let mQuery = admin.from('machines').select('id, name, location, technician_user_id, factory_id');
      if (isUuid) {
        mQuery = mQuery.eq('id', machine_id);
      } else {
        mQuery = mQuery.or(`id.eq.${machine_id},asset_code.eq.${machine_id},name.eq.${machine_id}`);
      }

      const { data: mDataArr, error: mErr } = await mQuery.limit(1);
      if (mErr || !mDataArr || mDataArr.length === 0) {
        return reply(req, { machine: null });
      }

      const mData = mDataArr[0];
      let technician_name = '';
      if (mData.technician_user_id) {
        const { data: uData } = await admin
          .from('users')
          .select('name')
          .eq('id', mData.technician_user_id)
          .maybeSingle();
        if (uData && uData.name) {
          technician_name = uData.name;
        }
      }

      return reply(req, { machine: { ...mData, technician_name } });
    }

    // Public Ticket Logging and Appending (allows anonymous QR Gateway operators to report breakdowns without signing in)
    if (action === 'log_ticket') {
      const { payload } = body
      if (!payload || !payload.machine_id) return reply(req, { error: 'Invalid payload.' }, 400)

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(payload.machine_id));
      let mQuery = admin.from('machines').select('id, factory_id');
      if (isUuid) {
        mQuery = mQuery.eq('id', payload.machine_id);
      } else {
        mQuery = mQuery.or(`id.eq.${payload.machine_id},asset_code.eq.${payload.machine_id},name.eq.${payload.machine_id}`);
      }
      
      const { data: mDataArr } = await mQuery.limit(1);
      const mRow = mDataArr?.[0];
      if (mRow) {
        payload.machine_id = mRow.id; 
        if (mRow.factory_id) {
          payload.factory_id = mRow.factory_id;
          admin.from('tickets').update({ factory_id: mRow.factory_id }).eq('machine_id', mRow.id).then(() => {}).catch(() => {});
        }
      } else {
        const { data: defaultM } = await admin.from('machines').select('id, factory_id').order('created_at', { ascending: true }).limit(1).maybeSingle();
        if (defaultM) {
          payload.machine_id = defaultM.id;
          if (defaultM.factory_id) payload.factory_id = defaultM.factory_id;
        }
      }

      if (!payload.factory_id) {
        const { data: fRow } = await admin.from('factories').select('id').order('created_at', { ascending: true }).limit(1).maybeSingle();
        if (fRow) payload.factory_id = fRow.id;
      }

      if (payload.ai_summary?.photo_base64) {
        try {
          const rawBase64 = String(payload.ai_summary.photo_base64);
          const base64Data = rawBase64.includes(';base64,') ? rawBase64.split(';base64,')[1] : rawBase64;
          const fileName = `issue-${payload.machine_id}-${Date.now()}.jpg`;
          const filePath = `${payload.machine_id}/${fileName}`;
          
          const binaryStr = atob(base64Data);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          
          const { error: upErr } = await admin.storage.from('repair-proofs').upload(filePath, bytes, { contentType: 'image/jpeg' });
          if (!upErr) {
            const { data: pUrl } = admin.storage.from('repair-proofs').getPublicUrl(filePath);
            if (pUrl?.publicUrl) {
              payload.ai_summary.photo_url = pUrl.publicUrl;
            }
          }
          delete payload.ai_summary.photo_base64;
        } catch (photoErr) {
          console.warn('Warning syncing offline photo:', photoErr);
        }
      }

      let machineName = 'Machine';
      if (payload.machine_id) {
        const { data: fullM } = await admin.from('machines').select('name, category, model, asset_code, location').eq('id', payload.machine_id).maybeSingle();
        if (fullM) {
          machineName = fullM.name || fullM.asset_code || 'Machine';
        }
      }

      let historicalTickets: any[] = [];
      let totalPastCount = 0;
      if (payload.machine_id) {
        const { data: pastData, count } = await admin
          .from('tickets')
          .select('issue_text, root_cause, repair_action, created_at', { count: 'exact' })
          .eq('machine_id', payload.machine_id)
          .order('created_at', { ascending: false })
          .limit(5);
        if (pastData) historicalTickets = pastData;
        totalPastCount = count || pastData?.length || 0;
      }

      if (!payload.ai_summary || typeof payload.ai_summary !== 'object') {
        payload.ai_summary = {};
      }

      const voiceArtifacts = payload.voice_artifacts && typeof payload.voice_artifacts === 'object' ? payload.voice_artifacts : null
      if (voiceArtifacts) {
        try {
          if (voiceArtifacts.raw_audio_data_url) {
            const uploaded = await uploadDataUrl(
              admin,
              String(voiceArtifacts.raw_audio_data_url),
              'voice-notes',
              String(payload.machine_id),
              'raw-audio'
            )
            if (uploaded) {
              payload.raw_audio_bucket = uploaded.bucket
              payload.raw_audio_path = uploaded.path
            }
          }
        } catch (voiceErr) {
          console.warn('Warning storing raw voice audio:', voiceErr)
        }

        payload.ai_output_snapshot = {
          ...(payload.ai_output_snapshot || {}),
          ...(voiceArtifacts.ai_output_snapshot || {}),
        }
        payload.review_snapshot = {
          ...(payload.review_snapshot || {}),
          ...(voiceArtifacts.review_snapshot || {}),
        }
        payload.final_submission_snapshot = {
          ...(payload.final_submission_snapshot || {}),
          ...(voiceArtifacts.final_submission_snapshot || {}),
        }
        payload.voice_language = payload.voice_language || String(voiceArtifacts.language_code || voiceArtifacts.language || '')
        delete payload.voice_artifacts
      }

      const issueLower = (payload.issue_text || '').toLowerCase();
      let predictedIssue = '';
      let recommendedAction = '';
      let recommendedParts = '';

      if (issueLower.includes('leak') || issueLower.includes('oil') || issueLower.includes('तेल') || issueLower.includes('गळती')) {
        predictedIssue = `${machineName}: Hydraulic/Lubrication Seal Wear or Hose Fitting Leak`;
        recommendedAction = 'Inspect main hydraulic seal rings, check hose fittings, verify oil level and pump pressure.';
        recommendedParts = 'Hydraulic Seal Kit, Oil Filter Element, Fitting O-Rings';
      } else if (issueLower.includes('smoke') || issueLower.includes('burn') || issueLower.includes('heat') || issueLower.includes('धुआं')) {
        predictedIssue = `${machineName}: Motor Overheating or Electrical Contactor Short`;
        recommendedAction = 'Isolate main power, inspect motor windings, check cooling fan, test thermal overload relay.';
        recommendedParts = 'Thermal Overload Relay, Motor Bearing Set, Contactor';
      } else if (issueLower.includes('noise') || issueLower.includes('vibrat') || issueLower.includes('sound') || issueLower.includes('आवाज')) {
        predictedIssue = `${machineName}: Spindle / Bearing Misalignment or Mechanical Friction`;
        recommendedAction = 'Check drive belt tension, inspect spindle bearings, lubricate linear guide ways.';
        recommendedParts = 'Drive Belt, High-Speed Bearing Set, Synthetic Lubricant';
      } else {
        predictedIssue = `${machineName}: Mechanical Operation Fault / Sensor Interlock Drop`;
        recommendedAction = 'Inspect safety interlocks, verify limit switches, test hydraulic pressure and control solenoid.';
        recommendedParts = 'Proximity Switch, Fuse Set, Multi-Purpose Seal Kit';
      }

      let historicalInsight = '';
      if (totalPastCount > 0) {
        const prevIssues = historicalTickets.map(t => t.root_cause || t.issue_text).filter(Boolean).slice(0, 3).join('; ');
        historicalInsight = `⚠️ ${machineName} History: ${totalPastCount} previous breakdown logs recorded. Past causes: ${prevIssues || 'General breakdown'}.`;
      } else {
        historicalInsight = `ℹ️ ${machineName}: 1st recorded breakdown ticket for this machine unit.`;
      }

      payload.ai_summary.predicted_issue = payload.ai_summary.predicted_issue || predictedIssue;
      payload.ai_summary.recommended_action = payload.ai_summary.recommended_action || recommendedAction;
      payload.ai_summary.recommended_parts = payload.ai_summary.recommended_parts || recommendedParts;
      payload.ai_summary.historical_insights = historicalInsight;
      payload.ai_summary.machine_name = machineName;
      payload.ai_summary.total_past_breakdowns = totalPastCount;

      let { data, error } = await admin
        .from('tickets')
        .insert(payload)
        .select('id, wo_number, created_at, lifecycle_stage, urgency')
        .single()
      if (error && optionalTicketColumns.some((column) => error.message?.includes(`'${column}' column`))) {
        console.warn('Ticket schema is missing optional AI record columns; retrying public ticket insert without snapshots:', error.message)
        const retry = await admin
          .from('tickets')
          .insert(withoutOptionalTicketColumns(payload))
          .select('id, wo_number, created_at, lifecycle_stage, urgency')
          .single()
        data = retry.data
        error = retry.error
      }
      if (error) {
        console.error('Error inserting public ticket:', error)
        return reply(req, { error: error.message }, 500)
      }
      return reply(req, { data })
    }

    if (action === 'update_ticket') {
      const { ticket_id, patches } = body
      if (!ticket_id || !patches) return reply(req, { error: 'Invalid payload.' }, 400)
      const { data, error } = await admin
        .from('tickets')
        .update(patches)
        .eq('id', ticket_id)
        .select('id, wo_number, created_at, lifecycle_stage, urgency')
        .single()
      if (error) {
        console.error('Error updating public ticket:', error)
        return reply(req, { error: error.message }, 500)
      }
      return reply(req, { data })
    }

    if (action === 'check_duplicate') {
      let { machine_id } = body
      if (!machine_id) return reply(req, { error: 'Invalid machine ID.' }, 400)
      
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(machine_id));
      if (!isUuid) {
        const { data: mRow } = await admin
          .from('machines')
          .select('id')
          .or(`id.eq.${machine_id},asset_code.eq.${machine_id},name.eq.${machine_id}`)
          .limit(1)
          .maybeSingle();
        if (mRow) machine_id = mRow.id;
      }

      const { data, error } = await admin
        .from('tickets')
        .select('id, issue_text, created_at')
        .eq('machine_id', machine_id)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
      if (error) {
        console.error('Error checking duplicates:', error)
        return reply(req, { error: error.message }, 500)
      }
      return reply(req, { duplicate: data && data.length > 0 ? data[0] : null })
    }

    if (action === 'get_ticket') {
      const { ticket_id } = body
      if (!ticket_id) return reply(req, { error: 'Invalid ticket ID.' }, 400)
      const { data, error } = await admin
        .from('tickets')
        .select('ai_summary')
        .eq('id', ticket_id)
        .single()
      return reply(req, { data })
    }

    if (action === 'get_factory_id') {
      const { data, error } = await admin
        .from('factories')
        .select('id')
        .limit(1)
        .maybeSingle()
      if (error) {
        console.error('Error fetching default factory:', error)
        return reply(req, { error: error.message }, 500)
      }
      return reply(req, { factory_id: data?.id || null })
    }

    return reply(req, { error: 'Invalid action for ticket_gateway.' }, 400)

  } catch (err: any) {
    console.error('Ticket Gateway Edge Function error:', err)
    return reply(req, { error: 'An unexpected error occurred.' }, 500)
  }
})
