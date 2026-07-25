# Graph Report - TurboFix  (2026-07-25)

## Corpus Check
- 372 files · ~471,458 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3062 nodes · 6182 edges · 247 communities (177 shown, 70 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 594 edges (avg confidence: 0.56)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `204eba79`
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
- test_vault_password_reset.py
- dynamicChecklist.js
- hash_password
- webhook_router.py
- parse_message
- dialog.jsx
- select.jsx
- OfflineQueue
- test_supabase_machine_records.py
- SupabasePartsRepository
- ShutdownPlanner.jsx
- LocalDocumentRepository
- LocalCustomKpiRepository
- LocalPartsRepository
- test_contact_privacy.py
- icons.svg (Icon Sprite Sheet)
- manifest.json
- table.jsx
- LocalMachineRecordRepository
- LocalTechnicianWorkRepository
- SheetsDocumentRepository
- SupabaseMachineRecordRepository
- SupabaseCustomKpiRepository
- test_admin_onboarding.py
- test_machine_records.py
- .oxlintrc.json
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
- Permission Assertions & RBAC Helpers
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
- imports
- qr-gateway.spec.ts
- qrgateway.spec.js
- TurboFix Production CI/CD Workflow
- TurboFix Brand Identity
- generate_logo.py
- seed_demo.py
- _FakeBrief
- DashboardWidget.jsx
- badge.jsx
- button.jsx
- badge.jsx
- button.jsx
- qrgateway-utils.test.js
- pwa.js
- inbound_email_receiver/index.ts
- qr-gateway.fixture.ts
- TurboFix Docs Index
- Offline Capabilities & Caching Strategy
- html-to-react
- lucide-react
- radix-ui
- dashboardLayout.js
- .add_kpi
- tw-animate-css
- SEARCH_AND_AI_DISCOVERY_STRATEGY.md
- React (JavaScript Framework)
- utils.js
- sw.js
- asset-service/index.ts
- check_inventory/index.ts
- notification-service/index.ts
- TurboFix-Improvements-Onboarding.md
- vite.config.js
- QRGateway E2E Tests Workflow
- local/__init__.py
- sheets/__init__.py
- tests/__init__.py
- Consumable Scheduling & Calendar Plan
- TurboFix Future Challenges Log
- EscalationConfigRepository
- DocumentRepository
- backend-ci.yml
- playwright.config.ts
- TurboFix LLMs Context
- Robots.txt
- QR_GATEWAY_QUICK_START.md
- QR_GATEWAY_TEST_SUMMARY.md
- README_updated.md
- render.yaml
- Hero Image (Layered Cube Graphic)
- Vite Logo (vite.svg)
- iot_telemetry_webhook/index.ts
- Ant Design Foundation Phase (Phase 1) — Completion Summary
- UserRepository
- useI18n
- api.js
- i18n.js
- Recommendations
- Documentation Files (3 Total)
- SheetsSettingsRepository
- 🏆 Quality Metrics
- 🚀 Quick Start
- 🎯 Next Steps
- ✅ Session Accomplishments
- 📁 Files Delivered
- 📈 Execution Timeline
- 🎉 Summary
- 📋 Session Overview
- send_report
- approve_ticket_closure

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
10. `react` - 65 edges

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
- **Core Security and Quality Measures** — audit_report_file, checklist_file, readme_file [INFERRED 0.85]
- **Onboarding and Adoption Documentation** — turbofix_improvements_onboarding_file, turbofix_onboarding_plan_file, turbofix_closedloop_systemsplan_file [INFERRED 0.85]
- **TurboFix Main Workflow Pages** — src_pages_qrgateway_qrgateway, src_pages_technician_technician, src_pages_machines_machines, src_pages_records_records, src_pages_dashboard_dashboard [INFERRED 0.85]
- **Smart Modules Configuration Options** — settings_screenshot_iot_predictive_power_signature, settings_screenshot_visual_spare_part_deduction, settings_screenshot_dynamic_supply_chain_sync, settings_screenshot_opportunistic_mesh_syncing, settings_screenshot_location_handshake_verification [EXTRACTED 1.00]

## Communities (247 total, 70 thin omitted)

### Community 0 - "UserRepository"
Cohesion: 0.04
Nodes (62): Self-contained internal TurboFix platform administration console., create_admin_token(), Role, CustomKpiRepository, PartsRepository, ABC, Read/write access to the SpareParts and Consumables entities.      Both share th, Generate a new unique item ID for 'spare_parts' or 'consumables'. (+54 more)

### Community 1 - "EventRepository"
Cohesion: 0.05
Nodes (58): get_machine_records(), Return the approved/draft AI machine-record repository., get_file_storage(), Return the FileStorage implementation selected by DOCUMENT_STORE env var., DocumentRepository, MachineRecordRepository, MachineRepository, Read/write access to the Machines data entity. (+50 more)

### Community 2 - "whatsapp_webhook/index.ts"
Cohesion: 0.04
Nodes (88): get_events(), Return the configured EventRepository implementation (cached singleton)., Rate limiting for sensitive endpoints — prevents brute-force, spam, and DoS., EventRepository, Read/write access to the MachineEvents data entity., Append a new event row. Keys must match MACHINE_EVENTS_HEADER., Return all events for a machine, oldest first., Return all events for a company. (+80 more)

### Community 3 - "DocumentRepository"
Cohesion: 0.06
Nodes (45): DriveFileStorage, FileStorage, LocalFileStorage, _object_key(), ABC, Path, Return file bytes for a storage_path previously returned by save()., Delete the file at storage_path. Silently ignores missing files. (+37 more)

### Community 4 - "CurrentUser"
Cohesion: 0.07
Nodes (49): OPENAI_API_KEY, allowedOrigins, cors(), reply(), RAZORPAY_WEBHOOK_SECRET, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN (+41 more)

### Community 5 - "admin_router.py"
Cohesion: 0.09
Nodes (36): auth_headers(), login(), test_assistant_rejects_machine_from_another_company(), test_machine_assistant_uses_exact_question_and_machine_data(), test_plant_wide_ai_context_contains_every_company_machine(), test_plant_wide_assistant_has_live_data_fallback(), TestOnboardingPhoneValidation, TestReports (+28 more)

### Community 6 - "fanout_service.py"
Cohesion: 0.09
Nodes (36): CurrentUser, The authenticated caller's identity, parsed straight from the JWT - no extra, Enforces the same multi-tenant isolation used for tickets/machines         elsew, Read/write access to company-scoped operational settings., Return the settings row for a company, or None when not configured., Create or replace the settings row for one company., SettingsRepository, add_custom_role() (+28 more)

### Community 7 - "LocalTicketRepository"
Cohesion: 0.06
Nodes (21): react, react, CachedData, LazyComponent, MemoizedCard, OptimizedImage(), useDebounce(), usePerformanceMonitor() (+13 more)

### Community 8 - "auth_headers"
Cohesion: 0.05
Nodes (57): create_reset_token(), decode_access_token(), decode_reset_token(), get_current_admin(), get_current_user(), hash_password(), _password_fingerprint(), Phase 5 - Document Vault authentication.  A small, real (not stubbed) JWT auth l (+49 more)

### Community 9 - "main.py"
Cohesion: 0.07
Nodes (24): extract_machine_record(), maintenance_assistant(), Extract structured machine knowledge from text-readable record sources., Calls OpenAI to turn a raw issue description into a structured brief.     Raises, Answer a scoped maintenance question through the OpenAI provider., summarize_issue(), analyze_image(), detect_language() (+16 more)

### Community 10 - "TicketRepository"
Cohesion: 0.06
Nodes (12): LocalEventRepository, LocalMachineRepository, LocalTicketRepository, Reads/writes events in the MachineEvents tab of the local tracker workbook., Reads/writes machines in the Machines tab of the local tracker workbook.      Ma, Return the next Mnnn code for a company (e.g. 'M003' if M001/M002 exist)., Reads/writes tickets in the Tickets tab of the local tracker workbook., machine_repo() (+4 more)

### Community 11 - "base.py"
Cohesion: 0.06
Nodes (43): build_custom_kpi_values(), compute_auto_insights(), compute_kpis(), _parse_dt(), datetime, Dashboard service — compute per-company KPIs from live ticket/machine data.  Ext, Derive MTBF, MTTR, repeat breakdown %, and top problem machines from ticket data, Compute live KPI dashboard for a company. Pure function — no I/O calls. (+35 more)

### Community 12 - "consumables_service.py"
Cohesion: 0.05
Nodes (41): Integration tests for intelligence_service.py  Tests AI-powered machine intellig, Test extracting data from machine photo (vision AI)., Test that high-confidence extractions are preferred over quantity., Test handling when two sources give conflicting specs., Test first occurrence of an issue (no repeat yet)., Test detecting repeat failure within threshold window., Test repeat failure is NOT detected if outside time window., Test that similar issues (not exact match) are grouped. (+33 more)

### Community 13 - "MachineRepository"
Cohesion: 0.08
Nodes (22): CustomKpiRepository, AntDKPICard(), ClosedLoopControlCard(), asNumber(), buildMonthlyTrend(), computeBacklog(), computeBacklogVelocity(), computeCostRatios() (+14 more)

### Community 14 - "test_new_features.py"
Cohesion: 0.07
Nodes (28): new_event_id(), new_kpi_entry_id(), new_kpi_id(), Abstract base classes (interfaces) for all TurboFix data repositories.  Every co, In-memory implementation of CustomKpiRepository for local dev/testing., Local Excel implementation of the AI machine-record repository., Local (openpyxl / Excel) implementation of PartsRepository., Excel-backed company settings repository for local development and tests. (+20 more)

### Community 15 - "Dashboard.jsx"
Cohesion: 0.05
Nodes (54): _auto_reorder_loop(), _daily_digest_loop(), _drift_check_loop(), _escalation_loop(), health(), _lifespan(), _predictive_loop(), Request (+46 more)

### Community 16 - "FileStorage"
Cohesion: 0.08
Nodes (52): _is_retryable(), Resilient HTTP client with tenacity retry + exponential backoff.  Wraps httpx fo, POST to `url` with automatic retry on transient errors.      All keyword argumen, GET from `url` with automatic retry on transient errors., resilient_get(), resilient_post(), get_account_info(), get_broadcast_status() (+44 more)

### Community 17 - "kpi_router.py"
Cohesion: 0.07
Nodes (26): App(), Assistant, Dashboard, Home, Inventory, Kaizen, Login, Machines (+18 more)

### Community 18 - "config.py"
Cohesion: 0.13
Nodes (18): AdvancedFeaturesDrilldown(), AppShell(), getLiveDataAnswer(), isTokenExpired(), NAV_LIVE, NAV_SOON, readAuth(), ContactReveal() (+10 more)

### Community 19 - "AppShell.jsx"
Cohesion: 0.06
Nodes (33): @ant-design/icons, antd, class-variance-authority, clsx, html-to-react, jszip, lucide-react, dependencies (+25 more)

### Community 20 - "react"
Cohesion: 0.09
Nodes (29): Read/write access to the Tickets data entity., Generate a new unique ticket ID., Append a new ticket row. Keys must match TICKETS_HEADER., Return the ticket dict for ticket_id, or None if not found., Set voice_note_media_id on the matching row. Returns True if found., Update AI-generated fields on the matching ticket. Returns True if found., Return all tickets belonging to a company., Set photo_media_id on the matching row. Returns True if found. (+21 more)

### Community 21 - "SheetsTicketRepository"
Cohesion: 0.29
Nodes (3): Badge(), badgeVariants, ThemeContext

### Community 22 - "wacrm_client.py"
Cohesion: 0.07
Nodes (19): react, Footer(), LanguageGate(), Navbar(), SkipLink(), LanguageContext, LanguageProvider(), useLanguage() (+11 more)

### Community 23 - "Top Navigation Bar"
Cohesion: 0.12
Nodes (12): Any, new_user_id(), _get_all_values(), Read canonical records while tolerating old, extra, or blank columns.      Produ, read_records(), _normalize(), Google Sheets implementation of UserRepository., Reads/writes Users and Companies worksheets in a Google Sheet. (+4 more)

### Community 24 - ".select"
Cohesion: 0.09
Nodes (10): Validate a Supabase access token and resolve authorization from public.users., _resolve_supabase_user(), compressed_json(), FakeAsyncClient, FakeAuthClient, FakePostgrestClient, FakeResponse, test_supabase_auth_uses_trusted_directory_link_not_user_metadata() (+2 more)

### Community 25 - "dependencies"
Cohesion: 0.12
Nodes (6): Reads/writes events in the MachineEvents worksheet of a Google Sheet., Reads/writes machines in the Machines worksheet of a Google Sheet.      Maintain, Reads/writes tickets in the Tickets worksheet of a Google Sheet., SheetsEventRepository, SheetsMachineRepository, SheetsTicketRepository

### Community 26 - "TurboFix WhatsApp Brochure (Marketing Image)"
Cohesion: 0.15
Nodes (20): download_media(), _graph_url(), WhatsApp messaging — routes through WaCRM when configured, else direct Meta Clou, Send a plain text message., Send turbofix_escalation in its six-placeholder order., Send a broadcast to multiple recipients. Only available via WaCRM.      recipien, Resolve a WhatsApp media ID → download → save to MEDIA_STORE_DIR.      Returns t, Send a Meta template with body values in placeholder order. (+12 more)

### Community 27 - "QRGatewayTestHelper"
Cohesion: 0.07
Nodes (28): scripts, build, deploy, dev, lint, predeploy, preview, test:dashboard (+20 more)

### Community 28 - "read_records"
Cohesion: 0.07
Nodes (27): @axe-core/playwright, gh-pages, jsdom, oxlint, devDependencies, @axe-core/playwright, gh-pages, jsdom (+19 more)

### Community 29 - "whatsapp.py"
Cohesion: 0.13
Nodes (20): ensure_headers(), _find_worksheet(), get_client(), get_spreadsheet(), get_worksheet(), _open_spreadsheet(), Shared, cached Google Sheets client for all Sheets-backed repositories.  A singl, Return a cached spreadsheet instead of fetching metadata every request. (+12 more)

### Community 30 - "test_webhook.py"
Cohesion: 0.17
Nodes (23): get_sessions(), Dependency that returns the module-level session store., Fire a fallback fan-out for any session that expired without being notified., sweep_expired_unnotified(), _audio_payload(), _enable_fanout_credentials(), _last_ticket_row(), Webhook endpoint tests — updated for the SOLID architecture.  Uses FastAPI's dep (+15 more)

### Community 31 - "devDependencies"
Cohesion: 0.07
Nodes (38): approve_purchase_order(), check_and_reserve_stock(), _check_reorder_for_table(), create_part_request(), create_purchase_order(), _find_inventory_item(), get_purchase_order(), _has_recent_auto_reorder() (+30 more)

### Community 32 - "provider.py"
Cohesion: 0.13
Nodes (27): Automatic Technician Alerts (Feature), Reply DEMO on WhatsApp (Call to Action), Evidence-Based Closure (Feature), Target Audience: Factories / Every Factory Worker, TurboFix WhatsApp Brochure (Marketing Image), Instant Breakdown Tickets (Feature), TurboFix Product (Maintenance Ticketing Platform), Step 1: Scan the Machine QR Code (+19 more)

### Community 34 - "machine_record_service.py"
Cohesion: 0.04
Nodes (45): 10.1 Monitor Metrics, 10.2 Create Post-Release Report, 2.1 Verify Review Completeness, 2.2 Check for Merge Conflicts, 2.3 Verify Commit Hygiene, 2.4 Verify No Secrets Leaked, 3.1 Determine Version Number, 3.2 Create Version Tag (+37 more)

### Community 35 - "App.jsx"
Cohesion: 0.12
Nodes (10): _events_for_machine(), _image_payload(), _last_ticket(), Tests for new features: photo support, language detection, ticket closure, machi, TestImageSupport, TestMachineEvents, TestMachineEventsTab, TestTicketClosure (+2 more)

### Community 36 - "ai_assistant/index.ts"
Cohesion: 0.07
Nodes (47): analyze_image(), detect_language(), extract_machine_record(), _headers(), maintenance_assistant(), Calls Gemini to turn a raw issue description into a structured brief.     Same p, Send a machine photo to Gemini and get a text description of visible issues., Detect the language and return an ISO 639-1 code. (+39 more)

### Community 37 - "summarize.py"
Cohesion: 0.16
Nodes (22): _all_recipients(), _assignee(), _closure_params(), notify_closure(), notify_ticket(), Fan-out service — notifies technicians and informed users about tickets.  Each r, Notify all stakeholders + the worker that a ticket has been closed.      If a tr, All stakeholders + the original worker who reported the issue. (+14 more)

### Community 38 - "escalation_service.py"
Cohesion: 0.06
Nodes (32): Sends a downloaded voice note to OpenAI's transcription API and returns the, transcribe_audio(), get_technician_workload(), check_and_flag_on_creation(), check_repeat_failure(), confirm_ai_diagnosis(), flag_repeat_failure(), get_factory_ai_stats() (+24 more)

### Community 39 - "intelligence_service.py"
Cohesion: 0.15
Nodes (18): MachineRecordRepository, QuickReportDialog(), apiFetch(), getApiBase(), ACCEPTED_EXTENSIONS, clone(), EMPTY_EXTRACTION, FILE_ACCEPT (+10 more)

### Community 40 - "Records.jsx"
Cohesion: 0.06
Nodes (35): 1.1 Create FeatureFlagSettings Component, 1.2 Update App.jsx (3 changes), 1.3 Test Build, 1.4 Test Feature Flag in Browser Console, 2.1 Configure Feature Flag for Phase 1, 2.2 Notify QA Team, 2.3 Create Monitoring Dashboard (Optional), 📞 Communication Plan (+27 more)

### Community 41 - "auth_router.py"
Cohesion: 0.17
Nodes (15): escalate_part_request(), escalate_ticket(), _minutes_open(), Escalation engine — checks ticket timers and fires WhatsApp notifications.  Two, Advance a part request to the next escalation level., Technician submits evidence photo; notify Maintenance Head for approval., Maintenance Head rejects closure — ticket reopened, technician notified., Check all open tickets and part requests for overdue escalations. (+7 more)

### Community 42 - "is_configured"
Cohesion: 0.13
Nodes (16): ALLOWED_AI_ROLES, allowedOrigins, buildMachineMarkdown(), bullets(), compactExtraction(), compactProperties(), cors(), DANGEROUS_RESPONSE_PATTERNS (+8 more)

### Community 43 - "LocalUserRepository"
Cohesion: 0.16
Nodes (3): _expand_encoded_json(), Supabase TEXT has no Excel cell limit, so persist readable JSON., SupabaseTicketRepository

### Community 44 - "sw-strategies.js"
Cohesion: 0.13
Nodes (7): _company_code_for_factory_id(), _company_code_for_id(), Given a company UUID, return its domain code., Given a factory UUID, find the matching company domain code., Map Supabase users row → standard USERS_HEADER dict., Map Supabase companies row → standard COMPANIES_HEADER dict., SupabaseUserRepository

### Community 46 - "conftest.py"
Cohesion: 0.13
Nodes (7): CACHE_NAMES, CachingStrategies, handleRequest(), OfflineActionQueue, offlineQueue, shouldCache(), STATIC_ASSETS

### Community 47 - "gemini.py"
Cohesion: 0.12
Nodes (8): Send turbofix_new_ticket: ticket, machine, location, issue, urgency, assignee., send_template_message(), FakeAsyncClient, FakePostAsyncClient, FakeResponse, Tests for the WhatsApp infrastructure client — updated for the SOLID architectur, test_download_media_saves_file(), test_send_template_message_posts_expected_payload()

### Community 48 - ".get"
Cohesion: 0.18
Nodes (12): Tracks, per sender phone number, the most recent ticket opened from a text     m, Records that this phone's session has already been fanned out, so a later, Removes every expired session (regardless of notified status, so memory, Session, SessionStore, test_get_returns_none_for_unknown_phone(), test_open_and_get_within_ttl(), test_opening_again_overwrites_previous_session() (+4 more)

### Community 49 - "components.json"
Cohesion: 0.19
Nodes (9): DirectionProvider(), getFlagEmoji(), LanguageStats(), LanguageSwitcher(), LocalizedDate(), LocalizedNumber(), LocalizedText(), I18nManager (+1 more)

### Community 50 - "scripts"
Cohesion: 0.11
Nodes (17): Integration tests for escalation_service.py  Tests ticket escalation workflow: -, Test supervisor rejecting technician's closure (incomplete work)., Test technician submitting closure evidence (photo/notes)., Test WhatsApp message formatting for escalation alerts., In-memory session store for testing., Test that _escalation_loop runs without errors., Test escalation timing respects factory shift schedule., Test automatic escalation triggers after N hours. (+9 more)

### Community 51 - "Home.jsx"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 52 - "test_gemini.py"
Cohesion: 0.16
Nodes (13): FeatureFlag, FlagConfig, FLAGS, getAllFeatureFlags(), getCurrentUser(), getFeatureFlagOverride(), getUserPercentage(), isFeatureFlagEnabled() (+5 more)

### Community 53 - "dependencies.py"
Cohesion: 0.29
Nodes (12): get_tickets(), Return the configured TicketRepository implementation (cached singleton)., new_ticket_id(), _open_ticket(), _technician_token(), test_evidence_upload_is_persisted_and_downloadable(), test_submission_requires_complete_checklist_and_notes(), test_technician_can_submit_work_for_supervisor_approval() (+4 more)

### Community 54 - "SupabaseFileStorage"
Cohesion: 0.11
Nodes (26): Pluggable outbound email (Phase 5 - password reset).  Mirrors the local/sheets a, Send (or, in console mode, log) a plain-text email. Failures are logged and, _send_console(), send_email(), _send_smtp(), Notification service — handles Email and WhatsApp routing for POs and requests., Send PO/Part request notifications via Email (always) and WhatsApp (if not opted, _send_po_email() (+18 more)

### Community 55 - "SupabaseTicketRepository"
Cohesion: 0.16
Nodes (5): _company_id_for_code(), _factory_id_for_code(), Given a company domain/code, return its companies UUID., Given a company domain/code, return the corresponding factories UUID., GET rows. params are PostgREST query-string filters.

### Community 56 - "test_vault_quota_admin.py"
Cohesion: 0.20
Nodes (13): admin_token(), _machine(), Machine-onboarding quota + the internal TurboFix-team admin console.  Seeded sta, test_admin_can_list_users_and_reset_password(), test_admin_can_view_company_dashboard(), test_admin_can_view_read_only_company_workspace(), test_admin_endpoints_require_admin_token(), test_admin_lists_companies_with_usage() (+5 more)

### Community 57 - "useI18n"
Cohesion: 0.18
Nodes (6): AccordionSections(), initialTab(), readCurrentUser(), responseStepLabel(), Settings(), settingTabs

### Community 58 - "get_tickets"
Cohesion: 0.14
Nodes (9): _clear_di_caches(), isolated_machine_data_store(), Path, Clear all DI factory lru_caches so monkeypatched config is picked up., Prevent generated MachineData files from leaking across tests or into source dat, A TestClient wired to a throwaway copy of the tracker (never the real one)     a, rewrite_document_paths(), vault_client() (+1 more)

### Community 59 - ".insert"
Cohesion: 0.12
Nodes (16): Closed-Loop Maintenance, DocumentRepository, DriveFileStorage, Machine Knowledge, MachineRecordRepository, QRGateway, Technician, TicketRepository (+8 more)

### Community 60 - "I18nManager"
Cohesion: 0.19
Nodes (4): new_item_id(), Google Sheets implementation of PartsRepository.  Previously parts_store.py only, Reads/writes spare parts and consumables worksheets in a Google Sheet., SheetsPartsRepository

### Community 61 - "ai_service.py"
Cohesion: 0.20
Nodes (5): AI Firewall Security, Security Checklist, Systems Thinking, Burden Absorption Principle, Closed-Loop Systems Model

### Community 62 - "SheetsPartsRepository"
Cohesion: 0.19
Nodes (10): AntDProvider(), antdLocaleExtensions, antdLocaleMap, getAntDLocaleFromI18n(), getExtendedAntDLocale(), turboFixToAntDKeys, brandColors, colors (+2 more)

### Community 63 - "checklist.md"
Cohesion: 0.06
Nodes (30): 3.1 TypeScript & Linting, 3.2 Unit Tests, 3.3 E2E Tests, 4.1 Architecture & Design, 4.2 Code Quality, 4.3 React & Hooks Best Practices, 4.4 i18n & Localization, 4.5 Responsive Design (+22 more)

### Community 64 - "PerformanceMonitor"
Cohesion: 0.16
Nodes (16): _content_matches_extension(), FileTooLargeError, Pluggable file storage — local disk (dev/test) and Google Drive (production).  T, Check that file content magic bytes match the claimed extension., Shared upload validation — called before any save attempt., UnsupportedFileTypeError, validate_upload(), configure_logging() (+8 more)

### Community 65 - "SheetsMachineRecordRepository"
Cohesion: 0.16
Nodes (4): LocalUserRepository, _normalize(), Reads/writes Users and Companies tabs in the local tracker workbook., Look up a user by phone or email (case-insensitive, whitespace-trimmed).

### Community 67 - "auth.py"
Cohesion: 0.13
Nodes (13): Bug Fix: Quick Example, Expected Timeline, Failure State (Reviewer Rejection), Issue: Creator Takes Too Long, Issue: Reviewer Blocks Code, Notification, Quick Workflow Run, Scenario (+5 more)

### Community 68 - "company_hierarchy"
Cohesion: 0.23
Nodes (12): Closed-Loop Maintenance Lifecycle, MachineRepository, TicketRepository, generateChecklist(), similarity(), step(), STOP_WORDS, text() (+4 more)

### Community 69 - "report_service.py"
Cohesion: 0.15
Nodes (21): admin_company_workspace_preview(), admin_list_companies(), admin_update_company(), _company_approved(), _company_quota(), _is_closed(), _is_critical(), _latest() (+13 more)

### Community 70 - "SupabaseUserRepository"
Cohesion: 0.15
Nodes (12): Key Reminders, Output Format, Phase 1: Receive & Parse Requirement, Phase 2: Design Architecture, Phase 3: Code Implementation, Phase 4: Write Tests, Phase 5: Update Documentation, Phase 6: Create Git Commit (+4 more)

### Community 71 - "FakeAsyncClient"
Cohesion: 0.17
Nodes (12): Example 1: Simple Feature Request, Example 2: Feature with Dependencies, Example 3: Bug Fix, Next Steps, Overview, Prerequisites, Repository Setup, Required Accounts & Access (+4 more)

### Community 72 - "test_vault_password_reset.py"
Cohesion: 0.23
Nodes (9): Password-reset flow (email link). Runs entirely against the local xlsx store wit, Capture every email the backend tries to send instead of logging/sending it., _request_reset(), sent_emails(), test_full_reset_flow_lets_user_log_in_with_new_password(), test_login_token_cannot_be_used_as_reset_token(), test_reset_enforces_min_password_length(), test_reset_token_is_single_use() (+1 more)

### Community 74 - "hash_password"
Cohesion: 0.33
Nodes (9): parse_message(), ParsedTicket, Extract the machine ID and issue description from an incoming message.      Retu, test_parses_id_embedded_mid_sentence(), test_parses_id_without_colon_or_description(), test_parses_lowercase_id(), test_parses_standard_prefilled_message(), test_returns_none_for_empty_text() (+1 more)

### Community 76 - "parse_message"
Cohesion: 0.20
Nodes (9): After Test Success, Feature Specification, Stage 1: Creator, Stage 2: Reviewer, Stage 3: Approver, Success Criteria for Test, Test Execution Log Template, Test Feature: Simple Widget Component (+1 more)

### Community 80 - "select.jsx"
Cohesion: 0.24
Nodes (7): TechnicianWorkRepository, AntDNavigationLayout(), getNavMenuItems(), getUserMenuItems(), computeDataQuality(), computeShiftHandover(), Technician()

### Community 81 - "OfflineQueue"
Cohesion: 0.36
Nodes (9): calculateEstimate(), clampHours(), defaultEstimationRules, formatDate(), loadEstimationRules(), nextSunday(), priorityRank, ShutdownPlanner() (+1 more)

### Community 82 - "test_supabase_machine_records.py"
Cohesion: 0.29
Nodes (8): dateFormatter, i18n, numberFormatter, I18nContext, I18nProvider(), useI18nContext(), SUPPORTED_LANGUAGES, TRANSLATIONS

### Community 83 - "SupabasePartsRepository"
Cohesion: 0.31
Nodes (7): GATEWAY_I18N, getDirectCause(), getRootCauseFix(), LIFECYCLE, stageInfo(), Tickets(), supabase

### Community 84 - "ShutdownPlanner.jsx"
Cohesion: 0.21
Nodes (4): new_document_id(), LocalDocumentRepository, Local (openpyxl / Excel) implementation of DocumentRepository., Reads/writes document metadata in the Documents tab of the local workbook.

### Community 85 - "LocalDocumentRepository"
Cohesion: 0.09
Nodes (4): LocalCustomKpiRepository, LocalMachineRecordRepository, LocalSettingsRepository, LocalTechnicianWorkRepository

### Community 87 - "LocalPartsRepository"
Cohesion: 0.33
Nodes (3): Google Sheets implementation of DocumentRepository.  Previously documents_store., Reads/writes document metadata in the Documents worksheet of a Google Sheet., SheetsDocumentRepository

### Community 88 - "test_contact_privacy.py"
Cohesion: 0.44
Nodes (8): _add_member(), _team(), test_legacy_machine_contacts_are_labeled_by_actual_staff_role(), test_machine_assignments_use_staff_ids_and_never_list_raw_contacts(), test_maintenance_head_can_reveal_all_company_contacts(), test_offline_staff_can_be_added_without_contact_details(), test_supervisor_and_technician_contact_access_follows_hierarchy(), test_team_directory_masks_contacts_and_owner_can_reveal()

### Community 90 - "manifest.json"
Cohesion: 0.36
Nodes (9): icons.svg (Icon Sprite Sheet), Bluesky Icon (butterfly logo), Brand/Social-Link Icon Group (dark-fill, uniform ~19x19 viewBox), Discord Icon (game controller/mascot face logo), Documentation Icon (open book/chat outline, purple stroke), GitHub Icon (Octocat/Git logo), Social/Community Icon (person with badge/ribbon, purple stroke), UI Accent Icon Group (purple stroke #aa3bff, outline style) (+1 more)

### Community 91 - "table.jsx"
Cohesion: 0.22
Nodes (8): background_color, display, icons, name, orientation, short_name, start_url, theme_color

### Community 93 - "LocalMachineRecordRepository"
Cohesion: 0.31
Nodes (7): allowedOrigins, cors(), mimeToExtension(), optionalTicketColumns, reply(), text(), uploadDataUrl()

### Community 95 - "SheetsDocumentRepository"
Cohesion: 0.25
Nodes (8): Issue: Build Fails During Deployment, Issue: Merge Conflict, Issue: Production Deployment Fails, Issue: Reviewer Rejects Code, Issue: Secrets Detected in Code, Issue: Workflow Stalls at Creator Stage, Issue: Workflow Timeout, Troubleshooting

### Community 96 - "SupabaseMachineRecordRepository"
Cohesion: 0.09
Nodes (22): get_custom_kpis(), get_documents(), get_escalation_config(), get_machines(), get_parts(), get_settings(), get_shift_config(), get_technician_work() (+14 more)

### Community 97 - "SupabaseCustomKpiRepository"
Cohesion: 0.36
Nodes (5): admin_token(), test_onboard_company_duplicate_rejected(), test_onboard_company_invalid_password_rejected(), test_onboard_company_success(), test_owner_cannot_create_another_owner()

### Community 98 - "test_admin_onboarding.py"
Cohesion: 0.39
Nodes (8): create_access_token(), test_backup_contains_originals_structured_data_csv_and_machine_data(), test_duplicate_source_is_rejected(), test_non_owner_operational_role_can_create_review_draft(), test_only_maintenance_head_can_approve_and_approved_data_reaches_machine_context(), test_restore_requires_maintenance_head(), test_supervisor_can_upload_and_company_isolation_is_enforced(), upload_record()

### Community 100 - ".oxlintrc.json"
Cohesion: 0.25
Nodes (7): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, warn

### Community 104 - "LocalSettingsRepository"
Cohesion: 0.29
Nodes (4): MediaRecorderMock, MOCK_MACHINE, MOCK_TICKET, MOCK_USER

### Community 105 - "get_technician_load"
Cohesion: 0.29
Nodes (3): AntDChartCard(), AntDDetailList(), AntDEmptyState()

### Community 107 - "useTheme.jsx"
Cohesion: 0.29
Nodes (7): New Feature: Complete Example, Scenario, Step 1: Define Requirements, Step 2: Run Workflow, Step 3: Monitor Workflow, Step 4: Post-Deployment Verification, Step 5: Collect Metrics (24 Hours Later)

### Community 108 - "Settings.jsx"
Cohesion: 0.52
Nodes (6): print_error(), print_header(), print_info(), print_stage(), print_success(), RUN_TEST.sh script

### Community 110 - "test_vault_signup.py"
Cohesion: 0.33
Nodes (6): App.jsx Feature Flag Routing Integration, Gradual Rollout Implementation Checklist, Emergency Rollback Procedure, Machines Gradual Rollout Strategy, featureFlags.ts Utility System, Feature Flag Monitoring Metrics Dashboard

### Community 111 - "compilerOptions"
Cohesion: 0.33
Nodes (5): compilerOptions, baseUrl, paths, include, src

### Community 112 - "tabs.jsx"
Cohesion: 0.60
Nodes (3): ThemeToggle(), ThemeProvider(), useTheme()

### Community 116 - "SheetsSettingsRepository"
Cohesion: 0.33
Nodes (6): 1. Clear Feature Descriptions, 2. Link to Issues, 3. Monitor Production After Deployment, 4. Keep Rollback Ready, 5. Document Custom Configurations, Best Practices

### Community 118 - "FakeAuthClient"
Cohesion: 0.60
Nodes (4): main(), Make the checked-in local workbook useful for a complete post-login demo.  Run f, row_map(), set_value()

### Community 119 - "migrate.cjs"
Cohesion: 0.40
Nodes (5): AI Diagnostics edge function, check_schedules, pm_scheduler, Service Integrations & Webhooks, WhatsApp Gateway client

### Community 120 - "package.json"
Cohesion: 0.40
Nodes (5): Machines Page UX/UI Audit, State Variable Grouping & Restructuring, 3-Tier Information Architecture Pattern, Machines Refactor Implementation Guide, MachinesRefactored.jsx Component

### Community 121 - "NotificationCenter.jsx"
Cohesion: 0.40
Nodes (4): fs, pages, { Parser }, path

### Community 122 - "alert.jsx"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 126 - "Permission Assertions & RBAC Helpers"
Cohesion: 0.50
Nodes (3): SSRF Webhook Validation, WebSocket Queue Overflow Fix, XSS Vulnerability Fix

### Community 127 - "imports"
Cohesion: 0.50
Nodes (4): approve_ticket_closure(), Maintenance Head approves closure — ticket resolved., Test supervisor approving technician's closure report., test_approve_ticket_closure_as_supervisor()

### Community 128 - "imports"
Cohesion: 0.50
Nodes (4): delegate_to_colleague(), Delegate ticket to a colleague; resets the escalation timer., Test technician delegating ticket to colleague., test_delegate_to_colleague()

### Community 129 - "imports"
Cohesion: 0.50
Nodes (4): initialize_ticket_escalation(), Set the first escalation timer on a newly created ticket., Test creating a new ticket escalation record., test_initialize_ticket_escalation()

### Community 130 - "imports"
Cohesion: 0.50
Nodes (4): mark_outsourced(), Manager marks ticket as outsourced; escalation pauses., Test marking issue as outsourced (vendor/contractor involvement)., test_mark_outsourced_escalation()

### Community 131 - "imports"
Cohesion: 0.50
Nodes (4): TurboFix SOLID Backend Architecture, TurboFix Backend README, Render Blueprint, Backend Requirements

### Community 133 - "imports"
Cohesion: 0.50
Nodes (4): Playwright Audit Summary, Playwright Delivery Checklist, Session 3 Summary, UX Audit Suite README

### Community 134 - "imports"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 135 - "imports"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 136 - "imports"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 137 - "imports"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 138 - "imports"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 139 - "qr-gateway.spec.ts"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 140 - "qrgateway.spec.js"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 141 - "TurboFix Production CI/CD Workflow"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 142 - "TurboFix Brand Identity"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 143 - "generate_logo.py"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 144 - "seed_demo.py"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 145 - "_FakeBrief"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 147 - "DashboardWidget.jsx"
Cohesion: 0.67
Nodes (3): TurboFix Production CI/CD Workflow, Deploy Frontend to GitHub Pages, Production Setup Checklist

### Community 149 - "button.jsx"
Cohesion: 0.67
Nodes (3): TurboFix Logo (SVG), Favicon (favicon.svg), TurboFix Brand Identity

### Community 235 - "Documentation Files (3 Total)"
Cohesion: 0.33
Nodes (6): Configuration, Configure Deployment Target, Configure Notifications (Optional), Email Notifications (Optional), GitHub Notifications, Slack Notifications

### Community 236 - "SheetsSettingsRepository"
Cohesion: 0.33
Nodes (6): Installation, Step 1: Verify Agent Files Exist, Step 2: Verify Workflow Config, Step 3: Install Dependencies, Step 4: Verify Git Configuration, Step 5: Setup Environment Variables

### Community 237 - "🏆 Quality Metrics"
Cohesion: 0.33
Nodes (6): Method 1: Manual CLI Command (Recommended for Testing), Method 2: Interactive Claude Code Session, Method 3: GitHub Webhook (Automated), Running the Workflow, Start Workflow with Feature Requirement, What Happens

### Community 238 - "🚀 Quick Start"
Cohesion: 0.40
Nodes (5): 1. Clear Feature Descriptions Help Creator, 2. Monitor During Workflow, 3. Have Rollback Ready, 4. Communicate with Team, Tips for Success

### Community 239 - "🎯 Next Steps"
Cohesion: 0.40
Nodes (5): Performance Optimization, Scenario, What Creator Does, What Reviewer Checks, Workflow Run

### Community 240 - "✅ Session Accomplishments"
Cohesion: 0.50
Nodes (4): Assistant(), getLiveDataAnswer(), machineSuggestions, plantSuggestions

### Community 241 - "📁 Files Delivered"
Cohesion: 0.60
Nodes (4): issueText(), roleTypes, Support(), typeLabel()

### Community 242 - "📈 Execution Timeline"
Cohesion: 0.50
Nodes (4): Accelerated Process, Scenario, Security Patch, Workflow Run

### Community 243 - "🎉 Summary"
Cohesion: 0.50
Nodes (4): Documentation Update, Scenario, Unique Aspect, Workflow Run

### Community 244 - "📋 Session Overview"
Cohesion: 0.50
Nodes (4): Check Agent Progress, Monitor Production Deployment, Monitoring, Track Workflow Progress

### Community 245 - "send_report"
Cohesion: 0.50
Nodes (4): Contact, Get Help, Report Issues, Support & Help

## Ambiguous Edges - Review These
- `Evidence-Based Closure (Feature)` → `Spare-Part Requests (Feature)`  [AMBIGUOUS]
  public/assets/turbofix-whatsapp-brochure.png · relation: conceptually_related_to
- `Bluesky Icon (butterfly logo)` → `Social/Community Icon (person with badge/ribbon, purple stroke)`  [AMBIGUOUS]
  public/icons.svg · relation: conceptually_related_to

## Knowledge Gaps
- **486 isolated node(s):** `$schema`, `oxc`, `react/rules-of-hooks`, `warn`, `$schema` (+481 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **70 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Evidence-Based Closure (Feature)` and `Spare-Part Requests (Feature)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Bluesky Icon (butterfly logo)` and `Social/Community Icon (person with badge/ribbon, purple stroke)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `MachineRepository` connect `EventRepository` to `UserRepository`, `whatsapp_webhook/index.ts`, `DocumentRepository`, `fanout_service.py`, `auth_headers`, `TicketRepository`, `base.py`, `test_new_features.py`, `react`, `dependencies`, `whatsapp.py`, `test_webhook.py`, `LocalUserRepository`, `sw-strategies.js`, `SessionStore`, `SupabaseFileStorage`, `PerformanceMonitor`, `performance.jsx`, `report_service.py`, `icons.svg (Icon Sprite Sheet)`, `SupabaseMachineRecordRepository`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Why does `UserRepository` connect `auth_headers` to `SupabaseMachineRecordRepository`, `UserRepository`, `SheetsMachineRecordRepository`, `EventRepository`, `whatsapp_webhook/index.ts`, `performance.jsx`, `report_service.py`, `fanout_service.py`, `LocalUserRepository`, `sw-strategies.js`, `SessionStore`, `test_new_features.py`, `react`, `Top Navigation Bar`, `icons.svg (Icon Sprite Sheet)`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `TicketRepository` connect `react` to `UserRepository`, `EventRepository`, `whatsapp_webhook/index.ts`, `fanout_service.py`, `auth_headers`, `TicketRepository`, `base.py`, `test_new_features.py`, `dependencies`, `whatsapp.py`, `test_webhook.py`, `LocalUserRepository`, `sw-strategies.js`, `SessionStore`, `dependencies.py`, `SupabaseFileStorage`, `performance.jsx`, `report_service.py`, `icons.svg (Icon Sprite Sheet)`, `SupabaseMachineRecordRepository`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Are the 47 inferred relationships involving `MachineRepository` (e.g. with `LocalEventRepository` and `LocalMachineRepository`) actually correct?**
  _`MachineRepository` has 47 INFERRED edges - model-reasoned connections that need verification._
- **Are the 45 inferred relationships involving `TicketRepository` (e.g. with `LocalEventRepository` and `LocalMachineRepository`) actually correct?**
  _`TicketRepository` has 45 INFERRED edges - model-reasoned connections that need verification._