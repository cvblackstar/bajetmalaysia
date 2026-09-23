document.addEventListener("DOMContentLoaded", function () {
    const $ = (id) => document.getElementById(id);
    const staticLink = $("retirementPlannerLinkStatic");
    const retirementResults = $("retirementResults");
    const retirementStatus = $("retirementStatus");
    const resultCard = document.querySelector(".calculator-result-card");
    const calculateButton = $("calculateKwspButton");

    function removeLegacyPlannerLink() {
        const legacyLink = $("retirementPlannerLink");
        if (legacyLink) legacyLink.remove();
    }

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
        removeLegacyPlannerLink();
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

    function formatScheduleRM(value) {
        const n = Math.max(0, Number(value) || 0);
        if (n >= 1000000) return `RM ${(n / 1000000).toFixed(2)} M`;
        if (n >= 1000) return `RM ${Math.round(n / 1000)} K`;
        return `RM ${Math.round(n).toLocaleString("ms-MY")}`;
    }

    function renderCompoundingSchedule() {
        if (!retirementResults) return;
        let container = $("kwspCompoundingSchedule");
        if (!container) {
            container = document.createElement("div");
            container.id = "kwspCompoundingSchedule";
            container.className = "planner-card kwsp-schedule-card";
            retirementResults.appendChild(container);
        }

        const currentAge = Number($("currentAge")?.value) || 0;
        const retireAge = Number($("retireAge")?.value) || 0;
        const endAge = Number($("retirementEndAge")?.value) || 0;
        const salaryStart = Number($("grossSalary")?.value) || 0;
        const salaryGrowth = (Number($("salaryIncrement")?.value) || 0) / 100;
        const dividendRate = (Number($("dividendRate")?.value) || 0) / 100;
        const inflationRate = (Number($("inflationRate")?.value) || 0) / 100;
        const spendingToday = Number($("retirementSpending")?.value) || 0;
        const voluntary = Number($("voluntaryContribution")?.value) || 0;
        if (!currentAge || !retireAge || !endAge || retireAge <= currentAge || endAge <= currentAge) {
            container.hidden = true;
            return;
        }

        const mode = getBalanceMode();
        let balance = mode === "individual"
            ? (Number($("currentPersaraan")?.value) || 0) + (Number($("currentSejahtera")?.value) || 0) + (Number($("currentFleksibel")?.value) || 0)
            : (Number($("currentBalance")?.value) || 0);
        let salary = salaryStart;
        const rows = [];

        for (let age = currentAge; age < endAge; age++) {
            const startBalance = balance;
            let annualSaving = 0;
            let dividend = 0;
            let spending = 0;
            const working = age < retireAge;
            if (working) {
                const employeeRate = age < 60 ? 0.11 : 0;
                const employerRate = age < 60 ? (salary <= 5000 ? 0.13 : 0.12) : 0;
                annualSaving = (salary * (employeeRate + employerRate) + voluntary) * 12;
                dividend = (startBalance + annualSaving / 2) * dividendRate;
                balance = startBalance + annualSaving + dividend;
                salary *= 1 + salaryGrowth;
            } else {
                spending = spendingToday * Math.pow(1 + inflationRate, age - retireAge);
                dividend = Math.max(0, startBalance - spending / 2) * dividendRate;
                balance = Math.max(0, startBalance + dividend - spending);
            }
            rows.push({ yearAge: age, endAge: age + 1, startBalance, annualSaving, dividend, spending, endBalance: balance, phase: working ? "Simpanan" : "Persaraan" });
            if (balance <= 0 && !working) break;
        }

        const totalSavings = rows.reduce((sum, row) => sum + row.annualSaving, 0);
        const totalDividend = rows.reduce((sum, row) => sum + row.dividend, 0);
        container.hidden = false;
        container.innerHTML = `<h2>Jadual Kesan Kompaun KWSP</h2><p class="small-note">Jadual ini menunjukkan bagaimana baki awal, caruman, dividen dan belanja persaraan membentuk baki akhir setiap tahun. Ia ialah anggaran tahunan dan bukan kaedah pengiraan dividen rasmi KWSP.</p><div class="kwsp-schedule-summary"><span><strong>${formatScheduleRM(totalSavings)}</strong><small>Jumlah caruman sepanjang tempoh jadual</small></span><span><strong>${formatScheduleRM(totalDividend)}</strong><small>Jumlah dividen diunjur</small></span></div><div class="kwsp-schedule-wrap"><table class="kwsp-schedule"><thead><tr><th>Umur</th><th>Fasa</th><th>Baki awal tahun</th><th>Caruman tahunan</th><th>Dividen tahun itu</th><th>Belanja tahunan</th><th>Baki akhir tahun</th></tr></thead><tbody>${rows.map(row => `<tr><td>${row.yearAge}–${row.endAge}</td><td>${row.phase}</td><td>${formatScheduleRM(row.startBalance)}</td><td>${formatScheduleRM(row.annualSaving)}</td><td>${formatScheduleRM(row.dividend)}</td><td>${formatScheduleRM(row.spending)}</td><td><strong>${formatScheduleRM(row.endBalance)}</strong></td></tr>`).join("")}</tbody></table></div><p class="small-note">Nota: KWSP mengira dividen sebenar menggunakan baki agregat harian (MADB), termasuk kesan masa caruman dan pengeluaran. Jadual ini menggunakan anggaran tahunan untuk memudahkan pemahaman kesan kompaun. <a href="https://www.kwsp.gov.my/en/others/resource-centre/dividend" target="_blank" rel="noopener">Rujukan kaedah dividen KWSP</a>.</p>`;
    }

    function updateAgeLabel() {
        const label = document.querySelector('label[for="retirementEndAge"]');
        if (label) label.textContent = "Simpanan bertahan hingga (umur)";
    }

    removeLegacyPlannerLink();
    ensureReadinessIndicator();
    syncPlannerLink();
    updateAgeLabel();

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
                removeLegacyPlannerLink();
                renderCompoundingSchedule();
            }, 0);
        });
    }

    if (retirementStatus) {
        const observer = new MutationObserver(function () {
            updateReadinessIndicator();
            removeLegacyPlannerLink();
        });
        observer.observe(retirementStatus, { attributes: true, attributeFilter: ["class"] });
    }

    const legacyObserver = new MutationObserver(function () {
        removeLegacyPlannerLink();
    });
    legacyObserver.observe(document.body, { childList: true, subtree: true });

    (function injectKwspScheduleStyles() {
        const style = document.createElement("style");
        style.textContent = `
            .kwsp-schedule-card{margin-top:1rem}.kwsp-schedule-summary{display:grid;grid-template-columns:repeat(2,1fr);gap:1rem;margin:1rem 0}.kwsp-schedule-summary span{padding:1rem;border:1px solid rgba(0,0,0,.1);border-radius:12px;background:rgba(0,0,0,.02)}.kwsp-schedule-summary strong,.kwsp-schedule-summary small{display:block}.kwsp-schedule-summary small{margin-top:.25rem;opacity:.7}.kwsp-schedule-wrap{overflow:auto;border:1px solid rgba(0,0,0,.1);border-radius:12px}.kwsp-schedule{width:100%;border-collapse:collapse;min-width:850px;font-size:.88rem}.kwsp-schedule th,.kwsp-schedule td{padding:.7rem .65rem;border-bottom:1px solid rgba(0,0,0,.08);text-align:right;white-space:nowrap}.kwsp-schedule th:first-child,.kwsp-schedule td:first-child,.kwsp-schedule th:nth-child(2),.kwsp-schedule td:nth-child(2){text-align:left}.kwsp-schedule thead th{background:rgba(0,0,0,.035);font-weight:700}.kwsp-schedule tbody tr:last-child td{border-bottom:0}.kwsp-schedule tbody tr:nth-child(even){background:rgba(0,0,0,.015)}
            @media(max-width:600px){.kwsp-schedule-summary{grid-template-columns:1fr}.kwsp-schedule-card{padding:1rem}.kwsp-schedule-wrap{margin:0 -0.25rem}}
        `;
        document.head.appendChild(style);
    })();
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