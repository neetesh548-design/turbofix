# TurboFix — AI Maintenance Decision Platform

TurboFix helps manufacturing SMEs turn machine history, preventive maintenance, breakdowns, spares, and factory records into practical maintenance decisions.

## Architecture Highlights
- **Framework**: React + Vite
- **Application API**: FastAPI with company-scoped JWT authentication
- **Data store**: Local Excel for demos or Google Sheets for hosted pilots
- **File storage**: Local disk for development or Google Drive for production
- **AI providers**: Gemini or OpenAI, selected through backend configuration
- **Integrations**: WhatsApp webhook flow plus retained Supabase migrations/functions

## AI Records Workflow

The **AI Records** workspace converts existing paper and digital machine records into approved machine knowledge:

1. Technicians, supervisors, engineers, owners, or Maintenance Heads upload photos, scans, PDFs, Excel, Word, CSV, or text files.
2. AI extracts machine identity, specifications, maintenance tasks, spares, consumables, service history, and risks with confidence and source references.
3. Plant users correct the review draft; only the **Maintenance Head** can approve or reject it.
4. Only approved facts are written into `{MachineName}MachineData.md` and used by TurboFix AI.
5. Backup exports include originals, structured JSON, CSV, approval history, and MachineData files. Restored records require Maintenance Head re-approval.

---

## WhatsApp Escalation System (Systems Thinking Design)

TurboFix uses two parallel WhatsApp-integrated escalation chains with company-specific staged thresholds, AI-powered diagnosis, and approval-based closure.

### Two Escalation Chains

**Breakdown Repair Chain:**
Operator reports breakdown via WhatsApp (machine ID + photo + voice) → Gemini AI diagnoses using machine history, manuals, wiring/hydraulic diagrams → ticket created → escalation ladder fires based on company-configured thresholds:

```
Technician → Supervisor → Maint. Engineer → Maint. Head → Owner
```

**Consumables & Spares Chain:**
Machine Owner requests parts via WhatsApp → AI checks BOM compatibility + inventory → escalation ladder:

```
Machine Owner → Store Incharge → Store Manager → VP/Owner
```

### Company-Specific Staged Thresholds

Each factory configures its own escalation timing per level in `escalation_config` (Supabase). There is no global default — thresholds are fully company-controlled. Example:

| Level | Threshold |
|-------|-----------|
| Technician | 45 min |
| Supervisor | 60 min |
| Maint. Engineer | 60 min |
| Maint. Head | 45 min |
| Owner notified at | T+3h 30m |

### Ticket Lifecycle (Breakdown)

1. **Operator** sends WhatsApp message with machine ID + photo + voice note
2. **Gemini AI** processes photo/voice, cross-references machine history/manuals/diagrams, produces structured diagnosis with urgency classification
3. **Ticket created** in Supabase, company thresholds loaded, Level 1 timer starts
4. **Technician notified** via WhatsApp with AI diagnosis + suggested parts
5. **Technician actions:**
   - **Fix it** → submit evidence photo → Maintenance Head approves/rejects closure
   - **Delegate** → reassign to colleague (timer resets) or escalate to manager
   - **Outsource** → manager marks as outsourced with vendor + evidence (timer pauses)
6. **Auto-escalation** fires if no action within threshold
7. **Maintenance Head approval** required for all closures — no ticket closes without evidence review

### Feedback Loops (Systems Thinking)

| Loop | Type | Behavior |
|------|------|----------|
| R1: AI Learning | Reinforcing | More tickets → better diagnosis → faster resolution → more trust |
| R2: Pressure Spiral | Reinforcing | Escalation pressure → rushed fixes → repeat failures → more tickets |
| R3: Outsourcing Trap | Reinforcing | Outsourcing → skill erosion → more outsourcing |
| B1: Threshold Governance | Balancing | Too many escalations → admin extends thresholds → fewer escalations |
| B2: Inventory Homeostasis | Balancing | Parts consumed → stock drops → PO raised → stock replenished |
| B3: Workload Distribution | Balancing | Overloaded technician → delegation → load balances |

### Countermeasures Built Into the System

- **Fixes That Fail:** AI tracks repeat failures per machine; >2 tickets in 30 days for same component auto-flags for preventive overhaul
- **Shifting the Burden:** Technicians must confirm/adjust AI diagnosis — system tracks override rate
- **Limits to Growth:** Tickets-per-technician ratio monitored; delegation shows colleague workload before allowing
- **Eroding Goals:** Threshold drift tracked over time; safety ceiling alerts if total escalation window exceeds 1 shift
- **Outsourcing Dependency:** Vendor repair docs captured and absorbed into AI knowledge base

### Implementation Phases

| Phase | Scope | Leverage Points |
|-------|-------|----------------|
| **1: Foundation** (Weeks 1-3) COMPLETED | Core ticket lifecycle, escalation engine, approval flow, WhatsApp templates | Bottleneck visibility, approval delegation, waiting_parts |
| **2: Intelligence** (Weeks 4-5) COMPLETED | AI feedback loop, load-aware delegation, repeat failure detection, shift handover | AI feedback closure, smart routing |
| **3: Consumables** (Weeks 6-7) COMPLETED | Parts chain, reservation-based inventory, PO workflow, auto-reorder | Inventory management |
| **4: Predictive** (Weeks 8-10) COMPLETED | Predictive maintenance, daily digest, downtime cost, threshold drift monitoring | Reactive → proactive shift |
| **5: WaCRM Integration** COMPLETED | Self-hosted WhatsApp CRM layer — shared inbox, contact management, broadcasts, conversation tracking | CRM visibility, team collaboration |

### Health Metrics

| Metric | Target | Guards Against |
|--------|--------|---------------|
| MTTR | < 45 min | Slow resolution |
| Escalation Rate | < 20% | Level 1 failing |
| Repeat Failure Rate | < 5% | Fixes That Fail |
| AI Diagnosis Accuracy | > 75% | Stale AI |
| Outsource Rate | < 15% | Outsourcing dependency |
| Tickets per Technician | < 3 | Burnout / limits to growth |
| Dead Zone Tickets | 0 | System lost track of broken machine |

### WaCRM Integration (Phase 5)

TurboFix integrates with [WaCRM](https://github.com/ArnasDon/wacrm) — a self-hosted WhatsApp CRM — to provide shared inbox, contact management, broadcasts, and conversation tracking without changing any existing escalation logic.

**How it works:**
- When `WACRM_API_URL` + `WACRM_API_KEY` are set, all WhatsApp sends route through WaCRM's public API (`/api/v1`)
- When not set, the system falls back to direct Meta Cloud API calls (zero-config for existing deployments)
- WaCRM webhook (`POST /wacrm-webhook`) receives inbound messages from WaCRM with `X-Wacrm-Signature` verification

**Admin endpoints** (`/admin/wacrm/*`):

| Endpoint | Description |
|----------|-------------|
| `GET /admin/wacrm/status` | Check WaCRM connection and account info |
| `GET /admin/wacrm/contacts` | List/search CRM contacts |
| `POST /admin/wacrm/contacts` | Create or find a contact |
| `PATCH /admin/wacrm/contacts/{id}` | Update contact details/tags |
| `GET /admin/wacrm/conversations` | List conversations (filter by status/contact) |
| `GET /admin/wacrm/conversations/{id}` | Get conversation detail |
| `GET /admin/wacrm/conversations/{id}/messages` | Message history |
| `POST /admin/wacrm/messages/send` | Send a text message via admin |
| `POST /admin/wacrm/broadcasts` | Launch template broadcast |
| `GET /admin/wacrm/broadcasts/{id}` | Check broadcast delivery status |
| `GET /admin/wacrm/webhooks` | List registered WaCRM webhooks |
| `POST /admin/wacrm/webhooks` | Register a new webhook endpoint |

**Environment variables:**
```env
WACRM_API_URL=https://your-crm.example.com
WACRM_API_KEY=wacrm_live_xxxxxxx
WACRM_WEBHOOK_SECRET=whsec_xxx
```

---

## Getting Started Locally

### Prerequisites
Make sure you have Node.js and the Supabase CLI installed on your machine.

```bash
# Install dependencies
npm install

# (Optional) Install Supabase CLI globally if not already installed
npm install -g supabase
```

### Environment Setup
You must have a `.env` file at the root of the `demo-site` directory containing your Supabase project credentials. This allows the local server to communicate with your live Supabase database.

Create a `.env` file with:
```env
VITE_SUPABASE_URL=https://<YOUR-PROJECT-ID>.supabase.co
VITE_SUPABASE_ANON_KEY=<YOUR-ANON-PUBLIC-KEY>
```

### Running the App
Start the FastAPI backend and Vite frontend in separate terminals:
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# From the repository root
npm run dev
```

---

## 🗄️ Database Management (Supabase CLI)

If you need to make changes to the database schema, we use the local Supabase CLI to push migrations to the cloud database.

### 1. Link your local project to Supabase
First, authenticate your CLI and link to your project reference:
```bash
# Login to Supabase CLI (will open a browser to retrieve an access token)
npx supabase login

# Link your local folder to your Supabase Project (replace <PROJECT_REF> with your Project ID)
npx supabase link --project-ref <PROJECT_REF>
```
*(You will be prompted to enter your database password).*

### 2. Push Schema Updates
If there are new migration files in `supabase/migrations/`, push them to your live database:
```bash
npx supabase db push
```
This automatically applies all SQL changes (Tables, Row Level Security, Storage Buckets).

### 3. Deploy Edge Functions
To update the backend logic (WhatsApp Webhook, AI Diagnostics, Email Notifications), push the Edge Functions:
```bash
npx supabase functions deploy
```

---

## 🚢 Deployment

This React application is configured to deploy statically (typically to GitHub Pages).

```bash
# Build the production bundle
npm run build

# Deploy the bundle to gh-pages branch
npm run deploy
```
*Note: Because Vite bakes environment variables into the build, ensure your `.env` file contains your Supabase credentials before running `npm run build`.*
