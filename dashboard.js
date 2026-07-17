(function () {
  const role = document.body.dataset.role; // "patient" or "doctor"

  const moduleHome = document.getElementById("moduleHome");
  const panels = {
    health: document.getElementById("moduleHealth"),
    rx: document.getElementById("moduleRx"),
    booking: document.getElementById("moduleBooking"),
    progress: document.getElementById("moduleProgress"),
  };
  const greetName = document.getElementById("greetName");
  greetName.textContent = ""; // name already shown in topbar; keep greeting clean

  // ---- Navigation ----
  // Pure in-page panel switching. No history/URL changes here — switching
  // modules, or going back to the module grid, never touches browser
  // history, so the browser's own Back button can't accidentally carry the
  // user past the dashboard and out to the login/sign-in page.
  document.querySelectorAll(".module-card").forEach((card) => {
    card.addEventListener("click", () => openModule(card.dataset.module));
  });
  document.querySelectorAll("[data-back]").forEach((btn) => {
    btn.addEventListener("click", closeModule);
  });

  function openModule(key) {
    moduleHome.classList.add("hidden");
    Object.values(panels).forEach((p) => p.classList.add("hidden"));
    panels[key].classList.remove("hidden");
    loadModule(key);
  }
  function closeModule() {
    Object.values(panels).forEach((p) => p.classList.add("hidden"));
    moduleHome.classList.remove("hidden");
  }

  function loadModule(key) {
    if (key === "health") loadHealth();
    if (key === "rx") loadRx();
    if (key === "booking") loadBooking();
    if (key === "progress") loadProgress();
  }

  function tagForStatus(status) {
    const s = (status || "").toLowerCase();
    if (["active", "good", "reviewed", "success", "approved", "completed", "resolved"].some((x) => s.includes(x))) return "tag-good";
    if (["pending", "fair", "stable", "on hold", "scheduled", "rescheduled"].some((x) => s.includes(x))) return "tag-warn";
    if (["poor", "failed", "cancelled", "no-show", "discontinued", "critical"].some((x) => s.includes(x))) return "tag-bad";
    return "tag-neutral";
  }

  // =====================================================================
  // MODULE 1 — Health Data
  // =====================================================================
  async function loadHealth() {
    const el = document.getElementById("healthContent");
    el.innerHTML = "<p class='empty-state'>Loading patient health data…</p>";
    const res = await fetch("/api/health_data");
    const data = await res.json();

    if (role === "patient") {
      const p = data.patient;
      el.innerHTML = `
        <div class="data-card">
          <div class="data-card-header">
            <div>
              <div class="data-card-title">${p["Full Name"]}</div>
              <div class="data-card-sub">${p["Gender"]} · Age ${p["Age"]} · Blood Group ${p["Blood Group"]}</div>
            </div>
            <span class="data-id">${p["Patient ID"]}</span>
          </div>
          <div class="kv-grid">
            <div><div class="k">Primary Diagnosis</div><div class="v">${p["Primary Diagnosis"]}</div></div>
            <div><div class="k">Assigned Doctor</div><div class="v">${p["Assigned Doctor"]}</div></div>
            <div><div class="k">Insurance</div><div class="v">${p["Insurance Provider"]}</div></div>
            <div><div class="k">Status</div><div class="v"><span class="tag ${tagForStatus(p["Status"])}">${p["Status"]}</span></div></div>
            <div><div class="k">Phone</div><div class="v">${p["Phone"]}</div></div>
            <div><div class="k">Email</div><div class="v">${p["Email"]}</div></div>
          </div>
        </div>
        <span class="section-label">Lab Results</span>
        ${data.labs.map(labCard).join("") || "<p class='empty-state'>No lab results on file.</p>"}
      `;
    } else {
      el.innerHTML = `<span class="section-label">My Patients (${data.patients.length})</span>` +
        data.patients.map(patientCard).join("");
    }
  }

  function patientCard(p) {
    return `
      <div class="data-card">
        <div class="data-card-header">
          <div>
            <div class="data-card-title">${p["Full Name"]}</div>
            <div class="data-card-sub">${p["Gender"]} · Age ${p["Age"]} · ${p["Primary Diagnosis"]}</div>
          </div>
          <span class="data-id">${p["Patient ID"]}</span>
        </div>
        <div class="kv-grid">
          <div><div class="k">Blood Group</div><div class="v">${p["Blood Group"]}</div></div>
          <div><div class="k">Insurance</div><div class="v">${p["Insurance Provider"]}</div></div>
          <div><div class="k">Status</div><div class="v"><span class="tag ${tagForStatus(p["Status"])}">${p["Status"]}</span></div></div>
        </div>
      </div>`;
  }

  function labCard(l) {
    return `
      <div class="data-card">
        <div class="data-card-header">
          <div>
            <div class="data-card-title">${l["Test Name"]}</div>
            <div class="data-card-sub">Result: ${l["Result Value"]} · Range: ${l["Reference Range"]}</div>
          </div>
          <span class="tag ${tagForStatus(l["Interpretation"])}">${l["Interpretation"]}</span>
        </div>
        <div class="kv-grid">
          <div><div class="k">Result Date</div><div class="v">${l["Result Date"]}</div></div>
          <div><div class="k">Verified By</div><div class="v">${l["Verified By"]}</div></div>
          <div><div class="k">Review Status</div><div class="v">${l["Review Status"]}</div></div>
        </div>
      </div>`;
  }

  // =====================================================================
  // MODULE 2 — Prescriptions
  // =====================================================================
  async function loadRx() {
    const el = document.getElementById("rxContent");
    el.innerHTML = "<p class='empty-state'>Loading prescriptions…</p>";
    const res = await fetch("/api/prescriptions");
    const data = await res.json();

    if (!data.length) {
      el.innerHTML = "<p class='empty-state'>No prescriptions found.</p>";
      return;
    }

    el.innerHTML = data.map((r) => `
      <div class="data-card">
        <div class="data-card-header">
          <div>
            <div class="data-card-title">${r["Drug Name"]} <span style="color:var(--muted); font-weight:500;">— ${r["Dosage"]}</span></div>
            <div class="data-card-sub">${r["Patient Name"]} · Prescribed by ${r["Prescribing Doctor"]}</div>
          </div>
          <span class="tag ${tagForStatus(r["Status"])}">${r["Status"]}</span>
        </div>
        <div class="kv-grid">
          <div><div class="k">Frequency</div><div class="v">${r["Frequency"]}</div></div>
          <div><div class="k">Route</div><div class="v">${r["Route"]}</div></div>
          <div><div class="k">Duration</div><div class="v">${r["Duration (days)"]} days</div></div>
          <div><div class="k">Refills Left</div><div class="v">${r["Refills Remaining"]}</div></div>
          <div><div class="k">Brand/Generic</div><div class="v">${r["Brand/Generic"]}</div></div>
          <div><div class="k">Dispensed At</div><div class="v">${r["Dispensed At"]}</div></div>
        </div>
      </div>
    `).join("");
  }

  // =====================================================================
  // MODULE 3 — Booking List
  // =====================================================================
  let appointmentsCache = [];

  async function loadBooking() {
    const el = document.getElementById("bookingContent");
    el.innerHTML = "<p class='empty-state'>Loading booking list…</p>";
    const res = await fetch("/api/appointments");
    appointmentsCache = await res.json();

    if (!appointmentsCache.length) {
      el.innerHTML = "<p class='empty-state'>No appointments found.</p>";
      return;
    }

    el.innerHTML = appointmentsCache.map(bookingRow).join("");

    if (role === "patient") {
      el.querySelectorAll("[data-choose-mode]").forEach((btn) => {
        btn.addEventListener("click", () => openBookingModal(btn.dataset.chooseMode));
      });
    }
  }

  function modeIcon(mode) {
    if (mode === "Phone") return '<svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>';
    if (mode === "Online") return '<svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>';
    return '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="3"/><path d="M9 21v-6l-2-3 3-4 2 2 2-2 3 4-2 3v6"/></svg>';
  }

  function bookingRow(a) {
    const isRescheduled = a["Status"] === "Rescheduled";
    const rescheduleNote = isRescheduled && a["Notes"]
      ? `<div class="reschedule-note">Reason: ${a["Notes"]}</div>` : "";

    let rightSide;
    if (role === "patient") {
      rightSide = `<button class="booking-action-btn" data-choose-mode="${a["Appointment ID"]}" type="button">
          ${modeIcon(a["Booking Mode"])} ${a["Booking Mode"] || "Choose mode"}
        </button>`;
    } else {
      rightSide = `<span class="mode-pill mode-${a["Booking Mode"]}">${modeIcon(a["Booking Mode"])} ${a["Booking Mode"]}</span>`;
    }

    return `
      <div class="booking-row" data-row-id="${a["Appointment ID"]}">
        <div class="booking-main">
          <div class="booking-doctor">${role === "patient" ? a["Doctor"] : a["Patient Name"]}</div>
          <div class="booking-meta">${a["Department"]} · ${a["Date"]} at ${a["Time"]} · ${a["Visit Type"]}</div>
          <div class="booking-meta"><span class="tag ${tagForStatus(a["Status"])}" style="margin-top:4px;">${a["Status"]}</span></div>
          ${rescheduleNote}
        </div>
        ${rightSide}
      </div>`;
  }

  // Booking modal
  const bookingModal = document.getElementById("bookingModal");
  const modalApptInfo = document.getElementById("modalApptInfo");
  const rescheduleBox = document.getElementById("rescheduleBox");
  const rescheduleReason = document.getElementById("rescheduleReason");
  let activeApptId = null;
  let selectedMode = null;

  function openBookingModal(apptId) {
    activeApptId = apptId;
    selectedMode = null;
    const a = appointmentsCache.find((x) => x["Appointment ID"] === apptId);
    modalApptInfo.textContent = `${a["Doctor"]} · ${a["Date"]} at ${a["Time"]}`;
    document.querySelectorAll(".mode-tile").forEach((t) => t.classList.remove("selected"));
    rescheduleBox.classList.toggle("hidden", a["Status"] !== "Rescheduled");
    rescheduleReason.value = a["Notes"] || "";
    bookingModal.classList.remove("hidden");
  }

  document.getElementById("closeBookingModal").addEventListener("click", () => {
    bookingModal.classList.add("hidden");
  });

  document.querySelectorAll(".mode-tile").forEach((tile) => {
    tile.addEventListener("click", async () => {
      document.querySelectorAll(".mode-tile").forEach((t) => t.classList.remove("selected"));
      tile.classList.add("selected");
      selectedMode = tile.dataset.mode;
      await saveBookingMode();
    });
  });

  document.getElementById("confirmRescheduleReason").addEventListener("click", async () => {
    await saveBookingMode();
  });

  async function saveBookingMode() {
    if (!activeApptId || !selectedMode) return;
    const res = await fetch(`/api/appointments/${activeApptId}/booking_mode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_mode: selectedMode,
        reschedule_reason: rescheduleReason.value,
      }),
    });
    const data = await res.json();
    if (data.success) {
      bookingModal.classList.add("hidden");
      loadBooking();
    }
  }

  // =====================================================================
  // MODULE 4 — Progress & Medical History
  // =====================================================================
  function bandClass(label) {
    const l = (label || "").toLowerCase();
    if (l === "poor") return "band-poor";
    if (l === "fair") return "band-fair";
    if (l === "stable") return "band-stable";
    if (l === "good") return "band-good";
    return "band-fair";
  }

  function ringSVG(pct, cls, size, stroke) {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const offset = c - (pct / 100) * c;
    return `
      <svg viewBox="0 0 ${size} ${size}">
        <circle class="ring-bg" cx="${size/2}" cy="${size/2}" r="${r}" stroke-width="${stroke}"></circle>
        <circle class="ring-fg ${cls}" cx="${size/2}" cy="${size/2}" r="${r}" stroke-width="${stroke}"
          stroke-dasharray="${c}" stroke-dashoffset="${c}" data-target-offset="${offset}"></circle>
      </svg>`;
  }

  async function loadProgress() {
    const el = document.getElementById("progressContent");
    el.innerHTML = "<p class='empty-state'>Loading progress records…</p>";
    const res = await fetch("/api/progress");
    const records = await res.json();

    if (!records.length) {
      el.innerHTML = "<p class='empty-state'>No medical history records found.</p>";
      return;
    }

    el.innerHTML = `<div class="progress-list">${records.map(progressRow).join("")}</div>`;

    // animate rings
    requestAnimationFrame(() => {
      el.querySelectorAll(".ring-fg").forEach((ring) => {
        const target = ring.dataset.targetOffset;
        setTimeout(() => { ring.style.strokeDashoffset = target; }, 50);
      });
    });

    el.querySelectorAll("[data-view-progress]").forEach((btn) => {
      btn.addEventListener("click", () => openProgressModal(btn.dataset.viewProgress));
    });
  }

  function progressRow(r) {
    const cls = bandClass(r["Progress"]);
    return `
      <div class="progress-row">
        <div class="ring-wrap">
          ${ringSVG(r.progress_percent, cls, 64, 6)}
          <div class="ring-pct">${r.progress_percent}%</div>
        </div>
        <div class="progress-info">
          <div class="progress-name">${r["Patient Name"]}</div>
          <div class="progress-diag">${r["Diagnosis"]} · ${r["Condition Status"]}</div>
        </div>
        <button class="progress-view-btn" data-view-progress="${r["Record ID"]}" type="button">View Progress</button>
      </div>`;
  }

  const progressModal = document.getElementById("progressModal");
  const progressModalContent = document.getElementById("progressModalContent");

  document.getElementById("closeProgressModal").addEventListener("click", () => {
    progressModal.classList.add("hidden");
  });

  async function openProgressModal(recordId) {
    const res = await fetch(`/api/progress/${recordId}`);
    const r = await res.json();
    const cls = bandClass(r["Progress"]);

    progressModalContent.innerHTML = `
      <h2 class="pm-title">${r["Patient Name"]}</h2>
      <p class="pm-sub">${r["Diagnosis"]} (${r["ICD-10 Code"]}) · Onset ${r["Onset Date"]}</p>
      <div class="pm-ring-row">
        <div class="pm-ring-wrap">
          ${ringSVG(r.progress_percent, cls, 100, 9)}
          <div class="pm-ring-pct">${r.progress_percent}%</div>
        </div>
        <div class="kv-grid" style="margin-top:0;">
          <div><div class="k">Progress Rating</div><div class="v">${r["Progress"]}</div></div>
          <div><div class="k">Condition Status</div><div class="v">${r["Condition Status"]}</div></div>
          <div><div class="k">Treating Doctor</div><div class="v">${r["Treating Doctor"]}</div></div>
          <div><div class="k">Department</div><div class="v">${r["Department"]}</div></div>
          <div><div class="k">Hospitalized</div><div class="v">${r["Hospitalized"]}</div></div>
          <div><div class="k">Medications</div><div class="v">${r["Current Medications"]}</div></div>
        </div>
      </div>
      <div class="pm-notes">${r["Clinical Notes"] || "No clinical notes recorded."}</div>
    `;
    progressModal.classList.remove("hidden");

    requestAnimationFrame(() => {
      const ring = progressModalContent.querySelector(".ring-fg");
      const target = ring.dataset.targetOffset;
      setTimeout(() => { ring.style.strokeDashoffset = target; }, 50);
    });
  }
})();
