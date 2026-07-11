// ===========================================================
// CONFIG — the only thing you should need to edit
// ===========================================================
const CONFIG = {
  // WhatsApp number in international format, no "+", no spaces, e.g. "919900012345"
  whatsappNumber: "919637438044",
  messages: {
    trial:
      "Hi TurboFix! I'd like to start my FREE 1-month trial.\n" +
      "Company name: \n" +
      "Number of machines: \n" +
      "City: ",
    general: "Hi TurboFix! I have a question about the product.",
  },
};

// ===========================================================
// i18n — English / Hindi / Marathi, persisted in localStorage
// ===========================================================
const I18N_STORAGE_KEY = "turbofix_lang";

function getCurrentLang() {
  return localStorage.getItem(I18N_STORAGE_KEY) || "en";
}

function t(key) {
  const lang = getCurrentLang();
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  return dict[key] || TRANSLATIONS.en[key] || "";
}

function applyTranslations(lang) {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) el.innerHTML = dict[key];
  });
  document.documentElement.setAttribute("lang", lang);
}

function initI18n() {
  const switcher = document.getElementById("langSwitch");
  const lang = getCurrentLang();
  switcher.value = lang;
  applyTranslations(lang);
  switcher.addEventListener("change", () => {
    localStorage.setItem(I18N_STORAGE_KEY, switcher.value);
    applyTranslations(switcher.value);
  });
}

// ===========================================================
// Wire up every WhatsApp CTA from CONFIG (single source of truth)
// ===========================================================
function wireWhatsAppLinks() {
  document.querySelectorAll("[data-wa]").forEach((el) => {
    const key = el.getAttribute("data-wa");
    const text = CONFIG.messages[key] || CONFIG.messages.general;
    const url = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(text)}`;
    el.setAttribute("href", url);
  });
}

// ===========================================================
// Nav: scroll shadow + mobile menu toggle
// ===========================================================
function initNav() {
  const nav = document.getElementById("nav");
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");

  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 8);
  });

  toggle.addEventListener("click", () => {
    links.classList.toggle("open");
    toggle.classList.toggle("open");
  });

  links.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      links.classList.remove("open");
      toggle.classList.remove("open");
    });
  });
}

// ===========================================================
// Hero stat counters — animate once when scrolled into view
// ===========================================================
function initStatCounters() {
  const stats = document.querySelectorAll(".stat-num");
  if (!stats.length) return;

  const animate = (el) => {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix || "";
    const duration = 900;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = target * eased;
      el.textContent = `${prefix}${value.toFixed(decimals)}${suffix}`;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.6 }
  );

  stats.forEach((el) => observer.observe(el));
}

// ===========================================================
// FAQ accordion
// ===========================================================
function initFaq() {
  document.querySelectorAll(".faq-item").forEach((item) => {
    const q = item.querySelector(".faq-q");
    q.addEventListener("click", () => {
      const wasOpen = item.classList.contains("open");
      item.parentElement
        .querySelectorAll(".faq-item")
        .forEach((el) => el.classList.remove("open"));
      if (!wasOpen) item.classList.add("open");
    });
  });
}

// ===========================================================
// Live demo simulation — a scripted ticket flowing through
// the chat + dashboard, all client-side, no backend needed.
// ===========================================================
function initDemo() {
  const qrTap = document.getElementById("qrTap");
  const chatBody = document.getElementById("chatBody");
  const chatPlaceholder = document.getElementById("chatPlaceholder");
  const demoStatus = document.getElementById("demoStatus");
  const replayBtn = document.getElementById("replayBtn");
  const dashFeed = document.getElementById("dashFeed");

  const kpiOpen = document.getElementById("kpiOpen");
  const kpiDown = document.getElementById("kpiDown");
  const kpiHealth = document.getElementById("kpiHealth");
  const kpiAvg = document.getElementById("kpiAvg");

  const stepEls = document.querySelectorAll(".demo-step");
  const stepDesc = document.getElementById("demoStepDesc");

  const INITIAL_KPI = { open: 2, down: 1, health: 86, avg: "4.2h" };
  const AUTO_REPLAY_DELAY = 4000;
  let playing = false;
  let timers = [];

  function setStep(n) {
    stepEls.forEach((el) => {
      const s = Number(el.dataset.step);
      el.classList.toggle("done", s < n);
      el.classList.toggle("active", s === n);
    });
    if (stepDesc) stepDesc.textContent = t(`demo.step${n}Desc`);
  }

  function schedule(fn, delay) {
    const id = setTimeout(fn, delay);
    timers.push(id);
    return id;
  }

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function addBubble(html, className) {
    const div = document.createElement("div");
    div.className = `bubble ${className}`;
    div.innerHTML = html;
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
    return div;
  }

  function addSystemNote(text) {
    const div = document.createElement("div");
    div.className = "bubble bubble-sys";
    div.textContent = text;
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function addTyping() {
    const div = document.createElement("div");
    div.className = "bubble bubble-in";
    div.id = "typingBubble";
    div.innerHTML = `<span class="typing-dots"><span></span><span></span><span></span></span>`;
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function removeTyping() {
    const el = document.getElementById("typingBubble");
    if (el) el.remove();
  }

  function flashKpi(el) {
    el.parentElement.classList.add("kpi-flash");
    schedule(() => el.parentElement.classList.remove("kpi-flash"), 700);
  }

  function addFeedItem(icon, text, time) {
    const empty = dashFeed.querySelector(".dash-feed-empty");
    if (empty) empty.remove();
    const div = document.createElement("div");
    div.className = "feed-item";
    div.innerHTML = `<span class="feed-ico">${icon}</span><span>${text}<span class="feed-time">${time}</span></span>`;
    dashFeed.prepend(div);
  }

  function resetDemo() {
    clearTimers();
    chatBody.innerHTML = "";
    chatBody.appendChild(chatPlaceholder);
    demoStatus.textContent = t("demo.tapToStart");
    dashFeed.innerHTML = `<p class="dash-feed-empty">${t("demo.feedEmpty")}</p>`;
    kpiOpen.textContent = INITIAL_KPI.open;
    kpiDown.textContent = INITIAL_KPI.down;
    kpiHealth.textContent = `${INITIAL_KPI.health}%`;
    kpiAvg.textContent = INITIAL_KPI.avg;
    replayBtn.textContent = t("demo.playBtn");
    replayBtn.disabled = false;
    playing = false;
    setStep(0);
  }

  function runDemo() {
    if (playing) return;
    playing = true;
    chatBody.innerHTML = "";
    demoStatus.textContent = t("demo.liveSimulation");
    replayBtn.textContent = t("demo.playingBtn");
    replayBtn.disabled = true;

    schedule(() => {
      setStep(1);
      addSystemNote(t("demo.qrScanned"));
    }, 200);

    schedule(() => {
      setStep(2);
      addBubble(t("demo.issueBubble"), "bubble-out");
    }, 900);

    schedule(() => {
      addBubble(
        `<div class="voice-wave"><span></span><span></span><span></span><span></span><span></span><span></span></div> 0:14`,
        "bubble-voice"
      );
    }, 1900);

    schedule(() => {
      addBubble(t("demo.ticketLogged"), "bubble-in");
    }, 2900);

    schedule(() => {
      addFeedItem("🎫", t("demo.feedTicketOpened"), t("demo.justNow"));
      kpiOpen.textContent = String(INITIAL_KPI.open + 1);
      flashKpi(kpiOpen);
      kpiDown.textContent = String(INITIAL_KPI.down + 1);
      flashKpi(kpiDown);
    }, 3000);

    schedule(() => {
      setStep(3);
      addTyping();
    }, 3700);

    schedule(() => {
      removeTyping();
      addBubble(t("demo.aiBrief"), "bubble-in");
    }, 5200);

    schedule(() => {
      addFeedItem("🤖", t("demo.feedAiTriage"), t("demo.secAgo2"));
    }, 5300);

    schedule(() => {
      setStep(4);
      addBubble(t("demo.notifiedBubble"), "bubble-in");
    }, 6600);

    schedule(() => {
      addFeedItem("🔔", t("demo.feedNotified"), t("demo.secAgo3"));
      kpiHealth.textContent = `${INITIAL_KPI.health - 6}%`;
      flashKpi(kpiHealth);
    }, 6700);

    schedule(() => {
      setStep(5);
      addBubble(t("demo.techReply"), "bubble-in");
      demoStatus.textContent = t("demo.ticketAssigned");
    }, 8000);

    schedule(() => {
      addFeedItem("✅", t("demo.feedAck"), t("demo.justNow"));
      kpiAvg.textContent = "3.9h";
      flashKpi(kpiAvg);
      replayBtn.textContent = t("demo.replayBtn");
      replayBtn.disabled = false;
      playing = false;
    }, 8600);

    // Automation: keep the demo looping on its own so a visitor never
    // has to lift a finger to see the full flow at least once.
    schedule(() => {
      resetDemo();
      runDemo();
    }, 8600 + AUTO_REPLAY_DELAY);
  }

  qrTap.addEventListener("click", runDemo);
  replayBtn.addEventListener("click", () => {
    resetDemo();
    runDemo();
  });

  return { run: runDemo };
}

// ===========================================================
// Language gate — full-screen prompt shown on page load.
// Once a language is picked, the page loads in that language,
// scrolls to the live demo, and starts it automatically.
// ===========================================================
function initLangGate(demo) {
  const gate = document.getElementById("langGate");
  if (!gate) return;

  document.body.style.overflow = "hidden";
  const buttons = gate.querySelectorAll(".lang-gate-btn");
  let chosen = false;

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (chosen) return;
      chosen = true;
      const lang = btn.getAttribute("data-lang");

      // Instant feedback: highlight the chosen card, fade the rest.
      // (Note: don't use the `disabled` attribute here — disabling the
      // focused button makes the browser shift focus and auto-scroll,
      // which fights with the intentional scroll-to-demo below.)
      gate.style.pointerEvents = "none";
      buttons.forEach((b) => {
        b.classList.toggle("selected", b === btn);
        b.classList.toggle("fade-out", b !== btn);
      });

      localStorage.setItem(I18N_STORAGE_KEY, lang);
      applyTranslations(lang);

      const switcher = document.getElementById("langSwitch");
      if (switcher) switcher.value = lang;

      setTimeout(() => {
        gate.classList.add("hidden");
        document.body.style.overflow = "";

        setTimeout(() => {
          const demoSection = document.getElementById("demo");
          if (!demoSection) {
            demo && demo.run();
            return;
          }
          demoSection.scrollIntoView({ behavior: "smooth", block: "start" });
          demoSection.classList.add("demo-autofocus");

          // Wait for the smooth scroll to actually finish before the demo
          // starts mutating the chat/dashboard — starting too early makes
          // the in-flight scroll animation get cut short by the reflow.
          let started = false;
          const start = () => {
            if (started) return;
            started = true;
            window.removeEventListener("scrollend", start);
            demo && demo.run();
          };
          window.addEventListener("scrollend", start, { once: true });
          setTimeout(start, 1300); // fallback for browsers without scrollend
        }, 450);
      }, 380);
    });
  });
}

// ===========================================================
// In-page anchor scrolling, driven manually frame-by-frame.
// Native smooth scrolls get silently aborted by the demo loop's
// programmatic chat scrolling (the browser cancels an in-flight
// document smooth scroll whenever any element is scrolled), so
// once the demo starts looping, plain anchor links stop moving
// the page. A rAF-driven scroll is immune to that.
// ===========================================================
function smoothScrollTo(targetY) {
  const startY = window.scrollY;
  const dist = targetY - startY;
  if (Math.abs(dist) < 2) return;
  const duration = Math.min(1100, 350 + Math.abs(dist) * 0.12);
  const start = performance.now();
  let cancelled = false;
  const cancel = () => { cancelled = true; };
  window.addEventListener("wheel", cancel, { once: true, passive: true });
  window.addEventListener("touchstart", cancel, { once: true, passive: true });
  function tick(now) {
    if (cancelled) return;
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    window.scrollTo(0, startY + dist * eased);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function initAnchorScroll() {
  const nav = document.getElementById("nav");
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href").slice(1);
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      e.preventDefault();
      const offset = (nav ? nav.offsetHeight : 0) + 12;
      const y = id === "top" ? 0 : target.getBoundingClientRect().top + window.scrollY - offset;
      smoothScrollTo(Math.max(0, y));
      history.replaceState(null, "", "#" + id);
    });
  });
}

// ===========================================================
// Every trial CTA links to the lead form (#contact); on arrival
// the form glows and the first field is focused so the visitor
// starts typing immediately.
// ===========================================================
function initTrialRedirect() {
  const form = document.getElementById("leadForm");
  if (!form) return;
  document.querySelectorAll('a[href="#contact"]').forEach((a) => {
    a.addEventListener("click", () => {
      form.classList.remove("flash");
      // restart the animation even on repeat clicks
      void form.offsetWidth;
      form.classList.add("flash");
      setTimeout(() => {
        document.getElementById("leadName").focus({ preventScroll: true });
      }, 1200);
    });
  });
}

function initLeadForm() {
  const form = document.getElementById("leadForm");
  if (!form) return;
  const error = document.getElementById("leadError");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = (id) => document.getElementById(id).value.trim();
    const name = val("leadName");
    const company = val("leadCompany");
    const city = val("leadCity");
    const machines = val("leadMachines");
    const phone = val("leadPhone");

    if (!name || !company || !phone) {
      error.hidden = false;
      return;
    }
    error.hidden = true;

    const lines = [
      "Hi TurboFix! I want to start the FREE 1-month pilot.",
      `Name: ${name}`,
      `Company: ${company}`,
      city ? `City: ${city}` : null,
      machines ? `Machines: ${machines}` : null,
      `WhatsApp: ${phone}`,
    ].filter(Boolean);

    const url = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(lines.join("\n"))}`;
    window.open(url, "_blank", "noopener");
  });
}

// ===========================================================
// Footer year
// ===========================================================
function initFooterYear() {
  const el = document.getElementById("year");
  if (el) el.textContent = new Date().getFullYear();
}

document.addEventListener("DOMContentLoaded", () => {
  initI18n();
  wireWhatsAppLinks();
  initNav();
  initStatCounters();
  initFaq();
  initLeadForm();
  initAnchorScroll();
  initTrialRedirect();
  const demo = initDemo();
  initFooterYear();
  initLangGate(demo);
});
