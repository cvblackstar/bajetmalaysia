// Platform layer: everything that talks to the outside world goes through here,
// so the game logic never touches localStorage, a backend or a portal SDK directly.
// Later: swap/extend these for Supabase (leaderboard), a donation link and the
// CrazyGames SDK without touching sim.js or ui.js.
window.KR = window.KR || {};

KR.platform = {
  storage: {
    load: function (key) {
      try {
        var raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    },
    save: function (key, value) {
      try { window.localStorage.setItem(key, JSON.stringify(value)); return true; }
      catch (e) { return false; }
    },
    remove: function (key) {
      try { window.localStorage.removeItem(key); } catch (e) {}
    }
  },

  // TODO(leaderboard): post { shopName, value, stars } to Supabase at season end.
  leaderboard: {
    enabled: false,
    submit: function (entry) { return Promise.resolve({ ok: false, reason: 'disabled' }); },
    top: function () { return Promise.resolve([]); }
  },

  // TODO(donation): set a URL (e.g. Ko-fi / ToyyibPay) to show the button.
  donationUrl: '',

  // TODO(crazygames): map these to the CrazyGames SDK calls when published there.
  sdk: {
    gameplayStart: function () {},
    gameplayStop: function () {},
    happytime: function () {}
  }
};
