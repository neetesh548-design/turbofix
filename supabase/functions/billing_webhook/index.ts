import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyHmacSha256 } from '../_shared/security.ts'

const RAZORPAY_WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const signature = req.headers.get('x-razorpay-signature');
    const bodyText = await req.text();

    if (!RAZORPAY_WEBHOOK_SECRET || !signature) {
      return new Response('Webhook signature is not configured', { status: 503 });
    }
    const isValid = await verifyHmacSha256(bodyText, signature, RAZORPAY_WEBHOOK_SECRET);
    if (!isValid) {
      return new Response('Invalid signature', { status: 400 });
    }

    const payload = JSON.parse(bodyText);
    const event = payload.event;
    const eventId = req.headers.get('x-razorpay-event-id') || payload.event_id || crypto.randomUUID();

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Idempotency Check: Log the event
    const { error: logError } = await supabase
      .from('payment_events')
      .insert({
        event_id: eventId,
        event_type: event,
        payload: payload
      });

    // If it fails with unique constraint, it means we already processed this event
    if (logError && logError.code === '23505') {
      return new Response('Already processed', { status: 200 });
    }

    // 2. Route the Event
    if (event === 'subscription.charged' || event === 'payment.captured') {
      // Find the subscription mapped to this provider_subscription_id (or notes.factory_id)
      const factoryId = payload.payload?.payment?.entity?.notes?.factory_id; // Pass this in checkout

      if (factoryId) {
        // Extend subscription by 1 month
        const newEndDate = new Date();
        newEndDate.setMonth(newEndDate.getMonth() + 1);

        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            current_period_end: newEndDate.toISOString()
          })
          .eq('factory_id', factoryId);

        // Generate Invoice record
        const amount = payload.payload?.payment?.entity?.amount / 100; // paise to INR
        
        await supabase
          .from('invoices')
          .insert({
            subscription_id: (await supabase.from('subscriptions').select('id').eq('factory_id', factoryId).single()).data?.id,
            amount: amount,
            gst_breakup: { igst: 0, cgst: amount * 0.09, sgst: amount * 0.09 }, // simplified logic
            status: 'paid'
          });

        // Trigger WhatsApp Receipt + PDF generation (simulated)
        console.log(`[Billing] Captured payment for factory ${factoryId}. Sent receipt.`);
      }
    } 
    else if (event === 'subscription.halted' || event === 'payment.failed') {
      const factoryId = payload.payload?.payment?.entity?.notes?.factory_id;
      
      if (factoryId) {
        // Gracefully degrade the subscription status
        await supabase
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('factory_id', factoryId);

        // Initiate Dunning logic
        console.log(`[Billing] Payment failed for factory ${factoryId}. Firing Dunning Day 0 template.`);
      }
    }

    return new Response(JSON.stringify({ received: true }), { 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
})
