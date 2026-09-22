document.addEventListener('DOMContentLoaded', () => {
    const calculateBtn = document.getElementById('calculateBtn');
    calculateBtn.addEventListener('click', calculateHousingLoan);

    // Auto calculate on input change for real-time responsiveness
    const inputs = document.querySelectorAll('#housingForm input');
    inputs.forEach(input => {
        input.addEventListener('input', calculateHousingLoan);
    });

    // Run once on load
    calculateHousingLoan();
});

function calculateHousingLoan() {
    const homePrice = parseFloat(document.getElementById('homePrice').value) || 0;
    const downPaymentPct = parseFloat(document.getElementById('downPaymentPct').value) || 0;
    const annualInterestRate = parseFloat(document.getElementById('interestRate').value) || 0;
    const loanDurationYears = parseInt(document.getElementById('loanDuration').value) || 30;

    // Calculations
    const downPaymentAmount = homePrice * (downPaymentPct / 100);
    const loanAmount = Math.max(0, homePrice - downPaymentAmount);

    const monthlyInterestRate = (annualInterestRate / 100) / 12;
    const totalMonths = loanDurationYears * 12;

    let monthlyInstallment = 0;

    if (monthlyInterestRate > 0 && totalMonths > 0) {
        // Standard amortization formula: M = P [ i(1 + i)^n ] / [ (1 + i)^n – 1]
        const x = Math.pow(1 + monthlyInterestRate, totalMonths);
        monthlyInstallment = loanAmount * (monthlyInterestRate * x) / (x - 1);
    } else if (totalMonths > 0) {
        monthlyInstallment = loanAmount / totalMonths;
    }

    const totalPayment = monthlyInstallment * totalMonths;
    const totalInterest = Math.max(0, totalPayment - loanAmount);

    // Format currency helper
    const formatRM = (num) => {
        return new Intl.NumberFormat(
            "ms-MY",
            {
                style: "currency",
                currency: "MYR",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        ).format(num);
    };

    // Update DOM elements
    document.getElementById('monthlyInstallment').textContent = formatRM(monthlyInstallment);
    document.getElementById('resHomePrice').textContent = formatRM(homePrice);
    document.getElementById('resDownPayment').textContent = formatRM(downPaymentAmount);
    document.getElementById('resLoanAmount').textContent = formatRM(loanAmount);
    document.getElementById('resTotalInterest').textContent = formatRM(totalInterest);
    document.getElementById('resTotalPayment').textContent = formatRM(totalPayment);
}
