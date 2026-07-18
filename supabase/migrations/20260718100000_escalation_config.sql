-- Escalation configuration: company-specific staged thresholds for
-- breakdown repair and consumables/spares chains.

CREATE TABLE IF NOT EXISTS escalation_config (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    factory_id      UUID REFERENCES factories(id) ON DELETE CASCADE,
    chain_type      TEXT NOT NULL CHECK (chain_type IN ('breakdown', 'consumable')),
    level           INT  NOT NULL CHECK (level BETWEEN 1 AND 5),
    threshold_min   INT  NOT NULL CHECK (threshold_min > 0),
    role_label      TEXT NOT NULL,
    notify_phone    TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(factory_id, chain_type, level)
);

CREATE INDEX idx_escalation_config_factory ON escalation_config(factory_id);

ALTER TABLE escalation_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on escalation_config"
    ON escalation_config FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE escalation_config IS
    'Per-factory escalation thresholds. Each row defines how many minutes '
    'a given escalation level waits before notifying the next person.';

-- Extend tickets with escalation tracking fields.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='current_escalation_level') THEN
        ALTER TABLE tickets
            ADD COLUMN current_escalation_level INT DEFAULT 1,
            ADD COLUMN next_escalation_at       TIMESTAMPTZ,
            ADD COLUMN escalation_paused        BOOLEAN DEFAULT false,
            ADD COLUMN delegated_from           TEXT,
            ADD COLUMN delegation_count         INT DEFAULT 0,
            ADD COLUMN outsource_vendor         TEXT,
            ADD COLUMN outsource_reason         TEXT,
            ADD COLUMN outsource_evidence_url   TEXT,
            ADD COLUMN closure_evidence_url     TEXT,
            ADD COLUMN closure_approved_by      TEXT,
            ADD COLUMN rejection_count          INT DEFAULT 0,
            ADD COLUMN rejection_reason         TEXT;
    END IF;
END $$;

-- Part requests table for the consumables chain.
CREATE TABLE IF NOT EXISTS part_requests (
    id                       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    factory_id               UUID REFERENCES factories(id) ON DELETE CASCADE,
    request_code             TEXT UNIQUE NOT NULL,
    machine_id               TEXT,
    requested_by_phone       TEXT,
    part_name                TEXT NOT NULL,
    part_number              TEXT,
    qty                      INT DEFAULT 1,
    status                   TEXT DEFAULT 'open'
                             CHECK (status IN ('open','issued','po_pending','po_approved','po_rejected','escalated','closed')),
    stock_status             TEXT,
    issued_by                TEXT,
    issue_evidence_url       TEXT,
    po_vendor                TEXT,
    po_amount                NUMERIC,
    po_approved_by           TEXT,
    linked_ticket_id         TEXT,
    current_escalation_level INT DEFAULT 1,
    next_escalation_at       TIMESTAMPTZ,
    created_at               TIMESTAMPTZ DEFAULT now(),
    updated_at               TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_part_requests_factory ON part_requests(factory_id);

ALTER TABLE part_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on part_requests"
    ON part_requests FOR ALL
    USING (true)
    WITH CHECK (true);
