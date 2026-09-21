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

        if (isNaN(age) || age < 14 || age > 100) {
            alert("Sila masukkan umur yang sah.");
            return;
        }


        /* =========================
           EPF / KWSP
           Effective October 2025
        ========================= */

        const epf = calculateEPF(
            grossSalary,
            age,
            status
        );


        /* =========================
           SOCSO / PERKESO
           Act 4 - Employee Share
        ========================= */

        const socso = calculateSOCSO(
            grossSalary,
            age
        );


        /* =========================
           EIS / SIP
           Act 800 - Employee Share
        ========================= */

        const eis = calculateEIS(
            grossSalary,
            age,
            eisApplicable
        );


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
           DISPLAY
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
         * Malaysian citizen below 60:
         * Employee 11%
         *
         * PR below 60:
         * Employee 11%
         *
         * Malaysian citizen age 60+:
         * Employee 0%
         *
         * PR age 60+:
         * Employee 5.5%
         *
         * Non-Malaysian:
         * Employee 2%
         */


        /* Non-Malaysian */
        if (status === "nonmalaysian") {

            return roundMoney(
                salary * 0.02
            );
        }


        /* Malaysian citizen */
        if (status === "malaysian") {

            if (age >= 60) {

                return calculateEPFSchedule(
                    salary,
                    0.04,
                    0
                );
            }

            return calculateEPFSchedule(
                salary,
                salary <= 5000 ? 0.13 : 0.12,
                0.11
            );
        }


        /* Permanent Resident */
        if (status === "pr") {

            if (age >= 60) {

                return calculateEPFSchedule(
                    salary,
                    salary <= 5000 ? 0.065 : 0.06,
                    0.055
                );
            }

            return calculateEPFSchedule(
                salary,
                salary <= 5000 ? 0.13 : 0.12,
                0.11
            );
        }


        return 0;
    }


    /*
     * Calculates employee EPF contribution
     * using the wage-band approach.
     *
     * For wages up to RM20,000:
     * the official schedule is used through
     * the upper boundary of the applicable band.
     *
     * Above RM20,000:
     * percentage calculation applies.
     */

    function calculateEPFSchedule(
        salary,
        employerRate,
        employeeRate
    ) {

        /* No contribution for extremely small wages */
        if (salary <= 10) {
            return 0;
        }


        /*
         * Above RM20,000:
         * official schedule permits percentage calculation.
         */

        if (salary > 20000) {

            const employee =
                salary * employeeRate;

            const employer =
                salary * employerRate;

            /*
             * EPF requires total contribution,
             * including sen, to be rounded upward.
             *
             * We derive the employee portion here
             * while keeping the employee calculation
             * consistent with the statutory rate.
             */

            const total =
                Math.ceil(
                    (employee + employer) * 100
                ) / 100;

            const roundedTotal =
                Math.ceil(total);

            return roundMoney(
                roundedTotal -
                employer
            );
        }


        /*
         * Wage bands:
         *
         * RM10.01 - RM20.00
         * then RM20 bands up to RM20,000.
         */

        let upperBand;

        if (salary <= 20) {

            upperBand = 20;

        } else {

            upperBand =
                Math.ceil(salary / 20) * 20;
        }


        /*
         * Special handling for wages
         * above RM20,000 is already done above.
         */

        let employeeContribution =
            Math.ceil(
                upperBand * employeeRate
            );


        /*
         * For Malaysian age 60+,
         * employee contribution is zero.
         */

        if (employeeRate === 0) {

            employeeContribution = 0;
        }


        return employeeContribution;
    }


    /* =====================================================
       SOCSO / PERKESO
       ===================================================== */

    function calculateSOCSO(
        salary,
        age
    ) {

        /*
         * Current calculator focuses on
         * Act 4 employee contribution.
         *
         * Wage ceiling:
         * RM6,000.
         */

        if (age >= 60) {

            /*
             * Second Category has no employee
             * contribution under the traditional
             * Act 4 employee share.
             */

            return 0;
        }


        if (salary <= 0) {
            return 0;
        }


        /*
         * PERKESO wage ceiling
         */

        const wage =
            Math.min(
                salary,
                6000
            );


        /*
         * Very low wages.
         * These bands are rarely relevant for
         * normal salaried employees, but we handle
         * them separately.
         */

        if (wage <= 100) {

            if (wage <= 30) {
                return 0.15;
            }

            if (wage <= 50) {
                return 0.25;
            }

            if (wage <= 70) {
                return 0.35;
            }

            return 0.50;
        }


        /*
         * PERKESO uses an assumed monthly wage
         * for each RM100 wage band.
         *
         * Example:
         *
         * RM4,900.01 - RM5,000.00
         *
         * Assumed wage = RM4,950
         *
         * Employee share = 0.5%
         * RM4,950 × 0.5% = RM24.75
         */

        const upperBand =
            Math.ceil(wage / 100) * 100;

        const lowerBand =
            upperBand - 100;

        const assumedWage =
            (upperBand + lowerBand) / 2;


        const employeeContribution =
            assumedWage * 0.005;


        return roundMoney(
            employeeContribution
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


        /*
         * EIS generally applies from age 18
         * until age 60, subject to eligibility
         * and statutory exceptions.
         */

        if (age < 18 || age > 60) {
            return 0;
        }


        /*
         * EIS wage ceiling:
         * RM6,000
         */

        const wage =
            Math.min(
                salary,
                6000
            );


        if (wage <= 30) {
            return 0;
        }


        /*
         * EIS uses assumed monthly wages.
         *
         * Example:
         *
         * RM4,900.01 - RM5,000
         *
         * Assumed wage = RM4,950
         *
         * Employee:
         * RM4,950 × 0.2% = RM9.90
         */

        const upperBand =
            Math.ceil(wage / 100) * 100;

        const lowerBand =
            upperBand - 100;

        const assumedWage =
            (upperBand + lowerBand) / 2;


        const employeeContribution =
            assumedWage * 0.002;


        return roundMoney(
            employeeContribution
        );
    }


    /* =====================================================
       MONEY FORMAT
       ===================================================== */

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


    /* =====================================================
       ROUNDING
       ===================================================== */

    function roundMoney(amount) {

        return Math.round(
            (amount + Number.EPSILON) * 100
        ) / 100;
    }

});
