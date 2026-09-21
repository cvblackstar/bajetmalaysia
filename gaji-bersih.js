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

        if (!grossSalary || !age) {
            alert("Sila masukkan gaji dan umur.");
            return;
        }

        /* Simple test calculation */

        const epf =
            Math.ceil(grossSalary * 0.11);

        const socso =
            Math.min(grossSalary, 6000) * 0.005;

        const eis =
            Math.min(grossSalary, 6000) * 0.002;

        const total =
            epf + socso + eis;

        const net =
            grossSalary - total;


        document.getElementById("resultGross").textContent =
            formatRM(grossSalary);

        document.getElementById("resultEpf").textContent =
            formatRM(epf);

        document.getElementById("resultSocso").textContent =
            formatRM(socso);

        document.getElementById("resultEis").textContent =
            formatRM(eis);

        document.getElementById("resultPcb").textContent =
            formatRM(0);

        document.getElementById("resultTotal").textContent =
            formatRM(total);

        document.getElementById("netSalary").textContent =
            formatRM(net);

    });


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
