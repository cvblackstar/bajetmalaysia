// Anggaran pendapatan YouTube.
// Pendapatan iklan = tontonan ÷ 1,000 × RPM. RPM (pendapatan pencipta per 1,000 tontonan, selepas bahagian YouTube)
// tidak didedahkan secara awam; julat di bawah ialah anggaran kasar Bajet MY daripada julat yang dilaporkan pencipta
// (RPM global sekitar US$1-5 untuk video panjang, US$0.03-0.15 untuk Shorts) dan diselaraskan untuk penonton Malaysia.
// Cukai AS (YouTube Help 10391362): Malaysia tiada perjanjian cukai dengan AS, jadi 30% daripada pendapatan
// penonton AS jika maklumat cukai dihantar; tanpa maklumat cukai, sehingga 24% daripada jumlah pendapatan (akaun individu).
// YPP (YouTube Help 72851): 1,000 subscriber + 4,000 jam tontonan (12 bulan) atau 10 juta tontonan Shorts (90 hari).
const LONG_RPM = { // RM per 1,000 tontonan, penonton Malaysia: [rendah, biasa, tinggi]
    kewangan: [4, 8, 15],
    teknologi: [3, 6, 10],
    pendidikan: [2.5, 5, 8],
    lifestyle: [1.5, 3, 6],
    gaming: [1, 2, 4],
    hiburan: [0.8, 1.5, 3]
};
const SHORTS_RPM = [0.03, 0.08, 0.18];
const AUDIENCE = { // pendarab RPM dan anggaran bahagian tontonan dari AS
    malaysia: { factor: 1, usShare: 0.02 },
    campuran: { factor: 2, usShare: 0.15 },
    global: { factor: 4, usShare: 0.35 }
};
const SHORT_MAX_SECONDS = 180;
const RETENTION = 0.35; // anggaran purata peratus video ditonton
const API = "https://www.googleapis.com/youtube/v3/";
const API_KEY = window.BAJETMY_YOUTUBE_KEY || "";

const money = value => window.BajetMY.formatCurrency(value);
const fmt = new Intl.NumberFormat("ms-MY", { maximumFractionDigits: 0 });
const num = id => Math.max(0, Number(document.getElementById(id).value) || 0);
let channelInfo = null; // diisi selepas carian pautan
let sharedChannel = null; // { id, title } saluran yang sedang dipaparkan, untuk pautan kongsi

function setText(id, value) {
    document.getElementById(id).textContent = value;
}

// ---------- Kalkulator ----------

function estimate(input) {
    const audience = AUDIENCE[input.audience] || AUDIENCE.malaysia;
    const longRange = input.customRpm > 0
        ? [input.customRpm, input.customRpm, input.customRpm]
        : (LONG_RPM[input.niche] || LONG_RPM.lifestyle).map(r => r * audience.factor);
    return [0, 1, 2].map(i => {
        const longAds = input.longViews / 1000 * longRange[i];
        const shortsAds = input.shortsViews / 1000 * SHORTS_RPM[i] * audience.factor;
        const ads = longAds + shortsAds;
        const withholding = input.taxInfo ? ads * audience.usShare * 0.30 : ads * 0.24;
        return { longAds, shortsAds, ads, withholding, net: ads - withholding + input.sponsorship, rpm: longRange[i] };
    });
}

function readInput() {
    return {
        longViews: num("longViews"),
        shortsViews: num("shortsViews"),
        niche: document.getElementById("niche").value,
        audience: document.getElementById("audience").value,
        customRpm: num("customRpm"),
        sponsorship: num("sponsorship"),
        taxInfo: document.getElementById("taxInfo").checked
    };
}

function yppStatus(input) {
    const avgLongMinutes = channelInfo?.avgLongMinutes || 8;
    const watchHours = input.longViews * 12 * avgLongMinutes * RETENTION / 60;
    const shorts90 = Math.max(input.shortsViews * 3, channelInfo?.shorts90 || 0);
    const subs = channelInfo && !channelInfo.hiddenSubs ? channelInfo.subs : null;
    const subsOk = subs === null ? null : subs >= 1000;
    const viewsOk = watchHours >= 4000 || shorts90 >= 10000000;
    const line = (ok, text) => `<li><span class="ypp-tag ${ok === null ? "" : ok ? "ok" : "no"}">${ok === null ? "Tidak diketahui" : ok ? "Lepas" : "Belum"}</span> ${text}</li>`;
    return `<strong>Syarat YouTube Partner Program (pendapatan iklan)</strong><ul class="ypp-list">` +
        line(subsOk, subs === null ? "1,000 subscriber (semak dalam YouTube Studio)" : `1,000 subscriber: saluran ini ada ${fmt.format(subs)}`) +
        line(watchHours >= 4000, `4,000 jam tontonan dalam 12 bulan: anggaran kasar ${fmt.format(watchHours)} jam`) +
        line(shorts90 >= 10000000, `atau 10 juta tontonan Shorts dalam 90 hari: anggaran ${fmt.format(shorts90)}`) +
        `</ul><p>${subsOk !== false && viewsOk ? "Berdasarkan anggaran, saluran ini mungkin layak. " : "Pendapatan iklan hanya bermula selepas diterima masuk YPP. "}Jam tontonan sebenar hanya boleh dilihat oleh pemilik saluran dalam YouTube Studio. YouTube juga mengumumkan kemas kini YPP mulai 1 Februari 2027.</p>`;
}

function calculateYoutube() {
    const input = readInput();
    const [low, mid, high] = estimate(input);

    setText("netMonthly", money(mid.net));
    setText("resLow", money(low.net));
    setText("resMid", money(mid.net));
    setText("resHigh", money(high.net));
    setText("resLongAds", money(mid.longAds));
    setText("resShortsAds", money(mid.shortsAds));
    setText("resWithholding", "− " + money(mid.withholding));
    setText("resSponsor", money(input.sponsorship));
    setText("resNet", money(mid.net));
    setText("resYearly", money(mid.net * 12));
    setText("resRpm", input.customRpm > 0
        ? `RPM video panjang anda: ${money(input.customRpm)} setiap 1,000 tontonan.`
        : `Anggaran RPM video panjang: ${money(low.rpm)} hingga ${money(high.rpm)} setiap 1,000 tontonan.`);
    setText("resTaxNote", input.taxInfo
        ? "Google tahan 30% daripada pendapatan penonton AS kerana Malaysia tiada perjanjian cukai dengan AS."
        : "Tanpa maklumat cukai, Google boleh tahan sehingga 24% daripada SEMUA pendapatan. Hantar borang W-8BEN dalam AdSense.");
    document.getElementById("yppBox").innerHTML = yppStatus(input);
}

// ---------- Carian pautan YouTube ----------

function parseYouTubeInput(text) {
    const raw = (text || "").trim();
    if (!raw) return null;
    if (/^@[\w.-]{3,}$/.test(raw)) return { type: "handle", value: raw };
    if (/^UC[\w-]{22}$/.test(raw)) return { type: "channel", value: raw };
    let url;
    try { url = new URL(/^https?:\/\//i.test(raw) ? raw : "https://" + raw); } catch { return null; }
    const host = url.hostname.replace(/^(www|m|music)\./, "");
    const parts = url.pathname.split("/").filter(Boolean);
    if (host === "youtu.be" && parts[0]) return { type: "video", value: parts[0] };
    if (host !== "youtube.com") return null;
    if (parts[0] === "watch" && url.searchParams.get("v")) return { type: "video", value: url.searchParams.get("v") };
    if (["shorts", "live", "embed"].includes(parts[0]) && parts[1]) return { type: "video", value: parts[1] };
    if (parts[0]?.startsWith("@")) return { type: "handle", value: decodeURIComponent(parts[0]) };
    if (parts[0] === "channel" && parts[1]) return { type: "channel", value: parts[1] };
    if (parts[0] === "user" && parts[1]) return { type: "username", value: parts[1] };
    if (parts[0] === "c" && parts[1]) return { type: "search", value: decodeURIComponent(parts[1]) };
    return null;
}

async function api(endpoint, params) {
    const query = new URLSearchParams({ ...params, key: API_KEY });
    let response;
    try {
        response = await fetch(`${API}${endpoint}?${query}`);
    } catch {
        // Ralat rangkaian (tiada internet, ad blocker atau rangkaian pejabat/sekolah yang sekat Google API)
        throw new Error("Tidak dapat menghubungi YouTube. Semak sambungan internet atau matikan ad blocker untuk laman ini, kemudian cuba lagi. Anda juga boleh masukkan tontonan secara manual.");
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) {
        const reason = data.error?.errors?.[0]?.reason || "";
        if (reason === "quotaExceeded" || reason === "dailyLimitExceeded") {
            throw new Error("Had carian harian YouTube telah habis. Cuba lagi esok, atau masukkan tontonan secara manual.");
        }
        throw new Error("YouTube tidak dapat dihubungi sekarang. Cuba lagi sebentar, atau masukkan tontonan secara manual.");
    }
    return data;
}

function parseDuration(iso) {
    const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || "");
    if (!m) return 0;
    return (Number(m[1] || 0) * 86400) + (Number(m[2] || 0) * 3600) + (Number(m[3] || 0) * 60) + Number(m[4] || 0);
}

async function findChannel(target) {
    const part = "snippet,statistics,contentDetails";
    let params;
    if (target.type === "channel") params = { id: target.value };
    else if (target.type === "handle") params = { forHandle: target.value };
    else if (target.type === "username") params = { forUsername: target.value };
    else if (target.type === "video") {
        const video = await api("videos", { part: "snippet", id: target.value });
        const channelId = video.items?.[0]?.snippet?.channelId;
        if (!channelId) throw new Error("Video tidak ditemui. Semak semula pautan.");
        params = { id: channelId };
    } else {
        const found = await api("search", { part: "snippet", type: "channel", q: target.value, maxResults: 1 });
        const channelId = found.items?.[0]?.snippet?.channelId;
        if (!channelId) throw new Error("Saluran tidak ditemui. Cuba pautan @nama saluran.");
        params = { id: channelId };
    }
    const data = await api("channels", { part, ...params });
    const channel = data.items?.[0];
    if (!channel) throw new Error("Saluran tidak ditemui. Semak semula pautan.");
    return channel;
}

function analyseUploads(channel, videos, now = Date.now()) {
    const items = videos
        .filter(v => v.snippet?.liveBroadcastContent === "none" || !v.snippet?.liveBroadcastContent)
        .map(v => {
            const seconds = parseDuration(v.contentDetails?.duration);
            return {
                ageDays: Math.max(1, (now - Date.parse(v.snippet.publishedAt)) / 864e5),
                views: Number(v.statistics?.viewCount || 0),
                seconds,
                isShort: seconds > 0 && seconds <= SHORT_MAX_SECONDS
            };
        });
    const sum = (list, short) => list.filter(v => v.isShort === short).reduce((s, v) => s + v.views, 0);
    const longs = items.filter(v => !v.isShort && v.seconds > 0);
    const avgLongMinutes = longs.length ? longs.reduce((s, v) => s + v.seconds, 0) / longs.length / 60 : 8;
    const shorts90 = sum(items.filter(v => v.ageDays <= 90), true);

    let windowDays = items.some(v => v.ageDays <= 90) ? 90 : items.some(v => v.ageDays <= 365) ? 365 : 0;
    if (windowDays && items.length >= 50) {
        const oldest = Math.max(...items.map(v => v.ageDays));
        windowDays = Math.max(7, Math.min(windowDays, oldest));
    }

    // 1. Video baharu: tontonan video yang dimuat naik dalam tempoh terkini, dibahagi ikut bulan.
    let longMonthly = 0, shortsMonthly = 0;
    const recent = windowDays ? items.filter(v => v.ageDays <= windowDays) : [];
    if (windowDays) {
        const months = windowDays / 30.44;
        longMonthly = sum(recent, false) / months;
        shortsMonthly = sum(recent, true) / months;
    }

    // 2. Video lama: kaedah 1 tidak nampak tontonan video lama (contohnya lagu atau tutorial yang masih
    // ditonton bertahun-tahun). Purata sepanjang hayat saluran dijadikan lantai: jika lebih tinggi,
    // bezanya dianggap tontonan video panjang lama, kerana Shorts jarang terus ditonton lama selepas
    // dimuat naik. Hanya saluran yang muat naik terkininya semua Shorts dikira sebagai Shorts.
    const ageMonths = Math.max(1, (now - Date.parse(channel.snippet.publishedAt)) / 864e5 / 30.44);
    const lifetimeMonthly = Number(channel.statistics?.viewCount || 0) / ageMonths;
    const recentMonthly = longMonthly + shortsMonthly;
    const backCatalog = Math.max(0, lifetimeMonthly - recentMonthly);
    const shortsOnly = items.length > 0 && items.every(v => v.isShort);
    if (shortsOnly) shortsMonthly += backCatalog;
    else longMonthly += backCatalog;

    const recentText = `${recent.length} video yang dimuat naik dalam ${Math.round(windowDays)} hari lepas (${fmt.format(recentMonthly)} tontonan sebulan)`;
    const lifetimeText = `purata sepanjang hayat saluran (${fmt.format(lifetimeMonthly)} tontonan sebulan)`;
    let method;
    if (!windowDays) method = `${lifetimeText}, kerana tiada muat naik dalam 12 bulan lepas`;
    else if (backCatalog > 0) method = `angka lebih tinggi antara ${lifetimeText} dan ${recentText}, kerana video lama saluran ini masih ditonton`;
    else method = recentText;
    return { longMonthly, shortsMonthly, avgLongMinutes, shorts90, method };
}

function showLookupStatus(message, isError) {
    const el = document.getElementById("ytStatus");
    el.hidden = !message;
    el.textContent = message || "";
    el.classList.toggle("calc-form-error", Boolean(isError));
}

function renderChannel(channel, analysis) {
    const s = channel.statistics || {};
    const card = document.getElementById("ytChannel");
    card.hidden = false;
    const img = document.getElementById("ytThumb");
    img.src = channel.snippet?.thumbnails?.default?.url || "";
    img.alt = channel.snippet?.title || "";
    const link = document.getElementById("ytName");
    link.textContent = channel.snippet?.title || "Saluran YouTube";
    link.href = channel.snippet?.customUrl ? `https://www.youtube.com/${channel.snippet.customUrl}` : `https://www.youtube.com/channel/${channel.id}`;
    setText("ytSubs", s.hiddenSubscriberCount ? "Disembunyikan" : fmt.format(Number(s.subscriberCount || 0)));
    setText("ytViews", fmt.format(Number(s.viewCount || 0)));
    setText("ytVideos", fmt.format(Number(s.videoCount || 0)));
    setText("ytMethod", `Anggaran tontonan sebulan dikira daripada ${analysis.method}. Ini anggaran kasar; ubah angka di bawah jika anda tahu angka sebenar dari YouTube Studio.`);
}

// ---------- Kongsi hasil ----------
// Pautan kongsi: pendapatan-youtube.html?saluran=@handle&niche=...&penonton=...
// Pelawat yang buka pautan ini terus nampak anggaran saluran yang sama.
const SHARE_PARAMS = ["saluran", "niche", "penonton"];

function setShareParams(url) {
    SHARE_PARAMS.forEach(key => url.searchParams.delete(key));
    if (sharedChannel) {
        url.searchParams.set("saluran", sharedChannel.id);
        url.searchParams.set("niche", document.getElementById("niche").value);
        url.searchParams.set("penonton", document.getElementById("audience").value);
    }
    return url;
}

// "@" sah dalam query string; biarkan ia supaya pautan nampak kemas (?saluran=@nama, bukan %40nama).
const shareHref = url => setShareParams(url).href.replace("saluran=%40", "saluran=@");

// Kemas kini bar alamat supaya pautan yang disalin terus dari pelayar juga boleh dikongsi.
function syncShareUrl() {
    history.replaceState(history.state, "", shareHref(new URL(window.location.href)));
}

async function shareResult() {
    if (!sharedChannel) return;
    const status = document.getElementById("ytShareStatus");
    const url = shareHref(new URL(window.location.pathname, window.location.origin));
    const mid = estimate(readInput())[1];
    const text = `Anggaran pendapatan YouTube ${sharedChannel.title}: lebih kurang ${money(mid.net)} sebulan (anggaran kasar Bajet MY). Cuba semak channel favourite korang:`;
    if (typeof window.gtag === "function") window.gtag("event", "youtube_share", { channel: sharedChannel.id });
    if (navigator.share) {
        try {
            await navigator.share({ title: document.title, text, url });
            status.textContent = "";
            return;
        } catch (error) {
            if (error.name === "AbortError") return; // pengguna tutup menu kongsi
        }
    }
    try {
        await navigator.clipboard.writeText(`${text} ${url}`);
        status.textContent = "Pautan disalin. Tampal di WhatsApp, Threads atau mana-mana.";
    } catch {
        status.textContent = `Salin pautan ini: ${url}`;
    }
}

// Sembunyikan saluran carian sebelumnya supaya ralat carian baharu tidak kelihatan seperti hasil lama.
function clearChannel() {
    document.getElementById("ytChannel").hidden = true;
    document.getElementById("ytShareStatus").textContent = "";
    if (sharedChannel) {
        sharedChannel = null;
        syncShareUrl();
    }
    if (channelInfo) {
        channelInfo = null;
        calculateYoutube();
    }
}

async function lookupChannel() {
    const target = parseYouTubeInput(document.getElementById("ytUrl").value);
    clearChannel();
    if (!target) {
        showLookupStatus("Pautan tidak dikenali. Contoh: https://www.youtube.com/@namasaluran atau pautan mana-mana video.", true);
        return;
    }
    const button = document.getElementById("ytLookup");
    button.disabled = true;
    showLookupStatus("Mencari saluran...", false);
    try {
        const channel = await findChannel(target);
        const uploads = channel.contentDetails?.relatedPlaylists?.uploads;
        let videos = [];
        if (uploads) {
            const list = await api("playlistItems", { part: "contentDetails", playlistId: uploads, maxResults: 50 }).catch(() => ({ items: [] }));
            const ids = (list.items || []).map(i => i.contentDetails?.videoId).filter(Boolean);
            if (ids.length) videos = (await api("videos", { part: "snippet,contentDetails,statistics", id: ids.join(",") })).items || [];
        }
        const analysis = analyseUploads(channel, videos);
        channelInfo = {
            subs: Number(channel.statistics?.subscriberCount || 0),
            hiddenSubs: Boolean(channel.statistics?.hiddenSubscriberCount),
            avgLongMinutes: analysis.avgLongMinutes,
            shorts90: analysis.shorts90
        };
        const handle = channel.snippet?.customUrl || "";
        sharedChannel = {
            id: /^@[\w.-]{3,}$/.test(handle) ? handle : channel.id,
            title: channel.snippet?.title || "saluran ini"
        };
        renderChannel(channel, analysis);
        syncShareUrl();
        document.getElementById("longViews").value = Math.round(analysis.longMonthly);
        document.getElementById("shortsViews").value = Math.round(analysis.shortsMonthly);
        document.getElementById("longViews").dispatchEvent(new Event("input", { bubbles: true }));
        showLookupStatus("", false);
    } catch (error) {
        showLookupStatus(error.message, true);
    } finally {
        button.disabled = false;
    }
}

// Buka pautan kongsi: isi niche dan penonton daripada pautan, kemudian cari saluran secara automatik.
// Dijalankan selepas calculator-state.js memulihkan input tersimpan pelawat (juga pada DOMContentLoaded).
function applySharedLink() {
    const params = new URLSearchParams(window.location.search);
    const saluran = params.get("saluran");
    if (!saluran) return;
    const setSelect = (id, value) => {
        const el = document.getElementById(id);
        if (value && [...el.options].some(option => option.value === value)) el.value = value;
    };
    setSelect("niche", params.get("niche"));
    setSelect("audience", params.get("penonton"));
    // Pautan kongsi menunjukkan anggaran saluran itu, bukan RPM atau tajaan peribadi pelawat.
    document.getElementById("customRpm").value = "";
    document.getElementById("sponsorship").value = 0;
    document.getElementById("taxInfo").checked = true;
    document.getElementById("ytUrl").value = saluran;
    calculateYoutube();
    lookupChannel();
}

if (API_KEY) {
    document.getElementById("ytLookupCard").hidden = false;
    document.getElementById("ytLookup").addEventListener("click", lookupChannel);
    document.getElementById("ytUrl").addEventListener("keydown", event => {
        if (event.key === "Enter") { event.preventDefault(); lookupChannel(); }
    });
    document.getElementById("ytShare").addEventListener("click", shareResult);
    ["niche", "audience"].forEach(id => document.getElementById(id).addEventListener("change", () => {
        if (sharedChannel) syncShareUrl();
    }));
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", applySharedLink);
    else applySharedLink();
}

document.getElementById("calculateYoutubeButton").addEventListener("click", calculateYoutube);
document.querySelectorAll(".calculator-form-card input, .calculator-form-card select").forEach(el => {
    el.addEventListener("input", calculateYoutube);
    el.addEventListener("change", calculateYoutube);
});
calculateYoutube();
