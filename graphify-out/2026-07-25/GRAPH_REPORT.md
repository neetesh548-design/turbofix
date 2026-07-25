# Graph Report - .  (2026-07-25)

## Corpus Check
- 16 files · ~453,065 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2821 nodes · 5946 edges · 235 communities (160 shown, 75 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 593 edges (avg confidence: 0.56)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 93
- Community 94
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 103
- Community 104
- Community 105
- Community 106
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Community 124
- Community 126
- Community 127
- Community 128
- Community 129
- Community 130
- Community 131
- Community 132
- Community 133
- Community 134
- Community 135
- Community 136
- Community 137
- Community 138
- Community 139
- Community 140
- Community 141
- Community 142
- Community 143
- Community 144
- Community 145
- Community 147
- Community 148
- Community 149
- Community 150
- Community 151
- Community 152
- Community 153
- Community 154
- Community 155
- Community 157
- Community 158
- Community 160
- Community 161
- Community 162
- Community 163
- Community 164
- Community 165
- Community 166
- Community 167
- Community 168
- Community 169
- Community 170
- Community 171
- Community 172
- Community 174
- Community 175
- Community 176
- Community 177
- Community 178
- Community 179
- Community 180
- Community 181
- Community 182
- Community 183
- Community 186
- Community 190
- Community 191
- Community 192
- Community 193
- Community 194
- Community 195
- Community 196
- Community 197
- Community 198
- Community 200
- Community 208
- Community 210
- Community 211
- Community 218
- Community 219
- Community 230

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

## Communities (235 total, 75 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (86): Role, get_ai_feedback(), get_escalation_config(), get_part_requests(), get_shift_config(), Dependency Injection factories for all TurboFix repositories.  FastAPI's Depends, CustomKpiRepository, DocumentRepository (+78 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (79): CurrentUser, The authenticated caller's identity, parsed straight from the JWT - no extra, Enforces the same multi-tenant isolation used for tickets/machines         elsew, get_machine_records(), Return the approved/draft AI machine-record repository., FileStorage, get_file_storage(), Return file bytes for a storage_path previously returned by save(). (+71 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (83): EventRepository, Read/write access to the Tickets data entity., Generate a new unique ticket ID., Append a new ticket row. Keys must match TICKETS_HEADER., Return the ticket dict for ticket_id, or None if not found., Set voice_note_media_id on the matching row. Returns True if found., Update AI-generated fields on the matching ticket. Returns True if found., Return all tickets belonging to a company. (+75 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (49): _content_matches_extension(), DriveFileStorage, FileTooLargeError, LocalFileStorage, _object_key(), ABC, Path, Pluggable file storage — local disk (dev/test) and Google Drive (production).  T (+41 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (49): OPENAI_API_KEY, allowedOrigins, cors(), reply(), RAZORPAY_WEBHOOK_SECRET, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN (+41 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (36): auth_headers(), login(), test_assistant_rejects_machine_from_another_company(), test_machine_assistant_uses_exact_question_and_machine_data(), test_plant_wide_ai_context_contains_every_company_machine(), test_plant_wide_assistant_has_live_data_fallback(), TestOnboardingPhoneValidation, TestReports (+28 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (36): Self-contained internal TurboFix platform administration console., create_admin_token(), get_current_admin(), is_configured(), admin_company_users(), admin_console(), admin_list_companies(), admin_login() (+28 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (21): react, react, CachedData, LazyComponent, MemoizedCard, OptimizedImage(), useDebounce(), usePerformanceMonitor() (+13 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (41): create_reset_token(), decode_access_token(), decode_reset_token(), get_current_user(), hash_password(), _password_fingerprint(), Phase 5 - Document Vault authentication.  A small, real (not stubbed) JWT auth l, Returns the payload only if the token is a valid, unexpired reset token.     Cal (+33 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (43): get_custom_kpis(), get_documents(), get_events(), get_machines(), get_parts(), get_settings(), get_technician_work(), get_users() (+35 more)

### Community 10 - "Community 10"
Cohesion: 0.06
Nodes (12): LocalEventRepository, LocalMachineRepository, LocalTicketRepository, Reads/writes events in the MachineEvents tab of the local tracker workbook., Reads/writes machines in the Machines tab of the local tracker workbook.      Ma, Return the next Mnnn code for a company (e.g. 'M003' if M001/M002 exist)., Reads/writes tickets in the Tickets tab of the local tracker workbook., machine_repo() (+4 more)

### Community 11 - "Community 11"
Cohesion: 0.06
Nodes (43): build_custom_kpi_values(), compute_auto_insights(), compute_kpis(), _parse_dt(), datetime, Dashboard service — compute per-company KPIs from live ticket/machine data.  Ext, Derive MTBF, MTTR, repeat breakdown %, and top problem machines from ticket data, Compute live KPI dashboard for a company. Pure function — no I/O calls. (+35 more)

### Community 12 - "Community 12"
Cohesion: 0.05
Nodes (43): check_repeat_failure(), Check if machine has had more than `threshold` tickets in last `days` days., Integration tests for intelligence_service.py  Tests AI-powered machine intellig, Test extracting data from machine photo (vision AI)., Test that high-confidence extractions are preferred over quantity., Test handling when two sources give conflicting specs., Test first occurrence of an issue (no repeat yet)., Test detecting repeat failure within threshold window. (+35 more)

### Community 13 - "Community 13"
Cohesion: 0.08
Nodes (22): CustomKpiRepository, AntDKPICard(), ClosedLoopControlCard(), asNumber(), buildMonthlyTrend(), computeBacklog(), computeBacklogVelocity(), computeCostRatios() (+14 more)

### Community 14 - "Community 14"
Cohesion: 0.07
Nodes (28): new_event_id(), new_kpi_entry_id(), new_kpi_id(), Abstract base classes (interfaces) for all TurboFix data repositories.  Every co, Local (openpyxl / Excel) implementation of DocumentRepository., In-memory implementation of CustomKpiRepository for local dev/testing., Local (openpyxl / Excel) implementation of PartsRepository., Excel-backed company settings repository for local development and tests. (+20 more)

### Community 15 - "Community 15"
Cohesion: 0.07
Nodes (35): Rate limiting for sensitive endpoints — prevents brute-force, spam, and DoS., _auto_reorder_loop(), _daily_digest_loop(), _drift_check_loop(), _escalation_loop(), health(), _lifespan(), _predictive_loop() (+27 more)

### Community 16 - "Community 16"
Cohesion: 0.12
Nodes (35): GET from `url` with automatic retry on transient errors., resilient_get(), get_account_info(), get_broadcast_status(), get_conversation(), get_conversation_messages(), get_or_create_contact(), _headers() (+27 more)

### Community 17 - "Community 17"
Cohesion: 0.07
Nodes (26): App(), Assistant, Dashboard, Home, Inventory, Kaizen, Login, Machines (+18 more)

### Community 18 - "Community 18"
Cohesion: 0.11
Nodes (23): AdvancedFeaturesDrilldown(), AppShell(), getLiveDataAnswer(), isTokenExpired(), NAV_LIVE, NAV_SOON, readAuth(), ContactReveal() (+15 more)

### Community 19 - "Community 19"
Cohesion: 0.06
Nodes (33): @ant-design/icons, antd, class-variance-authority, clsx, html-to-react, jszip, lucide-react, dependencies (+25 more)

### Community 20 - "Community 20"
Cohesion: 0.14
Nodes (24): MachineRepository, new_document_id(), Read/write access to the Machines data entity., Return {machine_id: {...}} for all machines (may be cached)., Return the machine dict, or None if not found., Append a new machine row. Keys must match MACHINES_HEADER (minus has_open_ticket, Force the next load() to re-read from the backing store., Return the next Mnnn code for a company, e.g. 'M003'. (+16 more)

### Community 21 - "Community 21"
Cohesion: 0.08
Nodes (9): react, Badge(), badgeVariants, Button(), buttonVariants, ThemeContext, LanguageContext, LanguageProvider() (+1 more)

### Community 22 - "Community 22"
Cohesion: 0.10
Nodes (18): Footer(), LanguageGate(), Navbar(), SkipLink(), useLanguage(), MainLayout(), contentByLanguage, faqs (+10 more)

### Community 23 - "Community 23"
Cohesion: 0.12
Nodes (12): Any, new_user_id(), _get_all_values(), Read canonical records while tolerating old, extra, or blank columns.      Produ, read_records(), _normalize(), Google Sheets implementation of UserRepository., Reads/writes Users and Companies worksheets in a Google Sheet. (+4 more)

### Community 24 - "Community 24"
Cohesion: 0.09
Nodes (10): Validate a Supabase access token and resolve authorization from public.users., _resolve_supabase_user(), compressed_json(), FakeAsyncClient, FakeAuthClient, FakePostgrestClient, FakeResponse, test_supabase_auth_uses_trusted_directory_link_not_user_metadata() (+2 more)

### Community 25 - "Community 25"
Cohesion: 0.13
Nodes (6): Reads/writes events in the MachineEvents worksheet of a Google Sheet., Reads/writes machines in the Machines worksheet of a Google Sheet.      Maintain, Reads/writes tickets in the Tickets worksheet of a Google Sheet., SheetsEventRepository, SheetsMachineRepository, SheetsTicketRepository

### Community 26 - "Community 26"
Cohesion: 0.12
Nodes (26): _is_retryable(), Resilient HTTP client with tenacity retry + exponential backoff.  Wraps httpx fo, POST to `url` with automatic retry on transient errors.      All keyword argumen, resilient_post(), download_media(), _graph_url(), WhatsApp messaging — routes through WaCRM when configured, else direct Meta Clou, Send a plain text message. (+18 more)

### Community 27 - "Community 27"
Cohesion: 0.07
Nodes (28): scripts, build, deploy, dev, lint, predeploy, preview, test:dashboard (+20 more)

### Community 28 - "Community 28"
Cohesion: 0.07
Nodes (27): @axe-core/playwright, gh-pages, jsdom, oxlint, devDependencies, @axe-core/playwright, gh-pages, jsdom (+19 more)

### Community 29 - "Community 29"
Cohesion: 0.13
Nodes (20): ensure_headers(), _find_worksheet(), get_client(), get_spreadsheet(), get_worksheet(), _open_spreadsheet(), Shared, cached Google Sheets client for all Sheets-backed repositories.  A singl, Return a cached spreadsheet instead of fetching metadata every request. (+12 more)

### Community 30 - "Community 30"
Cohesion: 0.17
Nodes (23): get_sessions(), Dependency that returns the module-level session store., Fire a fallback fan-out for any session that expired without being notified., sweep_expired_unnotified(), _audio_payload(), _enable_fanout_credentials(), _last_ticket_row(), Webhook endpoint tests — updated for the SOLID architecture.  Uses FastAPI's dep (+15 more)

### Community 31 - "Community 31"
Cohesion: 0.10
Nodes (26): approve_purchase_order(), _check_reorder_for_table(), create_purchase_order(), get_purchase_order(), _has_recent_auto_reorder(), issue_part(), issue_stock(), list_pending_pos() (+18 more)

### Community 32 - "Community 32"
Cohesion: 0.13
Nodes (27): Automatic Technician Alerts (Feature), Reply DEMO on WhatsApp (Call to Action), Evidence-Based Closure (Feature), Target Audience: Factories / Every Factory Worker, TurboFix WhatsApp Brochure (Marketing Image), Instant Breakdown Tickets (Feature), TurboFix Product (Maintenance Ticketing Platform), Step 1: Scan the Machine QR Code (+19 more)

### Community 34 - "Community 34"
Cohesion: 0.09
Nodes (24): get_downtime_summary(), get_threshold_drift(), get_ticket_downtime(), acknowledge_prediction(), calculate_ticket_downtime_cost(), _check_failure_pattern(), check_threshold_drift(), _create_prediction() (+16 more)

### Community 35 - "Community 35"
Cohesion: 0.12
Nodes (10): _events_for_machine(), _image_payload(), _last_ticket(), Tests for new features: photo support, language detection, ticket closure, machi, TestImageSupport, TestMachineEvents, TestMachineEventsTab, TestTicketClosure (+2 more)

### Community 36 - "Community 36"
Cohesion: 0.17
Nodes (21): active_provider(), analyze_image(), detect_language(), enabled(), extract_machine_record(), maintenance_assistant(), Resolves which AI backend to use: "gemini", "openai", or "" (AI layer off)., Extract structured maintenance facts without approving them for AI use. (+13 more)

### Community 37 - "Community 37"
Cohesion: 0.17
Nodes (22): _all_recipients(), _assignee(), _closure_params(), notify_closure(), notify_ticket(), Fan-out service — notifies technicians and informed users about tickets.  Each r, Notify all stakeholders + the worker that a ticket has been closed.      If a tr, All stakeholders + the original worker who reported the issue. (+14 more)

### Community 38 - "Community 38"
Cohesion: 0.10
Nodes (22): get_technician_workload(), check_and_flag_on_creation(), confirm_ai_diagnosis(), flag_repeat_failure(), get_factory_ai_stats(), get_least_loaded_technician(), get_machine_ai_accuracy(), get_shift_config() (+14 more)

### Community 39 - "Community 39"
Cohesion: 0.15
Nodes (18): MachineRecordRepository, QuickReportDialog(), apiFetch(), getApiBase(), ACCEPTED_EXTENSIONS, clone(), EMPTY_EXTRACTION, FILE_ACCEPT (+10 more)

### Community 40 - "Community 40"
Cohesion: 0.19
Nodes (21): analyze_image(), detect_language(), extract_machine_record(), _headers(), maintenance_assistant(), Calls Gemini to turn a raw issue description into a structured brief.     Same p, Send a machine photo to Gemini and get a text description of visible issues., Detect the language and return an ISO 639-1 code. (+13 more)

### Community 41 - "Community 41"
Cohesion: 0.11
Nodes (20): configure_logging(), get_logger(), Structured JSON logging for TurboFix, backed by structlog.  Every log event prod, Call once at application startup (from main.py lifespan)., Return a structlog logger bound to `name`.      The returned logger behaves exac, escalate_part_request(), escalate_ticket(), _minutes_open() (+12 more)

### Community 42 - "Community 42"
Cohesion: 0.13
Nodes (16): ALLOWED_AI_ROLES, allowedOrigins, buildMachineMarkdown(), bullets(), compactExtraction(), compactProperties(), cors(), DANGEROUS_RESPONSE_PATTERNS (+8 more)

### Community 44 - "Community 44"
Cohesion: 0.13
Nodes (5): _company_code_for_factory_id(), _company_code_for_id(), Given a company UUID, return its domain code., Given a factory UUID, find the matching company domain code., Map Supabase users row → standard USERS_HEADER dict.

### Community 45 - "Community 45"
Cohesion: 0.12
Nodes (6): _company_id_for_code(), _expand_encoded_json(), _factory_id_for_code(), Given a company domain/code, return its companies UUID., Given a company domain/code, return the corresponding factories UUID., Supabase TEXT has no Excel cell limit, so persist readable JSON.

### Community 46 - "Community 46"
Cohesion: 0.13
Nodes (7): CACHE_NAMES, CachingStrategies, handleRequest(), OfflineActionQueue, offlineQueue, shouldCache(), STATIC_ASSETS

### Community 47 - "Community 47"
Cohesion: 0.13
Nodes (6): FakeAsyncClient, FakePostAsyncClient, FakeResponse, Tests for the WhatsApp infrastructure client — updated for the SOLID architectur, test_download_media_saves_file(), test_send_template_message_posts_expected_payload()

### Community 48 - "Community 48"
Cohesion: 0.18
Nodes (12): Tracks, per sender phone number, the most recent ticket opened from a text     m, Records that this phone's session has already been fanned out, so a later, Removes every expired session (regardless of notified status, so memory, Session, SessionStore, test_get_returns_none_for_unknown_phone(), test_open_and_get_within_ttl(), test_opening_again_overwrites_previous_session() (+4 more)

### Community 49 - "Community 49"
Cohesion: 0.19
Nodes (9): DirectionProvider(), getFlagEmoji(), LanguageStats(), LanguageSwitcher(), LocalizedDate(), LocalizedNumber(), LocalizedText(), I18nManager (+1 more)

### Community 50 - "Community 50"
Cohesion: 0.11
Nodes (17): Integration tests for escalation_service.py  Tests ticket escalation workflow: -, Test supervisor rejecting technician's closure (incomplete work)., Test technician submitting closure evidence (photo/notes)., Test WhatsApp message formatting for escalation alerts., In-memory session store for testing., Test that _escalation_loop runs without errors., Test escalation timing respects factory shift schedule., Test automatic escalation triggers after N hours. (+9 more)

### Community 51 - "Community 51"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 52 - "Community 52"
Cohesion: 0.16
Nodes (13): FeatureFlag, FlagConfig, FLAGS, getAllFeatureFlags(), getCurrentUser(), getFeatureFlagOverride(), getUserPercentage(), isFeatureFlagEnabled() (+5 more)

### Community 53 - "Community 53"
Cohesion: 0.26
Nodes (12): create_access_token(), get_tickets(), new_ticket_id(), _open_ticket(), _technician_token(), test_evidence_upload_is_persisted_and_downloadable(), test_submission_requires_complete_checklist_and_notes(), test_technician_can_submit_work_for_supervisor_approval() (+4 more)

### Community 54 - "Community 54"
Cohesion: 0.18
Nodes (14): Pluggable outbound email (Phase 5 - password reset).  Mirrors the local/sheets a, Send (or, in console mode, log) a plain-text email. Failures are logged and, _send_console(), send_email(), _send_smtp(), Notification service — handles Email and WhatsApp routing for POs and requests., Send PO/Part request notifications via Email (always) and WhatsApp (if not opted, _send_po_email() (+6 more)

### Community 56 - "Community 56"
Cohesion: 0.20
Nodes (13): admin_token(), _machine(), Machine-onboarding quota + the internal TurboFix-team admin console.  Seeded sta, test_admin_can_list_users_and_reset_password(), test_admin_can_view_company_dashboard(), test_admin_can_view_read_only_company_workspace(), test_admin_endpoints_require_admin_token(), test_admin_lists_companies_with_usage() (+5 more)

### Community 57 - "Community 57"
Cohesion: 0.15
Nodes (13): Assistant(), getLiveDataAnswer(), machineSuggestions, plantSuggestions, initialTab(), readCurrentUser(), responseStepLabel(), Settings() (+5 more)

### Community 58 - "Community 58"
Cohesion: 0.14
Nodes (9): _clear_di_caches(), isolated_machine_data_store(), Path, Clear all DI factory lru_caches so monkeypatched config is picked up., Prevent generated MachineData files from leaking across tests or into source dat, A TestClient wired to a throwaway copy of the tracker (never the real one)     a, rewrite_document_paths(), vault_client() (+1 more)

### Community 59 - "Community 59"
Cohesion: 0.12
Nodes (16): Closed-Loop Maintenance, DocumentRepository, DriveFileStorage, Machine Knowledge, MachineRecordRepository, QRGateway, Technician, TicketRepository (+8 more)

### Community 60 - "Community 60"
Cohesion: 0.19
Nodes (4): new_item_id(), Google Sheets implementation of PartsRepository.  Previously parts_store.py only, Reads/writes spare parts and consumables worksheets in a Google Sheet., SheetsPartsRepository

### Community 61 - "Community 61"
Cohesion: 0.20
Nodes (5): AI Firewall Security, Security Checklist, Systems Thinking, Burden Absorption Principle, Closed-Loop Systems Model

### Community 62 - "Community 62"
Cohesion: 0.19
Nodes (10): AntDProvider(), antdLocaleExtensions, antdLocaleMap, getAntDLocaleFromI18n(), getExtendedAntDLocale(), turboFixToAntDKeys, brandColors, colors (+2 more)

### Community 63 - "Community 63"
Cohesion: 0.24
Nodes (6): Sends a downloaded voice note to OpenAI's transcription API and returns the, transcribe_audio(), _cell_value(), main(), Creates the live Google Sheet ("TurboFix-Tracker-Live") from TurboFix-Tracker.xl, test_transcribe_audio_returns_stripped_text()

### Community 64 - "Community 64"
Cohesion: 0.20
Nodes (3): new_machine_record_id(), LocalMachineRecordRepository, Local Excel implementation of the AI machine-record repository.

### Community 65 - "Community 65"
Cohesion: 0.16
Nodes (4): LocalUserRepository, _normalize(), Reads/writes Users and Companies tabs in the local tracker workbook., Look up a user by phone or email (case-insensitive, whitespace-trimmed).

### Community 67 - "Community 67"
Cohesion: 0.28
Nodes (12): _compute_metrics(), _filter_tickets_in_range(), generate_report(), _parse_dt(), _period_range(), _previous_period_range(), datetime, Report service — generates daily, weekly, monthly, and YTD maintenance reports. (+4 more)

### Community 68 - "Community 68"
Cohesion: 0.26
Nodes (11): Closed-Loop Maintenance Lifecycle, MachineRepository, TicketRepository, generateChecklist(), similarity(), step(), STOP_WORDS, text() (+3 more)

### Community 69 - "Community 69"
Cohesion: 0.30
Nodes (11): list_team(), reveal_team_contact(), can_reveal_contact(), company_hierarchy(), directory_entry(), _first_user_id(), _manager_chain(), mask_email() (+3 more)

### Community 70 - "Community 70"
Cohesion: 0.17
Nodes (12): check_and_reserve_stock(), create_part_request(), _find_inventory_item(), Release reserved stock (on cancellation)., Search for an item in consumables then parts tables., Create a new part request and start the consumable escalation chain., Check stock availability and reserve if sufficient., release_reservation() (+4 more)

### Community 71 - "Community 71"
Cohesion: 0.18
Nodes (4): CapturingClient, FakeResponse, gemini_reply(), test_transcribe_audio_sends_inline_audio_and_strips_text()

### Community 72 - "Community 72"
Cohesion: 0.23
Nodes (9): Password-reset flow (email link). Runs entirely against the local xlsx store wit, Capture every email the backend tries to send instead of logging/sending it., _request_reset(), sent_emails(), test_full_reset_flow_lets_user_log_in_with_new_password(), test_login_token_cannot_be_used_as_reset_token(), test_reset_enforces_min_password_length(), test_reset_token_is_single_use() (+1 more)

### Community 74 - "Community 74"
Cohesion: 0.33
Nodes (9): parse_message(), ParsedTicket, Extract the machine ID and issue description from an incoming message.      Retu, test_parses_id_embedded_mid_sentence(), test_parses_id_without_colon_or_description(), test_parses_lowercase_id(), test_parses_standard_prefilled_message(), test_returns_none_for_empty_text() (+1 more)

### Community 76 - "Community 76"
Cohesion: 0.18
Nodes (4): FakeAsyncClient, FakeResponse, json_content_for(), test_summarize_issue_parses_and_normalizes_urgency()

### Community 80 - "Community 80"
Cohesion: 0.24
Nodes (7): TechnicianWorkRepository, AntDNavigationLayout(), getNavMenuItems(), getUserMenuItems(), computeDataQuality(), computeShiftHandover(), Technician()

### Community 81 - "Community 81"
Cohesion: 0.36
Nodes (9): calculateEstimate(), clampHours(), defaultEstimationRules, formatDate(), loadEstimationRules(), nextSunday(), priorityRank, ShutdownPlanner() (+1 more)

### Community 82 - "Community 82"
Cohesion: 0.29
Nodes (8): dateFormatter, i18n, numberFormatter, I18nContext, I18nProvider(), useI18nContext(), SUPPORTED_LANGUAGES, TRANSLATIONS

### Community 83 - "Community 83"
Cohesion: 0.25
Nodes (8): extract_machine_record(), maintenance_assistant(), _normalize_urgency(), Extract structured machine knowledge from text-readable record sources., Calls OpenAI to turn a raw issue description into a structured brief.     Raises, Answer a scoped maintenance question through the OpenAI provider., summarize_issue(), test_summarize_issue_defaults_unexpected_urgency_to_medium()

### Community 88 - "Community 88"
Cohesion: 0.44
Nodes (8): _add_member(), _team(), test_legacy_machine_contacts_are_labeled_by_actual_staff_role(), test_machine_assignments_use_staff_ids_and_never_list_raw_contacts(), test_maintenance_head_can_reveal_all_company_contacts(), test_offline_staff_can_be_added_without_contact_details(), test_supervisor_and_technician_contact_access_follows_hierarchy(), test_team_directory_masks_contacts_and_owner_can_reveal()

### Community 90 - "Community 90"
Cohesion: 0.36
Nodes (9): icons.svg (Icon Sprite Sheet), Bluesky Icon (butterfly logo), Brand/Social-Link Icon Group (dark-fill, uniform ~19x19 viewBox), Discord Icon (game controller/mascot face logo), Documentation Icon (open book/chat outline, purple stroke), GitHub Icon (Octocat/Git logo), Social/Community Icon (person with badge/ribbon, purple stroke), UI Accent Icon Group (purple stroke #aa3bff, outline style) (+1 more)

### Community 91 - "Community 91"
Cohesion: 0.22
Nodes (8): background_color, display, icons, name, orientation, short_name, start_url, theme_color

### Community 93 - "Community 93"
Cohesion: 0.31
Nodes (7): allowedOrigins, cors(), mimeToExtension(), optionalTicketColumns, reply(), text(), uploadDataUrl()

### Community 97 - "Community 97"
Cohesion: 0.36
Nodes (5): admin_token(), test_onboard_company_duplicate_rejected(), test_onboard_company_invalid_password_rejected(), test_onboard_company_success(), test_owner_cannot_create_another_owner()

### Community 98 - "Community 98"
Cohesion: 0.43
Nodes (7): test_backup_contains_originals_structured_data_csv_and_machine_data(), test_duplicate_source_is_rejected(), test_non_owner_operational_role_can_create_review_draft(), test_only_maintenance_head_can_approve_and_approved_data_reaches_machine_context(), test_restore_requires_maintenance_head(), test_supervisor_can_upload_and_company_isolation_is_enforced(), upload_record()

### Community 100 - "Community 100"
Cohesion: 0.25
Nodes (7): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, warn

### Community 104 - "Community 104"
Cohesion: 0.29
Nodes (4): MediaRecorderMock, MOCK_MACHINE, MOCK_TICKET, MOCK_USER

### Community 105 - "Community 105"
Cohesion: 0.29
Nodes (3): AntDChartCard(), AntDDetailList(), AntDEmptyState()

### Community 110 - "Community 110"
Cohesion: 0.33
Nodes (6): App.jsx Feature Flag Routing Integration, Gradual Rollout Implementation Checklist, Emergency Rollback Procedure, Machines Gradual Rollout Strategy, featureFlags.ts Utility System, Feature Flag Monitoring Metrics Dashboard

### Community 111 - "Community 111"
Cohesion: 0.33
Nodes (5): compilerOptions, baseUrl, paths, include, src

### Community 112 - "Community 112"
Cohesion: 0.60
Nodes (3): ThemeToggle(), ThemeProvider(), useTheme()

### Community 118 - "Community 118"
Cohesion: 0.60
Nodes (4): main(), Make the checked-in local workbook useful for a complete post-login demo.  Run f, row_map(), set_value()

### Community 119 - "Community 119"
Cohesion: 0.40
Nodes (5): AI Diagnostics edge function, check_schedules, pm_scheduler, Service Integrations & Webhooks, WhatsApp Gateway client

### Community 120 - "Community 120"
Cohesion: 0.40
Nodes (5): Machines Page UX/UI Audit, State Variable Grouping & Restructuring, 3-Tier Information Architecture Pattern, Machines Refactor Implementation Guide, MachinesRefactored.jsx Component

### Community 121 - "Community 121"
Cohesion: 0.40
Nodes (4): fs, pages, { Parser }, path

### Community 122 - "Community 122"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 126 - "Community 126"
Cohesion: 0.50
Nodes (3): SSRF Webhook Validation, WebSocket Queue Overflow Fix, XSS Vulnerability Fix

### Community 127 - "Community 127"
Cohesion: 0.50
Nodes (4): approve_ticket_closure(), Maintenance Head approves closure — ticket resolved., Test supervisor approving technician's closure report., test_approve_ticket_closure_as_supervisor()

### Community 128 - "Community 128"
Cohesion: 0.50
Nodes (4): delegate_to_colleague(), Delegate ticket to a colleague; resets the escalation timer., Test technician delegating ticket to colleague., test_delegate_to_colleague()

### Community 129 - "Community 129"
Cohesion: 0.50
Nodes (4): initialize_ticket_escalation(), Set the first escalation timer on a newly created ticket., Test creating a new ticket escalation record., test_initialize_ticket_escalation()

### Community 130 - "Community 130"
Cohesion: 0.50
Nodes (4): mark_outsourced(), Manager marks ticket as outsourced; escalation pauses., Test marking issue as outsourced (vendor/contractor involvement)., test_mark_outsourced_escalation()

### Community 131 - "Community 131"
Cohesion: 0.50
Nodes (4): TurboFix SOLID Backend Architecture, TurboFix Backend README, Render Blueprint, Backend Requirements

### Community 133 - "Community 133"
Cohesion: 0.50
Nodes (4): Playwright Audit Summary, Playwright Delivery Checklist, Session 3 Summary, UX Audit Suite README

### Community 134 - "Community 134"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 135 - "Community 135"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 136 - "Community 136"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 137 - "Community 137"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 138 - "Community 138"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 139 - "Community 139"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 140 - "Community 140"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 141 - "Community 141"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 142 - "Community 142"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 143 - "Community 143"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 144 - "Community 144"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 145 - "Community 145"
Cohesion: 0.50
Nodes (3): imports, @supabase/functions-js, @supabase/server

### Community 147 - "Community 147"
Cohesion: 0.67
Nodes (3): TurboFix Production CI/CD Workflow, Deploy Frontend to GitHub Pages, Production Setup Checklist

### Community 149 - "Community 149"
Cohesion: 0.67
Nodes (3): TurboFix Logo (SVG), Favicon (favicon.svg), TurboFix Brand Identity

## Ambiguous Edges - Review These
- `Evidence-Based Closure (Feature)` → `Spare-Part Requests (Feature)`  [AMBIGUOUS]
  public/assets/turbofix-whatsapp-brochure.png · relation: conceptually_related_to
- `Bluesky Icon (butterfly logo)` → `Social/Community Icon (person with badge/ribbon, purple stroke)`  [AMBIGUOUS]
  public/icons.svg · relation: conceptually_related_to

## Knowledge Gaps
- **316 isolated node(s):** `PAGES`, `$schema`, `oxc`, `react/rules-of-hooks`, `warn` (+311 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **75 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Evidence-Based Closure (Feature)` and `Spare-Part Requests (Feature)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Bluesky Icon (butterfly logo)` and `Social/Community Icon (person with badge/ribbon, purple stroke)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `TicketRepository` connect `Community 2` to `Community 0`, `Community 96`, `Community 1`, `Community 67`, `Community 6`, `Community 8`, `Community 9`, `Community 10`, `Community 43`, `Community 11`, `Community 14`, `Community 20`, `Community 53`, `Community 25`, `Community 29`, `Community 30`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `MachineRepository` connect `Community 20` to `Community 0`, `Community 96`, `Community 1`, `Community 2`, `Community 3`, `Community 67`, `Community 6`, `Community 8`, `Community 9`, `Community 10`, `Community 43`, `Community 11`, `Community 14`, `Community 25`, `Community 29`, `Community 30`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `UserRepository` connect `Community 0` to `Community 96`, `Community 65`, `Community 1`, `Community 69`, `Community 6`, `Community 8`, `Community 9`, `Community 43`, `Community 14`, `Community 20`, `Community 23`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Are the 47 inferred relationships involving `MachineRepository` (e.g. with `LocalEventRepository` and `LocalMachineRepository`) actually correct?**
  _`MachineRepository` has 47 INFERRED edges - model-reasoned connections that need verification._
- **Are the 45 inferred relationships involving `TicketRepository` (e.g. with `LocalEventRepository` and `LocalMachineRepository`) actually correct?**
  _`TicketRepository` has 45 INFERRED edges - model-reasoned connections that need verification._