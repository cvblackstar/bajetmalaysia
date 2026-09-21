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

        /*
         * IMPORTANT:
         * HTML kita menggunakan id "eisApplicable".
         */
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
         * PCB ANGARAN 2026
         * ==========================================
         */

        const pcb =
            calculatePCB2026(
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
            grossSalary -
            epf -
            socso -
            eis -
            pcb;


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
     * PCB 2026 - ANGGARAN
     * ==========================================
     *
     * Based on the structure of HASiL's
     * computerized PCB calculation.
     *
     * This is NOT an official payroll engine.
     */

    function calculatePCB2026(
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
         * ------------------------------------------
         * Annual remuneration
         * ------------------------------------------
         */

        const annualSalary =
            monthlySalary * 12;

        const annualBonus =
            Math.max(0, bonus);

        const annualGross =
            annualSalary + annualBonus;


        /*
         * ------------------------------------------
         * Individual relief
         * ------------------------------------------
         */

        let relief =
            9000;


        /*
         * ------------------------------------------
         * Spouse relief
         * ------------------------------------------
         */

        if (
            maritalStatus === "marriedNotWorking"
        ) {

            relief += 4000;

        }


        /*
         * ------------------------------------------
         * Child relief
         * ------------------------------------------
         *
         * Basic assumption:
         * all children entered are eligible
         * for RM2,000 each.
         */

        const childCount =
            Math.max(0, children);

        relief +=
            childCount * 2000;


        /*
         * ------------------------------------------
         * EPF relief
         * ------------------------------------------
         *
         * Employee EPF contribution eligible
         * for this simplified calculation is
         * capped at RM4,000 annually.
         */

        const annualEpf =
            monthlyEpf * 12;

        const epfRelief =
            Math.min(
                annualEpf,
                4000
            );

        relief += epfRelief;


        /*
         * ------------------------------------------
         * PERKESO relief
         * ------------------------------------------
         *
         * HASiL lists PERKESO contribution relief
         * at a maximum of RM350.
         */

        const annualSocso =
            monthlySocso * 12;

        const socsoRelief =
            Math.min(
                annualSocso,
                350
            );

        relief += socsoRelief;


        /*
         * ------------------------------------------
         * Chargeable income
         * ------------------------------------------
         */

        const chargeableIncome =
            Math.max(
                0,
                annualGross - relief
            );


        /*
         * ------------------------------------------
         * Income tax calculation
         * ------------------------------------------
         *
         * Progressive resident individual
         * tax rates.
         */

        let tax = 0;


        if (chargeableIncome <= 5000) {

            tax = 0;

        } else if (chargeableIncome <= 20000) {

            tax =
                (chargeableIncome - 5000) *
                0.01;

        } else if (chargeableIncome <= 35000) {

            tax =
                150 +
                (chargeableIncome - 20000) *
                0.03;

        } else if (chargeableIncome <= 50000) {

            tax =
                600 +
                (chargeableIncome - 35000) *
                0.06;

        } else if (chargeableIncome <= 70000) {

            tax =
                1500 +
                (chargeableIncome - 50000) *
                0.11;

        } else if (chargeableIncome <= 100000) {

            tax =
                3700 +
                (chargeableIncome - 70000) *
                0.19;

        } else if (chargeableIncome <= 400000) {

            tax =
                9400 +
                (chargeableIncome - 100000) *
                0.25;

        } else if (chargeableIncome <= 600000) {

            tax =
                84400 +
                (chargeableIncome - 400000) *
                0.26;

        } else if (chargeableIncome <= 2000000) {

            tax =
                136400 +
                (chargeableIncome - 600000) *
                0.28;

        } else {

            tax =
                528400 +
                (chargeableIncome - 2000000) *
                0.30;

        }


        /*
         * ------------------------------------------
         * Individual / spouse rebate
         * ------------------------------------------
         *
         * Basic estimate:
         *
         * Individual rebate RM400 if chargeable
         * income <= RM35,000.
         *
         * Additional spouse rebate may apply
         * where spouse has no income.
         */

        if (chargeableIncome <= 35000) {

            tax -= 400;


            if (
                maritalStatus ===
                "marriedNotWorking"
            ) {

                tax -= 400;

            }

        }


        /*
         * ------------------------------------------
         * Zakat rebate
         * ------------------------------------------
         */

        const annualZakat =
            Math.max(
                0,
                monthlyZakat
            ) * 12;


        tax =
            Math.max(
                0,
                tax - annualZakat
            );


        /*
         * ------------------------------------------
         * Monthly estimate
         * ------------------------------------------
         */

        let monthlyPCB =
            tax / 12;


        /*
         * Round to sen
         */

        monthlyPCB =
            Math.round(
                monthlyPCB * 100
            ) / 100;


        /*
         * PCB below RM10
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
