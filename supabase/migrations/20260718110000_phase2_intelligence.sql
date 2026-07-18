-- Phase 2: Intelligence — AI feedback loop, repeat failure detection, shift handover

-- AI feedback tracking on tickets
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='ai_diagnosis_confirmed') THEN
        ALTER TABLE tickets
            ADD COLUMN ai_diagnosis_confirmed BOOLEAN,
            ADD COLUMN technician_override_reason TEXT,
            ADD COLUMN repeat_failure_flag BOOLEAN DEFAULT false,
            ADD COLUMN repeat_failure_count INT DEFAULT 0;
    END IF;
END $$;

-- Shift configuration per factory
CREATE TABLE IF NOT EXISTS shift_config (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    factory_id      UUID REFERENCES factories(id) ON DELETE CASCADE,
    shift_name      TEXT NOT NULL,
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    timezone        TEXT DEFAULT 'Asia/Kolkata',
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(factory_id, shift_name)
);

ALTER TABLE shift_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on shift_config"
    ON shift_config FOR ALL
    USING (true)
    WITH CHECK (true);

-- AI feedback aggregate table (per-machine accuracy tracking)
CREATE TABLE IF NOT EXISTS ai_feedback_stats (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    factory_id      UUID REFERENCES factories(id) ON DELETE CASCADE,
    machine_id      TEXT NOT NULL,
    total_diagnoses INT DEFAULT 0,
    confirmed       INT DEFAULT 0,
    overridden      INT DEFAULT 0,
    accuracy_pct    NUMERIC(5,2) DEFAULT 0,
    last_updated    TIMESTAMPTZ DEFAULT now(),
    UNIQUE(factory_id, machine_id)
);

ALTER TABLE ai_feedback_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on ai_feedback_stats"
    ON ai_feedback_stats FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE INDEX idx_ai_feedback_factory ON ai_feedback_stats(factory_id);
