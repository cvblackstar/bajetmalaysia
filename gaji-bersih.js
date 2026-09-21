document.addEventListener("DOMContentLoaded", function () {

    const calculateButton =
        document.getElementById("calculateButton");

    calculateButton.addEventListener(
        "click",
        calculateSalary
    );


    function calculateSalary() {

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

        const month =
            parseInt(
                document.getElementById("month").value
            );

        const bonus =
            parseFloat(
                document.getElementById("bonus").value
            ) || 0;

        const eisApplicable =
            document.getElementById(
                "eisApplicable"
            ).checked;


        /* =========================
           VALIDATION
        ========================= */

        if (
            isNaN(grossSalary) ||
            grossSalary <= 0
        ) {
            alert(
                "Sila masukkan gaji kasar yang sah."
            );
            return;
        }

        if (
            isNaN(age) ||
            age < 14 ||
            age > 100
        ) {
            alert(
                "Sila masukkan umur yang sah."
            );
            return;
        }


        /* =========================
           STATUTORY CONTRIBUTIONS
        ========================= */

        const epf =
            calculateEPF(
                grossSalary,
                age,
                status
            );

        const socso =
            calculateSOCSO(
                grossSalary,
                age
            );

        const eis =
            calculateEIS(
                grossSalary,
                age,
                eisApplicable
            );


        /* =========================
           PCB ESTIMATE
        ========================= */

        const pcb =
            calculatePBCEstimate({
                salary: grossSalary,
                bonus: bonus,
                age: age,
                status: status,
                maritalStatus: maritalStatus,
                children: children,
                zakat: zakat,
                month: month,
                epf: epf
            });


        /* =========================
           TOTAL
        ========================= */

        const totalDeductions =
            epf +
            socso +
            eis +
            pcb;


        const netSalary =
            grossSalary +
            bonus -
            totalDeductions;


        /* =========================
           DISPLAY
        ========================= */

        document.getElementById(
            "resultGross"
        ).textContent =
            formatRM(
                grossSalary + bonus
            );

        document.getElementById(
            "resultEpf"
        ).textContent =
            formatRM(epf);

        document.getElementById(
            "resultSocso"
        ).textContent =
            formatRM(socso);

        document.getElementById(
            "resultEis"
        ).textContent =
            formatRM(eis);

        document.getElementById(
            "resultPcb"
        ).textContent =
            formatRM(pcb);

        document.getElementById(
            "resultTotal"
        ).textContent =
            formatRM(totalDeductions);

        document.getElementById(
            "netSalary"
        ).textContent =
            formatRM(netSalary);


        const pcbNote =
            document.getElementById(
                "pcbNote"
            );

        pcbNote.textContent =
            "PCB yang dipaparkan ialah anggaran berdasarkan " +
            "pendapatan tahunan yang diunjurkan. Jumlah PCB " +
            "sebenar majikan boleh berbeza kerana HASiL " +
            "menggunakan rekod saraan dan caruman terkumpul " +
            "serta keadaan cukai individu.";
    }


    /* =====================================================
       EPF / KWSP
       ===================================================== */

    function calculateEPF(
        salary,
        age,
        status
    ) {

        /*
         * Current statutory employee rates:
         *
         * Malaysian below 60: 11%
         * Malaysian 60+: 0%
         * PR below 60: 11%
         * PR 60+: 5.5%
         * Certain non-Malaysian members: 2%
         *
         * NOTE:
         * Official EPF contributions use wage ranges
         * and statutory rounding. This calculator therefore
         * treats the result as an estimate.
         */

        if (status === "nonmalaysian") {

            return roundMoney(
                salary * 0.02
            );
        }


        if (status === "malaysian") {

            if (age >= 60) {
                return 0;
            }

            return estimateEPF(
                salary,
                0.11
            );
        }


        if (status === "pr") {

            if (age >= 60) {

                return estimateEPF(
                    salary,
                    0.055
                );
            }

            return estimateEPF(
                salary,
                0.11
            );
        }


        return 0;
    }


    function estimateEPF(
        salary,
        rate
    ) {

        /*
         * For common salaries this gives the expected
         * employee contribution very closely.
         *
         * The official schedule should be used for
         * payroll-level precision.
         */

        if (salary <= 0) {
            return 0;
        }

        if (salary > 20000) {

            return roundMoney(
                salary * rate
            );
        }


        return Math.ceil(
            salary * rate
        );
    }


    /* =====================================================
       SOCSO / PERKESO
       ===================================================== */

    function calculateSOCSO(
        salary,
        age
    ) {

        if (age >= 60) {
            return 0;
        }

        if (salary <= 0) {
            return 0;
        }


        /*
         * PERKESO wage ceiling:
         * RM6,000
         */

        const wage =
            Math.min(
                salary,
                6000
            );


        /*
         * Simplified statutory wage-band estimate.
         */

        if (wage <= 30) {
            return 0.15;
        }

        if (wage <= 50) {
            return 0.25;
        }

        if (wage <= 70) {
            return 0.35;
        }

        if (wage <= 100) {
            return 0.50;
        }


        const upperBand =
            Math.ceil(
                wage / 100
            ) * 100;

        const lowerBand =
            upperBand - 100;

        const assumedWage =
            (
                upperBand +
                lowerBand
            ) / 2;


        return roundMoney(
            assumedWage * 0.005
        );
    }


    /* =====================================================
       EIS / SIP
       ===================================================== */

    function calculateEIS(
        salary,
        age,
        applicable
    ) {

        if (!applicable) {
            return 0;
        }

        if (
            age < 18 ||
            age > 60
        ) {
            return 0;
        }


        const wage =
            Math.min(
                salary,
                6000
            );


        if (wage <= 30) {
            return 0;
        }


        const upperBand =
            Math.ceil(
                wage / 100
            ) * 100;

        const lowerBand =
            upperBand - 100;

        const assumedWage =
            (
                upperBand +
                lowerBand
            ) / 2;


        return roundMoney(
            assumedWage * 0.002
        );
    }


    /* =====================================================
       PCB ESTIMATE
       ===================================================== */

    function calculatePBCEstimate(data) {

        const salary =
            data.salary;

        const bonus =
            data.bonus;

        const age =
            data.age;

        const status =
            data.status;

        const maritalStatus =
            data.maritalStatus;

        const children =
            Math.max(
                0,
                data.children
            );

        const monthlyZakat =
            Math.max(
                0,
                data.zakat
            );


        /*
         * Annual employment income.
         */

        const annualSalary =
            salary * 12;

        const annualBonus =
            bonus;

        const annualGross =
            annualSalary +
            annualBonus;


        /*
         * EPF annual contribution.
         *
         * Tax relief for compulsory EPF is capped
         * within the relevant statutory relief.
         *
         * For this estimate we use RM4,000 as the
         * EPF component.
         */

        const annualEPF =
            Math.min(
                data.epf * 12,
                4000
            );


        /*
         * Individual relief.
         */

        let relief =
            9000;


        /*
         * Spouse relief.
         *
         * Only spouse without income receives
         * the RM4,000 basic spouse relief.
         */

        if (
            maritalStatus ===
            "marriedNotWorking"
        ) {

            relief += 4000;
        }


        /*
         * Child relief.
         *
         * Basic estimate:
         * RM2,000 per qualifying child.
         */

        relief +=
            children * 2000;


        /*
         * EPF relief.
         */

        relief +=
            annualEPF;


        /*
         * SOCSO/EIS relief.
         *
         * Current relief is capped at RM350.
         */

        relief += 350;


        /*
         * Estimated chargeable income.
         */

        let chargeableIncome =
            annualGross -
            relief;


        if (
            chargeableIncome < 0
        ) {
            chargeableIncome = 0;
        }


        /*
         * Calculate annual income tax.
         */

        let annualTax =
            calculateIncomeTax(
                chargeableIncome
            );


        /*
         * Individual rebate.
         *
         * Basic RM400 rebate when
         * chargeable income does not
         * exceed RM35,000.
         */

        if (
            chargeableIncome <= 35000
        ) {

            annualTax =
                Math.max(
                    0,
                    annualTax - 400
                );


            /*
             * Spouse rebate when spouse has
             * no income and conditions apply.
             */

            if (
                maritalStatus ===
                "marriedNotWorking"
            ) {

                annualTax =
                    Math.max(
                        0,
                        annualTax - 400
                    );
            }
        }


        /*
         * Zakat is a tax rebate.
         */

        const annualZakat =
            monthlyZakat * 12;


        annualTax =
            Math.max(
                0,
                annualTax -
                annualZakat
            );


        /*
         * Convert annual estimated tax
         * into a monthly estimate.
         *
         * This is NOT the exact HASiL
         * cumulative PCB formula.
         */

        let monthlyPCB =
            annualTax / 12;


        /*
         * PCB below RM10 is generally not
         * collected for the month.
         */

        if (
            monthlyPCB < 10
        ) {

            monthlyPCB = 0;
        }


        return roundMoney(
            monthlyPCB
        );
    }


    /* =====================================================
       MALAYSIA RESIDENT TAX RATES
       ===================================================== */

    function calculateIncomeTax(
        chargeableIncome
    ) {

        let tax = 0;


        /*
         * RM0 - RM5,000
         * 0%
         */

        if (
            chargeableIncome <= 5000
        ) {

            return 0;
        }


        /*
         * RM5,001 - RM20,000
         * 1%
         */

        tax +=
            Math.min(
                Math.max(
                    chargeableIncome - 5000,
                    0
                ),
                15000
            ) * 0.01;


        /*
         * RM20,001 - RM35,000
         * 3%
         */

        if (
            chargeableIncome > 20000
        ) {

            tax +=
                Math.min(
                    chargeableIncome - 20000,
                    15000
                ) * 0.03;
        }


        /*
         * RM35,001 - RM50,000
         * 6%
         */

        if (
            chargeableIncome > 35000
        ) {

            tax +=
                Math.min(
                    chargeableIncome - 35000,
                    15000
                ) * 0.06;
        }


        /*
         * RM50,001 - RM70,000
         * 11%
         */

        if (
            chargeableIncome > 50000
        ) {

            tax +=
                Math.min(
                    chargeableIncome - 50000,
                    20000
                ) * 0.11;
        }


        /*
         * RM70,001 - RM100,000
         * 19%
         */

        if (
            chargeableIncome > 70000
        ) {

            tax +=
                Math.min(
                    chargeableIncome - 70000,
                    30000
                ) * 0.19;
        }


        /*
         * RM100,001 - RM400,000
         * 25%
         */

        if (
            chargeableIncome > 100000
        ) {

            tax +=
                Math.min(
                    chargeableIncome - 100000,
                    300000
                ) * 0.25;
        }


        /*
         * RM400,001 - RM600,000
         * 26%
         */

        if (
            chargeableIncome > 400000
        ) {

            tax +=
                Math.min(
                    chargeableIncome - 400000,
                    200000
                ) * 0.26;
        }


        /*
         * RM600,001 - RM2,000,000
         * 28%
         */

        if (
            chargeableIncome > 600000
        ) {

            tax +=
                Math.min(
                    chargeableIncome - 600000,
                    1400000
                ) * 0.28;
        }


        /*
         * Above RM2 million
         * 30%
         */

        if (
            chargeableIncome > 2000000
        ) {

            tax +=
                (
                    chargeableIncome -
                    2000000
                ) * 0.30;
        }


        return tax;
    }


    /* =====================================================
       FORMAT MONEY
       ===================================================== */

    function formatRM(
        amount
    ) {

        return new Intl.NumberFormat(
            "ms-MY",
            {
                style: "currency",
                currency: "MYR",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        ).format(
            amount
        );
    }

});
