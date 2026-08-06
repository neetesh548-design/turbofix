-- Create leads table for marketing contact forms
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    phone TEXT,
    company TEXT,
    machines TEXT,
    challenge TEXT,
    city TEXT,
    preferred_time TEXT,
    source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (from marketing page)
CREATE POLICY "Allow anonymous inserts" ON leads FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow service role full access" ON leads FOR ALL TO service_role USING (true) WITH CHECK (true);
