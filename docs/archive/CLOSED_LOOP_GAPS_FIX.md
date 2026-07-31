# Closed-Loop Work Assignment Gaps — Fix Specification

**Issue:** Dashboard shows "2 loop gaps: open work, technician owner"
- Tickets created but not assigned to technicians
- No TechnicianWorkRepository records created to track work

**Root Cause:** Missing implementation in I2 (Repair Loop — Create & Assign stage)

When a new ticket is created, the system should:
1. ✗ Create a TechnicianWorkRepository entry
2. ✗ Assign to the machine's `assigned_technician_phone`
3. ✗ Set status to "open" for closed-loop tracking
4. ✗ Notify technician via WhatsApp

Currently: Tickets are created but work assignment is incomplete.

---

## Fix Locations

### 1. **ticket_service.py** — Add automatic work creation after ticket creation

Location: After `tickets.add()` in `handle_text_message()` and `handle_audio_message()`

```python
# AFTER ticket is created
technician_phone = machine.get("assigned_technician_phone", "")
if technician_phone:
    tech_work = {
        "ticket_id": ticket_id,
        "machine_id": machine_id,
        "company_code": company_code,
        "assigned_to_phone": technician_phone,
        "status": "open",
        "created_at": datetime.utcnow().isoformat(),
        "issue_description": description,
    }
    tech_work_repo.upsert(tech_work)
    
    # Log event
    _log_event(
        events, machine_id, company_code, ticket_id,
        "work_assigned", "system",
        f"Assigned to {technician_phone}",
    )
```

### 2. **dependencies.py** — Wire TechnicianWorkRepository into ticket handlers

Add to dependencies that ticket_service functions receive:
```python
def get_technician_work() -> TechnicianWorkRepository:
    from app.repositories import supabase_repo
    return supabase_repo.SupabaseTechnicianWorkRepository()
```

### 3. **fanout_service.py** — Notify technician of new work assignment

Add WhatsApp notification when work is assigned:
```python
async def notify_work_assigned(technician_phone: str, ticket: dict, machine: dict) -> None:
    msg = f"New work assigned: {machine.get('name')} - {ticket.get('issue_text')[:50]} (Ticket {ticket['ticket_id']})"
    # Send via WhatsApp
```

---

## Verification

**Functional Test:**
1. Create a ticket via WhatsApp (report an issue)
2. Verify TechnicianWorkRepository has a record with:
   - `ticket_id` matching the new ticket
   - `status` = "open"
   - `assigned_to_phone` = machine's technician phone
3. Verify technician receives WhatsApp notification

**Burden Test (I2 Repair Loop):**
- Technician doesn't need to do anything to receive the assignment
- Assignment happens automatically when ticket is created
- ✓ Zero new burden added

---

## Closed-Loop Impact

This fix **closes the I2 Repair Loop** (Create & Assign stage):
- Detect (I1) ✓ — Tickets created from voice/photo/scan
- **Create & Assign (I2)** ← **FIX HERE** — Work records created + assigned automatically
- Diagnose & Repair (I3) — Technician task screen shows assigned work
- Verify & Close (I4) — Closure workflow
- Record (I5) — Maintenance history
- Analyze (I6) — MTBF/MTTR/reliability
- Improve (I7) — PM updates based on feedback

Once I2 is complete, the entire **Repair Loop** becomes self-feeding: failures get assigned → fixed → verified → recorded → analyzed → prevented in the next cycle.

---

## Implementation Priority

**P0 (Critical)**: Automatic work assignment when ticket created
- This is **blocking** the closed-loop from functioning
- Every ticket created without a TechnicianWorkRepository entry is a broken loop cycle

**P1 (High)**: WhatsApp notification to technician
- Necessary for "zero burden" adoption
- Technician needs to know they have a job

**P2 (Medium)**: Dashboard "Control open work" feature
- Depends on TechnicianWorkRepository having correct data
- Will work correctly once P0 is complete

---

## Success Criteria

After fix:
1. ✓ New ticket created via WhatsApp
2. ✓ TechnicianWorkRepository entry exists with status="open"
3. ✓ Technician receives WhatsApp notification
4. ✓ Dashboard shows "0 loop gaps" or just "open work" (not "technician owner")
5. ✓ Technician can see their assigned work in Technician page

---

## Code Locations to Modify

| File | Function | Change |
|------|----------|--------|
| `backend/app/services/ticket_service.py` | `handle_text_message()` | Create TechnicianWorkRepository after ticket created |
| `backend/app/services/ticket_service.py` | `handle_audio_message()` | Create TechnicianWorkRepository after ticket created |
| `backend/app/dependencies.py` | (inject new dependency) | Add `tech_work_repo` parameter to ticket handlers |
| `backend/app/services/fanout_service.py` | (new function) | `notify_work_assigned()` — WhatsApp to technician |
| `backend/app/routers/webhook_router.py` | `receive_webhook()` | Pass `tech_work_repo` to handlers |

---

## Next Step

After implementing this fix, the dashboard will show:
- ✓ Tickets assigned to technicians (closes "technician owner" gap)
- ✓ Work tracked in TechnicianWorkRepository (closes "open work" gap)
- ✓ I2 Repair Loop becomes **functional and self-feeding**
