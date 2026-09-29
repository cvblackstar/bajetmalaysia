const MAX_MONTHS = 600;
const money = value => window.BajetMY.formatCurrency(value);

function simulate(balance, annualRate, payment) {
    const r = annualRate / 100 / 12;
    let bal = balance;
    let interest = 0;
    let months = 0;
    const points = [{ month: 0, balance: bal }];
    while (bal > 0.005 && months < MAX_MONTHS) {
        const i = bal * r;
        interest += i;
        bal += i;
        bal -= Math.min(bal, payment);
        months++;
        points.push({ month: months, balance: bal });
    }
    return { months, interest, points, finished: bal <= 0.005 };
}

function formatDuration(months) {
    const y = Math.floor(months / 12);
    const m = months % 12;
    const parts = [];
    if (y) parts.push(`${y} tahun`);
    if (m || !y) parts.push(`${m} bulan`);
    return parts.join(" ");
}

function payoffDate(months) {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toLocaleDateString("ms-MY", { month: "long", year: "numeric" });
}

function formatCompactRM(amount) {
    if (amount >= 1000000) return `RM${(amount / 1000000).toFixed(1)}J`;
    if (amount >= 1000) return `RM${(amount / 1000).toFixed(0)}k`;
    return `RM${Math.round(amount)}`;
}

function renderChart(base, extra) {
    const svg = document.getElementById("debtChart");
    const width = 900, height = 360;
    const pad = { left: 64, right: 24, top: 28, bottom: 48 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const maxMonth = Math.max(1, base.months);
    const maxValue = Math.max(1, base.points[0].balance);
    const x = m => pad.left + (m / maxMonth) * plotW;
    const y = v => pad.top + plotH - (v / maxValue) * plotH;
    const line = pts => pts.map(p => `${x(p.month).toFixed(1)},${y(p.balance).toFixed(1)}`).join(" ");

    const grid = [0, 0.25, 0.5, 0.75, 1].map(f => {
        const yy = pad.top + plotH * (1 - f);
        return `<line x1="${pad.left}" y1="${yy}" x2="${width - pad.right}" y2="${yy}" stroke="currentColor" opacity="0.12"/><text x="${pad.left - 10}" y="${yy + 4}" text-anchor="end" font-size="11" fill="currentColor">${formatCompactRM(maxValue * f)}</text>`;
    }).join("");

    const step = maxMonth <= 24 ? 6 : maxMonth <= 72 ? 12 : maxMonth <= 180 ? 24 : 60;
    let ticks = "";
    for (let m = 0; m <= maxMonth; m += step) {
        ticks += `<text x="${x(m)}" y="${height - 18}" text-anchor="middle" font-size="11" fill="currentColor">${m === 0 ? "Kini" : (m % 12 === 0 ? `Thn ${m / 12}` : `Bln ${m}`)}</text>`;
    }

    const extraLine = extra ? `<polyline points="${line(extra.points)}" fill="none" stroke="#0f8b5f" stroke-width="3"/>` : "";
    svg.innerHTML = `${grid}<polyline points="${line(base.points)}" fill="none" stroke="#98a2b3" stroke-width="2" stroke-dasharray="7 5"/>${extraLine}${ticks}`;
    document.getElementById("legendExtra").hidden = !extra;
}

function showError(message) {
    const el = document.getElementById("debtError");
    el.hidden = !message;
    el.textContent = message || "";
    document.getElementById("debtResults").hidden = !!message;
}

function setText(id, value) {
    document.getElementById(id).textContent = value;
}

function calculateDebt() {
    const balance = Number(document.getElementById("debtBalance").value);
    const rate = Number(document.getElementById("interestRate").value);
    const payment = Number(document.getElementById("monthlyPayment").value);
    const extraPay = Math.max(0, Number(document.getElementById("extraPayment").value) || 0);

    if (!Number.isFinite(balance) || balance <= 0) return showError("Sila masukkan baki hutang yang lebih daripada RM0.");
    if (!Number.isFinite(rate) || rate < 0 || rate > 60) return showError("Kadar faedah mesti antara 0% dan 60% setahun.");
    if (!Number.isFinite(payment) || payment <= 0) return showError("Sila masukkan bayaran bulanan yang lebih daripada RM0.");

    const firstInterest = balance * rate / 100 / 12;
    if (payment + extraPay <= firstInterest) {
        return showError(`Bayaran anda tidak cukup untuk menampung faedah bulan pertama (${money(firstInterest)}). Hutang akan terus bertambah. Tambah bayaran bulanan.`);
    }
    showError("");

    const base = simulate(balance, rate, payment);
    const extra = extraPay > 0 ? simulate(balance, rate, payment + extraPay) : null;
    const main = extra || base;

    setText("freeIn", main.finished ? formatDuration(main.months) : "Lebih 50 tahun");
    setText("freeDate", main.finished ? `Bebas hutang sekitar ${payoffDate(main.months)}` : "");
    setText("baseDuration", base.finished ? formatDuration(base.months) : "Lebih 50 tahun");
    setText("baseInterest", money(base.interest));
    setText("baseTotal", money(balance + base.interest));

    const extraBlock = document.getElementById("extraBlock");
    const savingNote = document.getElementById("savingNote");
    if (extra) {
        extraBlock.hidden = false;
        setText("extraLabel", `Dengan tambahan ${money(extraPay)} sebulan`);
        setText("extraDuration", formatDuration(extra.months));
        setText("extraInterest", money(extra.interest));
        setText("extraTotal", money(balance + extra.interest));
        const savedMonths = base.months - extra.months;
        const savedInterest = base.interest - extra.interest;
        savingNote.innerHTML = base.finished
            ? `<strong>Anda jimat ${money(savedInterest)} faedah</strong><p>dan bebas hutang ${formatDuration(savedMonths)} lebih awal dengan membayar ${money(extraPay)} lebih setiap bulan.</p>`
            : `<strong>Bayaran tambahan membuat perbezaan besar</strong><p>Tanpa tambahan, hutang ini mengambil masa lebih 50 tahun. Dengan tambahan ${money(extraPay)}, ia selesai dalam ${formatDuration(extra.months)}.</p>`;
    } else {
        extraBlock.hidden = true;
        const r = rate / 100 / 12;
        const hint = Math.max(50, Math.round(payment * 0.2 / 10) * 10);
        const test = simulate(balance, rate, payment + hint);
        savingNote.innerHTML = base.finished
            ? `<strong>Cuba tambah sedikit setiap bulan</strong><p>Jika anda bayar ${money(hint)} lebih sebulan, anda jimat ${money(base.interest - test.interest)} faedah dan selesai ${formatDuration(base.months - test.months)} lebih awal. Masukkan angka di ruangan bayaran tambahan untuk lihat kiraan anda sendiri.</p>`
            : `<strong>Bayaran ini hampir tidak mengurangkan hutang</strong><p>Faedah bulanan sekitar ${money(balance * r)} memakan hampir semua bayaran anda. Cuba tambah bayaran bulanan.</p>`;
    }

    renderChart(base, extra);
}

document.getElementById("calculateDebtButton").addEventListener("click", calculateDebt);
document.querySelectorAll(".calculator-form-card input").forEach(el => {
    el.addEventListener("input", calculateDebt);
    el.addEventListener("change", calculateDebt);
});
calculateDebt();
