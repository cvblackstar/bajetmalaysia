document.addEventListener('DOMContentLoaded', () => {
    const calculateBtn = document.getElementById('calculateBtn');
    calculateBtn.addEventListener('click', calculatePelaburan);

    const inputs = document.querySelectorAll('#pelaburanForm input');
    inputs.forEach(input => input.addEventListener('input', calculatePelaburan));

    calculatePelaburan();
});

function calculatePelaburan() {
    const initialAmount = parseFloat(document.getElementById('initialAmount').value) || 0;
    const monthlyContribution = parseFloat(document.getElementById('monthlyContribution').value) || 0;
    const annualReturn = parseFloat(document.getElementById('annualReturn').value) || 0;
    const years = parseInt(document.getElementById('years').value) || 0;

    const monthlyRate = (annualReturn / 100) / 12;
    const totalMonths = years * 12;

    // Timeline for the chart: one point per year (year 0 = starting point).
    const timeline = [];
    for (let month = 0; month <= totalMonths; month++) {
        const fvPrincipal = initialAmount * Math.pow(1 + monthlyRate, month);
        const fvContributions = monthlyRate > 0
            ? monthlyContribution * ((Math.pow(1 + monthlyRate, month) - 1) / monthlyRate)
            : monthlyContribution * month;
        const value = fvPrincipal + fvContributions;
        const contributed = initialAmount + monthlyContribution * month;
        if (month % 12 === 0 || month === totalMonths) {
            timeline.push({ month, value, contributed });
        }
    }

    const final = timeline[timeline.length - 1] || { value: initialAmount, contributed: initialAmount };
    const finalValue = final.value;
    const totalContributed = final.contributed;
    const totalGrowth = Math.max(0, finalValue - totalContributed);

    const formatRM = window.BajetMY.formatCurrency;
    document.getElementById('resFinalValue').textContent = formatRM(finalValue);
    document.getElementById('resTotalContributed').textContent = formatRM(totalContributed);
    document.getElementById('resTotalGrowth').textContent = formatRM(totalGrowth);

    renderGrowthChart(timeline);
}

function formatCompactRM(amount) {
    if (amount >= 1000000) return `RM${(amount / 1000000).toFixed(1)}J`;
    if (amount >= 1000) return `RM${(amount / 1000).toFixed(0)}k`;
    return `RM${Math.round(amount)}`;
}

function renderGrowthChart(timeline) {
    const svg = document.getElementById('growthChart');
    const width = 900, height = 360;
    const pad = { left: 64, right: 24, top: 28, bottom: 48 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    const maxYear = timeline.length ? timeline[timeline.length - 1].month / 12 : 1;
    const maxValue = Math.max(1, ...timeline.map(p => p.value));

    const x = month => pad.left + (maxYear > 0 ? (month / 12 / maxYear) * plotW : 0);
    const y = value => pad.top + plotH - (value / maxValue) * plotH;

    const valuePoints = timeline.map(p => `${x(p.month).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
    const contribPoints = timeline.map(p => `${x(p.month).toFixed(1)},${y(p.contributed).toFixed(1)}`).join(' ');

    const grid = [0, 0.25, 0.5, 0.75, 1].map(r => {
        const yy = pad.top + plotH * (1 - r);
        return `<line x1="${pad.left}" y1="${yy}" x2="${width - pad.right}" y2="${yy}" stroke="currentColor" opacity="0.12"/><text x="${pad.left - 10}" y="${yy + 4}" text-anchor="end" font-size="11" fill="currentColor">${formatCompactRM(maxValue * r)}</text>`;
    }).join('');

    const xTicks = timeline
        .filter((p, i) => i === 0 || i === timeline.length - 1 || (p.month / 12) % Math.max(1, Math.round(maxYear / 5)) === 0)
        .map(p => `<text x="${x(p.month)}" y="${height - 18}" text-anchor="middle" font-size="11" fill="currentColor">Thn ${Math.round(p.month / 12)}</text>`)
        .join('');

    svg.innerHTML = `${grid}<polyline points="${contribPoints}" fill="none" stroke="#98a2b3" stroke-width="2" stroke-dasharray="7 5"/><polyline points="${valuePoints}" fill="none" stroke="#0f8b5f" stroke-width="3"/>${xTicks}`;
}
