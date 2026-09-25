(() => {
  "use strict";

  const STORAGE_PREFIX = "bajetmy:calculator:";
  const HASH_PREFIX = "#s=";

  function formatCurrency(amount) {
    return new Intl.NumberFormat("ms-MY", {
      style: "currency",
      currency: "MYR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  window.BajetMY = window.BajetMY || {};
  window.BajetMY.formatCurrency = formatCurrency;

  function calculatorKey() {
    const path = window.location.pathname.replace(/\/$/, "") || "/index.html";
    return path.split("/").pop() || "calculator";
  }

  function storageKey() {
    return STORAGE_PREFIX + calculatorKey();
  }

  function getControls() {
    return Array.from(document.querySelectorAll("input[id], select[id], textarea[id]"));
  }

  function collectState() {
    const state = {};
    for (const el of getControls()) {
      if (el.disabled) continue;
      if (el.type === "radio") {
        if (el.checked && el.name) state["radio:" + el.name] = el.value;
      } else if (el.type === "checkbox") {
        state["check:" + el.id] = el.checked;
      } else {
        state["value:" + el.id] = el.value;
      }
    }
    return { v: 1, state };
  }

  function toBase64Url(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function fromBase64Url(encoded) {
    const padded = encoded.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((encoded.length + 3) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function encodeState() {
    // Version 2: store only control values in DOM order instead of repeating field names.
    const values = getControls().map(el => {
      if (el.type === "radio" || el.type === "checkbox") return el.checked ? 1 : 0;
      if (el.value === "") return "";
      const numeric = Number(el.value);
      return Number.isFinite(numeric) ? numeric : el.value;
    });
    return "2." + toBase64Url(JSON.stringify(values));
  }

  function decodeState(encoded) {
    if (encoded.startsWith("2.")) {
      const values = JSON.parse(fromBase64Url(encoded.slice(2)));
      const state = {};

      getControls().forEach((el, index) => {
        const value = values[index];
        if (value === undefined) return;

        if (el.type === "radio") {
          if (value === 1 && el.name) state["radio:" + el.name] = el.value;
        } else if (el.type === "checkbox") {
          state["check:" + el.id] = Boolean(value);
        } else {
          state["value:" + el.id] = String(value ?? "");
        }
      });

      return { v: 1, state };
    }

    // Backward compatibility for existing v1 share links.
    return JSON.parse(fromBase64Url(encoded));
  }

  function setRadioByName(name, value) {
    for (const el of document.querySelectorAll('input[type="radio"]')) {
      if (el.name === name) el.checked = el.value === value;
    }
  }

  function restoreState(payload) {
    if (!payload || payload.v !== 1 || !payload.state) return false;
    for (const [key, value] of Object.entries(payload.state)) {
      if (key.startsWith("radio:")) {
        setRadioByName(key.slice(6), value);
        continue;
      }
      if (key.startsWith("check:")) {
        const el = document.getElementById(key.slice(6));
        if (el && el.type === "checkbox") el.checked = Boolean(value);
        continue;
      }
      if (key.startsWith("value:")) {
        const el = document.getElementById(key.slice(6));
        if (el) el.value = String(value ?? "");
      }
    }

    for (const el of getControls()) {
      if (el.type === "checkbox" || el.type === "radio") {
        el.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
    return true;
  }

  function readHashState() {
    if (!window.location.hash.startsWith(HASH_PREFIX)) return null;
    try {
      return decodeState(window.location.hash.slice(HASH_PREFIX.length));
    } catch (error) {
      console.warn("Bajet MY: invalid shared calculator state", error);
      return null;
    }
  }

  function loadLocalState() {
    try {
      const raw = localStorage.getItem(storageKey());
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn("Bajet MY: local calculator state unavailable", error);
      return null;
    }
  }

  function saveLocalState() {
    try {
      const payload = collectState();
      localStorage.setItem(storageKey(), JSON.stringify(payload));
      if (calculatorKey() === "kwsp.html") {
        localStorage.setItem("bajetmy:kwsp:main", JSON.stringify(payload));
      }
    } catch (error) {
      console.warn("Bajet MY: could not save calculator state", error);
    }
  }

  function loadKwspMainHandoff() {
    try {
      const raw = localStorage.getItem("bajetmy:kwsp:main");
      if (!raw) return null;
      const payload = JSON.parse(raw);
      const source = payload && payload.state ? payload.state : {};
      const state = {};

      const copy = {
        "value:currentAge": "value:currentAge",
        "value:retireAge": "value:retireAge",
        "value:grossSalary": "value:salary",
        "value:salaryIncrement": "value:salaryGrowth",
        "value:dividendRate": "value:dividend",
        "value:retirementSpending": "value:spending",
        "value:inflationRate": "value:inflation",
        "value:retirementEndAge": "value:endAge",
        "value:voluntaryContribution": "value:extra",
        "value:currentBalance": "value:currentBalance",
        "value:currentPersaraan": "value:currentPersaraan",
        "value:currentSejahtera": "value:currentSejahtera",
        "value:currentFleksibel": "value:currentFleksibel"
      };

      for (const [from, to] of Object.entries(copy)) {
        if (Object.prototype.hasOwnProperty.call(source, from)) state[to] = source[from];
      }
      if (source["radio:balanceMode"]) state["radio:balanceMode"] = source["radio:balanceMode"];

      return { v: 1, state };
    } catch (error) {
      console.warn("Bajet MY: KWSP main handoff unavailable", error);
      return null;
    }
  }

  function track(eventName) {
    if (typeof window.gtag !== "function") return;
    window.gtag("event", eventName, { calculator: calculatorKey() });
  }

  function findCalculateControl() {
    const controls = Array.from(document.querySelectorAll(
      "button, input[type=\"submit\"], input[type=\"button\"]"
    ));
    return controls.find(el => {
      const label = ((el.id || "") + " " + (el.textContent || "") + " " + (el.value || "")).toLowerCase();
      return /calculate|kira|hitung/.test(label);
    }) || null;
  }

  function addSharingUI() {
    const existing = document.querySelector(".calculator-data-tools");
    if (existing) return existing;

    const host = document.getElementById("scenarioActions") ||
      document.querySelector(".calculator-form-card");
    if (!host) return null;

    const wrap = document.createElement("div");
    wrap.className = "calculator-data-tools";

    const actions = document.createElement("div");
    actions.className = "calculator-data-actions";

    const share = document.createElement("button");
    share.type = "button";
    share.className = "share-primary";
    share.textContent = "Kongsi Senario";

    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "share-secondary";
    clear.textContent = "Padam Simpanan";

    const status = document.createElement("span");
    status.className = "share-status";
    status.setAttribute("aria-live", "polite");

    const note = document.createElement("p");
    note.className = "calculator-data-note";
    note.innerHTML =
      'Input anda disimpan dalam browser anda by default. Pautan kongsi menggunakan encoded state, <strong>bukan encryption</strong>. ' +
      '<a href="privacy.html">Lihat Notis Privasi</a>.';

    share.addEventListener("click", async () => {
      const encoded = encodeState();
      const url = new URL(window.location.href);
      url.hash = HASH_PREFIX + encoded;
      history.replaceState(null, "", url.href);
      saveLocalState();
      track("calculator_share");

      try {
        await navigator.clipboard.writeText(url.href);
        status.textContent = "Pautan berjaya disalin.";
      } catch (error) {
        status.textContent = "Pautan dijana. Salin URL daripada bar alamat untuk berkongsi.";
      }
    });

    clear.addEventListener("click", () => {
      localStorage.removeItem(storageKey());
      const cleanUrl = new URL(window.location.href);
      cleanUrl.hash = "";
      history.replaceState(null, "", cleanUrl.href);
      status.textContent = "Simpanan tempatan dipadam.";
    });

    actions.append(share, clear, status);
    wrap.append(actions, note);

    if (host.id === "scenarioActions") {
      host.insertAdjacentElement("afterend", wrap);
    } else {
      host.appendChild(wrap);
    }

    return wrap;
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!document.querySelector(".calculator-form-card, #scenarioActions")) return;

    const sharedState = readHashState();
    const localState = sharedState ? null : loadLocalState();
    const handoffState = (!sharedState && !localState && calculatorKey() === "kwsp-retirement.html")
      ? loadKwspMainHandoff()
      : null;

    if (sharedState) {
      if (restoreState(sharedState)) saveLocalState();
    } else if (localState) {
      restoreState(localState);
      if (calculatorKey() === "kwsp.html") saveLocalState();
    } else if (handoffState) {
      restoreState(handoffState);
      saveLocalState();
    }

    addSharingUI();

    for (const el of getControls()) {
      el.addEventListener("input", saveLocalState);
      el.addEventListener("change", saveLocalState);
    }

    const calculate = findCalculateControl();
    if (calculate) {
      calculate.addEventListener("click", () => track("calculator_used"));
    }

    if (sharedState && calculate) {
      setTimeout(() => calculate.click(), 0);
    }
  });
})();