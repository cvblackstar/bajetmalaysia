document.addEventListener("DOMContentLoaded", function () {
    const $ = (id) => document.getElementById(id);
    const staticLink = $("retirementPlannerLinkStatic");
    const retirementResults = $("retirementResults");
    const retirementStatus = $("retirementStatus");
    const resultCard = document.querySelector(".calculator-result-card");
    const calculateButton = $("calculateKwspButton");

    // Remove the legacy dynamically-created Phase 2 link from kwsp.js.
    const dynamicLink = $("retirementPlannerLink");
    if (dynamicLink) dynamicLink.remove();

    function getBalanceMode() {
        const selected = document.querySelector('input[name="balanceMode"]:checked');
        return selected ? selected.value : "total";
    }

    function buildRetirementPlannerUrl() {
        const params = new URLSearchParams({
            currentAge: $("currentAge")?.value || "",
            retireAge: $("retireAge")?.value || "60",
            balanceMode: getBalanceMode(),
            currentBalance: $("currentBalance")?.value || "0",
            currentPersaraan: $("currentPersaraan")?.value || "0",
            currentSejahtera: $("currentSejahtera")?.value || "0",
            currentFleksibel: $("currentFleksibel")?.value || "0",
            salary: $("grossSalary")?.value || "",
            salaryGrowth: $("salaryIncrement")?.value || "3",
            dividend: $("dividendRate")?.value || "5.5",
            spending: $("retirementSpending")?.value || "4000",
            inflation: $("inflationRate")?.value || "3",
            endAge: $("retirementEndAge")?.value || "85",
            voluntary: $("voluntaryContribution")?.value || "0"
        });
        return `kwsp-retirement.html?${params.toString()}`;
    }

    function syncPlannerLink() {
        if (staticLink) staticLink.href = buildRetirementPlannerUrl();
    }

    function movePlannerLinkBelowGraph() {
        if (!staticLink || !retirementResults) return;
        retirementResults.appendChild(staticLink);
        staticLink.classList.add("phase2-link");
    }

    function ensureReadinessIndicator() {
        if (!resultCard || $("retirementReadinessIndicator")) return;
        const indicator = document.createElement("div");
        indicator.id = "retirementReadinessIndicator";
        indicator.className = "retirement-readiness neutral";
        indicator.innerHTML = "<span class=\"readiness-dot\" aria-hidden=\"true\"></span><span><strong>Kesediaan persaraan belum dikira</strong><small>Klik Kira Unjuran Persaraan untuk melihat sama ada simpanan anda diunjur mencukupi.</small></span>";
        const takeHome = resultCard.querySelector(".take-home");
        resultCard.insertBefore(indicator, takeHome || resultCard.firstChild);
    }

    function updateReadinessIndicator() {
        if (!resultCard || !retirementStatus) return;
        ensureReadinessIndicator();
        const indicator = $("retirementReadinessIndicator");
        if (!indicator) return;

        const statusClass = retirementStatus.className || "";
        indicator.classList.remove("good", "caution", "neutral");

        if (statusClass.includes("good")) {
            indicator.classList.add("good");
            indicator.innerHTML = "<span class=\"readiness-dot\" aria-hidden=\"true\"></span><span><strong>🟢 Unjuran mencukupi</strong><small>Simpanan masih berbaki pada umur sasaran yang anda tetapkan.</small></span>";
            resultCard.classList.add("retirement-ready-good");
            resultCard.classList.remove("retirement-ready-caution");
        } else if (statusClass.includes("caution")) {
            indicator.classList.add("caution");
            indicator.innerHTML = "<span class=\"readiness-dot\" aria-hidden=\"true\"></span><span><strong>🔴 Unjuran belum mencukupi</strong><small>Simpanan diunjur habis sebelum umur sasaran anda.</small></span>";
            resultCard.classList.add("retirement-ready-caution");
            resultCard.classList.remove("retirement-ready-good");
        } else {
            indicator.classList.add("neutral");
            indicator.innerHTML = "<span class=\"readiness-dot\" aria-hidden=\"true\"></span><span><strong>⚪ Kesediaan persaraan belum dikira</strong><small>Klik Kira Unjuran Persaraan untuk melihat keputusan.</small></span>";
            resultCard.classList.remove("retirement-ready-good", "retirement-ready-caution");
        }
    }

    ensureReadinessIndicator();
    syncPlannerLink();

    const ids = ["currentAge", "retireAge", "currentBalance", "currentPersaraan", "currentSejahtera", "currentFleksibel", "grossSalary", "salaryIncrement", "dividendRate", "retirementSpending", "inflationRate", "retirementEndAge", "voluntaryContribution"];
    ids.forEach(id => {
        const input = $(id);
        if (input) {
            input.addEventListener("input", syncPlannerLink);
            input.addEventListener("change", syncPlannerLink);
        }
    });
    document.querySelectorAll('input[name="balanceMode"]').forEach(input => input.addEventListener("change", syncPlannerLink));

    if (calculateButton) {
        calculateButton.addEventListener("click", function () {
            window.setTimeout(function () {
                syncPlannerLink();
                movePlannerLinkBelowGraph();
                updateReadinessIndicator();
            }, 0);
        });
    }

    if (retirementStatus) {
        const observer = new MutationObserver(function () {
            updateReadinessIndicator();
        });
        observer.observe(retirementStatus, { attributes: true, attributeFilter: ["class"] });
    }
});

(function injectKwspUiStyles() {
    const style = document.createElement("style");
    style.textContent = `
        .retirement-readiness{display:flex;align-items:center;gap:.8rem;margin:0 0 1rem;padding:1rem 1.1rem;border-radius:14px;border:1px solid rgba(0,0,0,.1);transition:all .2s ease}
        .retirement-readiness span:last-child{display:flex;flex-direction:column;gap:.2rem}
        .retirement-readiness strong{font-size:1rem}.retirement-readiness small{font-size:.82rem;line-height:1.4;opacity:.78}
        .readiness-dot{width:12px;height:12px;border-radius:50%;display:block;flex:0 0 12px;background:#90a4ae;box-shadow:0 0 0 4px rgba(144,164,174,.14)}
        .retirement-readiness.good{background:rgba(46,125,50,.09);border-color:rgba(46,125,50,.28)}.retirement-readiness.good .readiness-dot{background:#2e7d32;box-shadow:0 0 0 4px rgba(46,125,50,.14)}
        .retirement-readiness.caution{background:rgba(211,47,47,.08);border-color:rgba(211,47,47,.28)}.retirement-readiness.caution .readiness-dot{background:#d32f2f;box-shadow:0 0 0 4px rgba(211,47,47,.14)}
        .retirement-readiness.neutral{background:rgba(96,125,139,.07)}
        .retirement-ready-good{border-top:4px solid #2e7d32}.retirement-ready-caution{border-top:4px solid #d32f2f}
        #retirementResults > #retirementPlannerLinkStatic{margin-top:1rem;margin-bottom:.5rem}
        @media(max-width:760px){.retirement-readiness{align-items:flex-start}}
    `;
    document.head.appendChild(style);
})();
