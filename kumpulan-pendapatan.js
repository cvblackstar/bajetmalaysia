// Sumber B40/M40/T20: DOSM, Laporan Survei Pendapatan Isi Rumah 2024, Jadual 5 (Nota Teknikal 14.3).
// b40 = had atas B40 (isi rumah di bawah nilai ini ialah B40); t20 = had bawah T20.
// t10/t5 ialah anggaran Bajet MY (DOSM tidak menerbitkan had T10/T5): interpolasi taburan isi rumah
// mengikut kelas pendapatan (Jadual 2.14) dengan ekor Pareto bagi kelas RM15,000 dan ke atas.
// Kaedah yang sama menghasilkan semula had B40 dan T20 rasmi dalam lingkungan +/-3%.
const INCOME_GROUP_DATA = {
    Malaysia: { b40: 5860, t20: 12680, t10: 16600, t5: 21700 },
    Johor: { b40: 6570, t20: 13560, t10: 16600, t5: 20900 },
    Kedah: { b40: 3940, t20: 7820, t10: 10700, t5: 13000 },
    Kelantan: { b40: 3520, t20: 7000, t10: 9900, t5: 13000 },
    Melaka: { b40: 5920, t20: 11560, t10: 15600, t5: 19400 },
    "Negeri Sembilan": { b40: 4690, t20: 9980, t10: 13700, t5: 17200 },
    Pahang: { b40: 4330, t20: 8090, t10: 10900, t5: 14200 },
    "Pulau Pinang": { b40: 6370, t20: 12680, t10: 16200, t5: 20700 },
    Perak: { b40: 3970, t20: 8220, t10: 11500, t5: 15300 },
    Perlis: { b40: 4280, t20: 8010, t10: 10600, t5: 14300 },
    Selangor: { b40: 9570, t20: 16040, t10: 21600, t5: 29100 },
    Terengganu: { b40: 5880, t20: 9790, t10: 13400, t5: 16400 },
    Sabah: { b40: 4120, t20: 9160, t10: 12700, t5: 16200 },
    Sarawak: { b40: 4670, t20: 9710, t10: 13200, t5: 16400 },
    "W.P. Kuala Lumpur": { b40: 9630, t20: 17030, t10: 23700, t5: 32300 },
    "W.P. Labuan": { b40: 6320, t20: 11630, t10: 14800, t5: 18200 },
    "W.P. Putrajaya": { b40: 9620, t20: 19030, t10: 23500, t5: 29800 }
};

const money = value => `RM${Math.round(value).toLocaleString("en-MY")}`;

function classify(income, t) {
    const group = income < t.b40 ? "B40" : income < t.t20 ? "M40" : "T20";
    let top = group;
    if (income >= t.t5) top = "T5";
    else if (income >= t.t10) top = "T10";

    let next = null;
    if (top === "B40") next = { label: "M40", at: t.b40 };
    else if (top === "M40") next = { label: "T20", at: t.t20 };
    else if (top === "T20") next = { label: "T10", at: t.t10 };
    else if (top === "T10") next = { label: "T5", at: t.t5 };

    return { group, top, next, gap: next ? Math.max(0, next.at - income) : 0 };
}

function describe(top) {
    return {
        B40: "40% isi rumah berpendapatan terendah",
        M40: "40% isi rumah pertengahan",
        T20: "20% isi rumah berpendapatan tertinggi",
        T10: "Dalam T20, dan 10% teratas (anggaran)",
        T5: "Dalam T20, dan 5% teratas (anggaran)"
    }[top];
}

function renderPanel(prefix, income, t) {
    const r = classify(income, t);
    const badge = document.getElementById(`${prefix}Badge`);
    badge.textContent = r.top;
    badge.className = `ig-badge g-${r.top.toLowerCase()}`;
    document.getElementById(`${prefix}Desc`).textContent = describe(r.top);

    document.getElementById(`${prefix}RangeB40`).textContent = `Bawah ${money(t.b40)}`;
    document.getElementById(`${prefix}RangeM40`).textContent = `${money(t.b40)} – ${money(t.t20 - 1)}`;
    document.getElementById(`${prefix}RangeT20`).textContent = `${money(t.t20)} ke atas`;
    document.getElementById(`${prefix}RangeT10`).textContent = `~${money(t.t10)} ke atas`;
    document.getElementById(`${prefix}RangeT5`).textContent = `~${money(t.t5)} ke atas`;

    const rows = { B40: "B40", M40: "M40", T20: "T20", T10: "T10", T5: "T5" };
    Object.keys(rows).forEach(k => {
        const row = document.getElementById(`${prefix}Row${k}`);
        const active = k === r.top || (k === "T20" && (r.top === "T10" || r.top === "T5")) || (k === "T10" && r.top === "T5");
        row.classList.toggle("ig-active", active);
    });

    document.getElementById(`${prefix}Next`).textContent = r.next
        ? `Tambah ${money(r.gap)} sebulan untuk sampai ke ${r.next.label}.`
        : "Anda berada di kumpulan tertinggi.";
    return r;
}

function highlightTableRow(state) {
    document.querySelectorAll("#thresholdTable tbody tr").forEach(tr => {
        tr.classList.toggle("ig-active", tr.dataset.state === state);
    });
}

function showError(message) {
    const el = document.getElementById("incomeGroupError");
    el.hidden = !message;
    el.textContent = message || "";
}

function calculateIncomeGroup() {
    const income = Number(document.getElementById("income").value);
    const state = document.getElementById("state").value;
    const stateData = INCOME_GROUP_DATA[state];

    if (!Number.isFinite(income) || income <= 0) {
        showError("Sila masukkan pendapatan isi rumah bulanan yang lebih daripada RM0.");
        return;
    }
    if (!stateData) {
        showError("Sila pilih negeri.");
        return;
    }
    showError("");

    document.getElementById("stateName").textContent = state;
    document.getElementById("incomeShown").textContent = money(income);

    const local = renderPanel("st", income, stateData);
    const national = renderPanel("nat", income, INCOME_GROUP_DATA.Malaysia);

    const compare = document.getElementById("compareNote");
    if (local.top === national.top) {
        compare.textContent = `Anda dalam kumpulan ${local.top} di ${state} dan juga di peringkat Malaysia.`;
    } else {
        compare.textContent = `Pendapatan yang sama dikelaskan ${local.top} di ${state} tetapi ${national.top} di peringkat Malaysia, kerana had setiap negeri dikira daripada taburan pendapatan isi rumah di negeri itu.`;
    }
    highlightTableRow(state);
}

function buildTable() {
    const body = document.querySelector("#thresholdTable tbody");
    body.innerHTML = Object.keys(INCOME_GROUP_DATA).map(name => {
        const t = INCOME_GROUP_DATA[name];
        return `<tr data-state="${name}"><td>${name === "Malaysia" ? "Malaysia (nasional)" : name}</td>` +
            `<td>&lt; ${money(t.b40)}</td><td>${money(t.b40)} – ${money(t.t20 - 1)}</td>` +
            `<td>&ge; ${money(t.t20)}</td><td>~${money(t.t10)}</td><td>~${money(t.t5)}</td></tr>`;
    }).join("");
}

buildTable();
document.getElementById("calculateIncomeGroupButton").addEventListener("click", calculateIncomeGroup);
document.querySelectorAll("#income, #state").forEach(el => {
    el.addEventListener("input", calculateIncomeGroup);
    el.addEventListener("change", calculateIncomeGroup);
});
calculateIncomeGroup();
