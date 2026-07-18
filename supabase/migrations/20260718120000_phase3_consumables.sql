-- Phase 3: Consumables — reservation-based inventory, PO workflow, auto-reorder

-- Add reservation tracking to parts and consumables tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='parts' AND column_name='reserved_qty') THEN
        ALTER TABLE parts ADD COLUMN reserved_qty INT DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consumables' AND column_name='reserved_qty') THEN
        ALTER TABLE consumables ADD COLUMN reserved_qty INT DEFAULT 0;
    END IF;
END $$;

-- Purchase orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    po_code             TEXT UNIQUE NOT NULL,
    factory_id          UUID REFERENCES factories(id) ON DELETE CASCADE,
    part_request_id     UUID REFERENCES part_requests(id),
    item_type           TEXT NOT NULL CHECK (item_type IN ('spare_part', 'consumable')),
    item_id             TEXT,
    item_name           TEXT NOT NULL,
    item_number         TEXT,
    qty                 INT NOT NULL DEFAULT 1,
    vendor              TEXT,
    estimated_cost      NUMERIC,
    status              TEXT DEFAULT 'pending'
                        CHECK (status IN ('pending','approved','rejected','ordered','received','cancelled')),
    requested_by        TEXT,
    approved_by         TEXT,
    approved_at         TIMESTAMPTZ,
    rejection_reason    TEXT,
    auto_generated      BOOLEAN DEFAULT false,
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_purchase_orders_factory ON purchase_orders(factory_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on purchase_orders"
    ON purchase_orders FOR ALL
    USING (true)
    WITH CHECK (true);

-- Track last auto-reorder timestamp per item to prevent duplicates
CREATE TABLE IF NOT EXISTS auto_reorder_log (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    factory_id      UUID REFERENCES factories(id) ON DELETE CASCADE,
    item_type       TEXT NOT NULL,
    item_id         TEXT NOT NULL,
    po_id           UUID REFERENCES purchase_orders(id),
    triggered_at    TIMESTAMPTZ DEFAULT now(),
    UNIQUE(factory_id, item_type, item_id)
);

ALTER TABLE auto_reorder_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on auto_reorder_log"
    ON auto_reorder_log FOR ALL
    USING (true)
    WITH CHECK (true);
