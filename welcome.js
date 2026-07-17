(function () {
  const stepRole = document.getElementById("stepRole");
  const stepCreds = document.getElementById("stepCreds");
  const credsTitle = document.getElementById("credsTitle");
  const credsHint = document.getElementById("credsHint");
  const identifierLabel = document.getElementById("identifierLabel");
  const identifierSelect = document.getElementById("identifierSelect");
  const passwordInput = document.getElementById("passwordInput");
  const revealBtn = document.getElementById("revealBtn");
  const eyeIcon = document.getElementById("eyeIcon");
  const loginForm = document.getElementById("loginForm");
  const errorMsg = document.getElementById("errorMsg");
  const backToRole = document.getElementById("backToRole");

  let selectedRole = null;

  document.querySelectorAll(".role-tile").forEach((tile) => {
    tile.addEventListener("click", async () => {
      selectedRole = tile.dataset.role;
      await populateIdentifiers(selectedRole);
      stepRole.classList.add("hidden");
      stepCreds.classList.remove("hidden");

      if (selectedRole === "patient") {
        credsTitle.textContent = "Patient sign in";
        credsHint.textContent = "Select your Patient ID and enter your password.";
        identifierLabel.textContent = "Patient ID";
      } else {
        credsTitle.textContent = "Doctor sign in";
        credsHint.textContent = "Select your name and enter your password.";
        identifierLabel.textContent = "Doctor name";
      }
      errorMsg.classList.add("hidden");
      passwordInput.value = "";
    });
  });

  backToRole.addEventListener("click", () => {
    stepCreds.classList.add("hidden");
    stepRole.classList.remove("hidden");
  });

  async function populateIdentifiers(role) {
    identifierSelect.innerHTML = "";
    if (role === "patient") {
      const res = await fetch("/api/patient_ids");
      const patients = await res.json();
      patients.forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = `${p.id} — ${p.name}`;
        identifierSelect.appendChild(opt);
      });
    } else {
      const res = await fetch("/api/doctor_names");
      const doctors = await res.json();
      doctors.forEach((d) => {
        const opt = document.createElement("option");
        opt.value = d;
        opt.textContent = d;
        identifierSelect.appendChild(opt);
      });
    }
  }

  revealBtn.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
    revealBtn.classList.toggle("revealed", isPassword);
    eyeIcon.innerHTML = isPassword
      ? '<path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.24 4.24M9.88 4.6A10.6 10.6 0 0 1 12 4.5c7 0 11 7.5 11 7.5a17.6 17.6 0 0 1-3.16 4.12M6.1 6.1A17.4 17.4 0 0 0 1 12s4 7.5 11 7.5a10.7 10.7 0 0 0 4.24-.88"/>'
      : '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/>';
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorMsg.classList.add("hidden");

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: selectedRole,
        identifier: identifierSelect.value,
        password: passwordInput.value,
      }),
    });
    const data = await res.json();

    if (data.success) {
      window.location.href = data.redirect;
    } else {
      errorMsg.textContent = data.message || "Login failed.";
      errorMsg.classList.remove("hidden");
    }
  });
})();
