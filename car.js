document.getElementById('calculateBtn').addEventListener('click', calculateCarLoan);

function calculateCarLoan() {
    const carPrice = parseFloat(document.getElementById('carPrice').value) || 0;
    const downPayment = parseFloat(document.getElementById('downPayment').value) || 0;
    const annualInterestRate = parseFloat(document.getElementById('interestRate').value) || 0;
    const loanDurationYears = parseInt(document.getElementById('loanDuration').value) || 0;

    // 1. Kira jumlah pinjaman bersih
    const loanAmount = Math.max(0, carPrice - downPayment);

    // 2. Kira faedah mudah (Islamic/Conventional Flat Rate biasanya guna faedah atas prinsipal asal)
    const totalInterest = loanAmount * (annualInterestRate / 100) * loanDurationYears;

    // 3. Jumlah keseluruhan perlu dibayar
    const totalPayment = loanAmount + totalInterest;

    // 4. Bayaran bulanan
    const totalMonths = loanDurationYears * 12;
    const monthlyPayment = totalMonths > 0 ? totalPayment / totalMonths : 0;

    // Paparkan hasil
    document.getElementById('monthlyPayment').textContent = `RM ${monthlyPayment.toFixed(2)}`;
    document.getElementById('totalLoan').textContent = `RM ${loanAmount.toFixed(2)}`;
    document.getElementById('totalInterest').textContent = `RM ${totalInterest.toFixed(2)}`;
    document.getElementById('totalPayment').textContent = `RM ${totalPayment.toFixed(2)}`;
}

// Jalankan pengiraan kali pertama apabila muka surat dibuka
window.onload = calculateCarLoan;
