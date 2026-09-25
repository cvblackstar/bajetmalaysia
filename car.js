document.addEventListener('DOMContentLoaded', () => {
    const calculateBtn = document.getElementById('calculateBtn');
    calculateBtn.addEventListener('click', calculateCarLoan);

    const inputs = document.querySelectorAll('#carForm input, #carForm select');
    inputs.forEach(input => {
        input.addEventListener('input', calculateCarLoan);
        input.addEventListener('change', calculateCarLoan);
    });

    calculateCarLoan();
});

function calculateCarLoan() {
    const carPrice = parseFloat(document.getElementById('carPrice').value) || 0;
    const downPayment = parseFloat(document.getElementById('downPayment').value) || 0;
    const annualInterestRate = parseFloat(document.getElementById('interestRate').value) || 0;
    const loanDurationYears = parseInt(document.getElementById('loanDuration').value) || 0;

    // 1. Kira jumlah pinjaman bersih
    const loanAmount = Math.max(0, carPrice - downPayment);

    // 2. Kira faedah mudah (Flat Rate)
    const totalInterest = loanAmount * (annualInterestRate / 100) * loanDurationYears;

    // 3. Jumlah keseluruhan perlu dibayar
    const totalPayment = loanAmount + totalInterest;

    // 4. Bayaran bulanan
    const totalMonths = loanDurationYears * 12;
    const monthlyPayment = totalMonths > 0 ? totalPayment / totalMonths : 0;

    // Paparkan hasil pada senarai ringkasan baharu
    document.getElementById('monthlyPayment').textContent = formatRM(monthlyPayment);
    document.getElementById('resCarPrice').textContent = formatRM(carPrice);
    document.getElementById('resDownPayment').textContent = formatRM(downPayment);
    document.getElementById('resTotalLoan').textContent = formatRM(loanAmount);
    document.getElementById('resTotalInterest').textContent = formatRM(totalInterest);
    document.getElementById('resTotalPayment').textContent = formatRM(totalPayment);
}

function formatRM(amount) {
    return window.BajetMY.formatCurrency(amount);
}
