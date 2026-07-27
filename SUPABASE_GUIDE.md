# Supabase Setup & Configuration Guide for TurboFix

## Overview
TurboFix uses Supabase for database, authentication, and real-time features. This guide covers setup, migrations, and common operations.

---

## 1. **Initial Setup**

### Create Supabase Project
1. Go to https://supabase.com
2. Click "New Project"
3. Select region closest to your users
4. Set strong database password
5. Wait for project to initialize (5-10 minutes)

### Get Your Credentials
```
Project URL: https://wcqgbleppiaddgfjrnpq.supabase.co
Anon Key: (public key - safe in frontend)
Service Role Key: (secret - backend only)
```

Store these in `.env` or environment variables:
```
VITE_SUPABASE_URL=https://wcqgbleppiaddgfjrnpq.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 2. **Running Migrations**

### Option A: Via Supabase Dashboard (Easiest)

1. Open Supabase Dashboard → SQL Editor
2. Click "+ New Query"
3. Copy-paste migration SQL
4. Click "Run"

**Migrations to apply in order:**
```
1. supabase/migrations/20260711131850_init_schema.sql
2. supabase/migrations/20260711135509_add_accountability.sql
3. supabase/migrations/20260711163434_add_schedules_and_lead_times.sql
... (all migrations in chronological order)
4. supabase/migrations/20260727_setup_demo_auth_users.sql ← IMPORTANT FOR DEMO
```

### Option B: Via Supabase CLI

```bash
# Install CLI
npm install -g supabase

# Link to your project
supabase link --project-ref wcqgbleppiaddgfjrnpq

# Push all migrations
supabase db push
```

---

## 3. **Create Demo Auth Users** (Required for Demo Login)

### Copy the full SQL from this file:
```
supabase/migrations/20260727_setup_demo_auth_users.sql
```

### Paste into Supabase SQL Editor and run:
This creates auth users for:
- `owner@turbofix.co.in` (Demo Owner) - Password: `demo-password-123`
- `lead@turbofix.co.in` (Demo Lead) - Password: `demo-password-123`
- `tech@turbofix.co.in` (Demo Tech) - Password: `demo-password-123`

---

## 4. **Understanding RLS (Row Level Security)**

### What is RLS?
- Controls which rows users can access based on their identity
- Checked at `auth.uid()` - the authenticated user's ID
- When `auth.uid()` is NULL, RLS blocks queries

### Key RLS Policy for TurboFix:
```sql
create policy "Users can view machines in same company"
on public.machines for select
using (company_id = public.get_current_company_id());
```

This checks: `machine's company_id == user's company_id`

### Why Demo Login Failed:
```
Demo Login → localStorage token → No Supabase session
→ auth.uid() = NULL → RLS blocks query → "No machine" error
```

### Fix: Real Auth User Required
After applying the migration above, demo users have real auth accounts, so:
```
Demo Login → Supabase auth session → auth.uid() = UUID
→ RLS allows query → Machine data loads
```

---

## 5. **Database Schema Overview**

### Core Tables:
```
companies          ← Organizations
  ├─ users        ← Team members (linked by company_id)
  ├─ machines     ← Factory equipment
  │  ├─ parts     ← Spare parts inventory
  │  └─ consumables ← Lubricants, coolant, etc.
  ├─ tickets      ← Maintenance issues
  └─ documents    ← Manuals, diagrams
```

### Key Columns:
- `company_id` (UUID) - Links data to organization
- `id` - Unique identifier
- `created_at` - Timestamp
- `status` - State field

---

## 6. **Common Operations**

### View All Companies:
```sql
SELECT * FROM public.companies;
```

### View Users in ACME3:
```sql
SELECT * FROM public.users 
WHERE company_id = 'a1000000-0000-0000-0000-000000000001';
```

### View Machines by Company:
```sql
SELECT * FROM public.machines 
WHERE company_id = 'a1000000-0000-0000-0000-000000000001';
```

### Create New Company:
```sql
INSERT INTO public.companies (name, domain, status)
VALUES ('New Factory', 'NEWFACTORY', 'active');
```

### Create Demo User for Company:
```sql
INSERT INTO public.users (id, company_id, name, role, email, phone, created_at)
VALUES (
  gen_random_uuid(),
  'a1000000-0000-0000-0000-000000000001',  -- ACME3
  'John Doe',
  'owner',
  'john@example.com',
  '+919876543210',
  now()
);
```

---

## 7. **Authentication Flow**

### Current Setup (Demo Mode):
```
User clicks "Log in as Demo Owner"
  ↓
Login.jsx stores demo user in localStorage
  ↓
Frontend can read localStorage (no auth check)
  ↓
BUT: API calls are blocked by RLS (no Supabase session)
```

### Proper Setup (After Migration):
```
User clicks "Log in as Demo Owner"
  ↓
Supabase authenticates user → creates session
  ↓
auth.uid() is set to user's ID
  ↓
RLS policies allow data access
  ↓
Full app functionality works
```

---

## 8. **Troubleshooting**

### "No machine was linked to this RCA"
**Cause**: RLS blocking query (no auth session)
**Fix**: Apply `20260727_setup_demo_auth_users.sql` migration

### "Password was not accepted"
**Cause**: Wrong password or auth user doesn't exist
**Fix**: Check `auth.users` table; recreate auth user if missing

### "Loading portfolio..." (Forever)
**Cause**: API call blocked by RLS
**Fix**: Ensure user is authenticated and company_id matches

### RLS Error: "Insufficient permissions"
**Cause**: User's company doesn't match data's company
**Fix**: Check `company_id` in users vs machines/tickets tables

### Can't see machines even when logged in
**Cause**: User not linked to company or wrong company
**Fix**: Check `users.company_id` matches `machines.company_id`

---

## 9. **Useful Queries**

### Check Auth Users:
```sql
SELECT id, email FROM auth.users LIMIT 10;
```

### Check Public Users Table:
```sql
SELECT id, email, company_id, role FROM public.users LIMIT 10;
```

### Find Machines by Company Code:
```sql
SELECT m.* FROM public.machines m
JOIN public.companies c ON m.company_id = c.id
WHERE c.domain = 'ACME3';
```

### Debug RLS:
```sql
-- Check current user ID (NULL if not authenticated)
SELECT auth.uid();

-- Check get_current_company_id function
SELECT public.get_current_company_id();
```

---

## 10. **Production Checklist**

- [ ] Set strong database password
- [ ] Configure environment variables
- [ ] Apply all migrations
- [ ] Create production auth users
- [ ] Set up Row Level Security policies
- [ ] Enable database backups
- [ ] Configure email (for password resets)
- [ ] Set up custom domain (optional)
- [ ] Enable MFA for admin accounts
- [ ] Disable anonymous signups

---

## 11. **Key Concepts for TurboFix**

### Company Isolation
Each company can ONLY see their own data via RLS.
```
Company A users → Can only query Company A machines/tickets
Company B users → Can only query Company B machines/tickets
```

### Demo Company Structure
```
Company: ACME3
├─ User: Demo Owner (owner@turbofix.co.in)
├─ Machine 1: CNC Lathe 1
├─ Machine 2: Hydraulic Press
└─ Parts/Consumables for each machine
```

### Ticket Workflow
```
Operator reports issue → Ticket created
  ↓
Ticket shows in Maintenance Head's queue
  ↓
Technician gets assignment
  ↓
RCA (Root Cause Analysis) recorded
  ↓
Work order closed (ticket resolved)
```

---

## 12. **Next Steps**

1. **Apply Demo Auth Migration** (highest priority)
   ```
   Go to Supabase → SQL Editor → Run: 20260727_setup_demo_auth_users.sql
   ```

2. **Verify Demo Login Works**
   - Open TurboFix app
   - Click "Log in as Demo Owner"
   - Should redirect to dashboard

3. **Test RCA Page**
   - Go to Inventory page
   - Open a machine's ticket
   - Click "Analyze" → Should load RCA page with machine context

4. **Monitor for Issues**
   - Check Supabase logs for RLS violations
   - Verify auth sessions are created

---

## Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **RLS Guide**: https://supabase.com/docs/guides/auth/row-level-security
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **TurboFix Issue**: Check CLAUDE.md for project-specific guidance

---

## Quick Reference

| Task | Command/Steps |
|------|---|
| **Run Migration** | Supabase SQL Editor → Paste SQL → Run |
| **Create User** | INSERT into auth.users + public.users |
| **Debug Auth** | `SELECT auth.uid();` |
| **Check RLS** | Verify company_id matches |
| **Reset Password** | Supabase Auth → Users tab |
| **View Logs** | Supabase → Logs (SQL) |

---

**Last Updated**: 2026-07-27
**Created for**: TurboFix v1.0
