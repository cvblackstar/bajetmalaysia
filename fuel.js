const RON95_SUBSIDISED_PRICE = 1.99;
const BUDI95_MONTHLY_QUOTA_LITRES = 300;

const form = document.getElementById('fuelForm');
const distanceInput = document.getElementById('monthlyDistance');
const carAEfficiencyInput = document.getElementById('carAEfficiency');
const carBEfficiencyInput = document.getElementById('carBEfficiency');
const savingPeriodInput = document.getElementById('savingPeriod');
const formError = document.getElementById('fuelFormError');
const chart = document.getElementById('fuelChart');

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

function showFormError(message) {
    formError.hidden = !message;
    formError.textContent = message || '';
}

function niceMaxDistance(distance) {
    const minimum = 2000;
    const rounded = Math.ceil(Math.max(distance, minimum) / 500) * 500;
    return Math.min(rounded, 10000);
}

function drawChart(carAEfficiency, carBEfficiency, currentDistance) {
    if (!chart) return;

    const width = 1100;
    const height = 420;
    const pad = { top: 30, right: 32, bottom: 64, left: 82 };
    const plotWidth = width - pad.left - pad.right;
    const plotHeight = height - pad.top - pad.bottom;
    const maxDistance = niceMaxDistance(currentDistance);
    const steps = 6;
    const points = Array.from({ length: steps + 1 }, (_, index) => (maxDistance / steps) * index);
    const values = points.flatMap((distance) => [
        calculateCar(distance, carAEfficiency).monthlyCost,
        calculateCar(distance, carBEfficiency).monthlyCost
    ]);
    const maxCost = Math.max(...values, 1);
    const yMax = Math.ceil(maxCost / 50) * 50 || 50;

    const x = (distance) => pad.left + (distance / maxDistance) * plotWidth;
    const y = (cost) => pad.top + plotHeight - (cost / yMax) * plotHeight;
    const pathFor = (efficiency) => points.map((distance, index) => {
        const cost = calculateCar(distance, efficiency).monthlyCost;
        return `${index === 0 ? 'M' : 'L'} ${x(distance).toFixed(1)} ${y(cost).toFixed(1)}`;
    }).join(' ');

    const formatAxisMoney = (value) => value >= 1000
        ? `RM ${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}K`
        : `RM ${Math.round(value)}`;

    const grid = [];
    for (let i = 0; i <= 4; i += 1) {
        const value = (yMax / 4) * i;
        const yy = y(value);
        grid.push(`<line x1="${pad.left}" y1="${yy}" x2="${width - pad.right}" y2="${yy}" class="chart-grid"/>`);
        grid.push(`<text x="${pad.left - 12}" y="${yy + 4}" text-anchor="end" class="chart-axis-label">${formatAxisMoney(value)}</text>`);
    }

    points.forEach((distance) => {
        const xx = x(distance);
        grid.push(`<line x1="${xx}" y1="${pad.top}" x2="${xx}" y2="${pad.top + plotHeight}" class="chart-grid chart-grid-vertical"/>`);
        grid.push(`<text x="${xx}" y="${height - 30}" text-anchor="middle" class="chart-axis-label">${Math.round(distance).toLocaleString('ms-MY')}</text>`);
    });

    const currentX = x(currentDistance);
    const currentCostA = calculateCar(currentDistance, carAEfficiency).monthlyCost;
    const currentCostB = calculateCar(currentDistance, carBEfficiency).monthlyCost;

    chart.innerHTML = `
        <title id="fuelChartTitle">Perbandingan kos RON95 mengikut jarak pemanduan</title>
        <desc id="fuelChartDesc">Kos minyak bulanan Kereta A dan Kereta B berdasarkan jarak pemanduan.</desc>
        <g>${grid.join('')}</g>
        <line x1="${currentX}" y1="${pad.top}" x2="${currentX}" y2="${pad.top + plotHeight}" class="chart-current-distance"/>
        <text x="${Math.min(currentX + 9, width - 105)}" y="${pad.top + 18}" class="chart-current-label">Jarak anda</text>
        <path d="${pathFor(carAEfficiency)}" class="chart-line chart-line-a"/>
        <path d="${pathFor(carBEfficiency)}" class="chart-line chart-line-b"/>
        <circle cx="${currentX}" cy="${y(currentCostA)}" r="6" class="chart-dot chart-dot-a"/>
        <circle cx="${currentX}" cy="${y(currentCostB)}" r="6" class="chart-dot chart-dot-b"/>
        <text x="${currentX}" y="${Math.max(pad.top + 32, y(currentCostA) - 12)}" text-anchor="middle" class="chart-value-label">${money(currentCostA)}</text>
        <text x="${currentX}" y="${Math.min(pad.top + plotHeight - 5, y(currentCostB) + 22)}" text-anchor="middle" class="chart-value-label">${money(currentCostB)}</text>
        <text x="${pad.left + plotWidth / 2}" y="${height - 4}" text-anchor="middle" class="chart-axis-title">Jarak pemanduan sebulan (km)</text>
        <text x="22" y="${pad.top + plotHeight / 2}" text-anchor="middle" transform="rotate(-90 22 ${pad.top + plotHeight / 2})" class="chart-axis-title">Kos minyak sebulan</text>
    `;
}

function calculate() {
    const distance = Number(distanceInput.value);
    const carAEfficiency = Number(carAEfficiencyInput.value);
    const carBEfficiency = Number(carBEfficiencyInput.value);
    const savingPeriod = Number(savingPeriodInput.value);

    if (!Number.isFinite(distance) || distance <= 0) {
        showFormError('Sila masukkan jarak pemanduan sebulan yang lebih daripada 0 km.');
        distanceInput.focus();
        return false;
    }
    if (!Number.isFinite(carAEfficiency) || carAEfficiency <= 0 || carAEfficiency > 100) {
        showFormError('Sila masukkan kecekapan Kereta A antara 1 hingga 100 km/L.');
        carAEfficiencyInput.focus();
        return false;
    }
    if (!Number.isFinite(carBEfficiency) || carBEfficiency <= 0 || carBEfficiency > 100) {
        showFormError('Sila masukkan kecekapan Kereta B antara 1 hingga 100 km/L.');
        carBEfficiencyInput.focus();
        return false;
    }
    if (!Number.isFinite(savingPeriod) || savingPeriod <= 0) {
        showFormError('Sila pilih tempoh penjimatan yang sah.');
        savingPeriodInput.focus();
        return false;
    }

    showFormError('');

    const carA = calculateCar(distance, carAEfficiency);
    const carB = calculateCar(distance, carBEfficiency);

    updateCar('carA', carA);
    updateCar('carB', carB);

    const annualSaving = Math.abs(carA.annualCost - carB.annualCost);
    const periodSaving = annualSaving * savingPeriod;
    const betterCar = carA.annualCost <= carB.annualCost ? 'Kereta A' : 'Kereta B';

    document.getElementById('savingLabel').textContent = `Penjimatan untuk ${savingPeriod} ${savingPeriod === 1 ? 'tahun' : 'tahun'}`;
    document.getElementById('annualSaving').textContent = money(periodSaving);
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

    drawChart(carAEfficiency, carBEfficiency, distance);
    return true;
}

form.addEventListener('submit', (event) => {
    event.preventDefault();
    calculate();
});

[distanceInput, carAEfficiencyInput, carBEfficiencyInput, savingPeriodInput].forEach((input) => {
    input.addEventListener('input', calculate);
    input.addEventListener('change', calculate);
});

calculate();
