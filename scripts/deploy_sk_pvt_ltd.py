import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.dependencies import get_users, get_machines
from app.auth import hash_password

def deploy_sk_pvt_ltd():
    user_repo = get_users()
    machine_repo = get_machines()
    
    company_code = "SK_PVT_LTD"
    company_name = "SK Pvt Ltd"
    admin_contact_phone = "+919876543210"
    machine_quota = 15

    print(f"--- 🏭 Onboarding Stakeholders & Equipment for: {company_name} ({company_code}) ---")

    # 1. Update / Ensure Company Record
    user_repo.add_company(
        company_code=company_code,
        company_name=company_name,
        admin_contact_phone=admin_contact_phone,
        machine_quota=machine_quota,
        approved=True
    )
    user_repo.update_company(company_code, {
        "company_name": company_name,
        "admin_contact_phone": admin_contact_phone,
        "machine_quota": machine_quota,
        "approved": "yes"
    })
    print(f"✅ Company Updated (Quota: {machine_quota}, Approved: Yes)")

    # Default Password for dummy accounts
    default_pw = "SkPvtLtd@2026!"
    hashed_pw = hash_password(default_pw)

    # 2. Stakeholders Definition
    # Owner
    owner_email = "raghav.sathe@skpvtltd.in"
    owner = {
        "user_id": f"user_{company_code.lower()}_owner",
        "company_code": company_code,
        "name": "Mr. Raghav Sathe",
        "phone": "+919876543210",
        "email": owner_email,
        "role": "owner",
        "password_hash": hashed_pw,
        "password": default_pw,
        "department": "Executive Management",
        "plant_location": "Headquarters / Main Plant",
    }

    # Maintenance Head (1)
    head_phone = "+919876543211"
    maint_head = {
        "user_id": f"user_{company_code.lower()}_maint_head",
        "company_code": company_code,
        "name": "Vikram Deshmukh (Maintenance Head)",
        "phone": head_phone,
        "email": "vikram.deshmukh@skpvtltd.in",
        "role": "maintenance_head",
        "password_hash": hashed_pw,
        "password": default_pw,
        "department": "Plant Maintenance",
        "plant_location": "Central Maintenance Shop",
    }

    # Maintenance Engineers (2)
    engineers = [
        {
            "user_id": f"user_{company_code.lower()}_eng_1",
            "company_code": company_code,
            "name": "Rajesh Verma (Sr. Maintenance Engineer)",
            "phone": "+919876543212",
            "email": "rajesh.verma@skpvtltd.in",
            "role": "maintenance_engineer",
            "password_hash": hashed_pw,
            "password": default_pw,
            "department": "Laser & Automation Engineering",
            "plant_location": "Bay 1 - CNC Division",
        },
        {
            "user_id": f"user_{company_code.lower()}_eng_2",
            "company_code": company_code,
            "name": "Anil Kulkarni (Process & Thermal Engineer)",
            "phone": "+919876543213",
            "email": "anil.kulkarni@skpvtltd.in",
            "role": "maintenance_engineer",
            "password_hash": hashed_pw,
            "password": default_pw,
            "department": "Heavy Fabrication Engineering",
            "plant_location": "Bay 2 - Heavy Cutting Cell",
        },
    ]

    # Supervisors (4)
    supervisors = [
        {
            "user_id": f"user_{company_code.lower()}_sup_1",
            "company_code": company_code,
            "name": "Suresh Patil (Laser Shop Supervisor)",
            "phone": "+919876543214",
            "email": "suresh.patil@skpvtltd.in",
            "role": "supervisor",
            "password_hash": hashed_pw,
            "password": default_pw,
            "department": "Sheet Metal Cutting",
            "plant_location": "Sheet Metal Bay 1",
        },
        {
            "user_id": f"user_{company_code.lower()}_sup_2",
            "company_code": company_code,
            "name": "Amit Shinde (CO2 & Waterjet Supervisor)",
            "phone": "+919876543215",
            "email": "amit.shinde@skpvtltd.in",
            "role": "supervisor",
            "password_hash": hashed_pw,
            "password": default_pw,
            "department": "Heavy & Precision Cutting",
            "plant_location": "Heavy Fabrication Bay",
        },
        {
            "user_id": f"user_{company_code.lower()}_sup_3",
            "company_code": company_code,
            "name": "Deepak Joshi (Plasma & Night Supervisor)",
            "phone": "+919876543216",
            "email": "deepak.joshi@skpvtltd.in",
            "role": "supervisor",
            "password_hash": hashed_pw,
            "password": default_pw,
            "department": "Structural Steel Cutting",
            "plant_location": "Structural Bay",
        },
        {
            "user_id": f"user_{company_code.lower()}_sup_4",
            "company_code": company_code,
            "name": "Kavita Mehta (General Shift Supervisor)",
            "phone": "+919876543217",
            "email": "kavita.mehta@skpvtltd.in",
            "role": "supervisor",
            "password_hash": hashed_pw,
            "password": default_pw,
            "department": "Production Operations",
            "plant_location": "Main Plant Floor",
        },
    ]

    # Technicians (9)
    technicians = [
        {
            "user_id": f"user_{company_code.lower()}_tech_1",
            "company_code": company_code,
            "name": "Manoj Kumar (Sr. Fiber Laser Tech)",
            "phone": "+919876543220",
            "email": "manoj.kumar@skpvtltd.in",
            "role": "technician",
            "password_hash": hashed_pw,
            "password": default_pw,
            "department": "Laser Maintenance",
            "plant_location": "Sheet Metal Bay 1",
        },
        {
            "user_id": f"user_{company_code.lower()}_tech_2",
            "company_code": company_code,
            "name": "Pravin Jadhav (Laser Optics Tech)",
            "phone": "+919876543221",
            "email": "pravin.jadhav@skpvtltd.in",
            "role": "technician",
            "password_hash": hashed_pw,
            "password": default_pw,
            "department": "Laser Maintenance",
            "plant_location": "Sheet Metal Bay 1",
        },
        {
            "user_id": f"user_{company_code.lower()}_tech_3",
            "company_code": company_code,
            "name": "Ramesh Pawar (CNC Laser Tech)",
            "phone": "+919876543222",
            "email": "ramesh.pawar@skpvtltd.in",
            "role": "technician",
            "password_hash": hashed_pw,
            "password": default_pw,
            "department": "Laser Maintenance",
            "plant_location": "Sheet Metal Bay 2",
        },
        {
            "user_id": f"user_{company_code.lower()}_tech_4",
            "company_code": company_code,
            "name": "Sanjay More (High-Power Laser Tech)",
            "phone": "+919876543223",
            "email": "sanjay.more@skpvtltd.in",
            "role": "technician",
            "password_hash": hashed_pw,
            "password": default_pw,
            "department": "Laser Maintenance",
            "plant_location": "Sheet Metal Bay 2",
        },
        {
            "user_id": f"user_{company_code.lower()}_tech_5",
            "company_code": company_code,
            "name": "Ganesh Rao (CO2 Laser Specialist)",
            "phone": "+919876543224",
            "email": "ganesh.rao@skpvtltd.in",
            "role": "technician",
            "password_hash": hashed_pw,
            "password": default_pw,
            "department": "CO2 Cutting Maintenance",
            "plant_location": "Heavy Fabrication Bay",
        },
        {
            "user_id": f"user_{company_code.lower()}_tech_6",
            "company_code": company_code,
            "name": "Vijay Kale (CO2 Resonator Tech)",
            "phone": "+919876543225",
            "email": "vijay.kale@skpvtltd.in",
            "role": "technician",
            "password_hash": hashed_pw,
            "password": default_pw,
            "department": "CO2 Cutting Maintenance",
            "plant_location": "Heavy Fabrication Bay",
        },
        {
            "user_id": f"user_{company_code.lower()}_tech_7",
            "company_code": company_code,
            "name": "Pankaj Kulkarni (Abrasive Waterjet Tech)",
            "phone": "+919876543226",
            "email": "pankaj.kulkarni@skpvtltd.in",
            "role": "technician",
            "password_hash": hashed_pw,
            "password": default_pw,
            "department": "Waterjet Maintenance",
            "plant_location": "Precision Cutting Cell",
        },
        {
            "user_id": f"user_{company_code.lower()}_tech_8",
            "company_code": company_code,
            "name": "Nilesh Thorat (High-Definition Plasma Tech)",
            "phone": "+919876543227",
            "email": "nilesh.thorat@skpvtltd.in",
            "role": "technician",
            "password_hash": hashed_pw,
            "password": default_pw,
            "department": "Plasma Cutting Maintenance",
            "plant_location": "Structural Steel Shop",
        },
        {
            "user_id": f"user_{company_code.lower()}_tech_9",
            "company_code": company_code,
            "name": "Santosh Gaikwad (Relief & Utility Tech)",
            "phone": "+919876543228",
            "email": "santosh.gaikwad@skpvtltd.in",
            "role": "technician",
            "password_hash": hashed_pw,
            "password": default_pw,
            "department": "Plant Maintenance",
            "plant_location": "Central Maintenance Shop",
        },
    ]

    all_users = [owner, maint_head] + engineers + supervisors + technicians

    print(f"\n--- 👥 Upserting {len(all_users)} Stakeholders ---")
    for u in all_users:
        existing_u = user_repo.get_by_identifier(u["email"])
        if not existing_u:
            user_repo.add(u)
            print(f"  + Registered {u['role'].upper()}: {u['name']} ({u['email']})")
        else:
            print(f"  ~ Existing User: {u['name']} ({u['email']})")

    # 3. Machines Definition (8 Machines)
    # 4 Laser Cutting Machines
    # 2 CO2 Cutting Machines
    # 1 Water Jet Cutting Machine
    # 1 Plasma Cutting Machine
    machines_spec = [
        # Laser Cutting (4)
        {
            "machine_name": "SK-LASER-01 (Bystronic Fiber Laser 6kW)",
            "location": "Sheet Metal Bay 1 - Station L1",
            "assigned_technician_phone": technicians[0]["phone"],
            "informed_phone_1": supervisors[0]["phone"],
            "informed_phone_2": engineers[0]["phone"],
            "informed_phone_3": head_phone,
        },
        {
            "machine_name": "SK-LASER-02 (Trumpf TruLaser 3030 8kW)",
            "location": "Sheet Metal Bay 1 - Station L2",
            "assigned_technician_phone": technicians[1]["phone"],
            "informed_phone_1": supervisors[0]["phone"],
            "informed_phone_2": engineers[0]["phone"],
            "informed_phone_3": head_phone,
        },
        {
            "machine_name": "SK-LASER-03 (Amada Ensis 3012 3kW)",
            "location": "Sheet Metal Bay 2 - Station L3",
            "assigned_technician_phone": technicians[2]["phone"],
            "informed_phone_1": supervisors[0]["phone"],
            "informed_phone_2": engineers[0]["phone"],
            "informed_phone_3": head_phone,
        },
        {
            "machine_name": "SK-LASER-04 (Mazak Optiplex 3015 10kW)",
            "location": "Sheet Metal Bay 2 - Station L4",
            "assigned_technician_phone": technicians[3]["phone"],
            "informed_phone_1": supervisors[0]["phone"],
            "informed_phone_2": engineers[0]["phone"],
            "informed_phone_3": head_phone,
        },

        # CO2 Cutting (2)
        {
            "machine_name": "SK-CO2-01 (Trumpf TruCoax 2000 CO2 Cutter)",
            "location": "Heavy Fabrication Bay - Station C1",
            "assigned_technician_phone": technicians[4]["phone"],
            "informed_phone_1": supervisors[1]["phone"],
            "informed_phone_2": engineers[1]["phone"],
            "informed_phone_3": head_phone,
        },
        {
            "machine_name": "SK-CO2-02 (Bystronic Bysprint 3015 CO2)",
            "location": "Heavy Fabrication Bay - Station C2",
            "assigned_technician_phone": technicians[5]["phone"],
            "informed_phone_1": supervisors[1]["phone"],
            "informed_phone_2": engineers[1]["phone"],
            "informed_phone_3": head_phone,
        },

        # Waterjet Cutting (1)
        {
            "machine_name": "SK-WATERJET-01 (Flow Mach 500 Abrasive Waterjet)",
            "location": "Precision Cutting Cell - Station W1",
            "assigned_technician_phone": technicians[6]["phone"],
            "informed_phone_1": supervisors[1]["phone"],
            "informed_phone_2": engineers[1]["phone"],
            "informed_phone_3": head_phone,
        },

        # Plasma Cutting (1)
        {
            "machine_name": "SK-PLASMA-01 (ESAB Suprarex Heavy Duty Plasma)",
            "location": "Structural Steel Shop - Station P1",
            "assigned_technician_phone": technicians[7]["phone"],
            "informed_phone_1": supervisors[2]["phone"],
            "informed_phone_2": engineers[1]["phone"],
            "informed_phone_3": head_phone,
        },
    ]

    print(f"\n--- 🚜 Onboarding {len(machines_spec)} Industrial Cutting Machines ---")
    existing_machines = machine_repo.get_company_machines(company_code)
    existing_names = {m.get("machine_name") for m in existing_machines}

    for i, mdata in enumerate(machines_spec, start=1):
        machine_code = f"TF-{company_code}-M{i:03d}"
        if mdata["machine_name"] not in existing_names:
            machine_repo.create({
                "machine_id": machine_code,
                "company_code": company_code,
                "machine_name": mdata["machine_name"],
                "location": mdata["location"],
                "assigned_technician_phone": mdata["assigned_technician_phone"],
                "informed_phone_1": mdata["informed_phone_1"],
                "informed_phone_2": mdata["informed_phone_2"],
                "informed_phone_3": mdata["informed_phone_3"],
            })
            print(f"  + Created Machine [{machine_code}]: {mdata['machine_name']}")
        else:
            print(f"  ~ Existing Machine: {mdata['machine_name']}")

    print("\n=======================================================")
    print("🎉 SK PVT LTD STAKEHOLDERS & MACHINES ONBOARDED SUCCESSFULLY")
    print("=======================================================")
    print(f"🏢 Company Code:      {company_code}")
    print(f"🏭 Company Name:      {company_name}")
    print(f"👤 Owner Name:        Mr. Raghav Sathe ({owner_email})")
    print(f"📞 Owner Phone:       +919876543210")
    print(f"🔑 Default Password:   {default_pw}")
    print(f"👥 Total Stakeholders: 17 Users (1 Owner, 1 Maint Head, 2 Engineers, 4 Supervisors, 9 Technicians)")
    print(f"⚙️ Total Equipment:    8 Machines (4 Laser, 2 CO2, 1 Waterjet, 1 Plasma)")
    print(f"📊 Machine Quota:     15 Machines")
    print("=======================================================")

if __name__ == "__main__":
    deploy_sk_pvt_ltd()
