// Sound effects synthesised with the Web Audio API: no audio files, no licences.
window.KR = window.KR || {};

KR.audio = (function () {
  var ctx = null, KEY = 'kedaiRuncit.muted';
  var muted = KR.platform.storage.load(KEY) === true;
  var lastCoin = 0;

  // Browsers only allow audio after a tap, so the context is created lazily.
  function ac() {
    if (muted) return null;
    if (!ctx) {
      var A = window.AudioContext || window.webkitAudioContext;
      if (!A) return null;
      try { ctx = new A(); } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(c, freq, start, dur, vol, type) {
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(vol, start + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g); g.connect(c.destination);
    o.start(start); o.stop(start + dur + 0.02);
  }

  function noise(c, start, dur, vol) {
    var len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 2500;
    g.gain.value = vol;
    src.buffer = buf; src.connect(f); f.connect(g); g.connect(c.destination);
    src.start(start);
  }

  return {
    // Cash register: mechanical "ka" then a bright double bell "ching".
    kaching: function () {
      var c = ac(); if (!c) return;
      var t = c.currentTime + 0.01;
      noise(c, t, 0.06, 0.35);
      tone(c, 180, t, 0.07, 0.25, 'square');
      tone(c, 1568, t + 0.08, 0.9, 0.18);
      tone(c, 2093, t + 0.08, 1.1, 0.14);
      tone(c, 3136, t + 0.08, 0.5, 0.05);
    },
    // Small coin "ting" for each sale during the day (throttled).
    coin: function () {
      var c = ac(); if (!c) return;
      var now = c.currentTime;
      if (now - lastCoin < 0.12) return;
      lastCoin = now;
      tone(c, 1975, now + 0.01, 0.18, 0.06);
      tone(c, 2637, now + 0.05, 0.22, 0.05);
    },
    // Low "hmm" when a customer leaves unhappy.
    sad: function () {
      var c = ac(); if (!c) return;
      var t = c.currentTime + 0.01;
      tone(c, 220, t, 0.18, 0.05, 'triangle');
      tone(c, 175, t + 0.12, 0.25, 0.05, 'triangle');
    },
    click: function () {
      var c = ac(); if (!c) return;
      tone(c, 900, c.currentTime + 0.005, 0.05, 0.04, 'triangle');
    },
    isMuted: function () { return muted; },
    setMuted: function (m) {
      muted = !!m;
      KR.platform.storage.save(KEY, muted);
      if (muted && ctx) { ctx.close(); ctx = null; }
    }
  };
})();
