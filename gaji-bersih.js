document.addEventListener("DOMContentLoaded", function () {

    const calculateButton = document.getElementById("calculateButton");

    calculateButton.addEventListener("click", calculateSalary);


    function calculateSalary() {

        const grossSalary = parseFloat(
            document.getElementById("grossSalary").value
        );

        const age = parseInt(
            document.getElementById("age").value
        );

        const status = document.getElementById("status").value;

        const eisApplicable =
            document.getElementById("eisApplicable").checked;


        /* =========================
           VALIDATION
        ========================= */

        if (isNaN(grossSalary) || grossSalary <= 0) {
            alert("Sila masukkan gaji kasar yang sah.");
            return;
        }

        if (isNaN(age) || age < 15 || age > 100) {
            alert("Sila masukkan umur yang sah.");
            return;
        }


        /* =========================
           EPF / KWSP
        ========================= */

        let epfRate = 0;

        if (status === "malaysian") {

            if (age < 60) {
                epfRate = 0.11;
            } else {
                epfRate = 0;
            }

        } else if (status === "pr") {

            if (age < 60) {
                epfRate = 0.11;
            } else {
                epfRate = 0.055;
            }

        } else if (status === "nonmalaysian") {

            epfRate = 0.02;
        }


        let epf = grossSalary * epfRate;


        /*
         * EPF contribution is based on the official contribution
         * schedule rather than simply multiplying salary by a rate.
         *
         * This first version uses a percentage estimate.
         */

        epf = roundMoney(epf);


        /* =========================
           SOCSO / PERKESO
        ========================= */

        let socso = 0;

        if (age < 60) {

            /*
             * First Category contribution.
             * Employee share is approximately 0.5%.
             */

            socso = Math.min(grossSalary, 6000) * 0.005;

        } else {

            /*
             * Generally no employee share for Second Category.
             */

            socso = 0;
        }

        socso = roundMoney(socso);


        /* =========================
           EIS / SIP
        ========================= */

        let eis = 0;

        if (
            eisApplicable &&
            age >= 18 &&
            age <= 60
        ) {

            eis = Math.min(grossSalary, 6000) * 0.002;
        }

        eis = roundMoney(eis);


        /* =========================
           TOTAL DEDUCTIONS
        ========================= */

        const totalDeductions =
            epf +
            socso +
            eis;


        /* =========================
           NET SALARY
        ========================= */

        const netSalary =
            grossSalary -
            totalDeductions;


        /* =========================
           EFFECTIVE DEDUCTION
        ========================= */

        const deductionPercentage =
            (totalDeductions / grossSalary) * 100;


        /* =========================
           DISPLAY RESULTS
        ========================= */

        document.getElementById("resultGross").textContent =
            formatRM(grossSalary);

        document.getElementById("resultEpf").textContent =
            formatRM(epf);

        document.getElementById("resultSocso").textContent =
            formatRM(socso);

        document.getElementById("resultEis").textContent =
            formatRM(eis);

        document.getElementById("resultTotal").textContent =
            formatRM(totalDeductions);

        document.getElementById("netSalary").textContent =
            formatRM(netSalary);


        console.log(
            "Anggaran potongan:",
            deductionPercentage.toFixed(2) + "%"
        );
    }


    /* =========================
       MONEY FORMAT
    ========================= */

    function formatRM(amount) {

        return new Intl.NumberFormat("ms-MY", {
            style: "currency",
            currency: "MYR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }


    /* =========================
       ROUND MONEY
    ========================= */

    function roundMoney(amount) {

        return Math.round(
            (amount + Number.EPSILON) * 100
        ) / 100;
    }

});
