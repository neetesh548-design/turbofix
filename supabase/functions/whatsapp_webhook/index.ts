import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyHmacSha256 } from '../_shared/security.ts'

const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
const WHATSAPP_APP_SECRET = Deno.env.get('WHATSAPP_APP_SECRET');

serve(async (req) => {
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === Deno.env.get('WHATSAPP_VERIFY_TOKEN')) {
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  const signatureHeader = req.headers.get('x-hub-signature-256');
  if (!WHATSAPP_APP_SECRET || !signatureHeader?.startsWith('sha256=')) {
    return new Response('Webhook signature is not configured', { status: 503 });
  }
  const bodyText = await req.text();
  const signatureValid = await verifyHmacSha256(
    bodyText,
    signatureHeader.slice('sha256='.length),
    WHATSAPP_APP_SECRET,
  );
  if (!signatureValid) {
    return new Response('Invalid signature', { status: 401 });
  }
  const body = JSON.parse(bodyText);
  
  if (body.object) {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (message) {
      const from = message.from; // e.g. 919876543210
      let issueText = "";

      if (message.type === 'text') {
        issueText = message.text?.body;
      } 
      else if (message.type === 'audio') {
        try {
          const mediaId = message.audio.id;
          const metaResp = await fetch(`https://graph.facebook.com/v17.0/${mediaId}`, {
            headers: { 'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}` }
          });
          const meta = await metaResp.json();
          
          if (meta.url) {
            const mediaResp = await fetch(meta.url, {
              headers: { 'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}` }
            });
            const audioBlob = await mediaResp.blob();

            const formData = new FormData();
            formData.append('file', audioBlob, 'audio.ogg');
            formData.append('model', 'whisper-1');

            const whisperResp = await fetch('https://api.openai.com/v1/audio/translations', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
              body: formData
            });

            const whisperData = await whisperResp.json();
            issueText = whisperData.text || "Audio transcribed but empty.";
          }
        } catch (e) {
          console.error("Audio processing failed", e);
          issueText = "[Audio processing failed]";
        }
      }

      if (issueText) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. GATEKEEPER ROUTING
        const phoneE164 = `+${from.replace('+', '')}`;
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('factory_id, role')
          .eq('phone_e164', phoneE164)
          .single();

        let factoryId = null;
        let machineId = null;
        let isUnverified = false;

        if (profile) {
          // Known User
          factoryId = profile.factory_id;
        } else {
          // Unknown User - Check for QR Token
          const tokenMatch = issueText.match(/TF-([a-zA-Z0-9]+)/);
          if (tokenMatch) {
            const token = tokenMatch[1];
            const { data: qrData } = await supabase
              .from('machine_qr_codes')
              .select('factory_id, machine_id')
              .eq('token', token)
              .single();
              
            if (qrData) {
              factoryId = qrData.factory_id;
              machineId = qrData.machine_id;
              isUnverified = true;
              issueText = issueText.replace(`TF-${token}`, '').trim(); // Remove token from text
            }
          }
        }

        if (factoryId) {
          // 2. INSERT TICKET
          await supabase.from('tickets').insert({
            factory_id: factoryId,
            machine_id: machineId, // Nullable if not from QR
            reporter_phone: phoneE164,
            issue_text: issueText,
            status: 'open',
            ai_summary: isUnverified ? { flag: 'unverified_reporter' } : null
          });

          // 3. IF UNVERIFIED, ALERT SUPERVISORS
          if (isUnverified) {
            const { data: supervisors } = await supabase
              .from('profiles')
              .select('phone_e164')
              .eq('factory_id', factoryId)
              .eq('role', 'supervisor');

            if (supervisors && WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID) {
              for (const sup of supervisors) {
                // Simulate sending approval WhatsApp
                const msg = `New report from unregistered number ${phoneE164}. Approve to add as technician?`;
                await fetch(`https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    messaging_product: "whatsapp",
                    to: sup.phone_e164.replace("+", ""),
                    type: "text",
                    text: { body: msg }
                  })
                });
              }
            }
          }
        } else {
          // Unknown number, no token. Drop and notify.
          if (WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID) {
            const msg = `This number isn't linked to a TurboFix factory. Please scan a machine QR code to register.`;
            await fetch(`https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: from,
                type: "text",
                text: { body: msg }
              })
            });
          }
        }
      }
    }
    return new Response('EVENT_RECEIVED', { status: 200 });
  }
  
  return new Response('Not Found', { status: 404 });
})
