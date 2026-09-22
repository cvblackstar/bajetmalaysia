document.addEventListener("DOMContentLoaded", function () {

    const calculateButton = document.getElementById("calculateKwspButton");
    const balanceModeInputs = document.querySelectorAll('input[name="balanceMode"]');
    const totalBalanceGroup = document.getElementById("totalBalanceGroup");
    const individualBalanceGroup = document.getElementById("individualBalanceGroup");
    const individualBalanceInputs = [
        document.getElementById("currentPersaraan"),
        document.getElementById("currentSejahtera"),
        document.getElementById("currentFleksibel")
    ];
    const individualBalanceTotal = document.getElementById("individualBalanceTotal");

    function getBalanceMode() {
        const selected = document.querySelector('input[name="balanceMode"]:checked');
        return selected ? selected.value : "total";
    }

    function getIndividualBalances() {
        return {
            persaraan: parseFloat(document.getElementById("currentPersaraan").value) || 0,
            sejahtera: parseFloat(document.getElementById("currentSejahtera").value) || 0,
            fleksibel: parseFloat(document.getElementById("currentFleksibel").value) || 0
        };
    }

    function updateBalanceInputMode() {
        const mode = getBalanceMode();
        const individualMode = mode === "individual";

        totalBalanceGroup.hidden = individualMode;
        individualBalanceGroup.hidden = !individualMode;

        if (individualMode) {
            updateIndividualBalanceTotal();
        }
    }

    function updateIndividualBalanceTotal() {
        const balances = getIndividualBalances();
        const total = balances.persaraan + balances.sejahtera + balances.fleksibel;
        individualBalanceTotal.textContent = formatRM(total);
    }

    balanceModeInputs.forEach(function (input) {
        input.addEventListener("change", updateBalanceInputMode);
    });

    individualBalanceInputs.forEach(function (input) {
        input.addEventListener("input", updateIndividualBalanceTotal);
    });

    updateBalanceInputMode();

    calculateButton.addEventListener("click", function () {

        /*
         * ==========================================
         * INPUTS
         * ==========================================
         */

        const currentAge = parseInt(document.getElementById("currentAge").value);
        const retireAge = parseInt(document.getElementById("retireAge").value);
        const balanceMode = getBalanceMode();

        const currentBalance = parseFloat(document.getElementById("currentBalance").value) || 0;
        const individualBalances = getIndividualBalances();

        const grossSalaryStart = parseFloat(document.getElementById("grossSalary").value);
        const salaryIncrement = parseFloat(document.getElementById("salaryIncrement").value) || 0;
        const voluntaryContribution = parseFloat(document.getElementById("voluntaryContribution").value) || 0;
        const dividendRate = parseFloat(document.getElementById("dividendRate").value) || 0;

        if (!currentAge || currentAge <= 0 || !grossSalaryStart || grossSalaryStart <= 0) {
            alert("Sila masukkan umur dan gaji kasar bulanan yang sah.");
            return;
        }

        if (retireAge <= currentAge) {
            alert(
                "Umur ingin bersara mestilah lebih besar daripada " +
                "umur semasa."
            );
            return;
        }

        if (balanceMode === "total" && currentBalance < 0) {
            alert("Baki KWSP semasa tidak boleh negatif.");
            return;
        }

        if (
            balanceMode === "individual" &&
            (individualBalances.persaraan < 0 ||
                individualBalances.sejahtera < 0 ||
                individualBalances.fleksibel < 0)
        ) {
            alert("Baki setiap akaun KWSP tidak boleh negatif.");
            return;
        }

        /*
         * ==========================================
         * STARTING BALANCES
         * ==========================================
         *
         * Total mode:
         *   The existing total balance is distributed
         *   according to the current 75/15/10 allocation.
         *
         * Individual mode:
         *   The actual current balance entered for each
         *   account is preserved. This is useful when a
         *   member has previously withdrawn money from
         *   Account Sejahtera or Account Fleksibel.
         */

        let persaraanBalance;
        let sejahteraBalance;
        let fleksibelBalance;

        if (balanceMode === "individual") {
            persaraanBalance = individualBalances.persaraan;
            sejahteraBalance = individualBalances.sejahtera;
            fleksibelBalance = individualBalances.fleksibel;
        } else {
            persaraanBalance = currentBalance * 0.75;
            sejahteraBalance = currentBalance * 0.15;
            fleksibelBalance = currentBalance * 0.10;
        }

        const startingTotal =
            persaraanBalance + sejahteraBalance + fleksibelBalance;

        /*
         * ==========================================
         * PROJECTION
         * ==========================================
         *
         * This is a simplified estimate. EPF dividends
         * are declared annually and applied using the
         * Modified Aggregate Daily Balance method. Here,
         * dividends are approximated once per simulated
         * year on the average balance (opening balance +
         * half of that year's contributions). This is a
         * reasonable estimate for a "what if" projection
         * but is NOT the official EPF calculation.
         */

        const dividendDecimal = dividendRate / 100;
        const incrementDecimal = salaryIncrement / 100;

        let totalDividend = 0;
        let salary = grossSalaryStart;
        let firstMonth = null;

        for (let age = currentAge; age < retireAge; age++) {

            /* Statutory rates for this age/salary */
            let employeeRate;
            let employerRate;

            if (age < 60) {
                employeeRate = 0.11;
                employerRate = salary <= 5000 ? 0.13 : 0.12;
            } else {
                employeeRate = 0;
                employerRate = 0.04;
            }

            const monthlyEmployee = salary * employeeRate;
            const monthlyEmployer = salary * employerRate;
            const monthlyMandatory = monthlyEmployee + monthlyEmployer;
            const monthlyTotal = monthlyMandatory + voluntaryContribution;

            if (firstMonth === null) {
                firstMonth = {
                    employee: monthlyEmployee,
                    employer: monthlyEmployer,
                    voluntary: voluntaryContribution,
                    total: monthlyTotal
                };
            }

            const annualContribution = monthlyTotal * 12;
            const persaraanContribution = annualContribution * 0.75;
            const sejahteraContribution = annualContribution * 0.15;
            const fleksibelContribution = annualContribution * 0.10;

            /* Dividend on average balance for the year */
            const divPersaraan =
                (persaraanBalance + persaraanContribution / 2) *
                dividendDecimal;

            const divSejahtera =
                (sejahteraBalance + sejahteraContribution / 2) *
                dividendDecimal;

            const divFleksibel =
                (fleksibelBalance + fleksibelContribution / 2) *
                dividendDecimal;

            totalDividend +=
                divPersaraan + divSejahtera + divFleksibel;

            persaraanBalance += persaraanContribution + divPersaraan;
            sejahteraBalance += sejahteraContribution + divSejahtera;
            fleksibelBalance += fleksibelContribution + divFleksibel;

            salary = salary * (1 + incrementDecimal);
        }

        const totalSavings =
            persaraanBalance + sejahteraBalance + fleksibelBalance;

        const projectedGrowth = totalSavings - startingTotal;
        const projectedContributions =
            projectedGrowth - totalDividend;

        /*
         * ==========================================
         * DISPLAY RESULTS
         * ==========================================
         */

        document.getElementById("kwspTotal").textContent = formatRM(totalSavings);

        // Kept for compatibility with the existing result layout.
        // This now means the projected value of the current balance,
        // including its share of dividends, rather than a separate
        // legacy pot outside the three accounts.
        const projectedExistingBalance =
            startingTotal * Math.pow(1 + dividendDecimal, retireAge - currentAge);

        document.getElementById("resultLegacy").textContent =
            formatRM(projectedExistingBalance);

        document.getElementById("resultPersaraan").textContent =
            formatRM(persaraanBalance);

        document.getElementById("resultSejahtera").textContent =
            formatRM(sejahteraBalance);

        document.getElementById("resultFleksibel").textContent =
            formatRM(fleksibelBalance);

        document.getElementById("resultDividend").textContent =
            formatRM(totalDividend);

        document.getElementById("resultTotal").textContent =
            formatRM(totalSavings);

        /*
         * ==========================================
         * BALANCE NOTE
         * ==========================================
         */

        const balanceNoteEl = document.getElementById("balanceNote");

        if (balanceMode === "individual") {
            balanceNoteEl.textContent =
                "Unjuran bermula daripada baki sebenar yang dimasukkan: " +
                formatRM(startingTotal) +
                ". Ini membolehkan perbezaan akibat pengeluaran terdahulu " +
                "daripada akaun tertentu diambil kira.";
        } else {
            balanceNoteEl.textContent =
                "Baki keseluruhan " +
                formatRM(startingTotal) +
                " diagihkan secara anggaran kepada Akaun Persaraan 75%, " +
                "Akaun Sejahtera 15% dan Akaun Fleksibel 10%. Jika anda " +
                "pernah membuat pengeluaran, gunakan kaedah 'Baki setiap akaun' " +
                "untuk unjuran yang lebih tepat.";
        }

        /*
         * ==========================================
         * CONTRIBUTION NOTE
         * ==========================================
         */

        const noteEl = document.getElementById("contributionNote");

        let noteText =
            "Anggaran caruman bulanan pertama: " +
            formatRM(firstMonth.employee) + " (pekerja) + " +
            formatRM(firstMonth.employer) + " (majikan)";

        if (firstMonth.voluntary > 0) {
            noteText +=
                " + " + formatRM(firstMonth.voluntary) +
                " (caruman tambahan)";
        }

        noteText +=
            " = " + formatRM(firstMonth.total) +
            " sebulan, dikira berdasarkan jangkaan dividen " +
            dividendRate.toFixed(2) +
            "% setahun sepanjang " + (retireAge - currentAge) +
            " tahun akan datang.";

        noteEl.textContent = noteText;

        // Prevent an unused-variable warning if the value is useful during
        // future UI enhancements while keeping the current display unchanged.
        void projectedContributions;
    });

    function formatRM(amount) {
        return new Intl.NumberFormat("ms-MY", {
            style: "currency",
            currency: "MYR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

});
