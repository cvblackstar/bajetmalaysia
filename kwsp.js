document.addEventListener("DOMContentLoaded", function () {

    const calculateButton =
        document.getElementById("calculateKwspButton");

    calculateButton.addEventListener("click", function () {

        /*
         * ==========================================
         * INPUTS
         * ==========================================
         */

        const currentAge =
            parseInt(
                document.getElementById("currentAge").value
            );

        const retireAge =
            parseInt(
                document.getElementById("retireAge").value
            );

        const currentBalance =
            parseFloat(
                document.getElementById("currentBalance").value
            ) || 0;

        const grossSalaryStart =
            parseFloat(
                document.getElementById("grossSalary").value
            );

        const salaryIncrement =
            parseFloat(
                document.getElementById("salaryIncrement").value
            ) || 0;

        const voluntaryContribution =
            parseFloat(
                document.getElementById("voluntaryContribution").value
            ) || 0;

        const dividendRate =
            parseFloat(
                document.getElementById("dividendRate").value
            ) || 0;


        if (
            !currentAge || currentAge <= 0 ||
            !grossSalaryStart || grossSalaryStart <= 0
        ) {

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


        /*
         * ==========================================
         * PROJECTION
         * ==========================================
         *
         * NOTE: This is a simplified estimate. EPF
         * dividends are declared annually and applied
         * using a Modified Aggregate Daily Balance
         * method. Here, dividends are approximated once
         * per simulated year on the average balance
         * (opening balance + half of that year's
         * contributions), which is a reasonable estimate
         * for a "what if" projection but is NOT the
         * official EPF calculation.
         */

        const dividendDecimal =
            dividendRate / 100;

        const incrementDecimal =
            salaryIncrement / 100;

        let legacyBalance =
            currentBalance;

        let persaraanBalance = 0;
        let sejahteraBalance = 0;
        let fleksibelBalance = 0;

        let totalDividend = 0;

        let salary = grossSalaryStart;

        let firstMonth = null;


        for (
            let age = currentAge;
            age < retireAge;
            age++
        ) {

            /*
             * ------------------------------------------
             * Statutory rates for this age/salary
             * ------------------------------------------
             */

            let employeeRate;
            let employerRate;

            if (age < 60) {

                employeeRate = 0.11;

                employerRate =
                    salary <= 5000 ? 0.13 : 0.12;

            } else {

                employeeRate = 0;
                employerRate = 0.04;

            }

            const monthlyEmployee =
                salary * employeeRate;

            const monthlyEmployer =
                salary * employerRate;

            const monthlyMandatory =
                monthlyEmployee + monthlyEmployer;

            const monthlyTotal =
                monthlyMandatory + voluntaryContribution;


            if (firstMonth === null) {

                firstMonth = {
                    employee: monthlyEmployee,
                    employer: monthlyEmployer,
                    voluntary: voluntaryContribution,
                    total: monthlyTotal
                };

            }


            const annualContribution =
                monthlyTotal * 12;

            const persaraanContribution =
                annualContribution * 0.75;

            const sejahteraContribution =
                annualContribution * 0.15;

            const fleksibelContribution =
                annualContribution * 0.10;


            /*
             * ------------------------------------------
             * Dividend on average balance for the year
             * ------------------------------------------
             */

            const divLegacy =
                legacyBalance * dividendDecimal;

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
                divLegacy + divPersaraan + divSejahtera + divFleksibel;


            legacyBalance +=
                divLegacy;

            persaraanBalance +=
                persaraanContribution + divPersaraan;

            sejahteraBalance +=
                sejahteraContribution + divSejahtera;

            fleksibelBalance +=
                fleksibelContribution + divFleksibel;


            /*
             * ------------------------------------------
             * Salary growth for next year
             * ------------------------------------------
             */

            salary =
                salary * (1 + incrementDecimal);

        }


        const totalSavings =
            legacyBalance +
            persaraanBalance +
            sejahteraBalance +
            fleksibelBalance;


        /*
         * ==========================================
         * DISPLAY RESULTS
         * ==========================================
         */

        document.getElementById("kwspTotal").textContent =
            formatRM(totalSavings);

        document.getElementById("resultLegacy").textContent =
            formatRM(legacyBalance);

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
         * CONTRIBUTION NOTE
         * ==========================================
         */

        const noteEl =
            document.getElementById("contributionNote");

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
            " = " + formatRM(firstMonth.total) + " sebulan, dikira " +
            "berdasarkan jangkaan dividen " + dividendRate.toFixed(2) +
            "% setahun sepanjang " + (retireAge - currentAge) +
            " tahun akan datang.";

        noteEl.textContent = noteText;

    });


    /*
     * ==========================================
     * FORMAT RM
     * ==========================================
     */

    function formatRM(amount) {

        return new Intl.NumberFormat(
            "ms-MY",
            {
                style: "currency",
                currency: "MYR",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        ).format(amount);

    }

});
