# TurboFix — Website

**Live at https://neetesh548-design.github.io/turbofix/**

A single, self-contained static site: marketing landing page + a fully simulated,
client-side "live demo" of the TurboFix ticket flow (QR scan → WhatsApp voice note →
AI triage → technician notified → dashboard updates). No backend, no build step —
just `index.html` + `assets/style.css` + `assets/script.js`. Built to be deployed
directly on GitHub Pages.

On load, a full-screen gate asks the visitor to pick English/Hindi/Marathi before
showing anything else; once chosen, the page translates instantly and auto-scrolls
to the Live Demo section, which plays itself (and loops automatically) — no clicks
required beyond the language choice.

**The "live demo" is a scripted animation, not a connection to the real backend.**
There's no publicly hosted TurboFix backend yet (see the main project's
`progress.md`), so the demo replays a realistic, fixed script client-side. This is
intentional — it always works, requires no credentials, and can't leak real data.

## Before you deploy — one thing to edit

Open `assets/script.js` and set your real WhatsApp number and message templates at
the top of the file:

```js
const CONFIG = {
  whatsappNumber: "91XXXXXXXXXX", // no "+", no spaces, e.g. "919900012345"
  messages: {
    trial: "...",   // pre-filled message for the "Start Free Trial" buttons
    general: "...", // pre-filled message for the footer "Chat on WhatsApp" link
  },
};
```

Every button/link with a `data-wa="trial"` or `data-wa="general"` attribute in
`index.html` gets its `href` generated from this one config object at page load —
there's nothing else to hunt down and edit.

## Deploying to GitHub Pages

1. Push this folder's contents to the root of a GitHub repository (this README, `index.html`, and `assets/` should sit at the repo root — not nested one level down).
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Branch: `main`, folder: `/ (root)`. Save.
5. GitHub gives you a URL like `https://<username>.github.io/<repo>/` within a minute or two.

No build step, no dependencies, no environment variables required.

## Local preview

Any static file server works, e.g.:

```bash
python3 -m http.server 4173
# then open http://localhost:4173
```

## File guide

- `index.html` — all page markup/copy in one file (hero, problem, how-it-works, live demo, trial/pricing, FAQ, footer).
- `assets/style.css` — all styling. Color/spacing tokens are CSS custom properties at the top of the file.
- `assets/script.js` — `CONFIG` (WhatsApp number + messages), nav behavior, animated hero stat counters, FAQ accordion, and the scripted live-demo simulation.

## Known limitation, by design

The trial signup and general contact are both WhatsApp click-to-chat links, not a
form with a database behind it — matching the product's own "no app, just WhatsApp"
positioning, and avoiding needing any backend/third-party form service just to
collect leads on a static demo site.
