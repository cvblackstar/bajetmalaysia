document.addEventListener('DOMContentLoaded', () => {
    const calculateBtn = document.getElementById('calculateBtn');
    
    // Auto-adjust employer rate suggestion based on salary input changes
    const salaryInput = document.getElementById('monthlySalary');
    const employerSelect = document.getElementById('employerRate');

    salaryInput.addEventListener('input', () => {
        const salary = parseFloat(salaryInput.value) || 0;
        if (salary <= 5000) {
            employerSelect.value = "13";
        } else {
            employerSelect.value = "12";
        }
    });

    calculateBtn.addEventListener('click', calculateKWSP);

    // Run once on load for default values
    calculateKWSP();
});

function calculateKWSP() {
    const currentAge = parseInt(document.getElementById('currentAge').value) || 25;
    const retirementAge = 55; // Standard full withdrawal age
    const yearsToRetire = Math.max(0, retirementAge - currentAge);

    const monthlySalary = parseFloat(document.getElementById('monthlySalary').value) || 0;
    const employeeRatePct = parseFloat(document.getElementById('employeeRate').value) || 0;
    const employerRatePct = parseFloat(document.getElementById('employerRate').value) || 0;
    
    const initialAkaun1 = parseFloat(document.getElementById('existingAkaun1').value) || 0;
    const initialAkaun2 = parseFloat(document.getElementById('existingAkaun2').value) || 0;
    const annualDividendRate = (parseFloat(document.getElementById('dividendRate').value) || 5.5) / 100;

    // Monthly contribution amounts
    const employeeMonthly = monthlySalary * (employeeRatePct / 100);
    const employerMonthly = monthlySalary * (employerRatePct / 100);
    const totalMonthlyContribution = employeeMonthly + employerMonthly;

    // Standard KWSP split for new contributions: 70% Account 1, 30% Account 2
    let balanceAkaun1 = initialAkaun1;
    let balanceAkaun2 = initialAkaun2;
    let totalDividendsEarned = 0;

    // Compound simulation year-by-year
    for (let y = 0; y < yearsToRetire; y++) {
        // Add yearly contributions split 70/30
        const annualContribution = totalMonthlyContribution * 12;
        const annualAkaun1Contrib = annualContribution * 0.70;
        const annualAkaun2Contrib = annualContribution * 0.30;

        balanceAkaun1 += annualAkaun1Contrib;
        balanceAkaun2 += annualAkaun2Contrib;

        // Calculate dividends for the year based on accumulated balance
        const dividendAkaun1 = balanceAkaun1 * annualDividendRate;
        const dividendAkaun2 = balanceAkaun2 * annualDividendRate;

        balanceAkaun1 += dividendAkaun1;
        balanceAkaun2 += dividendAkaun2;

        totalDividendsEarned += (dividendAkaun1 + dividendAkaun2);
    }

    const totalProjected = balanceAkaun1 + balanceAkaun2;

    // Format currency helper
    const formatRM = (num) => {
        return 'RM ' + num.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Update DOM fields
    document.getElementById('totalProjectedSavings').textContent = formatRM(totalProjected);
    document.getElementById('resYears').textContent = `${yearsToRetire} Tahun (Sehingga Umur 55)`;
    document.getElementById('resMonthlyContribution').textContent = formatRM(totalMonthlyContribution);
    document.getElementById('resAkaun1').textContent = formatRM(balanceAkaun1);
    document.getElementById('resAkaun2').textContent = formatRM(balanceAkaun2);
    document.getElementById('resTotalDividends').textContent = formatRM(totalDividendsEarned);
}
