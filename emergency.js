document.addEventListener("DOMContentLoaded", function () {

    const calculateButton =
        document.getElementById("calculateEmergencyButton");

    calculateButton.addEventListener("click", calculateEmergencyFund);

    document.querySelectorAll(
        ".calculator-form-card input, .calculator-form-card select"
    ).forEach(function (input) {

        input.addEventListener("input", calculateEmergencyFund);
        input.addEventListener("change", calculateEmergencyFund);

    });


    /*
     * Run once on load so the pre-filled example values
     * show a result immediately, same as the defaults
     * already sitting in the form.
     */
    calculateEmergencyFund();


    function calculateEmergencyFund() {

        /*
         * ==========================================
         * INPUTS
         * ==========================================
         */

        const essentialExp =
            parseFloat(
                document.getElementById("essentialExp").value
            ) || 0;

        const debtCommitment =
            parseFloat(
                document.getElementById("debtCommitment").value
            ) || 0;

        const currentSavings =
            parseFloat(
                document.getElementById("currentSavings").value
            ) || 0;

        const employmentType =
            document.getElementById("employmentType").value;

        const dependents =
            parseInt(
                document.getElementById("dependents").value
            ) || 0;

        const monthlySaveCapacity =
            parseFloat(
                document.getElementById("monthlySaveCapacity").value
            ) || 0;


        const totalMonthly =
            essentialExp + debtCommitment;


        /*
         * ==========================================
         * RECOMMENDED MONTHS BY RISK PROFILE
         * ==========================================
         */

        let recommendedMonths = 6;
        let riskReason = "";

        if (employmentType === "stable" && dependents === 0) {

            recommendedMonths = 3;

            riskReason =
                "Anda mempunyai pekerjaan yang stabil (kerajaan/syarikat " +
                "besar) dan tiada tanggungan, jadi 3 bulan sudah memadai " +
                "sebagai asas permulaan.";

        } else if (employmentType === "freelance" || dependents >= 2) {

            recommendedMonths = 9;

            riskReason =
                "Oleh kerana profil pendapatan tidak menentu " +
                "(freelance/bisnes) atau mempunyai tanggungan keluarga " +
                "yang ramai, sasaran 9 hingga 12 bulan lebih disyorkan " +
                "untuk keselamatan jangka panjang.";

        } else {

            recommendedMonths = 6;

            riskReason =
                "Pekerjaan swasta biasa dan tanggungan sederhana " +
                "menjadikan 6 bulan sebagai standard emas keselamatan " +
                "kewangan di Malaysia.";

        }


        /*
         * ==========================================
         * TARGETS
         * ==========================================
         */

        const target3M =
            totalMonthly * 3;

        const targetRec =
            totalMonthly * recommendedMonths;

        const targetMax =
            totalMonthly * 12;

        const shortfall =
            Math.max(0, targetRec - currentSavings);

        let percentage =
            targetRec > 0 ?
                (currentSavings / targetRec) * 100 :
                0;

        percentage =
            Math.max(0, Math.min(100, percentage));


        /*
         * ==========================================
         * TIME TO GOAL
         * ==========================================
         */

        let timeText = "";

        if (shortfall === 0) {

            timeText =
                "Tahniah! Tabung kecemasan anda telah mencapai atau " +
                "melebihi sasaran disyorkan.";

        } else if (monthlySaveCapacity <= 0) {

            timeText =
                "Kekurangan anda ialah " + formatRM(shortfall) + ". " +
                "Sila masukkan kemampuan menabung bulanan untuk melihat " +
                "anggaran tempoh.";

        } else {

            const monthsNeeded =
                Math.ceil(shortfall / monthlySaveCapacity);

            const years =
                Math.floor(monthsNeeded / 12);

            const remMonths =
                monthsNeeded % 12;

            let durationStr = "";

            if (years > 0) {

                durationStr += years + " tahun ";

            }

            if (remMonths > 0 || years === 0) {

                durationStr += remMonths + " bulan";

            }

            timeText =
                "Kekurangan sebanyak " + formatRM(shortfall) + " akan " +
                "dapat diselesaikan dalam masa kira-kira " + durationStr +
                " jika anda menabung " + formatRM(monthlySaveCapacity) +
                " sebulan.";

        }


        /*
         * ==========================================
         * DISPLAY RESULTS
         * ==========================================
         */

        document.getElementById("totalMonthlyCommitment").textContent =
            formatRM(totalMonthly);

        document.getElementById("target3M").textContent =
            formatRM(target3M);

        document.getElementById("recommendedMonths").textContent =
            recommendedMonths;

        document.getElementById("targetRec").textContent =
            formatRM(targetRec);

        document.getElementById("targetMax").textContent =
            formatRM(targetMax);

        document.getElementById("shortfallAmount").textContent =
            shortfall > 0 ?
                formatRM(shortfall) :
                formatRM(0) + " (sasaran tercapai)";

        document.getElementById("progressText").textContent =
            percentage.toFixed(0) + "%";

        document.getElementById("progressBar").style.width =
            percentage + "%";

        document.getElementById("timeToGoalText").textContent =
            timeText;

        document.getElementById("riskProfileReason").textContent =
            riskReason;

    }


    /*
     * ==========================================
     * FORMAT RM
     * ==========================================
     */

    function formatRM(amount) {
        return window.BajetMY.formatCurrency(amount);
    }

});
