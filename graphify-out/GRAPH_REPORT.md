# Graph Report - /Users/nkumarsoni/TurboFix  (2026-07-24)

## Corpus Check
- 10 files · ~385,860 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2555 nodes · 5548 edges · 204 communities (134 shown, 70 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 519 edges (avg confidence: 0.55)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- UserRepository
- EventRepository
- whatsapp_webhook/index.ts
- DocumentRepository
- CurrentUser
- admin_router.py
- fanout_service.py
- LocalTicketRepository
- auth_headers
- main.py
- TicketRepository
- base.py
- consumables_service.py
- MachineRepository
- test_new_features.py
- Dashboard.jsx
- FileStorage
- kpi_router.py
- config.py
- AppShell.jsx
- react
- SheetsTicketRepository
- wacrm_client.py
- Top Navigation Bar
- .select
- dependencies
- TurboFix WhatsApp Brochure (Marketing Image)
- QRGatewayTestHelper
- read_records
- whatsapp.py
- test_webhook.py
- devDependencies
- provider.py
- logging.py
- machine_record_service.py
- App.jsx
- ai_assistant/index.ts
- summarize.py
- escalation_service.py
- intelligence_service.py
- Records.jsx
- auth_router.py
- is_configured
- LocalUserRepository
- sw-strategies.js
- SessionStore
- conftest.py
- gemini.py
- .get
- components.json
- scripts
- Home.jsx
- test_gemini.py
- dependencies.py
- SupabaseFileStorage
- SupabaseTicketRepository
- test_vault_quota_admin.py
- useI18n
- get_tickets
- .insert
- I18nManager
- ai_service.py
- SheetsPartsRepository
- checklist.md
- PerformanceMonitor
- SheetsMachineRecordRepository
- performance.jsx
- auth.py
- company_hierarchy
- report_service.py
- SupabaseUserRepository
- FakeAsyncClient
- hash_password
- webhook_router.py
- parse_message
- SheetsCustomKpiRepository
- machine_data_service.py
- dialog.jsx
- select.jsx
- OfflineQueue
- SupabasePartsRepository
- ShutdownPlanner.jsx
- LocalDocumentRepository
- LocalCustomKpiRepository
- LocalPartsRepository
- test_contact_privacy.py
- icons.svg (Icon Sprite Sheet)
- table.jsx
- ticket_gateway/index.ts
- LocalMachineRecordRepository
- LocalTechnicianWorkRepository
- SheetsDocumentRepository
- SupabaseMachineRecordRepository
- SupabaseCustomKpiRepository
- test_admin_onboarding.py
- test_machine_records.py
- .oxlintrc.json
- card.jsx
- accessibility.js
- StorageManager
- LocalSettingsRepository
- get_technician_load
- ErrorBoundary
- useTheme.jsx
- Settings.jsx
- SheetsTechnicianWorkRepository
- test_vault_signup.py
- compilerOptions
- tabs.jsx
- roles.js
- Tickets.jsx
- dashboard-fixtures.js
- SheetsSettingsRepository
- seed_local_demo.py
- FakeAuthClient
- migrate.cjs
- package.json
- NotificationCenter.jsx
- alert.jsx
- onboard_team_member/index.ts
- AUDIT_REPORT.md
- TurboFix Backend README
- imports
- imports
- imports
- imports
- imports
- imports
- imports
- imports
- imports
- imports
- qr-gateway.spec.ts
- qrgateway.spec.js
- TurboFix Production CI/CD Workflow
- TurboFix Brand Identity
- generate_logo.py
- seed_demo.py
- _FakeBrief
- README.md
- DashboardWidget.jsx
- badge.jsx
- button.jsx
- dashboardLayout.js
- escalation.js
- qrgateway-utils.test.js
- pwa.js
- inbound_email_receiver/index.ts
- qr-gateway.fixture.ts
- Post-Login Audit Report
- Offline Capabilities & Caching Strategy
- Company Isolation & Multi-Tenancy
- html-to-react
- lucide-react
- radix-ui
- tw-animate-css
- sw.js
- asset-service/index.ts
- check_inventory/index.ts
- notification-service/index.ts
- ticket-service/index.ts
- TurboFix-Improvements-Onboarding.md
- vite.config.js
- QRGateway E2E Tests Workflow
- local/__init__.py
- tests/__init__.py
- DocumentRepository
- Dual-Mode Repositories
- playwright.config.js
- playwright.config.ts
- reporting/index.ts

## God Nodes (most connected - your core abstractions)
1. `MachineRepository` - 129 edges
2. `TicketRepository` - 113 edges
3. `CurrentUser` - 103 edges
4. `UserRepository` - 94 edges
5. `auth_headers()` - 89 edges
6. `DocumentRepository` - 87 edges
7. `MachineRecordRepository` - 81 edges
8. `login()` - 81 edges
9. `PartsRepository` - 76 edges
10. `CustomKpiRepository` - 60 edges

## Surprising Connections (you probably didn't know these)
- `Visual Spare Part Deduction` --semantically_similar_to--> `Closed-Loop Maintenance`  [INFERRED] [semantically similar]
  settings-screenshot.png → docs/TURBOFIX_FEATURE_TICKET_LIST.md
- `IoT Predictive Power-Signature` --semantically_similar_to--> `Machine Knowledge`  [INFERRED] [semantically similar]
  settings-screenshot.png → docs/TURBOFIX_FEATURE_TICKET_LIST.md
- `Records()` --references--> `MachineRecordRepository`  [INFERRED]
  src/pages/Records.jsx → docs/TURBOFIX_PRD.md
- `Dashboard()` --references--> `CustomKpiRepository`  [INFERRED]
  src/pages/Dashboard.jsx → docs/TURBOFIX_TECHNICAL_ARCHITECTURE.md
- `QRGateway()` --references--> `TicketRepository`  [INFERRED]
  src/pages/QRGateway.jsx → docs/TURBOFIX_TECHNICAL_ARCHITECTURE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Smart Modules Configuration Options** — settings_screenshot_iot_predictive_power_signature, settings_screenshot_visual_spare_part_deduction, settings_screenshot_dynamic_supply_chain_sync, settings_screenshot_opportunistic_mesh_syncing, settings_screenshot_location_handshake_verification [EXTRACTED 1.00]
- **TurboFix Main Workflow Pages** — src_pages_qrgateway_qrgateway, src_pages_technician_technician, src_pages_machines_machines, src_pages_records_records, src_pages_dashboard_dashboard [INFERRED 0.85]
- **Onboarding and Adoption Documentation** — turbofix_improvements_onboarding_file, turbofix_onboarding_plan_file, turbofix_closedloop_systemsplan_file [INFERRED 0.85]
- **Core Security and Quality Measures** — audit_report_file, checklist_file, readme_file [INFERRED 0.85]

## Communities (204 total, 70 thin omitted)

### Community 0 - "UserRepository"
Cohesion: 0.04
Nodes (73): Role, CustomKpiRepository, PartsRepository, ABC, Abstract base classes (interfaces) for all TurboFix data repositories.  Every co, Read/write access to the Users and Companies entities., Generate a new unique user ID scoped to a company., Look up a user by phone or email (case-insensitive). (+65 more)

### Community 1 - "EventRepository"
Cohesion: 0.05
Nodes (71): CurrentUser, The authenticated caller's identity, parsed straight from the JWT - no extra, Enforces the same multi-tenant isolation used for tickets/machines         elsew, get_file_storage(), Return the FileStorage implementation selected by DOCUMENT_STORE env var., DocumentRepository, MachineRecordRepository, Read/write access to the Documents metadata entity. (+63 more)

### Community 2 - "whatsapp_webhook/index.ts"
Cohesion: 0.05
Nodes (32): TechnicianWorkRepository, react, react, DirectionProvider(), getFlagEmoji(), LanguageStats(), LanguageSwitcher(), LocalizedDate() (+24 more)

### Community 3 - "DocumentRepository"
Cohesion: 0.07
Nodes (49): OPENAI_API_KEY, allowedOrigins, cors(), reply(), RAZORPAY_WEBHOOK_SECRET, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN (+41 more)

### Community 4 - "CurrentUser"
Cohesion: 0.08
Nodes (52): _content_matches_extension(), FileStorage, FileTooLargeError, ABC, Pluggable file storage — local disk (dev/test) and Google Drive (production).  T, Return file bytes for a storage_path previously returned by save()., Delete the file at storage_path. Silently ignores missing files., Check that file content magic bytes match the claimed extension. (+44 more)

### Community 5 - "admin_router.py"
Cohesion: 0.06
Nodes (39): MachineRecordRepository, CustomKpiRepository, apiFetch(), getApiBase(), asNumber(), buildMonthlyTrend(), computeBacklog(), computeBacklogVelocity() (+31 more)

### Community 6 - "fanout_service.py"
Cohesion: 0.04
Nodes (43): Self-contained internal TurboFix platform administration console., create_admin_token(), get_escalation_config(), get_shift_config(), admin_company_users(), admin_console(), admin_login(), get_downtime_summary() (+35 more)

### Community 7 - "LocalTicketRepository"
Cohesion: 0.05
Nodes (19): Validate a Supabase access token and resolve authorization from public.users., _resolve_supabase_user(), DriveFileStorage, LocalFileStorage, _object_key(), Path, Stores files on the local filesystem under DOCUMENT_STORE_DIR.      WARNING: Rai, Stores files in a Google Drive folder using the Drive API.      Files are organi (+11 more)

### Community 8 - "auth_headers"
Cohesion: 0.11
Nodes (34): auth_headers(), login(), test_assistant_rejects_machine_from_another_company(), test_machine_assistant_uses_exact_question_and_machine_data(), test_plant_wide_ai_context_contains_every_company_machine(), test_plant_wide_assistant_has_live_data_fallback(), TestOnboardingPhoneValidation, test_cannot_download_another_companys_document() (+26 more)

### Community 9 - "main.py"
Cohesion: 0.06
Nodes (12): LocalEventRepository, LocalMachineRepository, LocalTicketRepository, Reads/writes events in the MachineEvents tab of the local tracker workbook., Reads/writes machines in the Machines tab of the local tracker workbook.      Ma, Return the next Mnnn code for a company (e.g. 'M003' if M001/M002 exist)., Reads/writes tickets in the Tickets tab of the local tracker workbook., machine_repo() (+4 more)

### Community 10 - "TicketRepository"
Cohesion: 0.07
Nodes (28): Send turbofix_new_ticket: ticket, machine, location, issue, urgency, assignee., send_template_message(), _all_recipients(), _assignee(), _closure_params(), notify_ticket(), Fan-out service — notifies technicians and informed users about tickets.  Each r, All stakeholders + the original worker who reported the issue. (+20 more)

### Community 11 - "base.py"
Cohesion: 0.08
Nodes (41): get_account_info(), get_broadcast_status(), get_conversation(), get_conversation_messages(), get_or_create_contact(), _headers(), is_configured(), list_contacts() (+33 more)

### Community 12 - "consumables_service.py"
Cohesion: 0.07
Nodes (30): new_kpi_entry_id(), new_kpi_id(), LocalCustomKpiRepository, In-memory implementation of CustomKpiRepository for local dev/testing., add_custom_kpi(), delete_custom_kpi(), get_kpi_history(), KpiConfigIn (+22 more)

### Community 13 - "MachineRepository"
Cohesion: 0.07
Nodes (39): configure_logging(), Call once at application startup (from main.py lifespan)., _auto_reorder_loop(), _daily_digest_loop(), _drift_check_loop(), _escalation_loop(), health(), _lifespan() (+31 more)

### Community 14 - "test_new_features.py"
Cohesion: 0.08
Nodes (29): _is_retryable(), Resilient HTTP client with tenacity retry + exponential backoff.  Wraps httpx fo, get_logger(), Structured JSON logging for TurboFix, backed by structlog.  Every log event prod, Return a structlog logger bound to `name`.      The returned logger behaves exac, WaCRM public API client for TurboFix.  Routes WhatsApp operations through a self, Webhook router — WhatsApp webhook receive + verify.  This router is intentionall, check_and_flag_on_creation() (+21 more)

### Community 15 - "Dashboard.jsx"
Cohesion: 0.11
Nodes (37): EventRepository, new_event_id(), Read/write access to the MachineEvents data entity., ai_enabled(), Return True if any AI provider is configured and ready., notify_closure(), Notify all stakeholders + the worker that a ticket has been closed.      If a tr, _detect_and_store_language() (+29 more)

### Community 16 - "FileStorage"
Cohesion: 0.08
Nodes (36): approve_purchase_order(), check_and_reserve_stock(), _check_reorder_for_table(), create_part_request(), create_purchase_order(), _find_inventory_item(), get_purchase_order(), _has_recent_auto_reorder() (+28 more)

### Community 17 - "kpi_router.py"
Cohesion: 0.11
Nodes (29): MachineRepository, Read/write access to the Machines data entity., Return {machine_id: {...}} for all machines (may be cached)., Return the machine dict, or None if not found., Append a new machine row. Keys must match MACHINES_HEADER (minus has_open_ticket, Force the next load() to re-read from the backing store., Return the next Mnnn code for a company, e.g. 'M003'., Return all machines belonging to a company. (+21 more)

### Community 18 - "config.py"
Cohesion: 0.08
Nodes (15): Path, rewrite_document_paths(), client(), _events_for_machine(), _image_payload(), _last_ticket(), Tests for new features: photo support, language detection, ticket closure, machi, TestImageSupport (+7 more)

### Community 19 - "AppShell.jsx"
Cohesion: 0.14
Nodes (20): get_custom_kpis(), get_documents(), get_events(), get_machine_records(), get_machines(), get_parts(), get_settings(), get_technician_work() (+12 more)

### Community 20 - "react"
Cohesion: 0.12
Nodes (12): Any, new_user_id(), _get_all_values(), Read canonical records while tolerating old, extra, or blank columns.      Produ, read_records(), _normalize(), Google Sheets implementation of UserRepository., Reads/writes Users and Companies worksheets in a Google Sheet. (+4 more)

### Community 21 - "SheetsTicketRepository"
Cohesion: 0.11
Nodes (18): Footer(), LanguageGate(), Navbar(), SkipLink(), LanguageContext, useLanguage(), MainLayout(), contentByLanguage (+10 more)

### Community 22 - "wacrm_client.py"
Cohesion: 0.07
Nodes (18): Read/write access to the Tickets data entity., Generate a new unique ticket ID., Append a new ticket row. Keys must match TICKETS_HEADER., Return the ticket dict for ticket_id, or None if not found., Set voice_note_media_id on the matching row. Returns True if found., Update AI-generated fields on the matching ticket. Returns True if found., Return all tickets belonging to a company., Set photo_media_id on the matching row. Returns True if found. (+10 more)

### Community 23 - "Top Navigation Bar"
Cohesion: 0.13
Nodes (6): Reads/writes events in the MachineEvents worksheet of a Google Sheet., Reads/writes machines in the Machines worksheet of a Google Sheet.      Maintain, Reads/writes tickets in the Tickets worksheet of a Google Sheet., SheetsEventRepository, SheetsMachineRepository, SheetsTicketRepository

### Community 24 - ".select"
Cohesion: 0.15
Nodes (22): get_sessions(), Dependency that returns the module-level session store., _audio_payload(), _enable_fanout_credentials(), _FakeBrief, _last_ticket_row(), Webhook endpoint tests — updated for the SOLID architecture.  Uses FastAPI's dep, test_ai_failure_is_swallowed_and_ticket_stays_logged() (+14 more)

### Community 25 - "dependencies"
Cohesion: 0.07
Nodes (27): @axe-core/playwright, gh-pages, jsdom, oxlint, devDependencies, @axe-core/playwright, gh-pages, jsdom (+19 more)

### Community 26 - "TurboFix WhatsApp Brochure (Marketing Image)"
Cohesion: 0.13
Nodes (20): ensure_headers(), _find_worksheet(), get_client(), get_spreadsheet(), get_worksheet(), _open_spreadsheet(), Shared, cached Google Sheets client for all Sheets-backed repositories.  A singl, Return a cached spreadsheet instead of fetching metadata every request. (+12 more)

### Community 27 - "QRGatewayTestHelper"
Cohesion: 0.07
Nodes (27): class-variance-authority, clsx, jszip, lucide-react, dependencies, class-variance-authority, clsx, jszip (+19 more)

### Community 28 - "read_records"
Cohesion: 0.13
Nodes (27): Automatic Technician Alerts (Feature), Reply DEMO on WhatsApp (Call to Action), Evidence-Based Closure (Feature), Target Audience: Factories / Every Factory Worker, TurboFix WhatsApp Brochure (Marketing Image), Instant Breakdown Tickets (Feature), TurboFix Product (Maintenance Ticketing Platform), Step 1: Scan the Machine QR Code (+19 more)

### Community 29 - "whatsapp.py"
Cohesion: 0.09
Nodes (8): react, ContactReveal(), Badge(), badgeVariants, Button(), buttonVariants, readStoredLayout(), useWidgetLayout()

### Community 31 - "devDependencies"
Cohesion: 0.13
Nodes (25): POST to `url` with automatic retry on transient errors.      All keyword argumen, GET from `url` with automatic retry on transient errors., resilient_get(), resilient_post(), launch_broadcast(), Launch a template broadcast to multiple recipients.      recipients: [{"to": "+p, download_media(), _graph_url() (+17 more)

### Community 32 - "provider.py"
Cohesion: 0.13
Nodes (7): _company_code_for_factory_id(), _company_code_for_id(), Given a company UUID, return its domain code., Given a factory UUID, find the matching company domain code., Map Supabase users row → standard USERS_HEADER dict., Map Supabase companies row → standard COMPANIES_HEADER dict., SupabaseUserRepository

### Community 33 - "logging.py"
Cohesion: 0.11
Nodes (23): approve_ticket_closure(), delegate_to_colleague(), escalate_part_request(), escalate_ticket(), initialize_ticket_escalation(), mark_outsourced(), _minutes_open(), Escalation engine — checks ticket timers and fires WhatsApp notifications.  Two (+15 more)

### Community 34 - "machine_record_service.py"
Cohesion: 0.19
Nodes (19): active_provider(), analyze_image(), detect_language(), enabled(), extract_machine_record(), maintenance_assistant(), Resolves which AI backend to use: "gemini", "openai", or "" (AI layer off)., Extract structured maintenance facts without approving them for AI use. (+11 more)

### Community 35 - "App.jsx"
Cohesion: 0.14
Nodes (19): create_reset_token(), decode_access_token(), decode_reset_token(), get_current_admin(), get_current_user(), _password_fingerprint(), Phase 5 - Document Vault authentication.  A small, real (not stubbed) JWT auth l, Returns the payload only if the token is a valid, unexpired reset token.     Cal (+11 more)

### Community 37 - "summarize.py"
Cohesion: 0.10
Nodes (19): App(), Assistant, Dashboard, Home, Inventory, Kaizen, Login, Machines (+11 more)

### Community 38 - "escalation_service.py"
Cohesion: 0.13
Nodes (16): ALLOWED_AI_ROLES, allowedOrigins, buildMachineMarkdown(), bullets(), compactExtraction(), compactProperties(), cors(), DANGEROUS_RESPONSE_PATTERNS (+8 more)

### Community 39 - "intelligence_service.py"
Cohesion: 0.12
Nodes (12): extract_machine_record(), maintenance_assistant(), _normalize_urgency(), Extract structured machine knowledge from text-readable record sources., Calls OpenAI to turn a raw issue description into a structured brief.     Raises, Answer a scoped maintenance question through the OpenAI provider., summarize_issue(), FakeAsyncClient (+4 more)

### Community 40 - "Records.jsx"
Cohesion: 0.16
Nodes (5): _company_id_for_code(), _factory_id_for_code(), Given a company domain/code, return its companies UUID., Given a company domain/code, return the corresponding factories UUID., GET rows. params are PostgREST query-string filters.

### Community 41 - "auth_router.py"
Cohesion: 0.11
Nodes (11): _clear_di_caches(), isolated_machine_data_store(), Clear all DI factory lru_caches so monkeypatched config is picked up., Prevent generated MachineData files from leaking across tests or into source dat, A TestClient wired to a throwaway copy of the tracker (never the real one)     a, vault_client(), admin_token(), test_onboard_company_duplicate_rejected() (+3 more)

### Community 42 - "is_configured"
Cohesion: 0.14
Nodes (19): hash_password(), Return an error message if the password is too weak, else None., validate_password_strength(), admin_onboard_company(), admin_reset_user_password(), add_supervisor(), AddSupervisorRequest, ForgotPasswordRequest (+11 more)

### Community 43 - "LocalUserRepository"
Cohesion: 0.16
Nodes (3): _expand_encoded_json(), Supabase TEXT has no Excel cell limit, so persist readable JSON., SupabaseTicketRepository

### Community 44 - "sw-strategies.js"
Cohesion: 0.13
Nodes (7): CACHE_NAMES, CachingStrategies, handleRequest(), OfflineActionQueue, offlineQueue, shouldCache(), STATIC_ASSETS

### Community 45 - "SessionStore"
Cohesion: 0.18
Nodes (18): admin_company_workspace_preview(), admin_list_companies(), admin_update_company(), _company_approved(), _company_quota(), Return a safe, read-only representation of the customer's workspace., list_machines(), list_team() (+10 more)

### Community 46 - "conftest.py"
Cohesion: 0.18
Nodes (12): Tracks, per sender phone number, the most recent ticket opened from a text     m, Records that this phone's session has already been fanned out, so a later, Removes every expired session (regardless of notified status, so memory, Session, SessionStore, test_get_returns_none_for_unknown_phone(), test_open_and_get_within_ttl(), test_opening_again_overwrites_previous_session() (+4 more)

### Community 47 - "gemini.py"
Cohesion: 0.16
Nodes (15): AppShell(), getLiveDataAnswer(), isTokenExpired(), NAV_LIVE, NAV_SOON, readAuth(), Assistant(), getLiveDataAnswer() (+7 more)

### Community 48 - ".get"
Cohesion: 0.25
Nodes (17): analyze_image(), detect_language(), extract_machine_record(), _headers(), maintenance_assistant(), Send a machine photo to Gemini and get a text description of visible issues., Detect the language and return an ISO 639-1 code., Translate text to the target language. (+9 more)

### Community 49 - "components.json"
Cohesion: 0.11
Nodes (18): confirm_ai_diagnosis(), override_ai_diagnosis(), Technician confirms AI diagnosis was correct., Technician overrides AI diagnosis with their own assessment., handle_confirm_ai_command(), handle_issue_part_command(), handle_override_ai_command(), handle_parts_request_command() (+10 more)

### Community 50 - "scripts"
Cohesion: 0.20
Nodes (16): _compute_metrics(), _filter_tickets_in_range(), format_report_text(), generate_report(), _parse_dt(), _period_range(), _previous_period_range(), datetime (+8 more)

### Community 51 - "Home.jsx"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 52 - "test_gemini.py"
Cohesion: 0.11
Nodes (18): scripts, build, deploy, dev, lint, predeploy, preview, test:dashboard (+10 more)

### Community 53 - "dependencies.py"
Cohesion: 0.15
Nodes (8): Calls Gemini to turn a raw issue description into a structured brief.     Same p, summarize_issue(), CapturingClient, FakeResponse, gemini_reply(), test_summarize_issue_defaults_unexpected_urgency_to_medium(), test_summarize_issue_parses_json_and_normalizes_urgency(), test_transcribe_audio_sends_inline_audio_and_strips_text()

### Community 54 - "SupabaseFileStorage"
Cohesion: 0.20
Nodes (13): admin_token(), _machine(), Machine-onboarding quota + the internal TurboFix-team admin console.  Seeded sta, test_admin_can_list_users_and_reset_password(), test_admin_can_view_company_dashboard(), test_admin_can_view_read_only_company_workspace(), test_admin_endpoints_require_admin_token(), test_admin_lists_companies_with_usage() (+5 more)

### Community 55 - "SupabaseTicketRepository"
Cohesion: 0.23
Nodes (11): create_access_token(), new_ticket_id(), _open_ticket(), _technician_token(), test_evidence_upload_is_persisted_and_downloadable(), test_submission_requires_complete_checklist_and_notes(), test_technician_can_submit_work_for_supervisor_approval(), test_unassigned_technician_cannot_access_ticket() (+3 more)

### Community 56 - "test_vault_quota_admin.py"
Cohesion: 0.21
Nodes (15): ask_maintenance_assistant(), AssistantQuestion, _event_line(), get_machine_events(), get_root_cause_analysis(), _live_data_answer(), _machine_context(), _plant_context() (+7 more)

### Community 57 - "useI18n"
Cohesion: 0.14
Nodes (16): _iter_messages(), BackgroundTasks, Request, Verify X-Wacrm-Signature: t=unix,v1=hmac-sha256., Receive webhook events from WaCRM.      WaCRM fires events for: message.received, Verify the X-Hub-Signature-256 HMAC from Meta., Meta's one-time handshake when you register the webhook URL., Receive and dispatch an incoming WhatsApp message.      Returns 200 immediately (+8 more)

### Community 58 - "get_tickets"
Cohesion: 0.12
Nodes (15): analyze_image(), detect_language(), maintenance_assistant(), AI service — thin, provider-agnostic wrapper around the Gemini AI layer.  For th, Transcribe a downloaded voice note. Raises on error — callers must handle., Summarize an issue description into a structured brief. Raises on error., Analyze a machine photo and return a text description of what's visible., Detect the language of a text and return an ISO 639-1 code (e.g. 'hi', 'en', 'mr (+7 more)

### Community 59 - ".insert"
Cohesion: 0.12
Nodes (16): Closed-Loop Maintenance, DocumentRepository, DriveFileStorage, Machine Knowledge, MachineRecordRepository, QRGateway, Technician, TicketRepository (+8 more)

### Community 60 - "I18nManager"
Cohesion: 0.16
Nodes (5): Sends a downloaded voice note to OpenAI's transcription API and returns the, transcribe_audio(), FakeAsyncClient, FakeResponse, test_transcribe_audio_returns_stripped_text()

### Community 61 - "ai_service.py"
Cohesion: 0.19
Nodes (4): new_item_id(), Google Sheets implementation of PartsRepository.  Previously parts_store.py only, Reads/writes spare parts and consumables worksheets in a Google Sheet., SheetsPartsRepository

### Community 62 - "SheetsPartsRepository"
Cohesion: 0.20
Nodes (5): AI Firewall Security, Security Checklist, Systems Thinking, Burden Absorption Principle, Closed-Loop Systems Model

### Community 63 - "checklist.md"
Cohesion: 0.16
Nodes (4): LocalUserRepository, _normalize(), Reads/writes Users and Companies tabs in the local tracker workbook., Look up a user by phone or email (case-insensitive, whitespace-trimmed).

### Community 64 - "PerformanceMonitor"
Cohesion: 0.22
Nodes (7): GATEWAY_I18N, getDirectCause(), getRootCauseFix(), LIFECYCLE, stageInfo(), Tickets(), supabase

### Community 65 - "SheetsMachineRecordRepository"
Cohesion: 0.24
Nodes (4): new_document_id(), Google Sheets implementation of DocumentRepository.  Previously documents_store., Reads/writes document metadata in the Documents worksheet of a Google Sheet., SheetsDocumentRepository

### Community 66 - "performance.jsx"
Cohesion: 0.26
Nodes (10): Pluggable outbound email (Phase 5 - password reset).  Mirrors the local/sheets a, Send (or, in console mode, log) a plain-text email. Failures are logged and, _send_console(), send_email(), _send_smtp(), Notification service — handles Email and WhatsApp routing for POs and requests., Send PO/Part request notifications via Email (always) and WhatsApp (if not opted, _send_po_email() (+2 more)

### Community 68 - "company_hierarchy"
Cohesion: 0.23
Nodes (9): Password-reset flow (email link). Runs entirely against the local xlsx store wit, Capture every email the backend tries to send instead of logging/sending it., _request_reset(), sent_emails(), test_full_reset_flow_lets_user_log_in_with_new_password(), test_login_token_cannot_be_used_as_reset_token(), test_reset_enforces_min_password_length(), test_reset_token_is_single_use() (+1 more)

### Community 69 - "report_service.py"
Cohesion: 0.33
Nodes (9): parse_message(), ParsedTicket, Extract the machine ID and issue description from an incoming message.      Retu, test_parses_id_embedded_mid_sentence(), test_parses_id_without_colon_or_description(), test_parses_lowercase_id(), test_parses_standard_prefilled_message(), test_returns_none_for_empty_text() (+1 more)

### Community 71 - "FakeAsyncClient"
Cohesion: 0.33
Nodes (9): Closed-Loop Maintenance Lifecycle, TicketRepository, generateChecklist(), similarity(), step(), STOP_WORDS, text(), tokens() (+1 more)

### Community 76 - "parse_message"
Cohesion: 0.36
Nodes (9): calculateEstimate(), clampHours(), defaultEstimationRules, formatDate(), loadEstimationRules(), nextSunday(), priorityRank, ShutdownPlanner() (+1 more)

### Community 79 - "dialog.jsx"
Cohesion: 0.44
Nodes (8): _add_member(), _team(), test_legacy_machine_contacts_are_labeled_by_actual_staff_role(), test_machine_assignments_use_staff_ids_and_never_list_raw_contacts(), test_maintenance_head_can_reveal_all_company_contacts(), test_offline_staff_can_be_added_without_contact_details(), test_supervisor_and_technician_contact_access_follows_hierarchy(), test_team_directory_masks_contacts_and_owner_can_reveal()

### Community 80 - "select.jsx"
Cohesion: 0.36
Nodes (9): icons.svg (Icon Sprite Sheet), Bluesky Icon (butterfly logo), Brand/Social-Link Icon Group (dark-fill, uniform ~19x19 viewBox), Discord Icon (game controller/mascot face logo), Documentation Icon (open book/chat outline, purple stroke), GitHub Icon (Octocat/Git logo), Social/Community Icon (person with badge/ribbon, purple stroke), UI Accent Icon Group (purple stroke #aa3bff, outline style) (+1 more)

### Community 81 - "OfflineQueue"
Cohesion: 0.22
Nodes (8): background_color, display, icons, name, orientation, short_name, start_url, theme_color

### Community 83 - "SupabasePartsRepository"
Cohesion: 0.31
Nodes (7): allowedOrigins, cors(), mimeToExtension(), optionalTicketColumns, reply(), text(), uploadDataUrl()

### Community 87 - "LocalPartsRepository"
Cohesion: 0.43
Nodes (7): test_backup_contains_originals_structured_data_csv_and_machine_data(), test_duplicate_source_is_rejected(), test_non_owner_operational_role_can_create_review_draft(), test_only_maintenance_head_can_approve_and_approved_data_reaches_machine_context(), test_restore_requires_maintenance_head(), test_supervisor_can_upload_and_company_isolation_is_enforced(), upload_record()

### Community 89 - "icons.svg (Icon Sprite Sheet)"
Cohesion: 0.25
Nodes (7): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, warn

### Community 92 - "ticket_gateway/index.ts"
Cohesion: 0.29
Nodes (4): MediaRecorderMock, MOCK_MACHINE, MOCK_TICKET, MOCK_USER

### Community 93 - "LocalMachineRecordRepository"
Cohesion: 0.29
Nodes (6): MachineRepository, KAIZEN_CATEGORIES, LEAN_WASTES, Machines(), PRE_SEEDED_KAIZENS, WORKSPACE_TABS

### Community 95 - "SheetsDocumentRepository"
Cohesion: 0.43
Nodes (3): ThemeContext, ThemeProvider(), useTheme()

### Community 96 - "SupabaseMachineRecordRepository"
Cohesion: 0.43
Nodes (5): initialTab(), readCurrentUser(), responseStepLabel(), Settings(), settingTabs

### Community 98 - "test_admin_onboarding.py"
Cohesion: 0.33
Nodes (5): compilerOptions, baseUrl, paths, include, src

### Community 101 - "card.jsx"
Cohesion: 0.33
Nodes (4): KAIZEN_CATEGORIES, KAIZEN_STATUSES, LEAN_WASTES, PRE_SEEDED_KAIZENS

### Community 104 - "LocalSettingsRepository"
Cohesion: 0.60
Nodes (4): main(), Make the checked-in local workbook useful for a complete post-login demo.  Run f, row_map(), set_value()

### Community 105 - "get_technician_load"
Cohesion: 0.40
Nodes (5): AI Diagnostics edge function, check_schedules, pm_scheduler, Service Integrations & Webhooks, WhatsApp Gateway client

### Community 106 - "ErrorBoundary"
Cohesion: 0.40
Nodes (4): fs, pages, { Parser }, path

### Community 107 - "useTheme.jsx"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 111 - "compilerOptions"
Cohesion: 0.50
Nodes (3): SSRF Webhook Validation, WebSocket Queue Overflow Fix, XSS Vulnerability Fix

### Community 112 - "tabs.jsx"
Cohesion: 0.50
Nodes (4): TurboFix SOLID Backend Architecture, TurboFix Backend README, Render Blueprint, Backend Requirements

### Community 114 - "Tickets.jsx"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 115 - "dashboard-fixtures.js"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 116 - "SheetsSettingsRepository"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 117 - "seed_local_demo.py"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 118 - "FakeAuthClient"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 119 - "migrate.cjs"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 120 - "package.json"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 121 - "NotificationCenter.jsx"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 122 - "alert.jsx"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 123 - "onboard_team_member/index.ts"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 124 - "AUDIT_REPORT.md"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 125 - "TurboFix Backend README"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 127 - "imports"
Cohesion: 0.67
Nodes (3): TurboFix Production CI/CD Workflow, Deploy Frontend to GitHub Pages, Production Setup Checklist

### Community 129 - "imports"
Cohesion: 0.67
Nodes (3): TurboFix Logo (SVG), Favicon (favicon.svg), TurboFix Brand Identity

## Ambiguous Edges - Review These
- `Evidence-Based Closure (Feature)` → `Spare-Part Requests (Feature)`  [AMBIGUOUS]
  public/assets/turbofix-whatsapp-brochure.png · relation: conceptually_related_to
- `Bluesky Icon (butterfly logo)` → `Social/Community Icon (person with badge/ribbon, purple stroke)`  [AMBIGUOUS]
  public/icons.svg · relation: conceptually_related_to

## Knowledge Gaps
- **275 isolated node(s):** `$schema`, `oxc`, `react/rules-of-hooks`, `warn`, `$schema` (+270 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **70 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Evidence-Based Closure (Feature)` and `Spare-Part Requests (Feature)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Bluesky Icon (butterfly logo)` and `Social/Community Icon (person with badge/ribbon, purple stroke)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `TicketRepository` connect `wacrm_client.py` to `UserRepository`, `EventRepository`, `fanout_service.py`, `main.py`, `consumables_service.py`, `test_new_features.py`, `Dashboard.jsx`, `kpi_router.py`, `AppShell.jsx`, `Top Navigation Bar`, `TurboFix WhatsApp Brochure (Marketing Image)`, `provider.py`, `ai_assistant/index.ts`, `LocalUserRepository`, `SessionStore`, `components.json`, `scripts`, `test_vault_quota_admin.py`, `useI18n`, `webhook_router.py`, `SheetsCustomKpiRepository`, `LocalCustomKpiRepository`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `MachineRepository` connect `kpi_router.py` to `UserRepository`, `EventRepository`, `CurrentUser`, `fanout_service.py`, `main.py`, `consumables_service.py`, `test_new_features.py`, `Dashboard.jsx`, `AppShell.jsx`, `wacrm_client.py`, `Top Navigation Bar`, `TurboFix WhatsApp Brochure (Marketing Image)`, `provider.py`, `ai_assistant/index.ts`, `LocalUserRepository`, `SessionStore`, `components.json`, `scripts`, `test_vault_quota_admin.py`, `useI18n`, `webhook_router.py`, `SheetsCustomKpiRepository`, `LocalCustomKpiRepository`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `UserRepository` connect `UserRepository` to `provider.py`, `EventRepository`, `App.jsx`, `ai_assistant/index.ts`, `fanout_service.py`, `is_configured`, `webhook_router.py`, `LocalUserRepository`, `SheetsCustomKpiRepository`, `SessionStore`, `kpi_router.py`, `AppShell.jsx`, `react`, `LocalCustomKpiRepository`, `test_vault_quota_admin.py`, `checklist.md`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Are the 47 inferred relationships involving `MachineRepository` (e.g. with `LocalEventRepository` and `LocalMachineRepository`) actually correct?**
  _`MachineRepository` has 47 INFERRED edges - model-reasoned connections that need verification._
- **Are the 45 inferred relationships involving `TicketRepository` (e.g. with `LocalEventRepository` and `LocalMachineRepository`) actually correct?**
  _`TicketRepository` has 45 INFERRED edges - model-reasoned connections that need verification._