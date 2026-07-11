# TurboFix Frontend (Supabase Migration)

This is the React frontend for the TurboFix application, successfully migrated from a legacy Python backend to a 100% serverless **Supabase** backend architecture.

## Architecture Highlights
- **Framework**: React + Vite
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth (replaces legacy custom JWTs)
- **Storage**: Supabase Storage (for document/manual uploads)
- **Serverless API**: Supabase Edge Functions (Deno/TypeScript) to handle WhatsApp Webhooks and AI Diagnostics.

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
Start the local Vite development server:
```bash
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
