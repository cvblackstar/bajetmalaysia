document.getElementById('calculateBtn').addEventListener('click', calculateEmergencyFund);

function calculateEmergencyFund() {
    const essentialExp = parseFloat(document.getElementById('essentialExp').value) || 0;
    const debtCommitment = parseFloat(document.getElementById('debtCommitment').value) || 0;
    const currentSavings = parseFloat(document.getElementById('currentSavings').value) || 0;
    const employmentType = document.getElementById('employmentType').value;
    const dependents = parseInt(document.getElementById('dependents').value) || 0;
    const monthlySaveCapacity = parseFloat(document.getElementById('monthlySaveCapacity').value) || 0;

    // Jumlah komitmen bulanan
    const totalMonthly = essentialExp + debtCommitment;

    // Tentukan bulan disyorkan berdasarkan profil risiko
    let recommendedMonths = 6;
    let riskReason = "";

    if (employmentType === 'stable' && dependents === 0) {
        recommendedMonths = 3;
        riskReason = "Anda mempunyai pekerjaan yang stabil (kerajaan/syarikat besar) dan tiada tanggungan, jadi 3 bulan sudah memadai sebagai asas permulaan.";
    } else if (employmentType === 'freelance' || dependents >= 2) {
        recommendedMonths = 9;
        riskReason = "Oleh kerana profil pendapatan tidak menentu (freelance/bisnes) atau mempunyai tanggungan keluarga yang ramai, sasaran 9 hingga 12 bulan lebih disyorkan untuk keselamatan jangka panjang.";
    } else {
        recommendedMonths = 6;
        riskReason = "Pekerjaan swasta biasa dan tanggungan sederhana menjadikan 6 bulan sebagai standard emas keselamatan kewangan di Malaysia.";
    }

    // Kira sasaran nilai wang
    const target3M = totalMonthly * 3;
    const targetRec = totalMonthly * recommendedMonths;
    const targetMax = totalMonthly * 12;
/*
         * ==========================================
         * EMERGENCY FUND PROGRESS BAR UPDATE
         * ==========================================
         */
        const emergencyCurrent = parseFloat(document.getElementById("currentSavingsInput").value) || 0;
        const monthlyExpenses = parseFloat(document.getElementById("monthlyExpensesInput").value) || 0;
        const targetMonths = 6; // e.g., 6 months of expenses
        const emergencyTarget = monthlyExpenses * targetMonths;

        // Calculate percentage (cap at 100% for the bar width)
        let emergencyPercent = emergencyTarget > 0 ? (emergencyCurrent / emergencyTarget) * 100 : 0;
        if (emergencyPercent > 100) emergencyPercent = 100;

        // Update DOM elements
        document.getElementById("emergencyBar").style.width = emergencyPercent + "%";
        document.getElementById("emergencyCurrentLabel").innerText = "Terkumpul: RM " + emergencyCurrent.toLocaleString();
        document.getElementById("emergencyTargetLabel").innerText = "Sasaran (" + targetMonths + " Bulan): RM " + emergencyTarget.toLocaleString();
    
    // Shortfall berdasarkan sasaran disyorkan
    const shortfall = Math.max(0, targetRec - currentSavings);

    // Kira peratusan pencapaian berbanding sasaran disyorkan
    let percentage = targetRec > 0 ? (currentSavings / targetRec) * 100 : 0;
    if (percentage > 100) percentage = 100;

    // Kira tempoh masa capai sasaran (dalam bulan)
    let timeText = "";
    if (shortfall === 0) {
        timeText = "🎉 Tahniah! Tabung kecemasan anda telah mencapai atau melebihi sasaran disyorkan.";
    } else if (monthlySaveCapacity <= 0) {
        timeText = `Kekurangan anda ialah <strong>RM ${shortfall.toFixed(2)}</strong>. Sila masukkan kemampuan menabung bulanan untuk melihat anggaran tempoh.`;
    } else {
        const monthsNeeded = Math.ceil(shortfall / monthlySaveCapacity);
        const years = Math.floor(monthsNeeded / 12);
        const remMonths = monthsNeeded % 12;
        
        let durationStr = "";
        if (years > 0) durationStr += `${years} tahun `;
        if (remMonths > 0 || years === 0) durationStr += `${remMonths} bulan`;

        timeText = `Kekurangan sebanyak <strong>RM ${shortfall.toFixed(2)}</strong> akan dapat diselesaikan dalam masa kira-kira <strong>${durationStr}</strong> jika anda menabung RM ${monthlySaveCapacity.toFixed(2)} sebulan.`;
    }

    // Paparkan hasil ke UI
    document.getElementById('totalMonthlyCommitment').textContent = `RM ${totalMonthly.toFixed(2)}`;
    document.getElementById('target3M').textContent = `RM ${target3M.toFixed(2)}`;
    document.getElementById('recommendedMonths').textContent = recommendedMonths;
    document.getElementById('targetRec').textContent = `RM ${targetRec.toFixed(2)}`;
    document.getElementById('targetMax').textContent = `RM ${targetMax.toFixed(2)}`;
    document.getElementById('shortfallAmount').textContent = shortfall > 0 ? `RM ${shortfall.toFixed(2)}` : "RM 0.00 (Sasaran Tercapai!)";
    
    document.getElementById('progressText').textContent = `${percentage.toFixed(0)}%`;
    document.getElementById('progressBar').style.width = `${percentage}%`;
    document.getElementById('timeToGoalText').innerHTML = timeText;
    document.getElementById('riskProfileReason').textContent = riskReason;
}

// Jalankan pengiraan automatik semasa muat halaman
window.onload = calculateEmergencyFund;
