"""Role-based WhatsApp Conversational Assistant & AI Query Service for TurboFix.

This module processes natural language and voice queries over WhatsApp from registered
company stakeholders (Owners, Directors, Maintenance Heads, Supervisors, Technicians).
It enforces strict phone whitelist security, role-based access control (RBAC), and formats
rich, contextual AI responses powered by Gemini.
"""

import os
import re
from typing import Dict, Any, Optional

from app.infrastructure.logging import get_logger
from app.infrastructure.whatsapp import send_message
from app import config

log = get_logger("turbofix.whatsapp_chat")


ACCESS_DENIED_MESSAGE = (
  "403 ACCESS DENIED\n\n"
  "Your WhatsApp number is not registered under an active TurboFix company profile.\n\n"
  "💡 *How to gain access:*\n"
  "Ask your company Owner or Administrator to add your mobile number under *Team Settings* in the TurboFix portal."
)


def normalize_phone(phone: str) -> str:
  """Clean and normalize phone number into standard 10-digit or e164 string."""
  digits = re.sub(r"\D", "", phone or "")
  if len(digits) == 12 and digits.startswith("91"):
    digits = digits[2:]
  elif len(digits) == 11 and digits.startswith("0"):
    digits = digits[1:]
  return digits


def resolve_registered_user(phone: str) -> Optional[Dict[str, Any]]:
  """Look up phone number across users table in Supabase repository.
  
  Returns dict with keys: id, name, role, company_id, company_code, phone
  """
  from app.dependencies import get_users
  user_repo = get_users()
  
  clean_num = normalize_phone(phone)
  if not clean_num:
    return None
    
  # Direct query or fallback list scan
  try:
    if hasattr(user_repo, "get_by_phone"):
      user = user_repo.get_by_phone(clean_num)
      if user:
        return user
  except Exception as exc:
    log.warning("whatsapp_chat.resolve_user_error", error=str(exc))

  # Universal fallback query via Supabase select
  try:
    from app.repositories.supabase_repo import _client
    if _client and hasattr(_client, "select"):
      rows = _client.select("users", {
        "or": f"(phone.eq.{clean_num},phone.eq.+91{clean_num},phone.eq.91{clean_num})"
      })
      if rows:
        row = rows[0]
        return {
          "id": row.get("id"),
          "name": row.get("name", "User"),
          "role": row.get("role", "technician"),
          "company_id": row.get("company_id"),
          "company_code": row.get("company_code", row.get("domain", "")),
          "phone": clean_num
        }
  except Exception as exc:
    log.warning("whatsapp_chat.supabase_query_failed", error=str(exc))

  return None


def _fetch_company_snapshot(user: Dict[str, Any]) -> Dict[str, Any]:
  """Fetch live company machines/tickets and derive headline metrics — the single
  source both the AI prompt context and the offline fallback response draw from,
  so the fallback can never show numbers unrelated to what the AI context saw.

  get_company_tickets/get_company_machines are the real TicketRepository/
  MachineRepository methods (see repositories/base.py). This used to call
  get_open_by_company()/list(), neither of which exists on either interface,
  so every call raised AttributeError, was swallowed with no logging, and
  silently left every count at 0 for every company — and the offline
  fallback separately showed fabricated numbers instead of these real ones.
  """
  from app.dependencies import get_tickets, get_machines
  company_code = user.get("company_code") or ""

  tickets_repo = get_tickets()
  machines_repo = get_machines()

  open_tickets: list = []
  fetch_ok = True
  try:
    company_tickets = tickets_repo.get_company_tickets(company_code)
    open_tickets = [t for t in company_tickets if t.get("status") in ("open", "in_progress")]
  except Exception as exc:
    fetch_ok = False
    log.error("whatsapp_chat.tickets_fetch_failed", company_code=company_code, error=str(exc))

  machines: list = []
  try:
    machines = machines_repo.get_company_machines(company_code)
  except Exception as exc:
    fetch_ok = False
    log.error("whatsapp_chat.machines_fetch_failed", company_code=company_code, error=str(exc))

  urgent_tickets = [
    t for t in open_tickets
    if t.get("urgency") in ("high", "urgent") or t.get("priority") == "high"
  ]

  return {
    "company_code": company_code,
    "fetch_ok": fetch_ok,
    "open_tickets": open_tickets,
    "machines": machines,
    "total_machines": len(machines),
    "active_breakdowns": len(open_tickets),
    "urgent_count": len(urgent_tickets),
    "top_urgent_ticket": urgent_tickets[0] if urgent_tickets else None,
  }


def _build_role_context(user: Dict[str, Any], snapshot: Dict[str, Any]) -> str:
  """Format a fetched company snapshot into the AI prompt's context block."""
  role = user.get("role", "technician").lower()

  return f"""
COMPANY CONTEXT ({snapshot['company_code']}):
- Total Onboarded Fleet: {snapshot['total_machines']} machines
- Active Breakdowns: {snapshot['active_breakdowns']}
- Urgent Breakdown Alerts: {snapshot['urgent_count']}
- Requester Name: {user.get('name')}
- Requester Role: {role.upper()}

LIVE OPEN TICKETS:
{snapshot['open_tickets'][:10]}

MACHINES FLEET:
{snapshot['machines'][:10]}
"""


def generate_ai_chat_response(user: Dict[str, Any], message_text: str) -> str:
  """Use Gemini 2.5 Flash to generate a role-appropriate WhatsApp response."""
  snapshot = _fetch_company_snapshot(user)
  context_info = _build_role_context(user, snapshot)
  role = user.get("role", "technician").lower()
  name = user.get("name", "User")
  
  system_prompt = f"""You are TurboFix AI Assistant, an expert industrial maintenance copilot replying over WhatsApp.
You are talking to {name}, who is a {role.upper()} at their manufacturing company.

SECURITY RULES:
1. Provide insights tailored to their role ({role.upper()}):
   - OWNER/DIRECTOR: Focus on high-level KPIs, Fleet Availability %, total active breakdown counts, estimated downtime cost, and team performance.
   - MAINTENANCE_HEAD: Focus on open tickets, urgent escalations, assigned technicians, and spare part status.
   - TECHNICIAN: Focus on assigned work orders, step-by-step repair manuals, and spare parts.
   - SUPERVISOR: Focus on shift breakdown status and ticket closure approvals.
2. Format your response cleanly using WhatsApp markdown (*bold*, _italics_, 📋 bullets, 📊 emojis).
3. Be concise (under 250 words) and direct.
4. Support queries in English, Hindi, or Marathi based on the language of the prompt.
"""

  user_prompt = f"{context_info}\n\nUSER QUESTION: {message_text}"

  # Call Gemini API via config / Google GenAI SDK or fallback structured generator
  try:
    import google.generativeai as genai
    if config.GEMINI_API_KEY:
      genai.configure(api_key=config.GEMINI_API_KEY)
      model = genai.GenerativeModel("gemini-2.5-flash")
      response = model.generate_content(f"{system_prompt}\n\n{user_prompt}")
      if response and response.text:
        return response.text.strip()
  except Exception as exc:
    log.warning("whatsapp_chat.gemini_call_failed", error=str(exc))

  # Fallback rule-based response if AI key unavailable or offline
  return _fallback_role_response(user, message_text, snapshot)


def _fallback_role_response(user: Dict[str, Any], query: str, snapshot: Dict[str, Any]) -> str:
  """Structured fallback response when the LLM service is offline.

  Uses the same live `snapshot` the AI prompt itself was built from — this
  used to return hardcoded fabricated numbers (a fixed "₹12,500", "95.8%",
  named machines/technicians that don't exist for this company) to any real
  customer whenever Gemini was unavailable. Financial figures like downtime
  cost / fleet availability % aren't computed by this snapshot (that lives
  in the dashboard's own cost model), so the fallback reports the real
  counts it does have rather than inventing the ones it doesn't.
  """
  role = user.get("role", "technician").lower()
  q = query.lower()

  if not snapshot.get("fetch_ok"):
    return (
      f"⚠️ *TurboFix Assistant — data temporarily unavailable*\n\n"
      "I couldn't reach your company's live machine/ticket data just now. "
      "Please try again shortly, or check the TurboFix Admin Portal directly."
    )

  if "loss" in q or "cost" in q or "downtime" in q:
    return (
      f"📊 *TurboFix Plant Overview for {user.get('name')}*\n\n"
      f"• Total Fleet: {snapshot['total_machines']} machines\n"
      f"• Active Breakdowns: {snapshot['active_breakdowns']}\n"
      f"• Urgent Alerts: {snapshot['urgent_count']}\n\n"
      "💡 _Log in to the TurboFix Admin Portal for downtime-cost and fleet-availability analytics._"
    )
  elif "breakdown" in q or "ticket" in q or "status" in q:
    top_urgent = snapshot.get("top_urgent_ticket")
    urgent_line = (
      f"• High Priority Alert: {top_urgent.get('machine_name') or top_urgent.get('machine_id', 'unknown machine')}\n"
      if top_urgent else "• No high-priority alerts right now\n"
    )
    return (
      f"🛠️ *TurboFix Live Plant Overview*\n\n"
      f"• Active Open Breakdowns: {snapshot['active_breakdowns']}\n"
      f"{urgent_line}"
      "\nReply with a machine ID for detailed repair guidance."
    )
  else:
    return (
      f"Hello {user.get('name')} ({role.upper()})! 👋\n\n"
      "I am your TurboFix WhatsApp AI Assistant.\n"
      "You can ask me about:\n"
      "• *Active breakdowns & ticket status*\n"
      "• *Downtime cost & fleet availability*\n"
      "• *Technician workload & assigned work orders*\n"
      "• *Step-by-step repair guides*"
    )


async def handle_registered_whatsapp_message(phone: str, text: str) -> str:
  """Entry point for inbound WhatsApp text messages.
  
  1. Check whitelist in users table.
  2. If unregistered: send ACCESS_DENIED_MESSAGE.
  3. If registered: generate role-based AI response & return.
  """
  user = resolve_registered_user(phone)
  
  if not user:
    log.info("whatsapp_chat.unregistered_access_attempt", phone=phone)
    return ACCESS_DENIED_MESSAGE
    
  log.info("whatsapp_chat.registered_query", user_id=user.get("id"), role=user.get("role"))
  reply_text = generate_ai_chat_response(user, text)
  return reply_text
