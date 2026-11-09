// Hand-drawn SVG sprites. Everything is inline, so there are no image files to load
// and sprites stay sharp at any size. Each function returns an <svg> string.
window.KR = window.KR || {};

KR.art = (function () {
  function svg(body, vb) {
    return '<svg class="sprite" viewBox="' + (vb || '0 0 48 48') + '" aria-hidden="true">' + body + '</svg>';
  }
  var OL = 'stroke="#3a2a1f" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"';

  var products = {
    cokelat:
      '<path d="M9 14h30v22H9z" fill="#6b3a1f" ' + OL + '/>' +
      '<path d="M19 14v22M29 14v22M9 25h30" stroke="#4a2612" stroke-width="1.6"/>' +
      '<path d="M7 28l34-8v20H7z" fill="#c0453a" ' + OL + '/>' +
      '<path d="M7 33l34-8" stroke="#ffd23f" stroke-width="2.2"/>',
    airtin:
      '<path d="M15 8h18l2 4v26l-2 4H15l-2-4V12z" fill="#2f7fd1" ' + OL + '/>' +
      '<path d="M13 18h22v12H13z" fill="#e8f4fb"/>' +
      '<path d="M18 24c2-3 4 3 6 0s4 3 6 0" fill="none" stroke="#d6332b" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M17 8l1-3h12l1 3" fill="#c9d3dc" ' + OL + '/><circle cx="24" cy="6" r="1" fill="#3a2a1f"/>',
    air:
      '<rect x="19" y="4" width="10" height="5" rx="1.5" fill="#2f7fd1" ' + OL + '/>' +
      '<path d="M18 9h12l2 6v25a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4V15z" fill="#bfe6ff" ' + OL + '/>' +
      '<rect x="16" y="22" width="16" height="9" fill="#2f7fd1"/>' +
      '<path d="M21 26.5h6" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>' +
      '<path d="M20 13v5" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>',
    roti:
      '<path d="M6 22c0-8 8-11 18-11s18 3 18 11c0 3-2 4-4 4v12a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V26c-2 0-4-1-4-4z" fill="#e3a35a" ' + OL + '/>' +
      '<path d="M10 26h28" stroke="#b9772f" stroke-width="1.4"/>' +
      '<path d="M16 15c2 2 2 5 0 7M24 13c2 2 2 6 0 8M32 15c2 2 2 5 0 7" fill="none" stroke="#fff3d6" stroke-width="2" stroke-linecap="round"/>' +
      '<rect x="14" y="30" width="20" height="6" rx="2" fill="#fff" ' + OL + '/>' +
      '<path d="M18 33h12" stroke="#c0453a" stroke-width="1.6" stroke-linecap="round"/>',
    maggi:
      '<path d="M8 10h32l-2 30H10z" fill="#ffd23f" ' + OL + '/>' +
      '<path d="M8.6 18h30.8l-.6 8H9.2z" fill="#d6332b"/>' +
      '<path d="M13 22c2-2 4 2 6 0s4 2 6 0 4 2 6 0 4 2 4 0" fill="none" stroke="#ffe9a8" stroke-width="1.8" stroke-linecap="round"/>' +
      '<circle cx="24" cy="33" r="4" fill="#fff" ' + OL + '/>' +
      '<path d="M22 33h4" stroke="#d6332b" stroke-width="1.6" stroke-linecap="round"/>' +
      '<path d="M8 10l2-3h28l2 3" fill="#f2b705" ' + OL + '/>',
    telur:
      '<path d="M4 30h40l-3 10H7z" fill="#c9b28a" ' + OL + '/>' +
      '<ellipse cx="13" cy="25" rx="6" ry="7.5" fill="#f3d9b6" ' + OL + '/>' +
      '<ellipse cx="24" cy="23" rx="6" ry="7.5" fill="#fbe8cf" ' + OL + '/>' +
      '<ellipse cx="35" cy="25" rx="6" ry="7.5" fill="#f3d9b6" ' + OL + '/>' +
      '<path d="M21 19.5c.8-1.5 2-2.3 3-2.5" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>' +
      '<path d="M8 34h32" stroke="#a8916a" stroke-width="1.4"/>',
    aiskrim:
      '<path d="M15 22l9 22 9-22z" fill="#e9a756" ' + OL + '/>' +
      '<path d="M18 27l9 5M21 34l5-8M17 24l13 0" stroke="#b9772f" stroke-width="1.2"/>' +
      '<circle cx="24" cy="15" r="9" fill="#ff9fc0" ' + OL + '/>' +
      '<path d="M15 20c3 3 5 0 9 3 4-3 6 0 9-3" fill="#ff9fc0" ' + OL + '/>' +
      '<circle cx="24" cy="5.5" r="2.5" fill="#d6332b" ' + OL + '/>' +
      '<path d="M20 11c1-2 3-3 5-3" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>',
    payung:
      '<path d="M4 24C5 12 14 6 24 6s19 6 20 18c-3-2-6-2-8 0-2-2-6-2-8 0-2-2-6-2-8 0-2-2-6-2-8 0-2-2-5-2-8 0z" fill="#2f9e6e" ' + OL + '/>' +
      '<path d="M24 6c-4 4-6 10-4 18M24 6c4 4 6 10 4 18" fill="none" stroke="#1f6e4c" stroke-width="1.4"/>' +
      '<path d="M24 24v14a4 4 0 0 1-8 0" fill="none" ' + OL + ' stroke-width="2.4"/>' +
      '<path d="M24 3v3" ' + OL + ' stroke-width="2.4"/>',
    beras:
      '<path d="M11 12c0-3 4-5 13-5s13 2 13 5l3 28a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3z" fill="#f4efe2" ' + OL + '/>' +
      '<path d="M12 10c4 3 20 3 24 0" fill="none" ' + OL + '/>' +
      '<rect x="13" y="20" width="22" height="13" rx="2" fill="#2f9e6e" ' + OL + '/>' +
      '<path d="M18 27c2-3 4-3 6 0s4 3 6 0" fill="none" stroke="#ffd23f" stroke-width="2" stroke-linecap="round"/>' +
      '<circle cx="19" cy="38" r="1" fill="#c9b28a"/><circle cx="24" cy="39" r="1" fill="#c9b28a"/><circle cx="29" cy="38" r="1" fill="#c9b28a"/>',
    minyak:
      '<path d="M20 4h8v5h-8z" fill="#d6332b" ' + OL + '/>' +
      '<path d="M18 9h12l4 8v23a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4V17z" fill="#ffd23f" ' + OL + '/>' +
      '<rect x="14" y="22" width="20" height="12" fill="#f08a24"/>' +
      '<path d="M24 25c-3 4-3 6 0 6s3-2 0-6z" fill="#fff3d6"/>' +
      '<path d="M19 14v6" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>',
    gula:
      '<path d="M12 8h24l2 34H10z" fill="#ffffff" ' + OL + '/>' +
      '<path d="M12 8l2-3h20l2 3" fill="#e8e2d0" ' + OL + '/>' +
      '<rect x="12.5" y="18" width="23" height="12" fill="#2f7fd1"/>' +
      '<path d="M18 24h12" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>' +
      '<path d="M17 36l2-2 2 2-2 2zM26 36l2-2 2 2-2 2z" fill="#cfd8f2"/>',
    mainan:
      '<circle cx="15" cy="12" r="5" fill="#b9772f" ' + OL + '/><circle cx="33" cy="12" r="5" fill="#b9772f" ' + OL + '/>' +
      '<circle cx="24" cy="20" r="11" fill="#d99a52" ' + OL + '/>' +
      '<ellipse cx="24" cy="36" rx="11" ry="9" fill="#d99a52" ' + OL + '/>' +
      '<ellipse cx="24" cy="24" rx="4.5" ry="3.5" fill="#f3d9b6"/>' +
      '<circle cx="20" cy="18" r="1.4" fill="#3a2a1f"/><circle cx="28" cy="18" r="1.4" fill="#3a2a1f"/><circle cx="24" cy="23" r="1.3" fill="#3a2a1f"/>' +
      '<path d="M18 30l6 3 6-3-6 4z" fill="#d6332b" ' + OL + '/>',
    tcg:
      '<rect x="7" y="9" width="20" height="30" rx="3" fill="#8e5bd1" ' + OL + ' transform="rotate(-12 17 24)"/>' +
      '<rect x="18" y="7" width="22" height="33" rx="3" fill="#2f7fd1" ' + OL + '/>' +
      '<rect x="21" y="10" width="16" height="14" rx="1.5" fill="#bfe6ff"/>' +
      '<path d="M29 12l2 4 4 .5-3 3 .8 4-3.8-2-3.8 2 .8-4-3-3 4-.5z" fill="#ffd23f" ' + OL + ' stroke-width="1"/>' +
      '<path d="M22 29h14M22 33h10" stroke="#fff" stroke-width="2" stroke-linecap="round"/>'
  };

  var weathers = {
    sun: '<circle cx="24" cy="24" r="9" fill="#ffc83d" ' + OL + '/>' +
      '<g stroke="#f29b05" stroke-width="3" stroke-linecap="round"><path d="M24 4v6M24 38v6M4 24h6M38 24h6M10 10l4 4M34 34l4 4M38 10l-4 4M10 38l4-4"/></g>',
    cloud: function (fill, x, y) {
      return '<path transform="translate(' + (x || 0) + ' ' + (y || 0) + ')" d="M12 36a8 8 0 0 1 0-16 11 11 0 0 1 21-3 8 8 0 0 1 3 19z" fill="' + fill + '" ' + OL + '/>';
    }
  };
  function weather(id) {
    var c = weathers.cloud;
    if (id === 'panas') return svg(weathers.sun);
    if (id === 'cerah') return svg('<g transform="translate(-6 -6) scale(.85)">' + weathers.sun + '</g>' + c('#fff', 4, 6));
    if (id === 'mendung') return svg(c('#d7dde3', -4, -4) + c('#b8c2cc', 4, 4));
    if (id === 'hujan') return svg(c('#9fb0bf', 0, -4) +
      '<g stroke="#2f7fd1" stroke-width="2.4" stroke-linecap="round"><path d="M16 38l-2 5M24 38l-2 5M32 38l-2 5"/></g>');
    return svg(c('#6c7a88', 0, -4) + '<path d="M26 32l-6 8h5l-3 7 9-10h-5l3-5z" fill="#ffc83d" ' + OL + '/>');
  }

  var upgrades = {
    rak: '<path d="M4 18h40v24H4z" fill="#f6e7c8" ' + OL + '/><path d="M4 12h40l-2 6H6z" fill="#c0453a" ' + OL + '/>' +
      '<path d="M17 18v24M31 18v24" ' + OL + '/>' +
      '<path d="M7 24h7v18H7zM34 24h7v18h-7z" fill="#9c7445"/><path d="M20 24h8v18h-8z" fill="#3a2a1f"/>' +
      '<path d="M38 2v8M34 6h8" stroke="#2f9e6e" stroke-width="3" stroke-linecap="round"/>',
    lewat: '<path d="M30 6a17 17 0 1 0 12 26A14 14 0 0 1 30 6z" fill="#ffd23f" ' + OL + '/>' +
      '<circle cx="17" cy="31" r="10" fill="#fff" ' + OL + '/><path d="M17 25v6l4 3" fill="none" ' + OL + ' stroke-width="2.2"/>',
    peti: '<rect x="12" y="4" width="24" height="40" rx="3" fill="#e8f4fb" ' + OL + '/>' +
      '<path d="M12 18h24" ' + OL + '/><path d="M31 9v5M31 22v8" stroke="#3a2a1f" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="M17 30l3-3 3 3-3 3z" fill="#7cc6ee"/>',
    kipas: '<path d="M24 2v12" ' + OL + ' stroke-width="2.4"/>' +
      '<ellipse cx="11" cy="20" rx="12" ry="3.5" fill="#9c7445" ' + OL + '/><ellipse cx="37" cy="20" rx="12" ry="3.5" fill="#9c7445" ' + OL + '/>' +
      '<circle cx="24" cy="19" r="5" fill="#e8e2d0" ' + OL + '/>' +
      '<path d="M14 30c3 2 6 2 9 0M26 34c3 2 6 2 9 0M10 38c3 2 6 2 9 0" fill="none" stroke="#7cc6ee" stroke-width="2" stroke-linecap="round"/>',
    qr: '<rect x="13" y="3" width="22" height="42" rx="4" fill="#3a2a1f"/><rect x="15.5" y="8" width="17" height="30" rx="1" fill="#fff"/>' +
      '<g fill="#d6336c"><rect x="17" y="10" width="6" height="6"/><rect x="25" y="10" width="6" height="6"/><rect x="17" y="18" width="6" height="6"/>' +
      '<rect x="25" y="19" width="2" height="2"/><rect x="28" y="21" width="3" height="3"/><rect x="25" y="23" width="2" height="2"/></g>' +
      '<rect x="17" y="27" width="14" height="4" rx="1" fill="#d6336c"/><circle cx="24" cy="41.5" r="1.6" fill="#fff"/>',
    papan: '<rect x="3" y="10" width="42" height="20" rx="3" fill="#23312b" ' + OL + '/>' +
      '<g fill="#ffc83d"><circle cx="9" cy="16" r="1.6"/><circle cx="14" cy="16" r="1.6"/><circle cx="19" cy="16" r="1.6"/><circle cx="24" cy="16" r="1.6"/><circle cx="29" cy="16" r="1.6"/><circle cx="34" cy="16" r="1.6"/><circle cx="39" cy="16" r="1.6"/></g>' +
      '<g fill="#5ee0a0"><circle cx="9" cy="24" r="1.6"/><circle cx="14" cy="24" r="1.6"/><circle cx="19" cy="24" r="1.6"/><circle cx="24" cy="24" r="1.6"/><circle cx="29" cy="24" r="1.6"/><circle cx="34" cy="24" r="1.6"/><circle cx="39" cy="24" r="1.6"/></g>' +
      '<path d="M14 30v12M34 30v12" ' + OL + ' stroke-width="2.4"/>',
    capit:
      '<rect x="10" y="4" width="28" height="40" rx="3" fill="#e86f9a" ' + OL + '/>' +
      '<rect x="13" y="8" width="22" height="20" rx="1.5" fill="#cfe9f3" ' + OL + '/>' +
      '<path d="M24 8v8" ' + OL + '/><path d="M20 19l4-3 4 3M20 19v3M28 19v3" fill="none" ' + OL + '/>' +
      '<circle cx="18" cy="25" r="2.5" fill="#ffd23f"/><circle cx="24" cy="26" r="2.5" fill="#2f9e6e"/><circle cx="30" cy="25" r="2.5" fill="#2f7fd1"/>' +
      '<rect x="14" y="32" width="20" height="8" rx="1.5" fill="#3a2a1f"/><circle cx="19" cy="36" r="2" fill="#d6332b"/><path d="M28 33v4" stroke="#fff" stroke-width="2" stroke-linecap="round"/>',
    bank:
      '<path d="M4 18L24 6l20 12z" fill="#2f7fd1" ' + OL + '/>' +
      '<rect x="6" y="18" width="36" height="4" fill="#cfd8f2" ' + OL + '/>' +
      '<path d="M10 22v14M18 22v14M30 22v14M38 22v14" ' + OL + ' stroke-width="3"/>' +
      '<rect x="5" y="36" width="38" height="6" rx="1" fill="#cfd8f2" ' + OL + '/>' +
      '<circle cx="24" cy="29" r="5" fill="#ffd23f" ' + OL + '/><path d="M24 26.5v5" stroke="#3a2a1f" stroke-width="1.4"/>'
  };
  // SSM certificate and the company mailbox
  upgrades.ssm =
    '<rect x="7" y="6" width="34" height="36" rx="2" fill="#fffdf6" ' + OL + '/>' +
    '<path d="M13 13h22M13 18h22M13 23h14" stroke="#9c7445" stroke-width="1.8" stroke-linecap="round"/>' +
    '<circle cx="32" cy="33" r="6" fill="#c0453a" ' + OL + '/><path d="M29 38l-2 7 5-3 5 3-2-7" fill="#c0453a" ' + OL + '/>' +
    '<path d="M30 33l1.5 1.5 3-3" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>';
  upgrades.petisurat =
    '<path d="M22 30v16" stroke="#6d4a2a" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M8 30V18a9 9 0 0 1 9-9h16a9 9 0 0 1 9 9v12z" fill="#2f7f80" ' + OL + '/>' +
    '<path d="M8 18a9 9 0 0 1 18 0v12" fill="#256566" ' + OL + '/>' +
    '<rect x="11" y="17" width="12" height="8" rx="1" fill="#fffdf6" ' + OL + '/><path d="M11 17l6 4.5 6-4.5" fill="none" ' + OL + '/>' +
    '<path d="M36 22V8h7v5h-7" fill="#c0453a" ' + OL + '/>';
  upgrades.tcg = products.tcg;

  // People: a seeded mix of skin tones, clothes and headwear.
  var SKIN = ['#f3c9a4', '#e0a87e', '#c68856', '#9a6440', '#f6d5b8'];
  var SHIRT = ['#d6332b', '#2f7fd1', '#2f9e6e', '#f2b705', '#8e5bd1', '#e86f9a', '#2a9d8f', '#f08a24'];
  var PANTS = ['#2d3a4a', '#5a4632', '#3c4f63', '#4a4a4a'];
  var HEAD = ['hair', 'tudung', 'songkok', 'cap', 'hair', 'tudung', 'bun'];

  function person(seed, opts) {
    opts = opts || {};
    var r = function (n, k) { return Math.abs(Math.floor(Math.sin(seed * 9.13 + k * 3.7) * 10000)) % n; };
    var skin = SKIN[r(SKIN.length, 1)], shirt = opts.shirt || SHIRT[r(SHIRT.length, 2)];
    var pants = PANTS[r(PANTS.length, 3)], head = opts.head || HEAD[r(HEAD.length, 4)];
    var veil = SHIRT[r(SHIRT.length, 5)];
    var hw = '';
    if (head === 'hair') hw = '<path d="M14 13a10 10 0 0 1 20 0c0 2-1 3-2 3-1-4-5-5-8-5s-7 1-8 5c-1 0-2-1-2-3z" fill="#2b1d14"/>';
    if (head === 'bun') hw = '<circle cx="24" cy="4" r="4" fill="#2b1d14"/><path d="M14 13a10 10 0 0 1 20 0c-3-3-17-3-20 0z" fill="#2b1d14"/>';
    if (head === 'songkok') hw = '<path d="M15 10h18v-4c-6-2-12-2-18 0z" fill="#1d1d1d" ' + OL + '/>';
    if (head === 'cap') hw = '<path d="M14 11a10 7 0 0 1 20 0z" fill="' + veil + '" ' + OL + '/><path d="M30 11h8" stroke="' + veil + '" stroke-width="3" stroke-linecap="round"/>';
    var face = '<circle cx="24" cy="14" r="9" fill="' + skin + '" ' + OL + '/>';
    if (head === 'tudung') face = '<path d="M12 18a12 13 0 0 1 24 0v12H12z" fill="' + veil + '" ' + OL + '/>' +
      '<ellipse cx="24" cy="15" rx="7" ry="7.5" fill="' + skin + '" ' + OL + '/>';
    var apron = opts.apron ? '<path d="M19 28h10v16H19z" fill="#fff" ' + OL + '/>' : '';
    return svg(
      '<g class="legs"><path d="M20 46v10M28 46v10" stroke="' + pants + '" stroke-width="5" stroke-linecap="round"/></g>' +
      '<path d="M14 30a10 6 0 0 1 20 0v17H14z" fill="' + shirt + '" ' + OL + '/>' +
      apron + face + hw +
      '<circle cx="21" cy="15" r="1.1" fill="#3a2a1f"/><circle cx="27" cy="15" r="1.1" fill="#3a2a1f"/>' +
      '<path d="M21.5 19c1.5 1.2 3.5 1.2 5 0" fill="none" stroke="#3a2a1f" stroke-width="1.2" stroke-linecap="round"/>',
      '0 -2 48 62');
  }
  upgrades.pembantu = null; // drawn with person()

  function star(on) {
    return '<svg class="sprite star' + (on ? '' : ' off') + '" viewBox="0 0 48 48" aria-hidden="true">' +
      '<path d="M24 4l6 13 14 1.5-10.5 9.5 3 14L24 35l-12.5 7 3-14L4 18.5 18 17z" fill="' + (on ? '#ffc83d' : '#ddd6c3') + '" ' + OL + '/></svg>';
  }

  return {
    product: function (id) { return svg(products[id] || ''); },
    weather: weather,
    upgrade: function (id) {
      if (id === 'pembantu') return person(7, { shirt: '#1f7a55', head: 'songkok', apron: true });
      if (id === 'pengurus') return person(21, { shirt: '#2d3a4a', head: 'hair' });
      return svg(upgrades[id] || '');
    },
    person: person,
    star: star
  };
})();
