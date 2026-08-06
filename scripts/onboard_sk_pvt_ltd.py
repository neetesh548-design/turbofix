import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.dependencies import get_users
from app.auth import hash_password

def onboard_sk_pvt_ltd():
    user_repo = get_users()
    
    company_code = "SK_PVT_LTD"
    company_name = "SK Pvt Ltd"
    admin_contact_phone = "+919876543210"
    owner_name = "S. K. Sharma (Plant MD)"
    owner_email = "owner@skpvtltd.in"
    owner_password = "SK-Pvt-Ltd-Owner-2026!"
    machine_quota = 10

    print(f"--- 🏭 Manual Onboarding for Interested Client: {company_name} ({company_code}) ---")

    # 1. Check if company already exists
    existing = user_repo.get_company(company_code)
    if existing:
        print(f"⚠️ Company '{company_code}' already exists. Updating details and approval state...")
        user_repo.update_company(company_code, {
            "company_name": company_name,
            "admin_contact_phone": admin_contact_phone,
            "machine_quota": machine_quota,
            "approved": "yes"
        })
    else:
        # Create Company (initially pending approval)
        user_repo.add_company(
            company_code=company_code,
            company_name=company_name,
            admin_contact_phone=admin_contact_phone,
            machine_quota=machine_quota,
            approved=False  # Pending backend approval
        )
        print(f"✅ Factory/Company Entry Created (Status: Pending Approval)")

    # 2. Create Owner Account for the Factory
    hashed_pw = hash_password(owner_password)
    user_id = f"user_{company_code.lower()}_owner"
    
    existing_user = user_repo.get_by_identifier(owner_email)
    if not existing_user:
        user_repo.add({
            "user_id": user_id,
            "company_code": company_code,
            "name": owner_name,
            "email": owner_email,
            "phone": admin_contact_phone,
            "role": "owner",
            "password_hash": hashed_pw,
            "password": owner_password,
            "plant_location": "Main Manufacturing Bay - Unit 1",
            "department": "Plant Management"
        })
        print(f"👤 Created Owner User: {owner_name} ({owner_email})")
    else:
        print(f"👤 Owner User ({owner_email}) already exists.")

    # 3. Approve Company from Backend
    print("\n--- 🔑 Approving Company from Backend ---")
    user_repo.update_company(company_code, {"approved": "yes", "machine_quota": machine_quota})
    
    # 4. Verify Approval & Status
    approved_company = user_repo.get_company(company_code)
    is_approved = str(approved_company.get("approved") or "").strip().lower() in {"yes", "true", "1"}
    
    print("\n=======================================================")
    print("🎉 COMPANY ONBOARDING & BACKEND APPROVAL SUCCESSFUL")
    print("=======================================================")
    print(f"🏢 Company Code:     {approved_company.get('company_code')}")
    print(f"🏭 Company Name:     {approved_company.get('company_name')}")
    print(f"📞 Contact Phone:    {approved_company.get('admin_contact_phone')}")
    print(f"📊 Machine Quota:    {approved_company.get('machine_quota')} machines")
    print(f"✅ Backend Approved: {is_approved} ('yes')")
    print(f"👤 Owner Login:      {owner_email}")
    print(f"🔑 Owner Password:   {owner_password}")
    print("=======================================================")

if __name__ == "__main__":
    onboard_sk_pvt_ltd()
