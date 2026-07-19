-- AI Usage Logging & Rate Limiting
-- Tracks every AI Assistant call for security monitoring, cost control,
-- and abuse detection.

CREATE TABLE IF NOT EXISTS ai_usage_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id),
  company_id  uuid NOT NULL REFERENCES companies(id),
  action      text NOT NULL DEFAULT 'chat',        -- 'chat', 'transcribe', 'image'
  question    text,                                 -- first 200 chars only (no PII)
  tokens_est  integer DEFAULT 0,                    -- estimated token count
  latency_ms  integer DEFAULT 0,                    -- round-trip latency
  status      text NOT NULL DEFAULT 'ok',           -- 'ok', 'blocked', 'error', 'rate_limited'
  error_msg   text,                                 -- short error message (no secrets)
  ip_address  text,                                 -- for anomaly detection
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes for fast rate-limit checks and admin dashboard queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_hour
  ON ai_usage_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_company_day
  ON ai_usage_log (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_status
  ON ai_usage_log (status, created_at DESC);

-- RLS: only service_role can insert/read (Edge Functions use service role)
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

-- No public policies → only service_role key can access
-- This prevents any user from reading or tampering with usage logs
