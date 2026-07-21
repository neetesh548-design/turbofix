import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing environment variables.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Auth check if invoked manually, otherwise allowed via cron
    const authHeader = req.headers.get('Authorization');
    if (!authHeader && req.headers.get('x-forwarded-for')) {
      // Basic protection: Require service key or auth if not local cron
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    let generatedCount = 0;

    // Helper to process items and generate POs
    const processItems = async (items, type) => {
      for (const item of items) {
        const availableQty = (item.stock_qty || 0) - (item.reserved_qty || 0);
        const reorderLevel = item.reorder_level || 0;

        if (availableQty <= reorderLevel) {
          // Check if a pending/ordered PO already exists for this item
          const { data: existingPo } = await supabase
            .from('purchase_orders')
            .select('id')
            .eq('item_type', type)
            .eq('item_id', item.id)
            .in('status', ['pending', 'ordered', 'approved'])
            .limit(1);

          if (!existingPo || existingPo.length === 0) {
            // Generate PO
            const poCode = `PO-${type.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;
            const reorderQty = Math.max(1, (item.reorder_level || 5) * 2); // default logic: order double the reorder level
            
            const { data: po, error: poErr } = await supabase
              .from('purchase_orders')
              .insert({
                po_code: poCode,
                factory_id: item.factory_id,
                item_type: type,
                item_id: item.id,
                item_name: item.name,
                item_number: item.part_number || null,
                qty: reorderQty,
                estimated_cost: (item.unit_cost || 0) * reorderQty,
                status: 'pending',
                auto_generated: true,
                notes: `Auto-generated: Available stock (${availableQty}) reached reorder level (${reorderLevel}).`
              })
              .select('id')
              .single();
              
            if (!poErr && po) {
              generatedCount++;
              // Log the auto-reorder
              await supabase.from('auto_reorder_log').insert({
                factory_id: item.factory_id,
                item_type: type,
                item_id: item.id,
                po_id: po.id
              }).catch(() => {}); // ignore unique constraint errors
              
              // Notify maintenance head / supervisor
              const { data: factory } = await supabase.from('factories').select('id').eq('id', item.factory_id).single(); // find correct users in real app
              // In this demo, we'll skip direct notification generation and let the UI show pending POs
            }
          }
        }
      }
    };

    // 1. Process Parts
    const { data: parts } = await supabase.from('parts').select('*');
    if (parts) await processItems(parts, 'spare_part');

    // 2. Process Consumables
    const { data: consumables } = await supabase.from('consumables').select('*');
    if (consumables) await processItems(consumables, 'consumable');

    return new Response(JSON.stringify({ success: true, message: `Generated ${generatedCount} purchase orders.` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error in check_inventory:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
