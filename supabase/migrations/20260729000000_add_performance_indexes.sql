-- Performance Indexing Migration for TurboFix Production DB
-- Created: 2026-07-29

-- 1. Ticket indexes for fast company & machine queries
CREATE INDEX IF NOT EXISTS idx_tickets_factory ON public.tickets(factory_id);
CREATE INDEX IF NOT EXISTS idx_tickets_machine ON public.tickets(machine_id);
CREATE INDEX IF NOT EXISTS idx_tickets_escalation ON public.tickets(status, next_escalation_at) WHERE escalation_paused = false;

-- 2. Event & Document indexes
CREATE INDEX IF NOT EXISTS idx_events_ticket ON public.events(ticket_id);
CREATE INDEX IF NOT EXISTS idx_documents_machine ON public.documents(machine_id);

-- 3. Parts & Consumables tenant indexes
CREATE INDEX IF NOT EXISTS idx_parts_factory ON public.parts(factory_id);
CREATE INDEX IF NOT EXISTS idx_parts_machine ON public.parts(machine_id);
CREATE INDEX IF NOT EXISTS idx_consumables_factory ON public.consumables(factory_id);
CREATE INDEX IF NOT EXISTS idx_consumables_machine ON public.consumables(machine_id);

-- 4. User lookup & login indexes
CREATE INDEX IF NOT EXISTS idx_users_company ON public.users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);

-- 5. Company domain index
CREATE INDEX IF NOT EXISTS idx_companies_domain ON public.companies(domain);
