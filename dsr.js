document.addEventListener("DOMContentLoaded", function () {

    const calculateButton =
        document.getElementById("calculateDsrButton");

    const formError =
        document.getElementById("dsrFormError");

    function showFormError(message) {
        if (!formError) return;
        formError.hidden = !message;
        formError.textContent = message || "";
    }

    calculateButton.addEventListener("click", calculateDsr);

    document.querySelectorAll(
        ".calculator-form-card input"
    ).forEach(function (input) {

        input.addEventListener("input", calculateDsr);
        input.addEventListener("change", calculateDsr);

    });

    function calculateDsr() {

        /*
         * ==========================================
         * INCOME
         * ==========================================
         */

        const grossIncome =
            parseFloat(
                document.getElementById("grossIncome").value
            ) || 0;

        const otherIncome =
            parseFloat(
                document.getElementById("otherIncome").value
            ) || 0;


        if (!grossIncome || grossIncome <= 0) {

            showFormError("Sila masukkan gaji kasar bulanan yang sah.");

            return;
        }

        showFormError("");


        const totalIncome =
            grossIncome + otherIncome;


        /*
         * ==========================================
         * EXISTING COMMITMENTS
         * ==========================================
         */

        const homeLoan =
            parseFloat(
                document.getElementById("homeLoan").value
            ) || 0;

        const carLoan =
            parseFloat(
                document.getElementById("carLoan").value
            ) || 0;

        const personalLoan =
            parseFloat(
                document.getElementById("personalLoan").value
            ) || 0;

        const creditCard =
            parseFloat(
                document.getElementById("creditCard").value
            ) || 0;

        const ptptn =
            parseFloat(
                document.getElementById("ptptn").value
            ) || 0;

        const otherCommitment =
            parseFloat(
                document.getElementById("otherCommitment").value
            ) || 0;


        const existingCommitment =
            homeLoan +
            carLoan +
            personalLoan +
            creditCard +
            ptptn +
            otherCommitment;


        /*
         * ==========================================
         * NEW LOAN (OPTIONAL)
         * ==========================================
         */

        const newLoan =
            parseFloat(
                document.getElementById("newLoan").value
            ) || 0;


        /*
         * ==========================================
         * TOTAL COMMITMENT & DSR
         * ==========================================
         */

        const totalCommitment =
            existingCommitment + newLoan;

        const dsr =
            (totalCommitment / totalIncome) * 100;


        /*
         * ==========================================
         * REMAINING CAPACITY AT 70% CEILING
         * ==========================================
         */

        const dsrCeiling = 70;

        const maxCommitmentAtCeiling =
            totalIncome * (dsrCeiling / 100);

        const remainingCapacity =
            maxCommitmentAtCeiling - totalCommitment;


        /*
         * ==========================================
         * DISPLAY RESULTS
         * ==========================================
         */

        document.getElementById("resultIncome").textContent =
            formatRM(totalIncome);

        document.getElementById("resultExisting").textContent =
            formatRM(existingCommitment);

        document.getElementById("resultNewLoan").textContent =
            formatRM(newLoan);

        document.getElementById("resultTotalCommitment").textContent =
            formatRM(totalCommitment);

        document.getElementById("dsrPercentage").textContent =
            dsr.toFixed(1) + "%";


        /*
         * ==========================================
         * DSR STATUS / BADGE
         * ==========================================
         */

        const badge =
            document.getElementById("dsrBadge");

        let statusClass = "good";
        let statusLabel = "Sangat Baik";

        if (dsr <= 30) {

            statusClass = "good";
            statusLabel = "Sangat Baik";

        } else if (dsr <= 60) {

            statusClass = "moderate";
            statusLabel = "Sederhana";

        } else if (dsr <= 70) {

            statusClass = "high";
            statusLabel = "Tinggi";

        } else {

            statusClass = "veryhigh";
            statusLabel = "Sangat Tinggi";

        }

        badge.textContent = statusLabel;
        badge.className = "dsr-badge " + statusClass;


        /*
         * ==========================================
         * GAUGE MARKER
         * ==========================================
         */

        const clampedDsr =
            Math.max(0, Math.min(dsr, 100));

        document.getElementById("dsrMarker").style.left =
            clampedDsr + "%";


        /*
         * ==========================================
         * REMAINING CAPACITY NOTE
         * ==========================================
         */

        const capacityTitle =
            document.getElementById("dsrCapacityTitle");

        const capacityNote =
            document.getElementById("dsrCapacityNote");

        if (remainingCapacity >= 0) {

            capacityTitle.textContent =
                "Ruang komitmen berbaki";

            capacityNote.textContent =
                "Untuk kekal di bawah DSR " + dsrCeiling + "%, jumlah " +
                "komitmen bulanan anda tidak sepatutnya melebihi " +
                formatRM(maxCommitmentAtCeiling) + ". Anda masih ada " +
                "ruang lebih kurang " + formatRM(remainingCapacity) +
                " sebulan untuk komitmen baharu.";

        } else {

            capacityTitle.textContent =
                "Komitmen melebihi paras DSR " + dsrCeiling + "%";

            capacityNote.textContent =
                "Jumlah komitmen bulanan anda melebihi had DSR " +
                dsrCeiling + "% yang biasa digunakan bank sebanyak " +
                formatRM(Math.abs(remainingCapacity)) + ". Peluang " +
                "kelulusan pinjaman baharu mungkin lebih rendah.";

        }

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
