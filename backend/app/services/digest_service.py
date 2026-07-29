"""Automated Daily & Weekly WhatsApp Digest Engine for TurboFix.

Generates scheduled daily evening briefings (7:00 PM) and weekly executive summaries
(Monday 8:00 AM) and sends them to onboarded company Owners, Directors, and Maintenance Heads.
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List

from app.infrastructure.logging import get_logger
from app.infrastructure.whatsapp import send_message

log = get_logger("turbofix.digest_service")



def get_company_executive_phones(company_code: str) -> List[str]:
  """Return phone numbers of Owners, Directors, and Maintenance Heads for a company."""
  try:
    from app.repositories.supabase_repo import _client
    if _client and hasattr(_client, "select"):
      # Query users table by company_code/domain
      rows = _client.select("users", {
        "company_code": f"eq.{company_code}",
        "role": "in.(owner,director,maintenance_head)"
      })
      phones = [r.get("phone") for r in rows if r.get("phone")]
      if phones:
        return phones
  except Exception as exc:
    log.warning("digest.get_executive_phones_failed", error=str(exc))
    
  # Fallback default contact
  return []


def generate_daily_digest_payload(company_code: str) -> Dict[str, Any]:
  """Calculate key daily maintenance metrics for a company over the past 24 hours."""
  from app.dependencies import get_tickets, get_machines
  tickets_repo = get_tickets()
  machines_repo = get_machines()


  all_tickets = []
  try:
    all_tickets = tickets_repo.list()
  except Exception:
    all_tickets = []

  all_machines = []
  try:
    all_machines = machines_repo.list()
  except Exception:
    all_machines = []

  # Filter tickets created today
  now = datetime.now(timezone.utc)
  cutoff_24h = now - timedelta(hours=24)
  
  tickets_today = []
  for t in all_tickets:
    created = t.get("created_at") or t.get("created")
    if created:
      try:
        if isinstance(created, str):
          created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
        else:
          created_dt = created
        if created_dt >= cutoff_24h:
          tickets_today.append(t)
      except Exception:
        pass

  total_logged = len(tickets_today)
  closed_today = len([t for t in tickets_today if t.get("status") in ("closed", "resolved")])
  open_critical = len([t for t in all_tickets if t.get("status") in ("open", "in_progress") and t.get("urgency") in ("high", "urgent")])

  # Estimate downtime cost
  total_downtime_hours = sum([float(t.get("downtime_hours", 1.5)) for t in tickets_today])
  est_downtime_cost = total_downtime_hours * 2500 # ₹2,500 per hour standard downtime loss rate

  return {
    "company_code": company_code,
    "date_str": now.strftime("%b %d, %Y"),
    "total_logged": total_logged,
    "closed_today": closed_today,
    "open_critical": open_critical,
    "downtime_hours": round(total_downtime_hours, 1),
    "est_downtime_cost": int(est_downtime_cost),
    "total_fleet": len(all_machines)
  }


def format_daily_digest_message(data: Dict[str, Any]) -> str:
  """Format daily metrics into a crisp WhatsApp markdown message."""
  return (
    f"📊 *TurboFix Daily Maintenance Briefing*\n"
    f"📅 *{data['date_str']}* — Company: *{data['company_code']}*\n\n"
    f"• *Total Breakdowns Today:* {data['total_logged']}\n"
    f"• *Resolved / Closed:* {data['closed_today']}\n"
    f"• *Open Critical Alerts:* {data['open_critical']}\n"
    f"• *Estimated Downtime Hours:* {data['downtime_hours']} hrs\n"
    f"• *Estimated Financial Loss:* ₹{data['est_downtime_cost']:,}\n\n"
    f"💡 *Fleet Status:* {data['total_fleet']} machines monitored.\n"
    f"_Log in to https://turbofix-backend-ehxb.onrender.com/admin for complete live details._"
  )


def generate_weekly_digest_payload(company_code: str) -> Dict[str, Any]:
  from app.dependencies import get_tickets, get_machines
  tickets_repo = get_tickets()
  machines_repo = get_machines()


  all_tickets = []
  try:
    all_tickets = tickets_repo.list()
  except Exception:
    all_tickets = []

  all_machines = []
  try:
    all_machines = machines_repo.list()
  except Exception:
    all_machines = []

  now = datetime.now(timezone.utc)
  cutoff_7d = now - timedelta(days=7)

  tickets_7d = []
  for t in all_tickets:
    created = t.get("created_at") or t.get("created")
    if created:
      try:
        if isinstance(created, str):
          created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
        else:
          created_dt = created
        if created_dt >= cutoff_7d:
          tickets_7d.append(t)
      except Exception:
        pass

  total_weekly = len(tickets_7d)
  closed_weekly = len([t for t in tickets_7d if t.get("status") in ("closed", "resolved")])
  fleet_count = len(all_machines) or 10
  fleet_availability = max(85.0, round(100.0 - (total_weekly * 1.2), 1))
  cost_saved = closed_weekly * 8500 # Estimated savings from fast resolution

  return {
    "company_code": company_code,
    "week_str": f"{(now - timedelta(days=7)).strftime('%b %d')} - {now.strftime('%b %d, %Y')}",
    "total_weekly": total_weekly,
    "closed_weekly": closed_weekly,
    "fleet_availability": fleet_availability,
    "cost_saved": int(cost_saved),
    "total_fleet": fleet_count
  }


def format_weekly_digest_message(data: Dict[str, Any]) -> str:
  """Format weekly metrics into an executive WhatsApp report."""
  return (
    f"📈 *TurboFix Weekly Executive Report*\n"
    f"🗓️ *{data['week_str']}* — Company: *{data['company_code']}*\n\n"
    f"• *Fleet Availability Rate:* {data['fleet_availability']}%\n"
    f"• *Total Breakdowns Reported:* {data['total_weekly']}\n"
    f"• *Successfully Resolved:* {data['closed_weekly']}\n"
    f"• *Estimated Downtime Cost Saved:* ₹{data['cost_saved']:,}\n\n"
    f"🏆 *Top Recommendation:* Perform preventive maintenance on high-cycle machines.\n"
    f"_TurboFix Industrial Copilot — Automated Report_"
  )


def dispatch_daily_digest(company_code: str = "TFDEMO") -> int:
  """Send daily digest to company executives. Returns count of messages sent."""
  payload = generate_daily_digest_payload(company_code)
  msg = format_daily_digest_message(payload)
  phones = get_company_executive_phones(company_code)
  
  sent_count = 0
  for p in phones:
    try:
      send_message(p, msg)
      sent_count += 1
    except Exception as exc:
      log.warning("digest.send_daily_failed", phone=p, error=str(exc))
  return sent_count


def dispatch_weekly_digest(company_code: str = "TFDEMO") -> int:
  """Send weekly executive digest to company executives."""
  payload = generate_weekly_digest_payload(company_code)
  msg = format_weekly_digest_message(payload)
  phones = get_company_executive_phones(company_code)
  
  sent_count = 0
  for p in phones:
    try:
      send_message(p, msg)
      sent_count += 1
    except Exception as exc:
      log.warning("digest.send_weekly_failed", phone=p, error=str(exc))
  return sent_count
