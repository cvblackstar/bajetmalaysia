// Untung Jual Rumah (subsale): bandingkan tunai yang dimasukkan sepanjang memiliki rumah dengan tunai
// yang diterima semasa jual.
// RPGT warganegara/PR (Akta Cukai Keuntungan Harta Tanah 1976, kadar sejak 1 Jan 2022, tiada perubahan Bajet 2026):
// tahun 1-3 30%, tahun ke-4 20%, tahun ke-5 15%, tahun ke-6 dan seterusnya 0%.
// Pengecualian: RM10,000 atau 10% daripada keuntungan, mana lebih tinggi. Pengecualian sekali seumur hidup untuk satu rumah kediaman.
// Kos pinjaman (duti setem & guaman pinjaman, faedah, penalti) tidak boleh ditolak dalam kiraan RPGT.
const { SST_RATE, motStampDuty, loanStampDuty, legalScaleFee } = window.BajetMY.propertyFees;
const MONTH_NAMES = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"];

const money = value => window.BajetMY.formatCurrency(value);
const num = id => Math.max(0, Number(document.getElementById(id).value) || 0);

function monthIndex(value) {
    const match = /^(\d{4})-(\d{2})$/.exec(value || "");
    return match ? Number(match[1]) * 12 + Number(match[2]) - 1 : null;
}

function monthLabel(index) {
    return `${MONTH_NAMES[index % 12]} ${Math.floor(index / 12)}`;
}

function rpgtRate(months) {
    const year = Math.ceil(months / 12);
    if (year <= 3) return 0.30;
    if (year === 4) return 0.20;
    if (year === 5) return 0.15;
    return 0;
}

function loanSchedule(loan, annualRate, tenureYears, months) {
    if (loan <= 0) return { payment: 0, paid: 0, balance: 0 };
    const n = Math.round(tenureYears * 12);
    const r = annualRate / 1200;
    const payment = r === 0 ? loan / n : loan * r / (1 - Math.pow(1 + r, -n));
    const paid = Math.min(months, n);
    const growth = Math.pow(1 + r, paid);
    const balance = r === 0 ? loan - payment * paid : loan * growth - payment * (growth - 1) / r;
    return { payment, paid, balance: Math.max(0, balance) };
}

function monthlyIrr(flows) {
    const npv = rate => flows.reduce((sum, flow, k) => sum + flow / Math.pow(1 + rate, k), 0);
    let lo = -0.99, hi = 1;
    if (Math.sign(npv(lo)) === Math.sign(npv(hi))) return null;
    for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2;
        if (Math.sign(npv(mid)) === Math.sign(npv(lo))) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
}

function compute(input, overrides = {}) {
    const months = overrides.months ?? input.months;
    const sellPrice = overrides.sellPrice ?? input.sellPrice;
    const { buyPrice, loan } = input;

    const schedule = loanSchedule(loan, input.rate, input.tenure, months);
    const useOverride = input.balanceOverride !== null && overrides.months === undefined;
    const balance = useOverride ? input.balanceOverride : schedule.balance;
    const instalments = schedule.payment * schedule.paid;
    const interest = Math.max(0, instalments - (loan - balance));

    const motDuty = input.firstHome ? 0 : motStampDuty(buyPrice);
    const loanDuty = input.firstHome ? 0 : loanStampDuty(loan);
    const spaLegal = legalScaleFee(buyPrice) * (1 + SST_RATE);
    const loanLegal = legalScaleFee(loan) * (1 + SST_RATE);
    const purchaseCosts = motDuty + loanDuty + spaLegal + loanLegal + input.buyOther;
    const downPayment = buyPrice - loan;

    const monthlyHolding = input.monthlyCost + input.yearlyCost / 12;
    const holding = monthlyHolding * months;
    const rent = input.monthlyRent * months;

    const agentFee = sellPrice * input.agentPct / 100 * (1 + SST_RATE);
    const sellLegal = legalScaleFee(sellPrice) * (1 + SST_RATE);
    const penalty = balance * (overrides.penaltyPct ?? input.penaltyPct) / 100;
    const sellingCosts = agentFee + sellLegal + input.sellOther + penalty;

    const rate = rpgtRate(months);
    const gain = sellPrice - (buyPrice + motDuty + spaLegal + input.buyOther + input.renovation) - (agentFee + sellLegal + input.sellOther);
    const taxable = gain > 0 ? Math.max(0, gain - Math.max(10000, gain * 0.1)) : 0;
    const rpgt = input.lifetimeExempt ? 0 : taxable * rate;

    const cashBack = sellPrice - balance - sellingCosts - rpgt;
    const upfront = downPayment + purchaseCosts + input.renovation;
    const invested = upfront + instalments + holding - rent;
    const net = cashBack - invested;

    const flows = [-upfront];
    for (let k = 1; k <= months; k++) {
        flows.push(-(k <= schedule.paid ? schedule.payment : 0) - monthlyHolding + input.monthlyRent);
    }
    flows[months] += cashBack;
    const irr = monthlyIrr(flows);

    return {
        months, sellPrice, balance, instalments, interest, downPayment, purchaseCosts, holding, rent,
        agentFee, sellLegal, penalty, sellingCosts, rate, gain, rpgt, cashBack, invested, net,
        roi: invested > 0 ? net / invested : null,
        annual: irr === null ? null : Math.pow(1 + irr, 12) - 1
    };
}

function breakEvenPrice(input) {
    if (compute(input, { sellPrice: 0 }).net >= 0) return 0;
    let lo = 0, hi = Math.max(input.buyPrice, input.sellPrice) * 2 + 1;
    while (compute(input, { sellPrice: hi }).net < 0 && hi < 1e10) hi *= 2;
    for (let i = 0; i < 80; i++) {
        const mid = (lo + hi) / 2;
        if (compute(input, { sellPrice: mid }).net < 0) lo = mid; else hi = mid;
    }
    return hi;
}

function readInput() {
    const buyMonth = monthIndex(document.getElementById("buyDate").value);
    const sellMonth = monthIndex(document.getElementById("sellDate").value);
    const overrideRaw = document.getElementById("balanceOverride").value;
    return {
        buyPrice: num("buyPrice"),
        loan: num("loanAmount"),
        rate: num("loanRate"),
        tenure: num("loanTenure"),
        firstHome: document.getElementById("firstHome").checked,
        buyOther: num("buyOther"),
        renovation: num("renovation"),
        monthlyCost: num("monthlyCost"),
        yearlyCost: num("yearlyCost"),
        monthlyRent: num("monthlyRent"),
        sellPrice: num("sellPrice"),
        agentPct: num("agentFee"),
        penaltyPct: num("penalty"),
        sellOther: num("sellOther"),
        balanceOverride: overrideRaw === "" ? null : num("balanceOverride"),
        lifetimeExempt: document.getElementById("lifetimeExempt").checked,
        buyMonth,
        months: buyMonth === null || sellMonth === null ? null : sellMonth - buyMonth
    };
}

function validate(input) {
    if (input.buyPrice <= 0) return "Sila masukkan harga beli yang lebih daripada RM0.";
    if (input.sellPrice <= 0) return "Sila masukkan anggaran harga jual yang lebih daripada RM0.";
    if (input.loan > input.buyPrice) return "Jumlah pinjaman tidak boleh melebihi harga beli.";
    if (input.loan > 0 && input.tenure <= 0) return "Sila masukkan tempoh pinjaman (tahun).";
    if (input.months === null) return "Sila pilih bulan beli dan bulan jual.";
    if (input.months <= 0) return "Bulan jual mesti selepas bulan beli.";
    if (input.months > 1200) return "Tempoh pegangan terlalu panjang. Semak semula bulan beli dan jual.";
    return "";
}

function setText(id, value) {
    document.getElementById(id).textContent = value;
}

function pct(value) {
    return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function outcome(net) {
    return `${net >= 0 ? "untung" : "rugi"} ${money(Math.abs(net))}`;
}

function holdingLabel(months) {
    const years = Math.floor(months / 12), rest = months % 12;
    return [years ? `${years} tahun` : "", rest ? `${rest} bulan` : ""].filter(Boolean).join(" ");
}

function calculateSale() {
    const input = readInput();
    const error = validate(input);
    const errorEl = document.getElementById("saleError");
    errorEl.hidden = !error;
    errorEl.textContent = error;
    if (error) return;

    const result = compute(input);
    const profit = result.net >= 0;

    const verdict = document.getElementById("verdict");
    verdict.classList.toggle("loss", !profit);
    setText("verdictLabel", profit ? "Untung bersih jika jual" : "Rugi bersih jika jual");
    setText("netResult", money(Math.abs(result.net)));
    setText("resRoi", pct(result.roi));
    setText("resAnnual", pct(result.annual));
    setText("resHeld", holdingLabel(result.months));

    setText("resSellPrice", money(result.sellPrice));
    setText("resBalance", "− " + money(result.balance));
    setText("resAgent", "− " + money(result.agentFee));
    setText("resSellLegal", "− " + money(result.sellLegal));
    setText("resSellOther", "− " + money(input.sellOther));
    setText("resPenalty", "− " + money(result.penalty));
    setText("resRpgt", "− " + money(result.rpgt));
    setText("resCashBack", money(result.cashBack));

    setText("resDown", money(result.downPayment));
    setText("resPurchase", money(result.purchaseCosts));
    setText("resReno", money(input.renovation));
    setText("resInstalments", money(result.instalments));
    setText("resInterest", money(result.interest));
    setText("resHolding", money(result.holding));
    setText("resRent", "− " + money(result.rent));
    setText("resInvested", money(result.invested));

    const breakEven = breakEvenPrice(input);
    setText("resBreakEven", breakEven > 0 ? money(breakEven) : "—");

    const rpgtLabel = input.lifetimeExempt
        ? "Pengecualian sekali seumur hidup digunakan, RPGT RM0."
        : `Dijual dalam tahun ke-${Math.ceil(result.months / 12)}: kadar RPGT ${Math.round(result.rate * 100)}%.`;
    setText("resRpgtRate", rpgtLabel);

    document.getElementById("rentHint").hidden = input.monthlyRent > 0;

    const tip = document.getElementById("rpgtTip");
    if (result.rate > 0 && !input.lifetimeExempt && result.gain > 0) {
        const wait = compute(input, { months: 61, penaltyPct: 0 });
        const waitMonth = monthLabel(input.buyMonth + 61);
        const diff = wait.net - result.net;
        tip.hidden = false;
        tip.innerHTML = `<strong>Tunggu hingga tahun ke-6?</strong><p>Jika anda jual pada ${waitMonth} atau selepasnya, RPGT jadi RM0 (jimat ${money(result.rpgt)}). Dengan harga jual yang sama, keputusan bersih jadi ${outcome(wait.net)}, iaitu ${diff >= 0 ? "lebih baik" : "lebih teruk"} ${money(Math.abs(diff))} berbanding jual sekarang, selepas ambil kira ansuran dan kos pegangan tambahan (andaian tempoh lock-in sudah tamat, tiada penalti). Harga pasaran boleh berubah dalam tempoh itu.</p>`;
    } else {
        tip.hidden = true;
        tip.innerHTML = "";
    }
}

document.getElementById("calculateSaleButton").addEventListener("click", calculateSale);
document.querySelectorAll(".calculator-form-card input").forEach(el => {
    el.addEventListener("input", calculateSale);
    el.addEventListener("change", calculateSale);
});
calculateSale();
