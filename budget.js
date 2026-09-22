document.addEventListener("DOMContentLoaded", function () {

    const calculateButton =
        document.getElementById("calculateBudgetButton");

    calculateButton.addEventListener("click", calculateBudget);


    /*
     * Live update as the person types, in addition to the
     * button, since adjusting several fields to compare
     * scenarios is the main way this page gets used.
     */

    const netSalaryInput =
        document.getElementById("bud_netSalary");

    netSalaryInput.addEventListener("input", calculateBudget);

    document.querySelectorAll(".bud-input").forEach(function (input) {

        input.addEventListener("input", calculateBudget);

    });


    /*
     * Restore any previously saved budget for this device,
     * then calculate once so the page never shows stale
     * RM0.00 placeholders.
     */

    loadSavedBudget();
    calculateBudget();


    function calculateBudget() {

        /*
         * ==========================================
         * INPUTS
         * ==========================================
         */

        const netSalary =
            parseFloat(netSalaryInput.value) || 0;

        const needsInputs =
            document.querySelectorAll(".bud-input.needs");

        const wantsInputs =
            document.querySelectorAll(".bud-input.wants");

        const savingsInputs =
            document.querySelectorAll(".bud-input.savings");

        let totalNeeds = 0;
        let totalWants = 0;
        let totalSavings = 0;

        const budgetData = {
            netSalary: netSalary,
            items: {}
        };

        needsInputs.forEach(function (input) {

            const val = parseFloat(input.value) || 0;

            totalNeeds += val;
            budgetData.items[input.dataset.category] = val;

        });

        wantsInputs.forEach(function (input) {

            const val = parseFloat(input.value) || 0;

            totalWants += val;
            budgetData.items[input.dataset.category] = val;

        });

        savingsInputs.forEach(function (input) {

            const val = parseFloat(input.value) || 0;

            totalSavings += val;
            budgetData.items[input.dataset.category] = val;

        });


        const totalExpenses =
            totalNeeds + totalWants + totalSavings;

        const remaining =
            netSalary - totalExpenses;


        /*
         * ==========================================
         * SAVE TO THIS DEVICE
         * ==========================================
         */

        try {

            localStorage.setItem(
                "bajetMalaysia_monthlyBudget",
                JSON.stringify(budgetData)
            );

        } catch (e) {

            /*
             * Storage can fail (private browsing, quota,
             * disabled storage). Not saving locally should
             * never break the calculator itself.
             */

        }


        /*
         * ==========================================
         * DISPLAY TOTALS
         * ==========================================
         */

        document.getElementById("bud_totalExpenses").textContent =
            formatRM(totalExpenses);

        const remainingEl =
            document.getElementById("bud_remaining");

        remainingEl.textContent =
            formatRM(remaining);

        remainingEl.style.color =
            remaining >= 0 ? "var(--green)" : "#c0392b";


        /*
         * ==========================================
         * PERCENTAGES (of net salary)
         * ==========================================
         */

        const safeSalary =
            netSalary > 0 ? netSalary : 1;

        const pctNeeds =
            Math.round((totalNeeds / safeSalary) * 100);

        const pctWants =
            Math.round((totalWants / safeSalary) * 100);

        const pctSavings =
            Math.round((totalSavings / safeSalary) * 100);

        document.getElementById("bud_pctNeeds").textContent =
            pctNeeds + "%";

        document.getElementById("bud_pctWants").textContent =
            pctWants + "%";

        document.getElementById("bud_pctSavings").textContent =
            pctSavings + "%";


        /*
         * ==========================================
         * SEGMENTED BAR (stacked to 100%)
         * ==========================================
         */

        const needsWidth =
            Math.min(100, Math.max(0, pctNeeds));

        const wantsWidth =
            Math.min(100 - needsWidth, Math.max(0, pctWants));

        const savingsWidth =
            Math.min(
                100 - needsWidth - wantsWidth,
                Math.max(0, pctSavings)
            );

        const surplusWidth =
            Math.max(
                0,
                100 - needsWidth - wantsWidth - savingsWidth
            );

        document.getElementById("budBarNeeds").style.width =
            needsWidth + "%";

        document.getElementById("budBarWants").style.width =
            wantsWidth + "%";

        document.getElementById("budBarSavings").style.width =
            savingsWidth + "%";

        document.getElementById("budBarSurplus").style.width =
            surplusWidth + "%";


        /*
         * ==========================================
         * INSIGHT
         * ==========================================
         */

        const insightEl =
            document.getElementById("bud_insight");

        let insightText = "";

        if (netSalary === 0) {

            insightText =
                "Sila masukkan jumlah gaji bersih anda.";

        } else if (totalExpenses > netSalary) {

            insightText =
                "Amaran: perbelanjaan anda melebihi pendapatan " +
                "sebanyak " + formatRM(Math.abs(remaining)) + " " +
                "sebulan. Cuba kurangkan komitmen di bahagian " +
                "kehendak atau cari alternatif penjimatan.";

        } else if (pctNeeds > 60) {

            insightText =
                "Komitmen keperluan anda mengambil " + pctNeeds +
                "% daripada pendapatan (lebih tinggi daripada " +
                "rujukan 50%). Masalah utama biasanya terletak " +
                "pada bebanan rumah atau kenderaan yang tinggi.";

        } else if (pctSavings < 15) {

            insightText =
                "Simpanan anda berada pada paras " + pctSavings +
                "%. Cuba tingkatkan sedikit tabungan bulanan " +
                "secara konsisten untuk membina dana kecemasan " +
                "yang stabil.";

        } else {

            insightText =
                "Corak belanjawan anda seimbang dan sihat. " +
                "Teruskan disiplin kewangan ini.";

        }

        insightEl.textContent = insightText;

    }


    /*
     * ==========================================
     * RESTORE SAVED BUDGET
     * ==========================================
     */

    function loadSavedBudget() {

        let savedData;

        try {

            savedData =
                localStorage.getItem("bajetMalaysia_monthlyBudget");

        } catch (e) {

            return;

        }

        if (!savedData) {

            return;

        }

        try {

            const parsed = JSON.parse(savedData);

            if (parsed.netSalary) {

                netSalaryInput.value = parsed.netSalary;

            }

            if (parsed.items) {

                Object.keys(parsed.items).forEach(function (key) {

                    const input =
                        document.querySelector(
                            '[data-category="' + key + '"]'
                        );

                    if (input) {

                        input.value = parsed.items[key];

                    }

                });

            }

        } catch (e) {

            console.error(
                "Gagal memuatkan data belanjawan tersimpan", e
            );

        }

    }


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
