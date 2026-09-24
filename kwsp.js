document.addEventListener("DOMContentLoaded", function () {
    const $ = (id) => document.getElementById(id);
    const calculateButton = $("calculateKwspButton");
    const balanceModeInputs = document.querySelectorAll('input[name="balanceMode"]');
    const totalBalanceGroup = $("totalBalanceGroup");
    const individualBalanceGroup = $("individualBalanceGroup");
    const individualBalanceInputs = [$("currentPersaraan"), $("currentSejahtera"), $("currentFleksibel")];
    const individualBalanceTotal = $("individualBalanceTotal");

    function formatRM(amount) {
        return new Intl.NumberFormat("ms-MY", { style: "currency", currency: "MYR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.max(0, amount || 0));
    }

    function getBalanceMode() {
        const selected = document.querySelector('input[name="balanceMode"]:checked');
        return selected ? selected.value : "total";
    }

    function getIndividualBalances() {
        return {
            persaraan: parseFloat($("currentPersaraan").value) || 0,
            sejahtera: parseFloat($("currentSejahtera").value) || 0,
            fleksibel: parseFloat($("currentFleksibel").value) || 0
        };
    }

    function updateBalanceInputMode() {
        const individualMode = getBalanceMode() === "individual";
        totalBalanceGroup.hidden = individualMode;
        individualBalanceGroup.hidden = !individualMode;
        if (individualMode) updateIndividualBalanceTotal();
    }

    function updateIndividualBalanceTotal() {
        const b = getIndividualBalances();
        individualBalanceTotal.textContent = formatRM(b.persaraan + b.sejahtera + b.fleksibel);
    }

    function renameRetirementSpendingField() {
        const label = document.querySelector('label[for="retirementSpending"]');
        if (label) label.textContent = "Belanja bulanan selepas bersara";
        const goalText = document.querySelector(".retirement-goal-box > p");
        if (goalText) goalText.innerHTML = "Berapa banyak anda mahu belanja setiap bulan <strong>selepas bersara</strong>? Masukkan jumlah dalam nilai wang semasa; kalkulator akan mengembangkan perbelanjaan mengikut inflasi bermula pada umur persaraan.";
    }

    function buildRetirementPlannerUrl() {
        return "kwsp-retirement.html";
    }

    function addRetirementPlannerLink() {
        const legacy = $("retirementPlannerLink");
        if (legacy) legacy.remove();
        const link = $("retirementPlannerLinkStatic");
        if (link) link.href = buildRetirementPlannerUrl();
    }

    balanceModeInputs.forEach(input => input.addEventListener("change", updateBalanceInputMode));
    individualBalanceInputs.forEach(input => input.addEventListener("input", updateIndividualBalanceTotal));
    ["currentAge", "retireAge", "currentBalance", "currentPersaraan", "currentSejahtera", "currentFleksibel", "grossSalary", "salaryIncrement", "dividendRate", "retirementSpending", "inflationRate", "retirementEndAge", "voluntaryContribution"].forEach(id => {
        const input = $(id);
        if (input) input.addEventListener("input", addRetirementPlannerLink);
        if (input) input.addEventListener("change", addRetirementPlannerLink);
    });
    renameRetirementSpendingField();
    updateBalanceInputMode();
    addRetirementPlannerLink();

    calculateButton.addEventListener("click", function () {
        const currentAge = parseInt($("currentAge").value, 10);
        const retireAge = parseInt($("retireAge").value, 10);
        const balanceMode = getBalanceMode();
        const currentBalance = parseFloat($("currentBalance").value) || 0;
        const individualBalances = getIndividualBalances();
        const grossSalaryStart = parseFloat($("grossSalary").value);
        const salaryIncrement = parseFloat($("salaryIncrement").value) || 0;
        const voluntaryContribution = parseFloat($("voluntaryContribution").value) || 0;
        const dividendRate = parseFloat($("dividendRate").value) || 0;
        const retirementSpending = parseFloat($("retirementSpending").value);
        const retirementEndAge = parseInt($("retirementEndAge").value, 10);
        const inflationRate = parseFloat($("inflationRate").value) || 0;

        if (!currentAge || currentAge < 16 || !grossSalaryStart || grossSalaryStart <= 0) {
            alert("Sila masukkan umur dan gaji kasar bulanan yang sah.");
            return;
        }
        if (retireAge <= currentAge) {
            alert("Umur ingin bersara mestilah lebih besar daripada umur semasa.");
            return;
        }
        if (retirementEndAge <= retireAge) {
            alert("Umur akhir persaraan mestilah lebih besar daripada umur persaraan.");
            return;
        }
        if (retirementSpending < 0 || inflationRate < 0 || dividendRate < 0 || salaryIncrement < 0 || voluntaryContribution < 0) {
            alert("Nilai peratusan dan perbelanjaan tidak boleh negatif.");
            return;
        }
        if (balanceMode === "individual" && Object.values(individualBalances).some(v => v < 0)) {
            alert("Baki setiap akaun KWSP tidak boleh negatif.");
            return;
        }

        let persaraanBalance, sejahteraBalance, fleksibelBalance;
        if (balanceMode === "individual") {
            ({ persaraan: persaraanBalance, sejahtera: sejahteraBalance, fleksibel: fleksibelBalance } = individualBalances);
        } else {
            persaraanBalance = currentBalance * 0.75;
            sejahteraBalance = currentBalance * 0.15;
            fleksibelBalance = currentBalance * 0.10;
        }

        const startingTotal = persaraanBalance + sejahteraBalance + fleksibelBalance;
        const dividendDecimal = dividendRate / 100;
        const incrementDecimal = salaryIncrement / 100;
        const inflationDecimal = inflationRate / 100;
        let salary = grossSalaryStart;
        let totalDividend = 0;
        let firstMonth = null;
        const timeline = [{ age: currentAge, phase: "Simpanan", balance: startingTotal, spending: 0 }];

        for (let age = currentAge; age < retireAge; age++) {
            const employeeRate = age < 60 ? 0.11 : 0;
            const employerRate = age < 60 ? (salary <= 5000 ? 0.13 : 0.12) : 0.04;
            const monthlyEmployee = salary * employeeRate;
            const monthlyEmployer = salary * employerRate;
            const monthlyTotal = monthlyEmployee + monthlyEmployer + voluntaryContribution;
            if (!firstMonth) firstMonth = { employee: monthlyEmployee, employer: monthlyEmployer, voluntary: voluntaryContribution, total: monthlyTotal };

            const annualContribution = monthlyTotal * 12;
            const pc = annualContribution * 0.75;
            const sc = annualContribution * 0.15;
            const fc = annualContribution * 0.10;
            const dp = (persaraanBalance + pc / 2) * dividendDecimal;
            const ds = (sejahteraBalance + sc / 2) * dividendDecimal;
            const df = (fleksibelBalance + fc / 2) * dividendDecimal;
            totalDividend += dp + ds + df;
            persaraanBalance += pc + dp;
            sejahteraBalance += sc + ds;
            fleksibelBalance += fc + df;
            salary *= 1 + incrementDecimal;
            timeline.push({ age: age + 1, phase: "Simpanan", balance: persaraanBalance + sejahteraBalance + fleksibelBalance, spending: 0 });
        }

        const retirementStartingBalance = persaraanBalance + sejahteraBalance + fleksibelBalance;
        let retirementBalance = retirementStartingBalance;
        let depletionAge = null;
        let finalRetirementSpending = retirementSpending;
        const retirementWithdrawalTimeline = [];

        for (let age = retireAge; age < retirementEndAge; age++) {
            const yearsIntoRetirement = age - retireAge;
            const monthlySpending = retirementSpending * Math.pow(1 + inflationDecimal, yearsIntoRetirement);
            const annualSpending = monthlySpending * 12;
            const dividendBase = Math.max(0, retirementBalance - annualSpending / 2);
            const dividend = dividendBase * dividendDecimal;
            retirementBalance = Math.max(0, retirementBalance + dividend - annualSpending);
            finalRetirementSpending = monthlySpending;
            retirementWithdrawalTimeline.push({ age: age + 1, phase: "Bersara", balance: retirementBalance, spending: annualSpending });
            if (retirementBalance <= 0 && depletionAge === null) {
                depletionAge = age + 1;
                break;
            }
        }
        timeline.push(...retirementWithdrawalTimeline);

        const totalSavings = retirementStartingBalance;
        const totalRetirementWithdrawals = retirementWithdrawalTimeline.reduce((sum, p) => sum + (p.spending || 0), 0);
        const targetEndBalance = !depletionAge && retirementBalance > 0;

        $("kwspTotal").textContent = formatRM(totalSavings);
        $("resultLegacy").textContent = formatRM(startingTotal * Math.pow(1 + dividendDecimal, retireAge - currentAge));
        $("resultPersaraan").textContent = formatRM(persaraanBalance);
        $("resultSejahtera").textContent = formatRM(sejahteraBalance);
        $("resultFleksibel").textContent = formatRM(fleksibelBalance);
        $("resultDividend").textContent = formatRM(totalDividend);
        $("resultTotal").textContent = formatRM(totalSavings);

        $("retirementBalance").textContent = formatRM(retirementBalance);
        $("retirementMonthlySpend").textContent = formatRM(retirementSpending);
        $("retirementEndSpend").textContent = formatRM(finalRetirementSpending);
        $("retirementAgeOut").textContent = depletionAge ? `sekitar umur ${depletionAge}` : `sekurang-kurangnya umur ${retirementEndAge}`;
        $("retirementYears").textContent = `${retirementEndAge - retireAge} tahun`;
        $("retirementWithdrawals").textContent = formatRM(totalRetirementWithdrawals);

        const status = $("retirementStatus");
        if (retirementSpending === 0) {
            status.className = "retirement-status neutral";
            status.innerHTML = "<strong>Masukkan sasaran perbelanjaan persaraan</strong><p>Masukkan jumlah yang anda mahu belanja setiap bulan selepas bersara untuk melihat sama ada simpanan anda boleh bertahan.</p>";
        } else if (targetEndBalance) {
            status.className = "retirement-status good";
            status.innerHTML = `<strong>Unjuran simpanan masih berbaki pada umur ${retirementEndAge}</strong><p>Dengan andaian yang dipilih, baki anggaran ialah ${formatRM(retirementBalance)} selepas tempoh persaraan yang dirancang.</p>`;
        } else {
            status.className = "retirement-status caution";
            status.innerHTML = `<strong>Unjuran simpanan habis sebelum umur ${retirementEndAge}</strong><p>Dalam senario ini, baki diunjurkan habis sekitar umur ${depletionAge}. Pertimbangkan umur persaraan, kadar simpanan atau sasaran perbelanjaan yang berbeza.</p>`;
        }

        $("balanceNote").textContent = balanceMode === "individual"
            ? `Unjuran bermula daripada baki sebenar yang dimasukkan: ${formatRM(startingTotal)}.`
            : `Baki keseluruhan ${formatRM(startingTotal)} diagihkan secara anggaran kepada Akaun Persaraan 75%, Akaun Sejahtera 15% dan Akaun Fleksibel 10%.`;

        let noteText = `Anggaran caruman bulanan pertama: ${formatRM(firstMonth.employee)} (pekerja) + ${formatRM(firstMonth.employer)} (majikan)`;
        if (firstMonth.voluntary > 0) noteText += ` + ${formatRM(firstMonth.voluntary)} (caruman tambahan)`;
        $("contributionNote").textContent = `${noteText} = ${formatRM(firstMonth.total)} sebulan, dengan andaian dividen ${dividendRate.toFixed(2)}% setahun.`;
        $("retirementNote").textContent = `Belanja RM${Number(retirementSpending).toLocaleString("ms-MY")} sebulan selepas bersara. Jumlah tahunan bermula pada RM${Number(retirementSpending * 12).toLocaleString("ms-MY")} dan meningkat ${inflationRate.toFixed(1)}% setahun sepanjang tempoh persaraan. Ini ialah anggaran, bukan jaminan pulangan atau baki KWSP rasmi.`;

        renderRetirementChart(timeline, currentAge, retireAge);
        $("retirementResults").hidden = false;
        addRetirementPlannerLink();
    });

    function renderRetirementChart(timeline, currentAge, retireAge) {
        const svg = $("retirementChart");
        const width = 900, height = 360;
        const pad = { left: 64, right: 24, top: 28, bottom: 48 };
        const plotW = width - pad.left - pad.right;
        const plotH = height - pad.top - pad.bottom;
        const maxBalance = Math.max(1, ...timeline.map(p => p.balance));
        const maxSpending = Math.max(1, ...timeline.map(p => p.spending || 0));
        const maxValue = Math.max(maxBalance, maxSpending * 2);
        const x = age => pad.left + ((age - currentAge) / Math.max(1, timeline[timeline.length - 1].age - currentAge)) * plotW;
        const y = value => pad.top + plotH - (value / maxValue) * plotH;
        const points = timeline.map(p => `${x(p.age).toFixed(1)},${y(p.balance).toFixed(1)}`).join(" ");
        const spendingPoints = timeline.filter(p => p.spending > 0).map(p => `${x(p.age).toFixed(1)},${y(p.spending).toFixed(1)}`).join(" ");
        const grid = [0, 0.25, 0.5, 0.75, 1].map(r => {
            const yy = pad.top + plotH * (1 - r);
            return `<line x1="${pad.left}" y1="${yy}" x2="${width - pad.right}" y2="${yy}" stroke="currentColor" opacity="0.12"/><text x="${pad.left - 10}" y="${yy + 4}" text-anchor="end" font-size="11" fill="currentColor">${formatCompactRM(maxValue * r)}</text>`;
        }).join("");
        const xTicks = timeline.filter((p, i) => i === 0 || p.age === retireAge || p.age === timeline[timeline.length - 1].age || (p.age - currentAge) % 5 === 0).map(p => `<text x="${x(p.age)}" y="${height - 18}" text-anchor="middle" font-size="11" fill="currentColor">${p.age}</text>`).join("");
        const retirementX = x(retireAge);
        svg.innerHTML = `${grid}<rect x="${retirementX}" y="${pad.top}" width="${Math.max(0, width - pad.right - retirementX)}" height="${plotH}" fill="currentColor" opacity="0.035"/><line x1="${retirementX}" y1="${pad.top}" x2="${retirementX}" y2="${pad.top + plotH}" stroke="currentColor" stroke-dasharray="5 5" opacity="0.5"/><text x="${retirementX + 8}" y="${pad.top + 16}" font-size="11" fill="currentColor">Mula bersara</text><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="3"/><polyline points="${spendingPoints}" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="7 5" opacity="0.7"/>${xTicks}<text x="${pad.left}" y="18" font-size="12" fill="currentColor">Baki KWSP</text><text x="${width - pad.right}" y="18" text-anchor="end" font-size="12" fill="currentColor">Perbelanjaan tahunan selepas bersara</text>`;
    }

    function formatCompactRM(amount) {
        if (amount >= 1000000) return `RM${(amount / 1000000).toFixed(1)}J`;
        if (amount >= 1000) return `RM${(amount / 1000).toFixed(0)}k`;
        return `RM${Math.round(amount)}`;
    }
});