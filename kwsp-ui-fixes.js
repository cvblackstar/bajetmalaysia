document.addEventListener("DOMContentLoaded", function () {
    const staticLink = document.getElementById("retirementPlannerLinkStatic");
    const dynamicLink = document.getElementById("retirementPlannerLink");
    if (dynamicLink) dynamicLink.remove();
    if (!staticLink) return;
    const retirementResults = document.getElementById("retirementResults");
    if (retirementResults) retirementResults.appendChild(staticLink);
    function syncPlannerUrl() {
        const params = new URLSearchParams({
            currentAge: document.getElementById("currentAge")?.value || "",
            retireAge: document.getElementById("retireAge")?.value || "60",
            balanceMode: document.querySelector('input[name="balanceMode"]:checked')?.value || "total",
            currentBalance: document.getElementById("currentBalance")?.value || "0",
            currentPersaraan: document.getElementById("currentPersaraan")?.value || "0",
            currentSejahtera: document.getElementById("currentSejahtera")?.value || "0",
            currentFleksibel: document.getElementById("currentFleksibel")?.value || "0",
            salary: document.getElementById("grossSalary")?.value || "",
            salaryGrowth: document.getElementById("salaryIncrement")?.value || "3",
            dividend: document.getElementById("dividendRate")?.value || "5.5",
            spending: document.getElementById("retirementSpending")?.value || "4000",
            inflation: document.getElementById("inflationRate")?.value || "3",
            endAge: document.getElementById("retirementEndAge")?.value || "85",
            voluntary: document.getElementById("voluntaryContribution")?.value || "0"
        });
        staticLink.href = `kwsp-retirement.html?${params.toString()}`;
    }
    const ids = ["currentAge", "retireAge", "currentBalance", "currentPersaraan", "currentSejahtera", "currentFleksibel", "grossSalary", "salaryIncrement", "dividendRate", "retirementSpending", "inflationRate", "retirementEndAge", "voluntaryContribution"];
    ids.forEach(id => { const input = document.getElementById(id); if (input) { input.addEventListener("input", syncPlannerUrl); input.addEventListener("change", syncPlannerUrl); } });
    document.querySelectorAll('input[name="balanceMode"]').forEach(input => input.addEventListener("change", syncPlannerUrl));
    syncPlannerUrl();
});
