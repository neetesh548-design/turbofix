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

  const INITIAL_KPI = { open: 2, down: 1, health: 86, avg: "4.2h" };
  let playing = false;
  let timers = [];

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
    demoStatus.textContent = "tap play to start";
    dashFeed.innerHTML = '<p class="dash-feed-empty">Activity will appear here once the demo starts…</p>';
    kpiOpen.textContent = INITIAL_KPI.open;
    kpiDown.textContent = INITIAL_KPI.down;
    kpiHealth.textContent = `${INITIAL_KPI.health}%`;
    kpiAvg.textContent = INITIAL_KPI.avg;
    replayBtn.textContent = "▶ Play Demo";
    replayBtn.disabled = false;
    playing = false;
  }

  function runDemo() {
    if (playing) return;
    playing = true;
    chatBody.innerHTML = "";
    demoStatus.textContent = "live simulation";
    replayBtn.textContent = "Playing…";
    replayBtn.disabled = true;

    schedule(() => {
      addSystemNote("📷 QR scanned — TF-ACME3-M001 · Hydraulic Press #2");
    }, 200);

    schedule(() => {
      addBubble("Issue with TF-ACME3-M001:", "bubble-out");
    }, 900);

    schedule(() => {
      addBubble(
        `<div class="voice-wave"><span></span><span></span><span></span><span></span><span></span><span></span></div> 0:14`,
        "bubble-voice"
      );
    }, 1900);

    schedule(() => {
      addBubble("Ticket <strong>#T-2481</strong> logged. Notifying the right people now…", "bubble-in");
    }, 2900);

    schedule(() => {
      addFeedItem("🎫", "Ticket #T-2481 opened for Hydraulic Press #2", "just now");
      kpiOpen.textContent = String(INITIAL_KPI.open + 1);
      flashKpi(kpiOpen);
      kpiDown.textContent = String(INITIAL_KPI.down + 1);
      flashKpi(kpiDown);
    }, 3000);

    schedule(() => addTyping(), 3700);

    schedule(() => {
      removeTyping();
      addBubble(
        `🤖 <strong>AI Brief</strong><br>
         Transcript: "spindle making a loud grinding noise since morning shift"<br>
         Likely cause: worn spindle bearing<br>
         Urgency: <span class="badge badge-high">High</span><br>
         Suggested action: stop the machine and inspect the bearing housing`,
        "bubble-in"
      );
    }, 5200);

    schedule(() => {
      addFeedItem("🤖", "AI triage complete — urgency set to High", "2s ago");
    }, 5300);

    schedule(() => {
      addBubble("🔧 <strong>Ramesh (Technician)</strong> has been notified on WhatsApp.<br>👤 Plant Owner is CC'd as an informed user.", "bubble-in");
    }, 6600);

    schedule(() => {
      addFeedItem("🔔", "Ramesh notified · Plant Owner informed", "3s ago");
      kpiHealth.textContent = `${INITIAL_KPI.health - 6}%`;
      flashKpi(kpiHealth);
    }, 6700);

    schedule(() => {
      addBubble("Ramesh: on it, reached the machine 👍", "bubble-in");
      demoStatus.textContent = "ticket assigned ✅";
    }, 8000);

    schedule(() => {
      addFeedItem("✅", "Ramesh acknowledged — repair in progress", "just now");
      kpiAvg.textContent = "3.9h";
      flashKpi(kpiAvg);
      replayBtn.textContent = "↻ Replay Demo";
      replayBtn.disabled = false;
      playing = false;
    }, 8600);
  }

  qrTap.addEventListener("click", runDemo);
  replayBtn.addEventListener("click", () => {
    resetDemo();
    runDemo();
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
  wireWhatsAppLinks();
  initNav();
  initStatCounters();
  initFaq();
  initDemo();
  initFooterYear();
});
