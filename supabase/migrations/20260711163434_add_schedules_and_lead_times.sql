-- 1. Create Suppliers Table
CREATE TABLE public.suppliers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  whatsapp_number text,
  email text
);

-- 2. Modify Parts Table
ALTER TABLE public.parts
ADD COLUMN lead_time_days integer NOT NULL DEFAULT 0,
ADD COLUMN supplier_id uuid REFERENCES public.suppliers(id),
ADD COLUMN stock_qty integer DEFAULT 0;

-- Migrate existing qty_on_hand data to stock_qty (if needed) then drop qty_on_hand
UPDATE public.parts SET stock_qty = qty_on_hand;
ALTER TABLE public.parts DROP COLUMN qty_on_hand;

-- 3. Modify Consumables Table
-- Note: Reorder level and old qty_on_hand are replaced with our robust schedule logic
ALTER TABLE public.consumables
ADD COLUMN lead_time_days integer NOT NULL DEFAULT 0,
ADD COLUMN buffer_days integer DEFAULT 3,
ADD COLUMN frequency_days integer,
ADD COLUMN last_replaced_at timestamp with time zone,
ADD COLUMN next_due_at timestamp with time zone,
ADD COLUMN stock_qty integer DEFAULT 0,
ADD COLUMN supplier_id uuid REFERENCES public.suppliers(id);

UPDATE public.consumables SET stock_qty = qty_on_hand;
ALTER TABLE public.consumables DROP COLUMN qty_on_hand;

-- 4. Create Postgres Trigger for auto-calculating next_due_at on Consumables
CREATE OR REPLACE FUNCTION public.calculate_next_due_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_replaced_at IS NOT NULL AND NEW.frequency_days IS NOT NULL THEN
    NEW.next_due_at = NEW.last_replaced_at + (NEW.frequency_days || ' days')::interval;
  ELSE
    NEW.next_due_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_consumable_next_due
BEFORE INSERT OR UPDATE OF last_replaced_at, frequency_days
ON public.consumables
FOR EACH ROW
EXECUTE FUNCTION public.calculate_next_due_at();

-- 5. Close the Loop Trigger (Ticket Resolution)
CREATE OR REPLACE FUNCTION public.handle_ticket_resolution()
RETURNS TRIGGER AS $$
DECLARE
  cid uuid;
BEGIN
  -- Check if the ticket was just resolved and is a preventative ticket
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' AND NEW.type = 'preventive' THEN
    -- Extract consumable_id from ai_summary (JSONB)
    cid := (NEW.ai_summary->>'consumable_id')::uuid;
    
    IF cid IS NOT NULL THEN
      -- Update last_replaced_at and decrement stock_qty
      UPDATE public.consumables
      SET 
        last_replaced_at = now(),
        stock_qty = GREATEST(stock_qty - 1, 0)
      WHERE id = cid;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_ticket_resolved
AFTER UPDATE OF status
ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.handle_ticket_resolution();

