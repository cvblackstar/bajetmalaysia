// Duti setem pindah milik (MOT) untuk warganegara/PR: 1% hingga RM100k, 2% hingga RM500k, 3% hingga RM1j, 4% selebihnya.
// Duti setem perjanjian pinjaman: 0.5% daripada jumlah pinjaman.
// Pengecualian pembeli rumah pertama (i-MILIKI, Bajet 2026): 100% bagi MOT dan perjanjian pinjaman,
// harga sehingga RM500,000, SPA ditandatangani 1 Jan 2026 hingga 31 Dis 2027.
// Yuran guaman: Solicitors' Remuneration Order 2023, Jadual A (Semenanjung) — 1.25% bagi RM500k pertama
// (minimum RM500), 1% selebihnya. Cukai perkhidmatan 8% atas yuran guaman.
const FIRST_HOME_CAP = 500000;
const SST_RATE = 0.08;

const money = value => window.BajetMY.formatCurrency(value);

function motStampDuty(price) {
    const tiers = [[100000, 0.01], [500000, 0.02], [1000000, 0.03], [Infinity, 0.04]];
    let duty = 0;
    let lower = 0;
    for (const [upper, rate] of tiers) {
        if (price <= lower) break;
        duty += (Math.min(price, upper) - lower) * rate;
        lower = upper;
    }
    return Math.ceil(duty);
}

function legalScaleFee(value) {
    if (value <= 0) return 0;
    if (value <= 500000) return Math.max(500, value * 0.0125);
    return 6250 + (value - 500000) * 0.01;
}

function showError(message) {
    const el = document.getElementById("houseCostError");
    el.hidden = !message;
    el.textContent = message || "";
}

function setText(id, value) {
    document.getElementById(id).textContent = value;
}

function calculateHouseCost() {
    const price = Number(document.getElementById("propertyPrice").value);
    const margin = Number(document.getElementById("loanMargin").value);
    const firstHome = document.getElementById("firstHome").checked;
    const otherCosts = Math.max(0, Number(document.getElementById("otherCosts").value) || 0);

    if (!Number.isFinite(price) || price <= 0) {
        showError("Sila masukkan harga rumah yang lebih daripada RM0.");
        return;
    }
    if (!Number.isFinite(margin) || margin < 0 || margin > 100) {
        showError("Margin pinjaman mesti antara 0% dan 100%.");
        return;
    }
    showError("");

    const loan = price * margin / 100;
    const downPayment = price - loan;
    const exempt = firstHome && price <= FIRST_HOME_CAP;

    const motDuty = exempt ? 0 : motStampDuty(price);
    const loanDuty = exempt ? 0 : Math.ceil(loan * 0.005);
    const spaFee = legalScaleFee(price) * (1 + SST_RATE);
    const loanFee = legalScaleFee(loan) * (1 + SST_RATE);
    const fees = motDuty + loanDuty + spaFee + loanFee + otherCosts;
    const total = downPayment + fees;

    setText("totalCash", money(total));
    setText("resDownPayment", money(downPayment));
    setText("resLoan", money(loan));
    setText("resMotDuty", money(motDuty));
    setText("resLoanDuty", money(loanDuty));
    setText("resSpaFee", money(spaFee));
    setText("resLoanFee", money(loanFee));
    setText("resOther", money(otherCosts));
    setText("resFees", money(fees));
    setText("resFeesPct", `${(fees / price * 100).toFixed(1)}% daripada harga rumah`);

    const note = document.getElementById("exemptNote");
    const fullDuty = motStampDuty(price) + Math.ceil(loan * 0.005);
    if (exempt) {
        note.innerHTML = `<strong>Pengecualian pembeli rumah pertama digunakan.</strong><p>Anda jimat ${money(fullDuty)} duti setem. Syarat: warganegara yang tidak pernah memiliki rumah kediaman, harga sehingga RM500,000, dan SPA ditandatangani antara 1 Januari 2026 hingga 31 Disember 2027.</p>`;
    } else if (price <= FIRST_HOME_CAP) {
        note.innerHTML = `<strong>Pembeli rumah pertama?</strong><p>Rumah ini di bawah had RM500,000. Jika ini rumah pertama anda, tandakan kotak di sebelah dan anda boleh jimat ${money(fullDuty)} duti setem.</p>`;
    } else if (firstHome) {
        note.innerHTML = `<strong>Pengecualian tidak terpakai</strong><p>Pengecualian duti setem pembeli rumah pertama hanya untuk harga sehingga RM500,000. Rumah ini melebihi had, jadi duti setem penuh dikenakan.</p>`;
    } else {
        note.innerHTML = `<strong>Tiada pengecualian duti setem</strong><p>Pengecualian pembeli rumah pertama hanya untuk harga sehingga RM500,000.</p>`;
    }
}

document.getElementById("calculateHouseCostButton").addEventListener("click", calculateHouseCost);
document.querySelectorAll(".calculator-form-card input").forEach(el => {
    el.addEventListener("input", calculateHouseCost);
    el.addEventListener("change", calculateHouseCost);
});
calculateHouseCost();
