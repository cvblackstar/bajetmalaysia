// Chunky, chibi-style 3D people built from primitives (no model files).
// A character is a set of parts: skin, headwear, top, bottom, extras, each with a colour.
// The same parts will drive the "Reka Tauke" creator later.
window.KR = window.KR || {};

KR.chars = (function () {
  var T = null, geo = {};

  var PALETTE = {
    skin: [0xf6d2b4, 0xeab48c, 0xd29a6c, 0xb07a52, 0x8a5a3c],
    hair: [0x2b1d14, 0x3d2a1e, 0x14100d, 0x5a3b25],
    cloth: [0xd6332b, 0x2f7fd1, 0x2f9e6e, 0xf2b705, 0x8e5bd1, 0xe86f9a, 0x2a9d8f, 0xf08a24, 0x1f4e79, 0xf5f0e6, 0x6b8e23, 0xc2185b],
    pants: [0x2d3a4a, 0x5a4632, 0x3c4f63, 0x4a4a4a, 0x7a6a55],
    songket: [0xb8860b, 0x8b1a1a, 0x1a3c8b, 0x2e5d32],
    shoe: [0xf2f2f2, 0x2b2b2b, 0x8b5a2b, 0x1f4e79]
  };

  // Which outfits go together, so random customers look natural.
  var LOOKS = [
    { head: 'tudung', top: 'kurung', bottom: 'kain', w: 3 },
    { head: 'tudung', top: 'tshirt', bottom: 'kain', w: 2 },
    { head: 'songkok', top: 'melayu', bottom: 'seluar', samping: true, w: 1.5 },
    { head: 'kopiah', top: 'melayu', bottom: 'seluar', w: 1.5 },
    { head: 'kopiah', top: 'kemeja', bottom: 'seluar', w: 1 },
    { head: 'short', top: 'tshirt', bottom: 'seluar', w: 3 },
    { head: 'short', top: 'kemeja', bottom: 'seluar', w: 2 },
    { head: 'cap', top: 'tshirt', bottom: 'shorts', w: 2 },
    { head: 'long', top: 'tshirt', bottom: 'skirt', w: 1.5 },
    { head: 'bun', top: 'kurung', bottom: 'kain', w: 1 },
    { head: 'bald', top: 'pagoda', bottom: 'kain', w: 1 }        // pakcik in singlet and kain pelikat
  ];

  function init(THREE) {
    T = THREE;
    // Shared geometries: created once, reused by every character.
    geo.head = new T.SphereGeometry(0.36, 24, 18);
    geo.ear = new T.SphereGeometry(0.07, 10, 8);
    geo.eye = new T.SphereGeometry(0.055, 12, 10);
    geo.glint = new T.SphereGeometry(0.018, 6, 6);
    geo.cheek = new T.CircleGeometry(0.05, 12);
    geo.mouth = new T.TorusGeometry(0.045, 0.012, 6, 12, Math.PI);
    geo.torso = new T.CapsuleGeometry(0.24, 0.22, 8, 16);
    geo.arm = new T.CapsuleGeometry(0.075, 0.26, 6, 10);
    geo.hand = new T.SphereGeometry(0.075, 10, 8);
    geo.leg = new T.CapsuleGeometry(0.085, 0.2, 6, 10);
    geo.shoe = new T.CapsuleGeometry(0.085, 0.1, 6, 10);
    geo.hairCap = new T.SphereGeometry(0.385, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.58);
    geo.fringe = new T.SphereGeometry(0.39, 20, 8, -Math.PI * 0.42, Math.PI * 0.84, Math.PI * 0.3, Math.PI * 0.16);
    geo.longHair = new T.CylinderGeometry(0.34, 0.37, 0.55, 20, 1, true, Math.PI * 0.55, Math.PI * 0.9);
    geo.bun = new T.SphereGeometry(0.13, 12, 10);
    geo.tudung = new T.SphereGeometry(0.42, 24, 18);
    geo.face = new T.SphereGeometry(0.3, 20, 16);
    geo.drape = new T.CylinderGeometry(0.3, 0.46, 0.34, 20, 1, true);
    geo.songkok = new T.CylinderGeometry(0.3, 0.31, 0.2, 20);
    geo.kopiah = new T.SphereGeometry(0.33, 20, 8, 0, Math.PI * 2, 0, Math.PI * 0.32);
    geo.capTop = new T.SphereGeometry(0.385, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.45);
    geo.visor = new T.CylinderGeometry(0.22, 0.22, 0.03, 16, 1, false, -Math.PI / 2, Math.PI);
    geo.longTop = new T.CylinderGeometry(0.27, 0.38, 0.62, 18);
    geo.kain = new T.CylinderGeometry(0.3, 0.33, 0.42, 18);
    geo.skirt = new T.CylinderGeometry(0.26, 0.4, 0.3, 18);
    geo.samping = new T.CylinderGeometry(0.29, 0.34, 0.2, 18);
    geo.collar = new T.TorusGeometry(0.16, 0.03, 6, 16);
    geo.lens = new T.TorusGeometry(0.075, 0.014, 6, 16);
    geo.bag = new T.BoxGeometry(0.2, 0.22, 0.12);
    geo.bagHandle = new T.TorusGeometry(0.06, 0.012, 4, 10, Math.PI);
  }

  function m(color, rough) { return new T.MeshStandardMaterial({ color: color, roughness: rough == null ? 0.7 : rough }); }
  function add(parent, g, mat, x, y, z) { var o = new T.Mesh(g, mat); o.position.set(x || 0, y || 0, z || 0); parent.add(o); return o; }

  function rng(seed) {
    var s = (seed * 9301 + 49297) % 233280;
    return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  }
  function pick(r, list) { return list[Math.floor(r() * list.length)]; }

  // Turn a seed into a full character description.
  function randomLook(seed) {
    var r = rng(seed + 1), total = LOOKS.reduce(function (t, l) { return t + l.w; }, 0), x = r() * total, look = LOOKS[0];
    for (var i = 0; i < LOOKS.length; i++) { x -= LOOKS[i].w; if (x <= 0) { look = LOOKS[i]; break; } }
    var top = pick(r, PALETTE.cloth), kainCol = look.top === 'kurung' && r() < 0.6 ? top : pick(r, PALETTE.cloth);
    return {
      skin: pick(r, PALETTE.skin), hair: pick(r, PALETTE.hair), head: look.head,
      headColor: pick(r, PALETTE.cloth), top: look.top, topColor: top,
      bottom: look.bottom, bottomColor: look.bottom === 'seluar' || look.bottom === 'shorts' ? pick(r, PALETTE.pants) : kainCol,
      samping: look.samping ? pick(r, PALETTE.songket) : null,
      shoe: pick(r, PALETTE.shoe), glasses: r() < 0.18, kid: r() < 0.15
    };
  }

  function build(d) {
    var g = new T.Group(), body = new T.Group(); g.add(body);
    var skin = m(d.skin, 0.6), top = m(d.topColor), bottom = m(d.bottomColor), shoe = m(d.shoe, 0.5);
    var hair = m(d.hair, 0.5), dark = m(0x1a1412, 0.3), white = m(0xffffff, 0.2), pink = m(0xff8a8a, 0.9);
    pink.transparent = true; pink.opacity = 0.45;

    // Legs pivot at the hips so they can swing; shoes ride along.
    var legs = [], arms = [];
    [-0.11, 0.11].forEach(function (x) {
      var hip = new T.Group(); hip.position.set(x, 0.44, 0); body.add(hip);
      var bare = d.bottom === 'shorts';
      add(hip, geo.leg, bare ? skin : (d.bottom === 'seluar' ? bottom : skin), 0, -0.2, 0);
      if (bare) add(hip, geo.leg, bottom, 0, -0.08, 0).scale.set(1.25, 0.45, 1.25);
      var s = add(hip, geo.shoe, shoe, 0, -0.38, 0.04); s.rotation.x = Math.PI / 2; s.scale.set(1.15, 1, 0.8);
      legs.push(hip);
    });

    // Bottoms worn over the legs
    if (d.bottom === 'kain') add(body, geo.kain, bottom, 0, 0.3, 0);
    if (d.bottom === 'skirt') add(body, geo.skirt, bottom, 0, 0.4, 0);

    // Torso and top
    var torso = add(body, geo.torso, top, 0, 0.78, 0); torso.scale.set(1, 1, 0.82);
    if (d.top === 'kurung' || d.top === 'melayu') add(body, geo.longTop, top, 0, d.top === 'kurung' ? 0.62 : 0.68, 0).scale.set(1, d.top === 'kurung' ? 1 : 0.8, 0.85);
    if (d.top === 'melayu' || d.top === 'kemeja') { var c = add(body, geo.collar, d.top === 'kemeja' ? white : top, 0, 1.02, 0); c.rotation.x = Math.PI / 2; }
    if (d.top === 'pagoda') { torso.material = m(0xf5f5f0); }
    if (d.samping) add(body, geo.samping, m(d.samping, 0.4), 0, 0.5, 0).scale.set(1, 1, 0.9);

    // Arms pivot at the shoulders; sleeves are the top colour, hands are skin.
    [-1, 1].forEach(function (side) {
      var sh = new T.Group(); sh.position.set(side * 0.3, 0.95, 0); body.add(sh);
      var longSleeve = d.top === 'kurung' || d.top === 'melayu' || d.top === 'kemeja';
      var a = add(sh, geo.arm, d.top === 'pagoda' ? skin : top, 0, -0.18, 0);
      if (!longSleeve && d.top !== 'pagoda') { a.scale.set(1.1, 0.45, 1.1); a.position.y = -0.09; add(sh, geo.arm, skin, 0, -0.24, 0).scale.set(0.9, 0.7, 0.9); }
      add(sh, geo.hand, skin, 0, -0.38, 0);
      sh.rotation.z = side * 0.12;
      arms.push(sh);
    });

    // Plastic bag, shown once the customer has bought something
    var bag = new T.Group(); bag.position.set(0, -0.48, 0); bag.visible = false;
    add(bag, geo.bag, m(0xfafafa, 0.9), 0, 0, 0);
    add(bag, geo.bagHandle, m(0xfafafa, 0.9), 0, 0.12, 0);
    arms[1].add(bag);

    // Big chibi head
    var head = new T.Group(); head.position.set(0, 1.38, 0); body.add(head);
    var ht = d.head;
    if (ht === 'tudung') {
      add(head, geo.tudung, m(d.headColor, 0.8), 0, 0.02, -0.1);
      add(head, geo.face, skin, 0, -0.03, 0.17).scale.set(0.95, 1.05, 1);
      add(head, geo.drape, m(d.headColor, 0.8), 0, -0.36, 0);
    } else {
      add(head, geo.head, skin);
      add(head, geo.ear, skin, -0.35, -0.02, 0); add(head, geo.ear, skin, 0.35, -0.02, 0);
    }
    var fz = ht === 'tudung' ? 0.44 : 0.32;
    [-0.12, 0.12].forEach(function (x) {
      add(head, geo.eye, dark, x, 0.0, fz).scale.set(1, 1.25, 0.6);
      add(head, geo.glint, white, x + 0.02, 0.03, fz + 0.035);
      var ch = add(head, geo.cheek, pink, x * 1.55, -0.1, fz - 0.03); ch.rotation.y = x > 0 ? 0.35 : -0.35;
    });
    var mouth = add(head, geo.mouth, dark, 0, -0.12, fz + 0.01); mouth.rotation.z = Math.PI;

    if (ht === 'short' || ht === 'long' || ht === 'bun' || ht === 'cap' || ht === 'kopiah' || ht === 'songkok') {
      var hc = add(head, geo.hairCap, hair, 0, 0.0, -0.01); hc.rotation.x = -0.25;
      if (ht === 'short' || ht === 'long' || ht === 'bun') add(head, geo.fringe, hair, 0, 0.01, 0);
    }
    if (ht === 'long') add(head, geo.longHair, hair, 0, -0.22, -0.02);
    if (ht === 'bun') add(head, geo.bun, hair, 0, 0.33, -0.2);
    if (ht === 'songkok') add(head, geo.songkok, m(0x151515, 0.3), 0, 0.27, -0.02).rotation.x = -0.12;
    if (ht === 'kopiah') add(head, geo.kopiah, m(0xf7f7f2, 0.9), 0, 0.12, -0.02).rotation.x = -0.15;
    if (ht === 'cap') {
      add(head, geo.capTop, m(d.headColor), 0, 0.02, 0).rotation.x = -0.15;
      add(head, geo.visor, m(d.headColor), 0, 0.12, 0.3);
    }
    if (d.glasses) [-0.12, 0.12].forEach(function (x) { add(head, geo.lens, dark, x, 0, fz + 0.03); });

    var size = d.kid ? 0.9 : 1.25;                        // chibi folk read well from the top-down camera
    g.scale.setScalar(size);
    g.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    g.userData = { legs: legs, arms: arms, bag: bag, body: body, top: 1.85 * size };
    return g;
  }

  // Walk cycle / idle pose, called every frame.
  function animate(g, walking, t) {
    var u = g.userData, s = walking ? Math.sin(t / 110 + g.id) : 0;
    u.legs[0].rotation.x = s * 0.55; u.legs[1].rotation.x = -s * 0.55;
    u.arms[0].rotation.x = -s * 0.5; u.arms[1].rotation.x = s * 0.5;
    u.body.position.y = walking ? Math.abs(s) * 0.05 : Math.sin(t / 500 + g.id) * 0.012;
  }

  // Free materials only: geometries are shared between characters.
  function dispose(g) { g.traverse(function (o) { if (o.isMesh && o.material) o.material.dispose(); }); }

  return {
    init: init, randomLook: randomLook, build: build, animate: animate, dispose: dispose,
    make: function (seed) { return build(randomLook(seed)); },
    looks: LOOKS, palette: PALETTE
  };
})();
