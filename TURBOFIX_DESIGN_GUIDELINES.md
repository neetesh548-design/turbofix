# TurboFix Design Guidelines

**For everyone:** This guide ensures all TurboFix interfaces are easy to use, look consistent, and work for technicians on the shop floor and managers in the office.

---

## Quick Reference: Design Principles (Remember These 6)

1. **Tell me what to do next** — show the action, don't make me think.
2. **Be clear about the machine and status** — always say the machine name, owner, and urgency directly.
3. **Color + words, never just color** — if something is red (critical), also write the word "Critical."
4. **One hand, one screen** — phones must work without two hands or scrolling left-right.
5. **Show what matters to me** — technicians see technician tasks; managers see management tasks.
6. **Keep my work safe** — if voice, camera, or internet fails, I can still work using text and fallbacks.

---

## 1. Core Design Principles

TurboFix is used under pressure. Every screen must be:

- **Simple to act on** — the next action is obvious without confusion.
- **Transparent about status** — machine name, owner, problem, urgency, and expected response are all visible and stated in words.
- **Safe to use when rushed** — never hide warnings behind hover effects, icons alone, or color only.
- **Usable on phones one-handed** — voice, scanning, photos, and technician tasks must work without a keyboard or second hand.
- **Aware of roles** — operators, technicians, supervisors, and owners each see only decisions that matter to them.
- **Resilient when things fail** — if voice, camera, internet, or AI stops working, you can still work with text and manual entry.

## 2. Look and Feel

TurboFix feels calm, practical, and industrial—not playful or decorative. This puts the work first.

- Keep backgrounds neutral and easy on the eyes.
- Make important text and buttons stand out clearly.
- Use simple, straightforward layouts without decoration.
- Use motion (animation) only to show state changes—recording, saving, or alerts. Do not use motion for decoration.
- No gradient backgrounds on headings or data displays.

---

## 3. Colors: What Each Means

**Every color has a meaning.** If you use green, also write the word “Ready” or “Running.” Never use color alone—add a word or icon.

| Color | Meaning | Example |
|---|---|---|
| **Green** | Ready, running, healthy, success | “Running” status |
| **Amber** | Warning, attention needed soon, wait a bit | “Needs attention” or “Due tomorrow” |
| **Red** | Critical, broken, unsafe, urgent, delete action | “Critical” or “Overdue” |
| **Blue** | Extra information, supporting details, help | Status message, tip |
| **Gray/Neutral** | Inactive, disabled, less important | Disabled button, secondary text |

---

## 4. Design Tokens (Color Code)

**Developers:** Use existing tokens instead of making new colors. Two sets exist:

### Standard tokens (everywhere)
Defined in `src/index.css`. Use these for most pages:

| Purpose | CSS Token | Actual Color |
|---|---|---|
| Brand button / Link | `--primary`, `--brand`, `--green` | `#25D366` (green) |
| Page/card background | `--background`, `--card-bg` | Dark charcoal |
| Main text | `--foreground`, `--ink` | Off-white |
| Secondary text | `--muted-foreground`, `--slate` | Gray/slate |
| Borders | `--ui-border`, `--border` | Low-contrast gray |
| Focus highlight (keyboard tab) | `--ring` | Brand green |
| Success | `--success` | Green |
| Warning | `--warning` | Amber |
| Danger/Critical | `--danger` | Red |
| Info | `--info` | Blue |

### Dashboard tokens (maintenance dashboards only)
Use in `src/pages/Dashboard.css`:

| Purpose | Token | Use |
|---|---|---|
| Selected/clicked item | `--md-accent` | (Do not use for machine health or data colors) |
| Main dashboard text | `--md-ink` | Headings, labels |
| Supporting text | `--md-ink-dim` | Less important info |
| Panel/card background | `--md-panel` | Card surfaces |
| Borders | `--md-line`, `--md-line-strong` | Borders (strong = darker) |
| Healthy/success | `--md-green` | Running, ready |
| Information | `--md-blue` | Neutral info |
| Warning | `--md-amber` | Needs attention |
| Critical | `--md-red` | Urgent, broken |

**Ant Design:** Use `generateAntDTheme()` from `src/config/antd-theme.js`. Do not create new Ant Design themes in components.

## 5. Text (Typography)

**Font:** The app uses "Outfit" (and falls back to system fonts like Arial, Roboto).

### Text sizes

| What | Size | Bold? | Example |
|---|---:|---|---|
| Page title | 32px max | Yes (700) | "Dashboard", "Report Issue" |
| Section title | 24px | Yes (700) | "Machines", "Recent tickets" |
| Card title | 20px | Medium (600) | "Compressor A", "Status" |
| Normal text | 14px | Normal (400–500) | Descriptions, lists |
| Small text | 12px | Normal–Medium (400–600) | Hints, timestamps |

### Writing rules

- **Use normal sentence case.** Not "THIS IS A HEADING" or "This Is A Heading."
- **Keep titles short.** "Start repair" not "Begin the repair process."
- **Use words for numbers.** If the number is important (KPI, price, time), use a monospace font so `123` and `456` line up vertically.
- **One idea per line.** Long descriptions are hard to read on phones.
- **Be direct.** "Machine is down" not "Operational status: offline."

---

## 6. Spacing and Corners (Layout Rhythm)

**Use multiples of 8 pixels.** This creates a visual rhythm.

| Space | Size | Used for |
|---|---|---|
| Tiny | 4px | Small gap between icon and text |
| Small | 8px | Space inside buttons, tight padding |
| Medium | 12px | Padding inside small boxes |
| Standard | 16px | Normal padding, space between elements |
| Large | 24px | Space between sections |
| Extra large | 32px | Space between major sections |

**Corners (border radius):**
- Small buttons, badges: 6–8px
- Cards, panels: 10–12px
- Large dashboard cards: 14px
- Pills (status labels): very round

**Shadows:** Almost none. Use borders and background colors instead. Avoid glowing effects.

## 7. Screens: Desktop, Tablet, Phone (Responsive Design)

**The same interface works on phones, tablets, and computers.** We do not build separate apps.

### Three screen sizes
| Size | Width | What to do |
|---|---|---|
| Phone | Narrow | Single column, everything stacked |
| Tablet | Medium (~900px) | Two columns if needed |
| Computer | Wide (~1180px) | Use space for dashboards |

### Simple rules
- **Always start with phone.** Make it work one-handed.
- **Never force horizontal scrolling** for the main work (reporting, scanning, repairs).
- **Use the same words and task order** on all sizes. A patient name looks the same on phone and desktop.
- **Use the shared AppShell** for page structure (sidebar, header, content).
- **Move panels (sidebars) off-screen on phones** but do not add extra width to the page when they close.

## 8. Building Blocks (Components)

### Buttons

- **One main action per screen.** If it is the most important action, make it stand out.
- **Use action words:** "Send report", "Start repair", "Approve", "Save", "Cancel."
- **Be clear about danger.** If a button will delete or overwrite something, say "Delete" not "OK" and use red.
- **Show why a button is disabled.** Example: "Can’t save—machine ID is missing."
- **Make buttons big enough.** At least 44×44 pixels for phones and gloved hands.

### Input fields (Text boxes, dropdowns)

- **Always show the label** above the input. Do not rely on placeholder text alone.
- **Placeholder text is just an example.** The real label must be visible.
- **Show errors near the field.** Example: "Please enter a number" right below the field.
- **Keep the user’s text when it fails.** If the internet drops, do not erase what they typed.
- **Use plain words.** Ask "Which technician?" not "Select personnel category code."

### Cards (Information boxes)

A card holds one thing: a machine, a ticket, a KPI, or an action.

**Order:**
1. Status label (e.g., "Running" in green)
2. Main info (e.g., "Compressor A")
3. Details (e.g., "Owner: Rajesh, Uptime: 12hr")
4. Action (e.g., "View details" button)

### Status badges (Small colored labels)

- Keep text short: "Critical", "Running", "Overdue", "Demo".
- Use color + text. Never just color.
- Do not turn every piece of data into a badge. Use them for status only.

### Tables and lists

- **Tables:** Use when comparing data across columns (e.g., "Machine name | Status | Next maintenance").
- **Lists/Cards:** Use on phones for actions. Each card = one action.
- **Put the most important info first.** Machine name comes before timestamps.
- **Make a row clickable only if it goes to one place.** If a row has multiple buttons, do not make the whole row clickable.

### Modals and side panels

- **Use for focused, temporary work.** Examples: add a note, confirm an action.
- **Do not put the main task inside a modal.** The primary work must always be visible.
- **Show a title and close button (X).**
- **Close the panel when done.** Focus should return to the button that opened it.

## 9. Reporting, Voice, Camera, and QR Codes

Reports should be short and reviewable. Ask only for information the system needs to route the work.

### Report flow
1. Ask the essential question (e.g., "What's wrong?")
2. Infer urgency and category from plain words (e.g., "machine stopped" → critical + downtime category)
3. Let the user change what the system guessed
4. Show the machine name and who will be notified before sending
5. Send a confirmation with what was created and when to expect a reply

### Voice recording

The app can record your voice and turn it into text:

1. **Show a clear "Record" button** and a **"Stop" button** once recording starts.
2. **Show what is recording** (e.g., "Recording... 00:12").
3. **Convert to text** (transcription).
4. **Let the user edit the text** before sending. Never send a transcription without review.
5. **Always have a text fallback.** If the microphone doesn't work or you prefer typing, the user can type instead.
6. **Explain what went wrong.** If the mic is busy in another app, say "Microphone is being used elsewhere," not "Media device exception."

### Camera and QR scanning

- **Show what the camera will do** (e.g., "Point at the machine label to scan").
- **Always provide a manual fallback.** User can type the code if the camera doesn't work.
- **Explain why you need the photo.** "Photo helps confirm the repair," not just "Take a photo."
- **Do not force a photo unless required by law or safety policy.**

## 10. Saving, Loading, and Errors (System Messages)

Users need to know what the app is doing.

| State | What to show | Example |
|---|---|---|
| **Idle** | Normal view | Screen shows the report form |
| **Saving** | Spinner or progress bar, and text | “Saving...” |
| **Saved** | Confirmation | “Report saved ✓” (green, for 2 seconds) |
| **Error** | Clear message explaining what to do | “No internet. Report saved on this phone—it will send when connected.” |
| **Empty** | Helpful message | “No repairs assigned yet.” |
| **Offline** | Explain what will happen | “You are offline. Changes will sync when online.” |

**Writing messages:**
- **Good:** “Saved on this device. TurboFix will sync when the connection returns.”
- **Bad:** “Something went wrong.”

**Loading animations:** Do not hide content while loading unless the content cannot be used. Example: a blank page while loading is OK; hiding a form button is not.

**Demo data:** Always label it clearly (e.g., “Demo data—not live production”). It must never look like real machine data.

---

## 11. Accessible Design (Usable by Everyone)

TurboFix must work for all technicians, including those with low vision, color blindness, or using a keyboard only.

### Basic rules

| Need | What to do | Why |
|---|---|---|
| **Text contrast** | Dark text on light background, light text on dark background. Pass [contrast checker](https://webaim.org/resources/contrastchecker/). | Some users cannot see low contrast. |
| **One title per page** | Use one `<h1>`. | Screen readers use this to find the main topic. |
| **Heading order** | h1 → h2 → h3 (do not skip levels). | Screen readers navigate by heading structure. |
| **Color + words** | Never communicate important info with color alone. | Color-blind users miss it otherwise. |
| **Working keyboard** | All buttons and links work with Tab key and Enter key. | Some users cannot use a mouse. |
| **Focus visible** | When Tab-ing through, show a visible ring around the focused button. Use `--ring` token (brand green). | Keyboard users must see where they are. |
| **Label every input** | `<label>` tags connected to input fields. Not placeholder text alone. | Screen readers read the label aloud. |
| **Meaningful icons** | If an icon means something (e.g., ⚠ = warning), provide text or an accessible name. Decorative icons get `aria-hidden=”true”`. | Screen readers read the icon's meaning. |
| **Respect “reduce motion”** | Do not auto-play animations. Let user enable them. | Some users get sick from motion. |
| **Skip link** | Provide a “Skip to main content” link at the top. | Keyboard users can jump past navigation. |

**Bottom line:** Every screen works with a keyboard alone. No mouse needed.

## 12. Plain Language

Write for a technician standing near a machine, not a database. Use everyday words.

| Instead of | Use |
|---|---|
| “Enter incident taxonomy” | “What is wrong?” |
| “Routing successful” | “Goes to Rajesh Kumar—answer within 4 hr” |
| “Media device exception” | “Microphone is busy in another app” |
| “Operational status: offline” | “Machine is down” |
| “Reboot the system” | “Restart the machine” |

**Other rules:**
- Keep text short and actionable.
- Always include units: “4 hours,” “50 PSI,” “$1,200,” “12:30 PM.”
- If the user makes a mistake, explain how to fix it, not just “Invalid input.”

---

## 13. Light and Dark Themes

Every part of TurboFix must work in both **light theme** and **dark theme.**

### Rules for developers

- **Use design tokens.** Do not hard-code colors like `#ffffff` or `background-color: black`.
- **Test both themes.** Before sending code for review, check both light and dark.
- **Check all states:** button hover, button focus (keyboard Tab), disabled button, error state, success state.
- **Brand green text:** The green button `#25D366` needs dark text, not white. (White on green fails accessibility.)
- **Dashboard headings:** Use real text color, not gradient effects.

## 14. Before You Send Code for Review (Checklist)

Before merging a change to TurboFix, confirm these:

- [ ] **Uses existing design tokens and components** — no new colors or styles invented
- [ ] **Primary action is obvious** — one clear button with a verb, not hidden in a menu
- [ ] **Color + text** — no important message is shown by color alone
- [ ] **All states are visible** — empty, loading, saving, error, offline, success all have messages
- [ ] **Phone-friendly** — no scrolling left-right; works one-handed
- [ ] **Big buttons** — buttons/taps are at least 44×44px on the shop floor
- [ ] **Keyboard works** — Tab key and Enter key navigate and activate everything
- [ ] **One title per page** — one `<h1>` at the top, other headings in order (h2, h3)
- [ ] **Readable text** — test contrast in both light and dark themes using a [contrast checker](https://webaim.org/resources/contrastchecker/)
- [ ] **Fallback for all inputs** — voice, camera, QR, AI all have a manual text option
- [ ] **User input is saved** — if saving fails, do not erase what the user typed
- [ ] **Demo data is labeled** — "Demo" badge is always visible if not live
- [ ] **Regression test included** — if behavior changed, add a test (Playwright or Jest unit test)

---

## 15. Where the Rules Live (Source Code)

When this guide differs from the code, **fix the code, not this guide.** These are the actual sources:

| What | File |
|---|---|
| Colors, text sizes, spacing | `src/index.css` (shared tokens) |
| Dashboard colors | `src/pages/Dashboard.css` |
| Ant Design colors | `src/config/antd-theme.js` |
| Page structure, sidebar, header | `src/components/AppShell.jsx` |
| Report form, voice, camera | `src/pages/ReportBreakdown.jsx` and `src/components/breakdown/` |
| QR scanning, approval workflow | `src/pages/QRGateway.jsx` |

**To update the design guide:** If the code has changed or added a pattern that should be documented here, edit this file and share it with the team.

---

## Quick Answers (FAQ)

**Q: Can I use a custom color?**  
A: No. Use an existing token from section 4.

**Q: Do I need to support light and dark themes?**  
A: Yes. Every component must work in both.

**Q: How big should a button be?**  
A: At least 44×44px (for phones and gloved hands).

**Q: What if the internet fails?**  
A: Save the user's work locally and explain: "Saved on this device. Will sync when online."

**Q: Can I use an icon without a label?**  
A: Only if it is decorative. If the icon means something, add a label or text.

**Q: How do I know if colors work for color-blind users?**  
A: Use a [color-blindness simulator](https://www.color-blindness.com/coblis-color-blindness-simulator/) or just add text (red + "Critical") to every color.

**Q: Should I hide features in menus to save space?**  
A: No. Show the main action. Advanced features can be in a drawer or drill-down.

