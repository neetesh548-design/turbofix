# Graph Report - TurboFix  (2026-07-25)

## Corpus Check
- 343 files · ~422,542 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3420 nodes · 6480 edges · 253 communities (180 shown, 73 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 545 edges (avg confidence: 0.54)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1fcf8179`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

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
- handle_close_command
- file_storage.py
- Ant Design Migration — Phase 1 Completion Report
- test_supabase_machine_records.py
- Ant Design Foundation Phase (Phase 1) — Completion Summary
- LocalCustomKpiRepository
- UserRepository
- useI18n
- file_storage.py
- AntDProvider.jsx
- LocalTechnicianWorkRepository
- Tickets.jsx
- PerformanceMonitor
- AntDModalsAndFeedback.jsx
- api.js
- i18n.js
- LanguageContext.jsx
- Phase 2: Dashboard & Forms Migration — FINAL REPORT
- SupabaseCustomKpiRepository
- get_technician_load
- AntDDashboardComponents.jsx
- 1. Component Library (Reusable Across App)
- _rate_limit_handler
- Assistant.jsx
- Build & Verification
- Final Notes
- Recommendations
- ai_diagnostics/index.ts
- Next Steps
- Support.jsx
- Migration Patterns
- Files Status
- Dashboard Migration Summary
- Files Modified & Created
- Quality Assurance
- Remaining Phase 2 Work (10%)
- Timeline Summary
- @ant-design/icons
- lucide-react
- tailwind-merge
- tw-animate-css
- workbox-routing
- .get_machine_events
- _SupabaseClient
- _FakeBrief
- detect_language
- transcribe_audio
- translate_message

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
10. `react` - 62 edges

## Surprising Connections (you probably didn't know these)
- `Visual Spare Part Deduction` --semantically_similar_to--> `Closed-Loop Maintenance`  [INFERRED] [semantically similar]
  settings-screenshot.png → docs/TURBOFIX_FEATURE_TICKET_LIST.md
- `IoT Predictive Power-Signature` --semantically_similar_to--> `Machine Knowledge`  [INFERRED] [semantically similar]
  settings-screenshot.png → docs/TURBOFIX_FEATURE_TICKET_LIST.md
- `Machines()` --references--> `MachineRepository`  [INFERRED]
  src/pages/Machines.jsx → docs/TURBOFIX_TECHNICAL_ARCHITECTURE.md
- `Records()` --references--> `MachineRecordRepository`  [INFERRED]
  src/pages/Records.jsx → docs/TURBOFIX_PRD.md
- `Dashboard()` --references--> `CustomKpiRepository`  [INFERRED]
  src/pages/Dashboard.jsx → docs/TURBOFIX_TECHNICAL_ARCHITECTURE.md

## Import Cycles
- 2-file cycle: `src/utils/i18n-provider.jsx -> src/utils/i18n.js -> src/utils/i18n-provider.jsx`

## Hyperedges (group relationships)
- **Smart Modules Configuration Options** — settings_screenshot_iot_predictive_power_signature, settings_screenshot_visual_spare_part_deduction, settings_screenshot_dynamic_supply_chain_sync, settings_screenshot_opportunistic_mesh_syncing, settings_screenshot_location_handshake_verification [EXTRACTED 1.00]
- **TurboFix Main Workflow Pages** — src_pages_qrgateway_qrgateway, src_pages_technician_technician, src_pages_machines_machines, src_pages_records_records, src_pages_dashboard_dashboard [INFERRED 0.85]
- **Onboarding and Adoption Documentation** — turbofix_improvements_onboarding_file, turbofix_onboarding_plan_file, turbofix_closedloop_systemsplan_file [INFERRED 0.85]
- **Core Security and Quality Measures** — audit_report_file, checklist_file, readme_file [INFERRED 0.85]

## Communities (253 total, 73 thin omitted)

### Community 0 - "UserRepository"
Cohesion: 0.04
Nodes (83): Role, get_machines(), Return the configured MachineRepository implementation (cached singleton)., MachineRepository, new_document_id(), ABC, Read/write access to the Tickets data entity., Generate a new unique ticket ID. (+75 more)

### Community 1 - "EventRepository"
Cohesion: 0.07
Nodes (29): 1. **ViewModeContext** (`src/ViewModeContext.jsx`), 2. **App.jsx Updates**, 3. **AdvancedFeaturesDrilldown.jsx Updates**, 4. **AppShell.jsx Updates**, 5. **Translations (9 languages)**, Author Notes, Behavior Matrix, Browser Compatibility (+21 more)

### Community 2 - "whatsapp_webhook/index.ts"
Cohesion: 0.06
Nodes (21): react, react, CachedData, LazyComponent, MemoizedCard, OptimizedImage(), useDebounce(), usePerformanceMonitor() (+13 more)

### Community 3 - "DocumentRepository"
Cohesion: 0.07
Nodes (49): OPENAI_API_KEY, allowedOrigins, cors(), reply(), RAZORPAY_WEBHOOK_SECRET, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN (+41 more)

### Community 4 - "CurrentUser"
Cohesion: 0.04
Nodes (68): get_ai_feedback(), get_documents(), get_escalation_config(), get_machine_records(), get_shift_config(), Dependency Injection factories for all TurboFix repositories.  FastAPI's Depends, Return the configured DocumentRepository implementation (cached singleton)., Return the approved/draft AI machine-record repository. (+60 more)

### Community 5 - "admin_router.py"
Cohesion: 0.07
Nodes (10): CustomKpiRepository, AntDChartCard(), AntDDetailList(), AntDEmptyState(), AntDKPICard(), ClosedLoopControlCard(), Dashboard(), fallback (+2 more)

### Community 6 - "fanout_service.py"
Cohesion: 0.10
Nodes (38): create_reset_token(), decode_access_token(), decode_reset_token(), get_current_admin(), get_current_user(), hash_password(), _password_fingerprint(), Phase 5 - Document Vault authentication.  A small, real (not stubbed) JWT auth l (+30 more)

### Community 7 - "LocalTicketRepository"
Cohesion: 0.21
Nodes (3): FakeAsyncClient, FakeResponse, test_supabase_file_storage_uses_private_bucket_and_safe_object_key()

### Community 8 - "auth_headers"
Cohesion: 0.10
Nodes (35): auth_headers(), login(), test_assistant_rejects_machine_from_another_company(), test_machine_assistant_uses_exact_question_and_machine_data(), test_plant_wide_ai_context_contains_every_company_machine(), test_plant_wide_assistant_has_live_data_fallback(), TestOnboardingPhoneValidation, TestRootCauseAnalysis (+27 more)

### Community 9 - "main.py"
Cohesion: 0.06
Nodes (12): LocalEventRepository, LocalMachineRepository, LocalTicketRepository, Reads/writes events in the MachineEvents tab of the local tracker workbook., Reads/writes machines in the Machines tab of the local tracker workbook.      Ma, Return the next Mnnn code for a company (e.g. 'M003' if M001/M002 exist)., Reads/writes tickets in the Tickets tab of the local tracker workbook., machine_repo() (+4 more)

### Community 10 - "TicketRepository"
Cohesion: 0.15
Nodes (24): _all_recipients(), _assignee(), _closure_params(), notify_closure(), notify_ticket(), notify_work_assigned(), Fan-out service — notifies technicians and informed users about tickets.  Each r, Notify all stakeholders + the worker that a ticket has been closed.      If a tr (+16 more)

### Community 11 - "base.py"
Cohesion: 0.08
Nodes (49): _is_retryable(), Resilient HTTP client with tenacity retry + exponential backoff.  Wraps httpx fo, POST to `url` with automatic retry on transient errors.      All keyword argumen, GET from `url` with automatic retry on transient errors., resilient_get(), resilient_post(), get_account_info(), get_broadcast_status() (+41 more)

### Community 12 - "consumables_service.py"
Cohesion: 0.06
Nodes (36): CustomKpiRepository, new_kpi_entry_id(), new_kpi_id(), Abstract base classes (interfaces) for all TurboFix data repositories.  Every co, Read/write access to owner-defined custom KPI configs and daily data entries., Return all custom KPI configs for a company., Return a single KPI config, or None., Append a new custom KPI config row. (+28 more)

### Community 13 - "MachineRepository"
Cohesion: 0.06
Nodes (40): get_events(), Return the configured EventRepository implementation (cached singleton)., configure_logging(), Call once at application startup (from main.py lifespan)., Rate limiting for sensitive endpoints — prevents brute-force, spam, and DoS., _auto_reorder_loop(), _daily_digest_loop(), _drift_check_loop() (+32 more)

### Community 14 - "test_new_features.py"
Cohesion: 0.17
Nodes (5): Sends a downloaded voice note to OpenAI's transcription API and returns the, transcribe_audio(), FakeAsyncClient, FakeResponse, test_transcribe_audio_returns_stripped_text()

### Community 15 - "Dashboard.jsx"
Cohesion: 0.09
Nodes (45): EventRepository, new_event_id(), Read/write access to the MachineEvents data entity., Local (openpyxl / Excel) implementations of TicketRepository and MachineReposito, ai_enabled(), Return True if any AI provider is configured and ready., _detect_and_store_language(), finish_audio_ticket() (+37 more)

### Community 16 - "FileStorage"
Cohesion: 0.15
Nodes (16): _check_reorder_for_table(), create_purchase_order(), get_purchase_order(), _has_recent_auto_reorder(), list_pending_pos(), _new_po_code(), Consumables & Spares service — Phase 3 capabilities.  1. Part request via WhatsA, Create a new purchase order. (+8 more)

### Community 17 - "kpi_router.py"
Cohesion: 0.06
Nodes (34): 1. Comprehensive Audit ✅, 1. View Mode Implementation, 2. View Mode Toggle ✅, 2. WhatsApp Entry Point, 3. QuickReportDialog Design, 3. WhatsApp Integration Entry Point ✅, Build Status, Code (2 new components) (+26 more)

### Community 18 - "config.py"
Cohesion: 0.12
Nodes (10): _events_for_machine(), _image_payload(), _last_ticket(), Tests for new features: photo support, language detection, ticket closure, machi, TestImageSupport, TestMachineEvents, TestMachineEventsTab, TestTicketClosure (+2 more)

### Community 19 - "AppShell.jsx"
Cohesion: 0.09
Nodes (38): CurrentUser, The authenticated caller's identity, parsed straight from the JWT - no extra, Enforces the same multi-tenant isolation used for tickets/machines         elsew, get_settings(), Return company-scoped settings using the active store backend., Read/write access to company-scoped operational settings., Return the settings row for a company, or None when not configured., Create or replace the settings row for one company. (+30 more)

### Community 20 - "react"
Cohesion: 0.15
Nodes (11): ensure_headers(), Read canonical records while tolerating old, extra, or blank columns.      Produ, Append newly introduced schema columns without disturbing existing data., read_records(), _normalize(), Google Sheets implementation of UserRepository., Reads/writes Users and Companies worksheets in a Google Sheet., SheetsUserRepository (+3 more)

### Community 21 - "SheetsTicketRepository"
Cohesion: 0.09
Nodes (21): 1. Comprehensive Audit ✅, 1. WhatsApp Integration (1-2 days) ⬅️ NEXT PRIORITY, 2. Evidence Capture (0.5 days), 2. View Mode Toggle Implementation ✅, 3. AI Records Workflow Discovery ✅, 3. Escalation Configuration (2 days), Critical Blockers (4-6 days to fix), Current Status Summary (+13 more)

### Community 22 - "wacrm_client.py"
Cohesion: 0.22
Nodes (3): compressed_json(), FakePostgrestClient, test_supabase_machine_record_repository_is_tenant_scoped_and_expands_json()

### Community 23 - "Top Navigation Bar"
Cohesion: 0.12
Nodes (7): Google Sheets implementations of TicketRepository and MachineRepository., Reads/writes events in the MachineEvents worksheet of a Google Sheet., Reads/writes machines in the Machines worksheet of a Google Sheet.      Maintain, Reads/writes tickets in the Tickets worksheet of a Google Sheet., SheetsEventRepository, SheetsMachineRepository, SheetsTicketRepository

### Community 24 - ".select"
Cohesion: 0.05
Nodes (50): get_custom_kpis(), get_parts(), get_technician_work(), get_tickets(), get_users(), Return the configured UserRepository implementation (cached singleton)., Return the configured PartsRepository implementation (cached singleton)., Return the configured CustomKpiRepository implementation (cached singleton). (+42 more)

### Community 25 - "dependencies"
Cohesion: 0.07
Nodes (27): @axe-core/playwright, gh-pages, jsdom, oxlint, devDependencies, @axe-core/playwright, gh-pages, jsdom (+19 more)

### Community 26 - "TurboFix WhatsApp Brochure (Marketing Image)"
Cohesion: 0.09
Nodes (22): Any, SecurityHeadersMiddleware, _find_worksheet(), _get_all_values(), get_client(), get_spreadsheet(), get_worksheet(), _open_spreadsheet() (+14 more)

### Community 27 - "QRGatewayTestHelper"
Cohesion: 0.07
Nodes (29): antd, class-variance-authority, clsx, html-to-react, jszip, dependencies, antd, class-variance-authority (+21 more)

### Community 28 - "read_records"
Cohesion: 0.13
Nodes (27): Automatic Technician Alerts (Feature), Reply DEMO on WhatsApp (Call to Action), Evidence-Based Closure (Feature), Target Audience: Factories / Every Factory Worker, TurboFix WhatsApp Brochure (Marketing Image), Instant Breakdown Tickets (Feature), TurboFix Product (Maintenance Ticketing Platform), Step 1: Scan the Machine QR Code (+19 more)

### Community 29 - "whatsapp.py"
Cohesion: 0.06
Nodes (33): approve_ticket_closure(), delegate_to_colleague(), initialize_ticket_escalation(), mark_outsourced(), Set the first escalation timer on a newly created ticket., Maintenance Head approves closure — ticket resolved., Delegate ticket to a colleague; resets the escalation timer., Manager marks ticket as outsourced; escalation pauses. (+25 more)

### Community 31 - "devDependencies"
Cohesion: 0.09
Nodes (27): download_media(), _graph_url(), WhatsApp messaging — routes through WaCRM when configured, else direct Meta Clou, Send a plain text message., Send turbofix_escalation in its six-placeholder order., Send a broadcast to multiple recipients. Only available via WaCRM.      recipien, Resolve a WhatsApp media ID → download → save to MEDIA_STORE_DIR.      Returns t, Send a Meta template with body values in placeholder order. (+19 more)

### Community 32 - "provider.py"
Cohesion: 0.24
Nodes (3): Map Supabase users row → standard USERS_HEADER dict., Map Supabase companies row → standard COMPANIES_HEADER dict., SupabaseUserRepository

### Community 33 - "logging.py"
Cohesion: 0.17
Nodes (17): ask_maintenance_assistant(), _event_line(), get_machine_events(), get_root_cause_analysis(), _live_data_answer(), _machine_context(), _plant_context(), Dashboard router — per-company KPI dashboard + root cause analysis endpoints. (+9 more)

### Community 34 - "machine_record_service.py"
Cohesion: 0.15
Nodes (22): active_provider(), analyze_image(), detect_language(), enabled(), extract_machine_record(), maintenance_assistant(), Resolves which AI backend to use: "gemini", "openai", or "" (AI layer off)., Extract structured maintenance facts without approving them for AI use. (+14 more)

### Community 35 - "App.jsx"
Cohesion: 0.05
Nodes (43): check_repeat_failure(), Check if machine has had more than `threshold` tickets in last `days` days., Integration tests for intelligence_service.py  Tests AI-powered machine intellig, Test extracting data from machine photo (vision AI)., Test that high-confidence extractions are preferred over quantity., Test handling when two sources give conflicting specs., Test first occurrence of an issue (no repeat yet)., Test detecting repeat failure within threshold window. (+35 more)

### Community 36 - "ai_assistant/index.ts"
Cohesion: 0.21
Nodes (4): _company_code_for_factory_id(), _company_code_for_id(), Given a company UUID, return its domain code., Given a factory UUID, find the matching company domain code.

### Community 37 - "summarize.py"
Cohesion: 0.09
Nodes (21): App(), Assistant, Dashboard, Home, Inventory, Kaizen, Login, Machines (+13 more)

### Community 38 - "escalation_service.py"
Cohesion: 0.13
Nodes (16): ALLOWED_AI_ROLES, allowedOrigins, buildMachineMarkdown(), bullets(), compactExtraction(), compactProperties(), cors(), DANGEROUS_RESPONSE_PATTERNS (+8 more)

### Community 39 - "intelligence_service.py"
Cohesion: 0.04
Nodes (45): 10. RECOMMENDED PRIORITIZATION, 11. TESTING CHECKLIST, 12. DEVELOPER NOTES, 1. FEATURE COMPLETENESS AUDIT, 1. State Management Disconnect, 2. Missing Feature Flags, 2. MVP-FIRST DRILL-DOWN ISSUES, 3. API Integration Unclear (+37 more)

### Community 41 - "auth_router.py"
Cohesion: 0.07
Nodes (35): get_logger(), Structured JSON logging for TurboFix, backed by structlog.  Every log event prod, Return a structlog logger bound to `name`.      The returned logger behaves exac, get_downtime_summary(), get_ticket_downtime(), Webhook router — WhatsApp webhook receive + verify.  This router is intentionall, escalate_ticket(), _minutes_open() (+27 more)

### Community 42 - "is_configured"
Cohesion: 0.09
Nodes (22): Dashboard ✅ (DONE), Implementation Pattern, Inventory, Kaizen, Machines, MVP-First Refactoring Plan — All Tabs, Notes, Overview (+14 more)

### Community 44 - "sw-strategies.js"
Cohesion: 0.13
Nodes (7): CACHE_NAMES, CachingStrategies, handleRequest(), OfflineActionQueue, offlineQueue, shouldCache(), STATIC_ASSETS

### Community 45 - "SessionStore"
Cohesion: 0.06
Nodes (40): Self-contained internal TurboFix platform administration console., create_admin_token(), admin_company_users(), admin_company_workspace_preview(), admin_console(), admin_list_companies(), admin_login(), admin_update_company() (+32 more)

### Community 46 - "conftest.py"
Cohesion: 0.11
Nodes (4): _company_id_for_code(), _expand_encoded_json(), Given a company domain/code, return its companies UUID., Supabase TEXT has no Excel cell limit, so persist readable JSON.

### Community 47 - "gemini.py"
Cohesion: 0.36
Nodes (9): calculateEstimate(), clampHours(), defaultEstimationRules, formatDate(), loadEstimationRules(), nextSunday(), priorityRank, ShutdownPlanner() (+1 more)

### Community 48 - ".get"
Cohesion: 0.23
Nodes (19): analyze_image(), detect_language(), extract_machine_record(), _headers(), maintenance_assistant(), Calls Gemini to turn a raw issue description into a structured brief.     Same p, Send a machine photo to Gemini and get a text description of visible issues., Detect the language and return an ISO 639-1 code. (+11 more)

### Community 49 - "components.json"
Cohesion: 0.27
Nodes (9): Pluggable outbound email (Phase 5 - password reset).  Mirrors the local/sheets a, Send (or, in console mode, log) a plain-text email. Failures are logged and, _send_console(), send_email(), _send_smtp(), format_report_text(), Format a report dict into a human-readable text message., Trigger weekly reports for stakeholders (Store, Purchase, Owners, Supervisors). (+1 more)

### Community 50 - "scripts"
Cohesion: 0.28
Nodes (12): _compute_metrics(), _filter_tickets_in_range(), generate_report(), _parse_dt(), _period_range(), _previous_period_range(), datetime, Report service — generates daily, weekly, monthly, and YTD maintenance reports. (+4 more)

### Community 51 - "Home.jsx"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 52 - "test_gemini.py"
Cohesion: 0.11
Nodes (18): scripts, build, deploy, dev, lint, predeploy, preview, test:dashboard (+10 more)

### Community 53 - "dependencies.py"
Cohesion: 0.17
Nodes (6): CapturingClient, FakeResponse, gemini_reply(), test_summarize_issue_defaults_unexpected_urgency_to_medium(), test_summarize_issue_parses_json_and_normalizes_urgency(), test_transcribe_audio_sends_inline_audio_and_strips_text()

### Community 54 - "SupabaseFileStorage"
Cohesion: 0.20
Nodes (13): admin_token(), _machine(), Machine-onboarding quota + the internal TurboFix-team admin console.  Seeded sta, test_admin_can_list_users_and_reset_password(), test_admin_can_view_company_dashboard(), test_admin_can_view_read_only_company_workspace(), test_admin_endpoints_require_admin_token(), test_admin_lists_companies_with_usage() (+5 more)

### Community 57 - "useI18n"
Cohesion: 0.14
Nodes (18): _iter_messages(), BackgroundTasks, Request, Verify X-Wacrm-Signature: t=unix,v1=hmac-sha256., Receive webhook events from WaCRM.      WaCRM fires events for: message.received, Verify the X-Hub-Signature-256 HMAC from Meta., Meta's one-time handshake when you register the webhook URL., Receive and dispatch an incoming WhatsApp message.      Returns 200 immediately (+10 more)

### Community 58 - "get_tickets"
Cohesion: 0.12
Nodes (12): extract_machine_record(), maintenance_assistant(), _normalize_urgency(), Extract structured machine knowledge from text-readable record sources., Calls OpenAI to turn a raw issue description into a structured brief.     Raises, Answer a scoped maintenance question through the OpenAI provider., summarize_issue(), FakeAsyncClient (+4 more)

### Community 59 - ".insert"
Cohesion: 0.12
Nodes (16): Closed-Loop Maintenance, DocumentRepository, DriveFileStorage, Machine Knowledge, MachineRecordRepository, QRGateway, Technician, TicketRepository (+8 more)

### Community 61 - "ai_service.py"
Cohesion: 0.22
Nodes (15): asNumber(), buildMonthlyTrend(), computeBacklog(), computeBacklogVelocity(), computeCostRatios(), computeMaintenanceInsights(), computeOwnerImpact(), computePlannedReactiveRatio() (+7 more)

### Community 62 - "SheetsPartsRepository"
Cohesion: 0.20
Nodes (5): AI Firewall Security, Security Checklist, Systems Thinking, Burden Absorption Principle, Closed-Loop Systems Model

### Community 63 - "checklist.md"
Cohesion: 0.12
Nodes (6): new_user_id(), LocalUserRepository, _normalize(), Local (openpyxl / Excel) implementation of UserRepository., Reads/writes Users and Companies tabs in the local tracker workbook., Look up a user by phone or email (case-insensitive, whitespace-trimmed).

### Community 64 - "PerformanceMonitor"
Cohesion: 0.10
Nodes (29): Closed-Loop Maintenance Lifecycle, MachineRecordRepository, MachineRepository, TicketRepository, apiFetch(), getApiBase(), generateChecklist(), similarity() (+21 more)

### Community 65 - "SheetsMachineRecordRepository"
Cohesion: 0.29
Nodes (3): Google Sheets implementation of DocumentRepository.  Previously documents_store., Reads/writes document metadata in the Documents worksheet of a Google Sheet., SheetsDocumentRepository

### Community 66 - "performance.jsx"
Cohesion: 0.06
Nodes (41): compute_auto_insights(), compute_kpis(), _parse_dt(), datetime, Dashboard service — compute per-company KPIs from live ticket/machine data.  Ext, Derive MTBF, MTTR, repeat breakdown %, and top problem machines from ticket data, Compute live KPI dashboard for a company. Pure function — no I/O calls., _safe_float() (+33 more)

### Community 67 - "auth.py"
Cohesion: 0.23
Nodes (3): new_machine_record_id(), Google Sheets implementation of the AI machine-record repository., SheetsMachineRecordRepository

### Community 68 - "company_hierarchy"
Cohesion: 0.23
Nodes (9): Password-reset flow (email link). Runs entirely against the local xlsx store wit, Capture every email the backend tries to send instead of logging/sending it., _request_reset(), sent_emails(), test_full_reset_flow_lets_user_log_in_with_new_password(), test_login_token_cannot_be_used_as_reset_token(), test_reset_enforces_min_password_length(), test_reset_token_is_single_use() (+1 more)

### Community 69 - "report_service.py"
Cohesion: 0.33
Nodes (9): parse_message(), ParsedTicket, Extract the machine ID and issue description from an incoming message.      Retu, test_parses_id_embedded_mid_sentence(), test_parses_id_without_colon_or_description(), test_parses_lowercase_id(), test_parses_standard_prefilled_message(), test_returns_none_for_empty_text() (+1 more)

### Community 71 - "FakeAsyncClient"
Cohesion: 0.08
Nodes (52): _content_matches_extension(), FileStorage, FileTooLargeError, ABC, Pluggable file storage — local disk (dev/test) and Google Drive (production).  T, Return file bytes for a storage_path previously returned by save()., Delete the file at storage_path. Silently ignores missing files., Check that file content magic bytes match the claimed extension. (+44 more)

### Community 75 - "webhook_router.py"
Cohesion: 0.18
Nodes (12): Tracks, per sender phone number, the most recent ticket opened from a text     m, Records that this phone's session has already been fanned out, so a later, Removes every expired session (regardless of notified status, so memory, Session, SessionStore, test_get_returns_none_for_unknown_phone(), test_open_and_get_within_ttl(), test_opening_again_overwrites_previous_session() (+4 more)

### Community 76 - "parse_message"
Cohesion: 0.19
Nodes (10): AntDProvider(), antdLocaleExtensions, antdLocaleMap, getAntDLocaleFromI18n(), getExtendedAntDLocale(), turboFixToAntDKeys, brandColors, colors (+2 more)

### Community 77 - "SheetsCustomKpiRepository"
Cohesion: 0.04
Nodes (45): Aggregate Statistics, Ant Design Migration — Phases 1-4 Completion Report, Build Performance, By Category, By Phase, Code Metrics, Comparison to Original Plan, ✅ Completed (+37 more)

### Community 78 - "machine_data_service.py"
Cohesion: 0.15
Nodes (4): new_item_id(), LocalPartsRepository, Local (openpyxl / Excel) implementation of PartsRepository., Reads/writes spare parts and consumables in the local workbook.

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

### Community 84 - "ShutdownPlanner.jsx"
Cohesion: 0.15
Nodes (3): _factory_id_for_code(), Given a company domain/code, return the corresponding factories UUID., GET rows. params are PostgREST query-string filters.

### Community 86 - "LocalCustomKpiRepository"
Cohesion: 0.04
Nodes (45): Accomplishments, Accomplishments, Activity Summary, Build Verification, Code Metrics, Code Quality, Component Library Created (380+ lines), Conclusion (+37 more)

### Community 87 - "LocalPartsRepository"
Cohesion: 0.39
Nodes (8): create_access_token(), test_backup_contains_originals_structured_data_csv_and_machine_data(), test_duplicate_source_is_rejected(), test_non_owner_operational_role_can_create_review_draft(), test_only_maintenance_head_can_approve_and_approved_data_reaches_machine_context(), test_restore_requires_maintenance_head(), test_supervisor_can_upload_and_company_isolation_is_enforced(), upload_record()

### Community 88 - "test_contact_privacy.py"
Cohesion: 0.09
Nodes (11): _clear_di_caches(), isolated_machine_data_store(), Path, Clear all DI factory lru_caches so monkeypatched config is picked up., Prevent generated MachineData files from leaking across tests or into source dat, A TestClient wired to a throwaway copy of the tracker (never the real one)     a, rewrite_document_paths(), vault_client() (+3 more)

### Community 89 - "icons.svg (Icon Sprite Sheet)"
Cohesion: 0.25
Nodes (7): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, warn

### Community 92 - "ticket_gateway/index.ts"
Cohesion: 0.29
Nodes (4): MediaRecorderMock, MOCK_MACHINE, MOCK_TICKET, MOCK_USER

### Community 93 - "LocalMachineRecordRepository"
Cohesion: 0.43
Nodes (3): LocalFileStorage, Path, Stores files on the local filesystem under DOCUMENT_STORE_DIR.      WARNING: Rai

### Community 95 - "SheetsDocumentRepository"
Cohesion: 0.60
Nodes (3): ThemeToggle(), ThemeProvider(), useTheme()

### Community 97 - "SupabaseCustomKpiRepository"
Cohesion: 0.25
Nodes (8): check_and_reserve_stock(), create_part_request(), Create a new part request and start the consumable escalation chain., Check stock availability and reserve if sufficient., initialize_part_request_escalation(), Set the first escalation timer on a new part request., Test escalation when spare parts unavailable in stock., test_initialize_part_request_escalation()

### Community 98 - "test_admin_onboarding.py"
Cohesion: 0.33
Nodes (5): compilerOptions, baseUrl, paths, include, src

### Community 101 - "card.jsx"
Cohesion: 0.43
Nodes (5): initialTab(), readCurrentUser(), responseStepLabel(), Settings(), settingTabs

### Community 103 - "StorageManager"
Cohesion: 0.24
Nodes (7): TechnicianWorkRepository, AntDNavigationLayout(), getNavMenuItems(), getUserMenuItems(), computeDataQuality(), computeShiftHandover(), Technician()

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

### Community 108 - "Settings.jsx"
Cohesion: 0.05
Nodes (41): 1. Detail Lists Migration (30 min), 1. KPI Cards → AntDKPICard, 2. Chart Cards → AntDChartCard, 2. Status Badges (20 min), 3. Empty States (15 min), 4. Health Ring (25 min), After (Ant Design), Before (Custom) (+33 more)

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

### Community 128 - "imports"
Cohesion: 0.17
Nodes (11): 1. **ticket_service.py** — Add automatic work creation after ticket creation, 2. **dependencies.py** — Wire TechnicianWorkRepository into ticket handlers, 3. **fanout_service.py** — Notify technician of new work assignment, Closed-Loop Impact, Closed-Loop Work Assignment Gaps — Fix Specification, Code Locations to Modify, Fix Locations, Implementation Priority (+3 more)

### Community 129 - "imports"
Cohesion: 0.67
Nodes (3): TurboFix Logo (SVG), Favicon (favicon.svg), TurboFix Brand Identity

### Community 135 - "imports"
Cohesion: 0.25
Nodes (8): _find_inventory_item(), issue_part(), issue_stock(), Release reserved stock (on cancellation)., Actually issue stock — deduct from stock_qty and release reservation., Search for an item in consumables then parts tables., Store Incharge issues the part — deducts stock and marks request as issued., release_reservation()

### Community 138 - "imports"
Cohesion: 0.11
Nodes (21): get_technician_workload(), _send_escalation_whatsapp(), check_and_flag_on_creation(), flag_repeat_failure(), get_factory_ai_stats(), get_least_loaded_technician(), get_machine_ai_accuracy(), get_shift_config() (+13 more)

### Community 140 - "qrgateway.spec.js"
Cohesion: 0.10
Nodes (20): 1. **Dynamic Python Imports Not Captured**, 2. **Supabase Edge Function Invocation Pattern**, 3. **Conditional/Lazy Repository Imports**, 4. **Supabase Edge Functions with Unknown Purpose**, 5. **Services with Sparse Test Coverage**, 6. **Unclear Frontend-Backend Contracts**, Bottleneck Nodes (High Centrality = Single Points of Failure), Critical Gaps (Extraction Misses) (+12 more)

### Community 141 - "TurboFix Production CI/CD Workflow"
Cohesion: 0.12
Nodes (16): 1. Edge Function Documentation ✅, 2. Frontend-Backend API Contracts ✅, 3. test_escalation_service.py ✅, 4. test_intelligence_service.py ✅, 5. test_dashboard_service.py ✅, Files Modified/Created, Gaps Filled — TurboFix Knowledge Graph, Impact Assessment (+8 more)

### Community 142 - "TurboFix Brand Identity"
Cohesion: 0.50
Nodes (4): Assistant(), getLiveDataAnswer(), machineSuggestions, plantSuggestions

### Community 149 - "button.jsx"
Cohesion: 0.05
Nodes (41): 1. Component Library (`src/components/`), 2. Dashboard Integration, 3. Build Verification, Ant Design Integration Pattern, AntDDashboardComponents.jsx (213 lines), AntDKPICard.jsx (43 lines), Backward Compatibility, Browser Verification (+33 more)

### Community 151 - "escalation.js"
Cohesion: 0.05
Nodes (39): **Build Quality**, **Code Quality**, 📁 COMPLETE FILE INVENTORY, **Components (8 Files)**, 🎉 CONCLUSION, 📞 CONTACT & NEXT STEPS, 🚀 DEPLOYMENT ROADMAP, **Documentation (18 Files)** (+31 more)

### Community 153 - "pwa.js"
Cohesion: 0.05
Nodes (37): **All Phases Status**, Build Status, 📁 **COMPLETE FILE INVENTORY**, 📈 **COMPLETE MIGRATION OVERVIEW**, Component Created (300+ lines), **Components (9 Files, 1,500+ lines)**, **Configuration**, 📋 **DEPLOYMENT CHECKLIST** (+29 more)

### Community 154 - "inbound_email_receiver/index.ts"
Cohesion: 0.05
Nodes (37): All Files Saved to Project, Build Metrics, Build Verification, Code Quality, Component Library Created (Foundation), Component Migration Tracking, Components Created, Dashboard Integration Completed (+29 more)

### Community 204 - "handle_close_command"
Cohesion: 0.06
Nodes (35): Ant Design Components Used, Ant Design Defaults, AntDNavigationLayout.jsx (127 lines), Backward Compatibility, Component Created, Created, Documentation, Files Status (+27 more)

### Community 205 - "file_storage.py"
Cohesion: 0.33
Nodes (6): approve_purchase_order(), Store Manager/VP approves a PO., Store Manager/VP rejects a PO., Send PO-related notification., reject_purchase_order(), _send_po_notification()

### Community 206 - "Ant Design Migration — Phase 1 Completion Report"
Cohesion: 0.06
Nodes (34): Ant Design Migration — Phase 1 Completion Report, Best Practices Going Forward, Build Status, Bundle Impact, ✅ Code Files (Saved to `/Users/nkumarsoni/TurboFix/`), Conclusion, Deliverables Verified, Deployment Ready (+26 more)

### Community 207 - "test_supabase_machine_records.py"
Cohesion: 0.27
Nodes (3): Google Sheets implementation of PartsRepository.  Previously parts_store.py only, Reads/writes spare parts and consumables worksheets in a Google Sheet., SheetsPartsRepository

### Community 208 - "Ant Design Foundation Phase (Phase 1) — Completion Summary"
Cohesion: 0.06
Nodes (32): 1. Package Installation, 2. Design Token System, 3. Locale Bridge System, 4. React Provider Layer, 5. Theme Hook, 6. Application Integration, Ant Design Foundation Phase (Phase 1) — Completion Summary, Architecture Highlights (+24 more)

### Community 209 - "LocalCustomKpiRepository"
Cohesion: 0.07
Nodes (28): 1.1 Installation & Setup, 1.2 Design Token Customization, 2.1 Dashboard Components, 2.2 Forms & Inputs, 2.3 Tables & Lists, 3.1 Navigation, 3.2 Layout Structure, 4.1 Modals & Drawers (+20 more)

### Community 211 - "useI18n"
Cohesion: 0.19
Nodes (9): DirectionProvider(), getFlagEmoji(), LanguageStats(), LanguageSwitcher(), LocalizedDate(), LocalizedNumber(), LocalizedText(), I18nManager (+1 more)

### Community 212 - "file_storage.py"
Cohesion: 0.25
Nodes (4): Validate a Supabase access token and resolve authorization from public.users., _resolve_supabase_user(), FakeAuthClient, test_supabase_auth_uses_trusted_directory_link_not_user_metadata()

### Community 213 - "AntDProvider.jsx"
Cohesion: 0.36
Nodes (5): admin_token(), test_onboard_company_duplicate_rejected(), test_onboard_company_invalid_password_rejected(), test_onboard_company_success(), test_owner_cannot_create_another_owner()

### Community 214 - "LocalTechnicianWorkRepository"
Cohesion: 0.09
Nodes (8): react, ContactReveal(), Badge(), badgeVariants, Button(), buttonVariants, readStoredLayout(), useWidgetLayout()

### Community 215 - "Tickets.jsx"
Cohesion: 0.39
Nodes (6): QuickReportDialog(), getDirectCause(), getRootCauseFix(), LIFECYCLE, stageInfo(), Tickets()

### Community 216 - "PerformanceMonitor"
Cohesion: 0.28
Nodes (4): DriveFileStorage, _object_key(), Stores files in a Google Drive folder using the Drive API.      Files are organi, Build a Drive API service (lazy import — not needed in local mode).

### Community 219 - "i18n.js"
Cohesion: 0.29
Nodes (8): dateFormatter, i18n, numberFormatter, I18nContext, I18nProvider(), useI18nContext(), SUPPORTED_LANGUAGES, TRANSLATIONS

### Community 220 - "LanguageContext.jsx"
Cohesion: 0.09
Nodes (19): Footer(), LanguageGate(), Navbar(), SkipLink(), LanguageContext, useLanguage(), MainLayout(), contentByLanguage (+11 more)

### Community 221 - "Phase 2: Dashboard & Forms Migration — FINAL REPORT"
Cohesion: 0.22
Nodes (8): Approval Status, Conclusion, Executive Summary, Key Achievements, Phase 2 Completion Breakdown, Phase 2: Dashboard & Forms Migration — FINAL REPORT, Phase Completion Status, Success Metrics — Phase 2

### Community 222 - "SupabaseCustomKpiRepository"
Cohesion: 0.11
Nodes (21): AdvancedFeaturesDrilldown(), AppShell(), getLiveDataAnswer(), isTokenExpired(), NAV_LIVE, NAV_SOON, readAuth(), KAIZEN_CATEGORIES (+13 more)

### Community 224 - "AntDDashboardComponents.jsx"
Cohesion: 0.47
Nodes (5): Notification service — handles Email and WhatsApp routing for POs and requests., Send PO/Part request notifications via Email (always) and WhatsApp (if not opted, _send_po_email(), send_po_notification(), _send_whatsapp()

### Community 225 - "1. Component Library (Reusable Across App)"
Cohesion: 0.33
Nodes (6): 1. Component Library (Reusable Across App), AntDDashboardComponents.jsx (213 lines), AntDKPICard.jsx (43 lines), AntDProvider.jsx (58 lines) [Phase 1], ClosedLoopControlCard.jsx (68 lines), Components Delivered

### Community 226 - "_rate_limit_handler"
Cohesion: 0.50
Nodes (4): confirm_ai_diagnosis(), Technician confirms AI diagnosis was correct., handle_confirm_ai_command(), Technician confirms AI diagnosis was correct.

### Community 227 - "Assistant.jsx"
Cohesion: 0.50
Nodes (4): override_ai_diagnosis(), Technician overrides AI diagnosis with their own assessment., handle_override_ai_command(), Technician overrides AI diagnosis with their own assessment.

### Community 228 - "Build & Verification"
Cohesion: 0.50
Nodes (4): Build & Verification, Bundle Size Analysis, Performance Metrics, Production Build Status

### Community 229 - "Final Notes"
Cohesion: 0.50
Nodes (4): Final Notes, Recommendations, What's Ready to Use, What Works Perfectly

### Community 230 - "Recommendations"
Cohesion: 0.50
Nodes (4): For Development, For Immediate Deployment, For User Experience, Recommendations

### Community 232 - "Next Steps"
Cohesion: 0.50
Nodes (4): Immediate (Phase 3 — Navigation), Next Steps, Optional (Finish Phase 2 — 10% remaining), Recommended Path

### Community 234 - "Migration Patterns"
Cohesion: 0.67
Nodes (3): After (Ant Design), Before (Custom), Migration Patterns

### Community 235 - "Files Status"
Cohesion: 0.67
Nodes (3): All Files Saved to Project, Build Artifacts, Files Status

### Community 236 - "Dashboard Migration Summary"
Cohesion: 0.67
Nodes (3): Code Impact, Components Migrated, Dashboard Migration Summary

### Community 237 - "Files Modified & Created"
Cohesion: 0.67
Nodes (3): Created, Files Modified & Created, Modified

### Community 238 - "Quality Assurance"
Cohesion: 0.67
Nodes (3): Performance Verification, Quality Assurance, Testing Coverage

### Community 239 - "Remaining Phase 2 Work (10%)"
Cohesion: 0.67
Nodes (3): Ready-Made Components, Remaining Phase 2 Work (10%), Stretch Goals (Optional)

### Community 240 - "Timeline Summary"
Cohesion: 0.67
Nodes (3): Remaining Phases, Time Invested, Timeline Summary

## Ambiguous Edges - Review These
- `Evidence-Based Closure (Feature)` → `Spare-Part Requests (Feature)`  [AMBIGUOUS]
  public/assets/turbofix-whatsapp-brochure.png · relation: conceptually_related_to
- `Bluesky Icon (butterfly logo)` → `Social/Community Icon (person with badge/ribbon, purple stroke)`  [AMBIGUOUS]
  public/icons.svg · relation: conceptually_related_to

## Knowledge Gaps
- **777 isolated node(s):** `1. Comprehensive Audit ✅`, `2. View Mode Toggle ✅`, `3. WhatsApp Integration Entry Point ✅`, `Production Readiness: 80% → 85%`, `Documentation (4 files)` (+772 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **73 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Evidence-Based Closure (Feature)` and `Spare-Part Requests (Feature)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Bluesky Icon (butterfly logo)` and `Social/Community Icon (person with badge/ribbon, purple stroke)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `MachineRepository` connect `UserRepository` to `CurrentUser`, `main.py`, `consumables_service.py`, `Dashboard.jsx`, `AppShell.jsx`, `Top Navigation Bar`, `.select`, `provider.py`, `logging.py`, `Records.jsx`, `auth_router.py`, `LocalUserRepository`, `SessionStore`, `scripts`, `SupabaseTicketRepository`, `test_vault_quota_admin.py`, `useI18n`, `performance.jsx`, `FakeAsyncClient`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `TicketRepository` connect `UserRepository` to `CurrentUser`, `main.py`, `consumables_service.py`, `Dashboard.jsx`, `AppShell.jsx`, `Top Navigation Bar`, `.select`, `provider.py`, `logging.py`, `Records.jsx`, `auth_router.py`, `LocalUserRepository`, `SessionStore`, `scripts`, `SupabaseTicketRepository`, `test_vault_quota_admin.py`, `useI18n`, `performance.jsx`, `_rate_limit_handler`, `Assistant.jsx`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `react` connect `LocalTechnicianWorkRepository` to `whatsapp_webhook/index.ts`, `admin_router.py`, `TurboFix Brand Identity`, `summarize.py`, `gemini.py`, `PerformanceMonitor`, `test_vault_password_reset.py`, `dynamicChecklist.js`, `parse_message`, `test_supabase_machine_records.py`, `useI18n`, `Tickets.jsx`, `AntDModalsAndFeedback.jsx`, `manifest.json`, `icons.svg (Icon Sprite Sheet)`, `LanguageContext.jsx`, `i18n.js`, `LocalTechnicianWorkRepository`, `SupabaseCustomKpiRepository`, `get_technician_load`, `SheetsDocumentRepository`, `test_machine_records.py`, `card.jsx`, `StorageManager`, `ai_diagnostics/index.ts`, `SheetsTechnicianWorkRepository`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Are the 47 inferred relationships involving `MachineRepository` (e.g. with `LocalEventRepository` and `LocalMachineRepository`) actually correct?**
  _`MachineRepository` has 47 INFERRED edges - model-reasoned connections that need verification._
- **Are the 45 inferred relationships involving `TicketRepository` (e.g. with `LocalEventRepository` and `LocalMachineRepository`) actually correct?**
  _`TicketRepository` has 45 INFERRED edges - model-reasoned connections that need verification._