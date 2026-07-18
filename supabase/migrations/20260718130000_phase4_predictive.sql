-- Phase 4: Predictive — maintenance scheduling, downtime cost, threshold drift, daily digest

-- Predictive maintenance fields on machines
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='machines' AND column_name='last_maintenance_date') THEN
        ALTER TABLE machines
            ADD COLUMN last_maintenance_date DATE,
            ADD COLUMN maintenance_interval_days INT DEFAULT 90,
            ADD COLUMN next_maintenance_due DATE,
            ADD COLUMN hourly_downtime_cost NUMERIC DEFAULT 0,
            ADD COLUMN total_downtime_hours NUMERIC DEFAULT 0,
            ADD COLUMN total_downtime_cost NUMERIC DEFAULT 0;
    END IF;
END $$;

-- Predictive maintenance alerts log
CREATE TABLE IF NOT EXISTS maintenance_predictions (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    factory_id      UUID REFERENCES factories(id) ON DELETE CASCADE,
    machine_id      TEXT NOT NULL,
    prediction_type TEXT NOT NULL CHECK (prediction_type IN ('overdue','upcoming','pattern_detected')),
    severity        TEXT DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
    message         TEXT NOT NULL,
    acknowledged    BOOLEAN DEFAULT false,
    acknowledged_by TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_predictions_factory ON maintenance_predictions(factory_id);
ALTER TABLE maintenance_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on maintenance_predictions"
    ON maintenance_predictions FOR ALL USING (true) WITH CHECK (true);

-- Daily digest configuration per factory
CREATE TABLE IF NOT EXISTS digest_config (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    factory_id      UUID REFERENCES factories(id) ON DELETE CASCADE,
    send_time       TIME DEFAULT '08:00',
    timezone        TEXT DEFAULT 'Asia/Kolkata',
    recipient_phones TEXT[] DEFAULT '{}',
    enabled         BOOLEAN DEFAULT true,
    last_sent_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(factory_id)
);

ALTER TABLE digest_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on digest_config"
    ON digest_config FOR ALL USING (true) WITH CHECK (true);

-- Threshold drift history
CREATE TABLE IF NOT EXISTS threshold_drift_log (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    factory_id      UUID REFERENCES factories(id) ON DELETE CASCADE,
    chain_type      TEXT NOT NULL,
    level           INT NOT NULL,
    old_threshold   INT NOT NULL,
    new_threshold   INT NOT NULL,
    changed_at      TIMESTAMPTZ DEFAULT now(),
    changed_by      TEXT
);

CREATE INDEX idx_drift_log_factory ON threshold_drift_log(factory_id);
ALTER TABLE threshold_drift_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on threshold_drift_log"
    ON threshold_drift_log FOR ALL USING (true) WITH CHECK (true);
