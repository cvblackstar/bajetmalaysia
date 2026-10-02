// Kos hartanah dikongsi oleh kalkulator Kos Beli Rumah dan Untung Jual Rumah.
// Duti setem pindah milik (MOT) untuk warganegara/PR: 1% hingga RM100k, 2% hingga RM500k, 3% hingga RM1j, 4% selebihnya.
// Duti setem perjanjian pinjaman: 0.5% daripada jumlah pinjaman.
// Yuran guaman: Solicitors' Remuneration Order 2023, Jadual A (Semenanjung) — 1.25% bagi RM500k pertama
// (minimum RM500), 1% selebihnya. Cukai perkhidmatan 8% atas yuran guaman dan komisen ejen.
window.BajetMY = window.BajetMY || {};
window.BajetMY.propertyFees = (() => {
    const SST_RATE = 0.08;

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

    function loanStampDuty(loan) {
        return Math.ceil(Math.max(0, loan) * 0.005);
    }

    function legalScaleFee(value) {
        if (value <= 0) return 0;
        if (value <= 500000) return Math.max(500, value * 0.0125);
        return 6250 + (value - 500000) * 0.01;
    }

    return { SST_RATE, motStampDuty, loanStampDuty, legalScaleFee };
})();
