"""Trigger weekly reports for stakeholders (Store, Purchase, Owners, Supervisors).

Can be run via cron or a manual admin trigger.
"""
import asyncio
import os
import sys

# Add backend to path so we can run this directly
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.email_client import send_email
from app.infrastructure import whatsapp
from app.infrastructure.logging import get_logger
from app.repositories.supabase_repo import (
    SupabaseMachineRepository,
    SupabaseTicketRepository,
    SupabaseUserRepository,
)
from app.services.report_service import generate_report, format_report_text

log = get_logger("turbofix.weekly_reports")

async def send_weekly_role_reports():
    user_repo = SupabaseUserRepository()
    machine_repo = SupabaseMachineRepository()
    ticket_repo = SupabaseTicketRepository()

    companies = user_repo.list_companies()
    users = user_repo.list_users()

    for company in companies:
        company_code = company.get("company_code")
        if not company_code:
            continue
            
        try:
            report_data = generate_report(
                company_code,
                company.get("company_name", company_code),
                "weekly",
                ticket_repo,
                machine_repo
            )
            report_text = format_report_text(report_data)
        except Exception as exc:
            log.error("weekly_reports.generate_failed", company=company_code, error=str(exc))
            continue

        # Find stakeholders for this company
        stakeholders = [
            u for u in users 
            if u.get("company_code") == company_code 
            and u.get("role", "").lower() in ["owner", "supervisor", "store manager", "purchase manager"]
        ]

        for user in stakeholders:
            email = user.get("email")
            phone = user.get("phone")
            opt_out = user.get("opt_out_whatsapp", False)
            
            # Send Email
            if email:
                try:
                    send_email(
                        to=email,
                        subject=f"TurboFix Weekly Report - {company.get('company_name', company_code)}",
                        body=report_text
                    )
                    log.info("weekly_reports.email_sent", to=email)
                except Exception as exc:
                    log.error("weekly_reports.email_failed", to=email, error=str(exc))
            
            # Send WhatsApp
            if phone and not opt_out:
                try:
                    # Depending on template, we might use send_text_message for plain text reports
                    await whatsapp.send_text_message(phone, report_text)
                    log.info("weekly_reports.whatsapp_sent", to=phone)
                except Exception as exc:
                    log.error("weekly_reports.whatsapp_failed", to=phone, error=str(exc))


if __name__ == "__main__":
    asyncio.run(send_weekly_role_reports())
