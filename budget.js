function calculateBudget() {
    const netSalary = parseFloat(document.getElementById("bud_netSalary").value) || 0;
    
    // Gather inputs by class groups
    const needsInputs = document.querySelectorAll(".bud-input.needs");
    const wantsInputs = document.querySelectorAll(".bud-input.wants");
    const savingsInputs = document.querySelectorAll(".bud-input.savings");

    let totalNeeds = 0;
    let totalWants = 0;
    let totalSavings = 0;

    let budgetData = { netSalary: netSalary, items: {} };

    needsInputs.forEach(input => {
        let val = parseFloat(input.value) || 0;
        totalNeeds += val;
        budgetData.items[input.dataset.category] = val;
    });

    wantsInputs.forEach(input => {
        let val = parseFloat(input.value) || 0;
        totalWants += val;
        budgetData.items[input.dataset.category] = val;
    });

    savingsInputs.forEach(input => {
        let val = parseFloat(input.value) || 0;
        totalSavings += val;
        budgetData.items[input.dataset.category] = val;
    });

    const totalExpenses = totalNeeds + totalWants + totalSavings;
    const remaining = netSalary - totalExpenses;

    // Save to localStorage automatically
    localStorage.setItem("bajetMalaysia_monthlyBudget", JSON.stringify(budgetData));

    // Update Text UI
    document.getElementById("bud_totalExpenses").innerText = "RM " + totalExpenses.toLocaleString();
    const remainingEl = document.getElementById("bud_remaining");
    remainingEl.innerText = "RM " + remaining.toLocaleString();
    remainingEl.style.color = remaining >= 0 ? "#38a169" : "#e53e3e";

    // Calculate Percentages relative to net salary (fallback to safe divisor)
    const safeSalary = netSalary > 0 ? netSalary : 1;
    const pctNeeds = Math.round((totalNeeds / safeSalary) * 100);
    const pctWants = Math.round((totalWants / safeSalary) * 100);
    const pctSavings = Math.round((totalSavings / safeSalary) * 100);
    const pctSurplus = Math.round((Math.max(0, remaining) / safeSalary) * 100);

    document.getElementById("bud_pctNeeds").innerText = pctNeeds + "%";
    document.getElementById("bud_pctWants").innerText = pctWants + "%";
    document.getElementById("bud_pctSavings").innerText = pctSavings + "%";

    // Update Visual Chart Bars
    document.getElementById("budBarNeeds").style.width = Math.min(pctNeeds, 100) + "%";
    document.getElementById("budBarWants").style.width = Math.min(pctWants, 100 - pctNeeds) + "%";
    document.getElementById("budBarSavings").style.width = Math.min(pctSavings, 100 - pctNeeds - pctWants) + "%";
    document.getElementById("budBarSurplus").style.width = Math.max(0, Math.min(pctSurplus, 100 - pctNeeds - pctWants - pctSavings)) + "%";

    // Educational Insight Engine ("Duit Bocor" / Feedback)
    let insightText = "";
    if (netSalary === 0) {
        insightText = "Sila masukkan jumlah gaji bersih anda.";
    } else if (totalExpenses > netSalary) {
        insightText = `⚠️ Amaran: Perbelanjaan anda melebihi pendapatan sebanyak RM ${Math.abs(remaining).toLocaleString()} sebulan. Cuba kurangkan komitmen di bahagian kehendak atau cari alternatif penjimatan.`;
    } else if (pctNeeds > 60) {
        insightText = `💡 Analisis: Komitmen keperluan anda mengambil masa ${pctNeeds}% daripada pendapatan (lebih tinggi daripada rujukan 50%). Masalah utama biasanya terletak pada bebanan rumah atau kenderaan yang tinggi.`;
    } else if (pctSavings < 15) {
        insightText = `💡 Analisis: Simpanan anda berada pada paras ${pctSavings}%. Cuba tingkatkan sedikit tabungan bulanan secara konsisten untuk membina dana kecemasan yang stabil.`;
    } else {
        insightText = `✨ Tahniah! Corak belanjawan anda seimbang dan sihat. Teruskan disiplin kewangan ini.`;
    }
    document.getElementById("bud_insight").innerText = insightText;
}

// Load saved data on page startup
window.addEventListener("DOMContentLoaded", () => {
    const savedData = localStorage.getItem("bajetMalaysia_monthlyBudget");
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            if (parsed.netSalary) document.getElementById("bud_netSalary").value = parsed.netSalary;
            if (parsed.items) {
                for (const [key, val] of Object.entries(parsed.items)) {
                    const input = document.querySelector(`[data-category="${key}"]`);
                    if (input) input.value = val;
                }
            }
            calculateBudget();
        } catch (e) {
            console.error("Gagal memuatkan data belanjawan tersimpan", e);
        }
    }
});
