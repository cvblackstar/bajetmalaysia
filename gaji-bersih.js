document.addEventListener("DOMContentLoaded", function () {

    const calculateButton =
        document.getElementById("calculateButton");

    calculateButton.addEventListener("click", function () {

        const grossSalary =
            parseFloat(
                document.getElementById("grossSalary").value
            );

        const age =
            parseInt(
                document.getElementById("age").value
            );

        const status =
            document.getElementById("status").value;

        const maritalStatus =
            document.getElementById("maritalStatus").value;

        const children =
            parseInt(
                document.getElementById("children").value
            ) || 0;

        const zakat =
            parseFloat(
                document.getElementById("zakat").value
            ) || 0;

        const bonus =
            parseFloat(
                document.getElementById("bonus").value
            ) || 0;

        const includeEis =
            document.getElementById("eisApplicable").checked;


        if (!grossSalary || grossSalary <= 0 || !age || age <= 0) {

            alert("Sila masukkan gaji dan umur yang sah.");

            return;
        }


        /*
         * ==========================================
         * KWSP / EPF
         * ==========================================
         */

        let epf = 0;

        if (status === "malaysian") {

            if (age < 60) {

                epf = grossSalary * 0.11;

            } else {

                epf = 0;

            }

        } else if (status === "pr") {

            if (age < 60) {

                epf = grossSalary * 0.11;

            } else {

                epf = grossSalary * 0.055;

            }

        } else if (status === "nonmalaysian") {

            epf = grossSalary * 0.02;

        }


        /*
         * ==========================================
         * SOCSO / PERKESO
         * ==========================================
         */

        let socso = 0;

        if (age < 60) {

            socso =
                Math.min(grossSalary, 6000) * 0.005;

        }


        /*
         * ==========================================
         * EIS / SIP
         * ==========================================
         */

        let eis = 0;

        if (
            includeEis &&
            age >= 18 &&
            age <= 60
        ) {

            eis =
                Math.min(grossSalary, 6000) * 0.002;

        }


        /*
         * ==========================================
         * PCB (ANGGARAN)
         * ==========================================
         */

        let pcb = calculatePCB(
            grossSalary,
            bonus,
            epf,
            socso,
            eis,
            maritalStatus,
            children,
            zakat
        );


        /*
         * ==========================================
         * JUMLAH POTONGAN
         * ==========================================
         */

        const total =
            epf +
            socso +
            eis +
            pcb;


        /*
         * ==========================================
         * GAJI BERSIH
         * ==========================================
         */

        const net =
            grossSalary - epf - socso - eis - pcb;


        /*
         * ==========================================
         * PAPAR KEPUTUSAN
         * ==========================================
         */

        document.getElementById("resultGross").textContent =
            formatRM(grossSalary);

        document.getElementById("resultEpf").textContent =
            formatRM(epf);

        document.getElementById("resultSocso").textContent =
            formatRM(socso);

        document.getElementById("resultEis").textContent =
            formatRM(eis);

        document.getElementById("resultPcb").textContent =
            formatRM(pcb);

        document.getElementById("resultTotal").textContent =
            formatRM(total);

        document.getElementById("netSalary").textContent =
            formatRM(net);

    });


    /*
     * ==========================================
     * PCB ESTIMATE
     * ==========================================
     */

    function calculatePCB(
        monthlySalary,
        bonus,
        monthlyEpf,
        monthlySocso,
        monthlyEis,
        maritalStatus,
        children,
        monthlyZakat
    ) {

        /*
         * Annual income
         */

        const annualSalary =
            monthlySalary * 12;

        const annualBonus =
            Math.max(bonus, 0);

        const annualIncome =
            annualSalary + annualBonus;


        /*
         * Personal relief
         */

        let relief =
            9000;


        /*
         * Spouse relief
         *
         * This calculator assumes:
         * marriedNonWorking = spouse has no income
         */

        if (
            maritalStatus === "marriedNotWorking"
        ) {

            relief += 4000;

        }


        /*
         * Child relief
         *
         * Basic estimate:
         * RM2,000 per child
         */

        relief +=
            Math.max(children, 0) * 2000;


        /*
         * EPF relief
         *
         * Estimated annual maximum RM4,000
         */

        const annualEpf =
            monthlyEpf * 12;

        relief +=
            Math.min(annualEpf, 4000);


        /*
         * SOCSO + EIS relief
         *
         * Estimated maximum RM350
         */

        const annualSocsoEis =
            (monthlySocso + monthlyEis) * 12;

        relief +=
            Math.min(annualSocsoEis, 350);


        /*
         * Chargeable income
         */

        const chargeableIncome =
            Math.max(
                0,
                annualIncome - relief
            );


        /*
         * ======================================
         * MALAYSIA INDIVIDUAL TAX ESTIMATE
         * ======================================
         */

        let tax = 0;


        if (chargeableIncome <= 5000) {

            tax = 0;

        } else if (chargeableIncome <= 20000) {

            tax =
                (chargeableIncome - 5000) * 0.01;

        } else if (chargeableIncome <= 35000) {

            tax =
                150 +
                (chargeableIncome - 20000) * 0.03;

        } else if (chargeableIncome <= 50000) {

            tax =
                600 +
                (chargeableIncome - 35000) * 0.06;

        } else if (chargeableIncome <= 70000) {

            tax =
                1500 +
                (chargeableIncome - 50000) * 0.11;

        } else if (chargeableIncome <= 100000) {

            tax =
                3700 +
                (chargeableIncome - 70000) * 0.19;

        } else if (chargeableIncome <= 400000) {

            tax =
                9400 +
                (chargeableIncome - 100000) * 0.25;

        } else if (chargeableIncome <= 600000) {

            tax =
                84400 +
                (chargeableIncome - 400000) * 0.26;

        } else if (chargeableIncome <= 2000000) {

            tax =
                136400 +
                (chargeableIncome - 600000) * 0.28;

        } else {

            tax =
                528400 +
                (chargeableIncome - 2000000) * 0.30;

        }


        /*
         * Individual rebate
         *
         * Basic estimate for lower chargeable income.
         */

        if (chargeableIncome <= 35000) {

            tax -= 400;

        }


        /*
         * Zakat rebate
         *
         * Zakat can reduce tax payable,
         * but cannot reduce it below zero.
         */

        const annualZakat =
            Math.max(monthlyZakat, 0) * 12;

        tax =
            Math.max(
                0,
                tax - annualZakat
            );


        /*
         * Convert annual estimate
         * into monthly PCB estimate.
         */

        let monthlyPCB =
            tax / 12;


        /*
         * PCB below RM10 is generally not deducted.
         */

        if (monthlyPCB < 10) {

            monthlyPCB = 0;

        }


        return monthlyPCB;

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
