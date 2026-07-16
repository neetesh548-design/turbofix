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

## 🚀 Getting Started Locally

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
