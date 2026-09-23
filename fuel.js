const RON95_SUBSIDISED_PRICE = 1.99;
const BUDI95_MONTHLY_QUOTA_LITRES = 300;

const form = document.getElementById('fuelForm');
const distanceInput = document.getElementById('monthlyDistance');
const carAEfficiencyInput = document.getElementById('carAEfficiency');
const carBEfficiencyInput = document.getElementById('carBEfficiency');

const money = (value) => `RM ${value.toLocaleString('ms-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
})}`;

const litres = (value) => `${value.toLocaleString('ms-MY', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
})} L`;

function calculateCar(distance, efficiency) {
    const monthlyLitres = distance / efficiency;
    const monthlyCost = monthlyLitres * RON95_SUBSIDISED_PRICE;
    const annualCost = monthlyCost * 12;
    const costPer100Km = (100 / efficiency) * RON95_SUBSIDISED_PRICE;

    return { monthlyLitres, monthlyCost, annualCost, costPer100Km };
}

function updateCar(prefix, result) {
    document.getElementById(`${prefix}CostMonthly`).textContent = money(result.monthlyCost);
    document.getElementById(`${prefix}Litres`).textContent = litres(result.monthlyLitres);
    document.getElementById(`${prefix}Cost100`).textContent = money(result.costPer100Km);
    document.getElementById(`${prefix}CostAnnual`).textContent = money(result.annualCost);
}

function calculate() {
    const distance = Number(distanceInput.value);
    const carAEfficiency = Number(carAEfficiencyInput.value);
    const carBEfficiency = Number(carBEfficiencyInput.value);

    if (!Number.isFinite(distance) || distance <= 0 ||
        !Number.isFinite(carAEfficiency) || carAEfficiency <= 0 ||
        !Number.isFinite(carBEfficiency) || carBEfficiency <= 0) {
        return;
    }

    const carA = calculateCar(distance, carAEfficiency);
    const carB = calculateCar(distance, carBEfficiency);

    updateCar('carA', carA);
    updateCar('carB', carB);

    const annualSaving = Math.abs(carA.annualCost - carB.annualCost);
    const betterCar = carA.annualCost <= carB.annualCost ? 'Kereta A' : 'Kereta B';

    document.getElementById('annualSaving').textContent = money(annualSaving);
    document.getElementById('savingMessage').textContent =
        annualSaving < 0.01
            ? 'Kedua-dua kereta mempunyai kos minyak yang hampir sama.'
            : `${betterCar} menggunakan kos minyak lebih rendah untuk jarak yang sama.`;

    const quotaNotice = document.getElementById('quotaNotice');
    const overQuotaCars = [];

    if (carA.monthlyLitres > BUDI95_MONTHLY_QUOTA_LITRES) {
        overQuotaCars.push(`Kereta A: ${litres(carA.monthlyLitres)}`);
    }
    if (carB.monthlyLitres > BUDI95_MONTHLY_QUOTA_LITRES) {
        overQuotaCars.push(`Kereta B: ${litres(carB.monthlyLitres)}`);
    }

    if (overQuotaCars.length > 0) {
        quotaNotice.hidden = false;
        quotaNotice.innerHTML = `<strong>Perhatian tentang kuota</strong><p>Anggaran penggunaan melebihi 300 liter sebulan untuk ${overQuotaCars.join(' dan ')}. Kalkulator masih menggunakan RM1.99/liter untuk memudahkan perbandingan, tetapi kos sebenar anda boleh berbeza jika penggunaan melebihi kuota subsidi yang terpakai kepada anda.</p>`;
    } else {
        quotaNotice.hidden = true;
        quotaNotice.textContent = '';
    }
}

form.addEventListener('submit', (event) => {
    event.preventDefault();
    calculate();
});

[distanceInput, carAEfficiencyInput, carBEfficiencyInput].forEach((input) => {
    input.addEventListener('input', calculate);
});

calculate();
