// Optional 3D street scene (three.js). Loaded in the background after the page starts.
// If WebGL or the module can't load, or the player picks 2D, the SVG scene is used instead.
window.KR = window.KR || {};

KR.scene3d = (function () {
  var THREE = null, ready = false, failed = false;
  var renderer, scene, camera, hemi, sun, rain, root, shopSign, shopLamp, shelfGroup, lights = [];
  var people = [], running = false, raf = 0;
  var PREF = 'kedaiRuncit.graphics';

  var SKY = { panas: 0xffd98a, cerah: 0x9fd6f2, mendung: 0xbcc6cf, hujan: 0x8596a5, ribut: 0x56636f };
  var LIGHT = { panas: 1.5, cerah: 1.3, mendung: 0.8, hujan: 0.6, ribut: 0.4 };

  function wanted() { return KR.platform.storage.load(PREF) !== '2d'; }
  function setWanted(on) { KR.platform.storage.save(PREF, on ? '3d' : '2d'); }

  function hasWebGL() {
    try { var c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); }
    catch (e) { return false; }
  }

  function load() {
    if (ready || failed || !wanted()) return Promise.resolve(ready);
    if (!hasWebGL()) { failed = true; return Promise.resolve(false); }
    return import('../vendor/three.module.min.js').then(function (mod) {
      THREE = mod; KR.chars.init(THREE); build(); ready = true;
      KR.models.load(THREE);                              // rigged models arrive a bit later; chibi ones fill in until then
      loadEnv();
      return true;
    }).catch(function () { failed = true; return false; });
  }

  function mat(color, opts) {
    return new THREE.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.85, flatShading: true }, opts || {}));
  }
  function box(w, h, d, color, x, y, z, parent) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    m.position.set(x, y, z); (parent || root).add(m); return m;
  }

  // Draws one of the SVG sprites from art.js onto a canvas texture.
  function svgTexture(svg, size) {
    size = size || 128;
    var canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
    var tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    var img = new Image();
    img.onload = function () { canvas.getContext('2d').drawImage(img, 0, 0, size, size); tex.needsUpdate = true; };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
      svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" '));
    return tex;
  }

  function signTexture(text, bg) {
    var c = document.createElement('canvas'); c.width = 1024; c.height = 128;
    var g = c.getContext('2d');
    g.fillStyle = bg || '#1f7a55'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#fff'; g.font = '600 64px Fredoka, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, c.width / 2, c.height / 2 + 4, c.width - 40);
    var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  function prism(len, h, depth, color, x, y, z, parent) {          // gable roof, ridge running along x
    var sh = new THREE.Shape();
    sh.moveTo(-depth / 2, 0); sh.lineTo(depth / 2, 0); sh.lineTo(0, h); sh.lineTo(-depth / 2, 0);
    var geo = new THREE.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false });
    geo.translate(0, 0, -len / 2);
    var m = new THREE.Mesh(geo, mat(color));
    m.rotation.y = Math.PI / 2; m.position.set(x, y, z); (parent || root).add(m); return m;
  }
  var prim = {};
  // The kilang across the road (built from boxes; the building pack has no factory).
  // FGATE is where its workers come out.
  var FAC = { x: -26, z: 16.8, w: 11, d: 8 }, FGATE = [-26, 12.6], factorySign = null, factoryLang = '', factoryLorry = null;
  function buildFactory() {
    var g = new THREE.Group(); root.add(g);
    var front = FAC.z - FAC.d / 2, x0 = FAC.x - FAC.w / 2;
    box(FAC.w, 3.0, FAC.d, 0xd9d4c7, FAC.x, 1.5, FAC.z, g);                                  // main hall
    box(FAC.w + 0.1, 0.5, FAC.d + 0.1, 0x7d8a93, FAC.x, 0.25, FAC.z, g);                     // plinth
    for (var k = 0; k < 4; k++) prism(FAC.w, 0.9, 2, 0x8fa3b0, FAC.x, 3.0, front + 1 + k * 2, g);  // sawtooth roof
    for (var k2 = 0; k2 < 4; k2++) box(FAC.w, 0.85, 0.06, 0xb9d9ea, FAC.x, 3.42, front + 1.95 + k2 * 2, g);
    var chim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 3.4, 10), mat(0xa7553a)); chim.position.set(x0 + 1.6, 4.4, FAC.z + 2.6); g.add(chim);
    box(0.84, 0.25, 0.84, 0xe8e3d8, x0 + 1.6, 6.0, FAC.z + 2.6, g);
    for (var wx = x0 + 1.1; wx < FAC.x + FAC.w / 2 - 0.6; wx += 1.6) {                       // windows along the front
      if (Math.abs(wx - FAC.x) < 1.6) continue;
      box(1.1, 0.7, 0.06, 0x9fd3ea, wx, 2.1, front - 0.02, g);
    }
    box(2.4, 2.2, 0.06, 0x3b3f44, FAC.x, 1.1, front - 0.03, g);                              // gate opening
    box(2.8, 0.18, 0.4, 0xf2b705, FAC.x, 2.3, front - 0.2, g);                               // awning over the gate
    // The gate faces the road (away from the camera), so the name board stands on the roof facing the player
    factorySign = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.9, 0.12), mat(0x2f4b63));
    factorySign.position.set(FAC.x + 1, 4.55, FAC.z + 1.2); g.add(factorySign);
    [-1.6, 1.6].forEach(function (dx) { box(0.1, 0.8, 0.1, 0x3b3f44, FAC.x + 1 + dx, 3.9, FAC.z + 1.15, g); });
    var back = FAC.z + FAC.d / 2, x1 = FAC.x + FAC.w / 2;
    for (var bx = x0 + 1.1; bx < x1 - 0.6; bx += 1.6) box(1.1, 0.7, 0.06, 0x9fd3ea, bx, 2.1, back + 0.02, g);   // windows the camera sees
    for (var bz = front + 1.2; bz < back - 0.6; bz += 1.6) box(0.06, 0.7, 1.1, 0x9fd3ea, x1 + 0.02, 2.1, bz, g);
    box(0.06, 2.2, 2.6, 0x6f7a82, x1 + 0.03, 1.1, back - 1.6, g);                                    // loading bay door
    var lorry = factoryLorry = new THREE.Group(); g.add(lorry);                                     // a lorry at the loading bay (Kenney's flatbed replaces it once loaded)
    box(1.4, 1.5, 3.2, 0xeeeeee, 0, 1.0, 0, lorry); box(1.4, 1.1, 1.1, 0x2f7fd1, 0, 0.8, -2.2, lorry);
    box(1.3, 0.45, 0.06, 0xcfe9f3, 0, 1.05, -2.76, lorry);
    lorry.position.set(x1 + 1.6, 0, back - 1.4);
    signFactory();
    for (var fx = x0; fx <= FAC.x + FAC.w / 2 + 0.01; fx += 1.1) {                           // fence, open at the gate
      if (Math.abs(fx - FAC.x) < 1.4) continue;
      box(0.08, 1.0, 0.08, 0x5a6066, fx, 0.5, front - 1.0, g);
    }
    [[x0, FAC.x - 1.4], [FAC.x + 1.4, FAC.x + FAC.w / 2]].forEach(function (r) {
      box(r[1] - r[0], 0.06, 0.06, 0x5a6066, (r[0] + r[1]) / 2, 0.9, front - 1.0, g);
      box(r[1] - r[0], 0.06, 0.06, 0x5a6066, (r[0] + r[1]) / 2, 0.5, front - 1.0, g);
    });
    box(2.6, 0.04, 2.0, 0xb0aa9c, FAC.x, 0.03, front - 0.9, g);                              // path to the pavement
    g.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }
  function signFactory() {
    var lang = KR.i18n.lang();
    if (!factorySign || lang === factoryLang) return;
    factoryLang = lang;
    var face = new THREE.MeshBasicMaterial({ map: signTexture(KR.i18n.t('KILANG') + ' MAJU JAYA') });
    factorySign.material = [mat(0x2f4b63), mat(0x2f4b63), mat(0x2f4b63), mat(0x2f4b63), face, mat(0x2f4b63)];
  }
  // One shop lot. Height is the model's; cut is where the roof is sliced off when zoomed in.
  var LOT = { w: 8.5, h: 3.7, cut: 2.3, front: 1.2, back: -7.2 }, LOTS = 3;
  function lotX(i) { return i * LOT.w; }
  // The shop model has thick double walls, so the room inside is smaller than the lot:
  // IN = inner side wall (from the lot's centre), BK = inner back wall. Shelves and the spots where
  // customers stand are laid out from these, so nobody stands inside a wall.
  // The three lots are one linked row of shophouses (kedai deret) built here: shared party walls,
  // one roof and a covered kaki lima. FZ = shop front, BZ = outside of the back wall.
  var FZ = 1.0, BZ = -6.0, WALL = 0.25, ROW_H = 3.5;
  var IN = LOT.w / 2 - WALL, BK = BZ + WALL;
  // Everything on the shop's side of the road to the right of the row moves with the row's length.
  var RX = 3 * (LOT.w - 7);
  var TREES = [[-6.3, -5], [4.6, -11.6], [19.5 + RX, -6.2], [3.5, 10.3], [-3.9, 10.3], [8.2, 10.3], [-21, -3], [13.3, 10.3]];
  function tree(x, z, s) {
    s = s || 1;
    box(0.25 * s, 1.2 * s, 0.25 * s, 0x7a5233, x, 0.6 * s, z, prim.trees);
    var c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 * s, 0), mat(0x3f9b5b));
    c.position.set(x, 1.7 * s, z); c.castShadow = true; prim.trees.add(c);
  }
  function house(x, z, wall, roof) {                       // rumah teres unit
    var g = prim.houses;
    box(3, 2.4, 3.6, wall, x, 1.2, z, g);
    prism(3.2, 1.3, 4.2, roof, x, 2.4, z, g);
    box(0.9, 1.6, 0.08, 0x9c7445, x - 0.6, 0.8, z + 1.82, g);
    box(1, 0.8, 0.08, 0xcfe9f3, x + 0.7, 1.3, z + 1.82, g);
  }

  // ---------- Zebra crossing and traffic ----------
  // People coming from across the road (the kilang, the houses opposite) use the zebra crossing at
  // ZX. They wait at the kerb while a car is going over it, and cars stop for anyone on it or waiting.
  var ZX = -5, KERB_NEAR = 3.25, KERB_FAR = 9.7, cars = [], carLamps = [];
  function buildZebra() {
    for (var z = 3.85; z < 8.3; z += 0.75) box(2.4, 0.02, 0.42, 0xf7f4ea, ZX, 0.035, z);
    [[ZX - 1.55, 3.42], [ZX + 1.55, 8.95]].forEach(function (p) {                  // beacon posts at each end
      for (var k = 0; k < 6; k++) box(0.1, 0.4, 0.1, k % 2 ? 0x222222 : 0xf2efe6, p[0], 0.2 + k * 0.4, p[1]);
      var globe = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), mat(0xffb020, { emissive: 0xff9a00, emissiveIntensity: 0.6 }));
      globe.position.set(p[0], 2.55, p[1]); root.add(globe);
    });
    [ZX - 2.4, ZX + 2.4].forEach(function (x, j) {                                // stop lines, one per lane
      box(0.15, 0.02, 2.3, 0xf7f4ea, x, 0.035, j ? 7.1 : 4.7);
    });
  }
  // Waypoints to cross the road at the zebra (off = a small sideways offset so people don't stack).
  // The second point is marked 'cross': walkers wait at the kerb until it's clear, then go over.
  function crossOver(off, toShop) {
    var x = ZX + off;
    return toShop ? [[x, KERB_FAR], [x, KERB_NEAR, 'cross']] : [[x, KERB_NEAR], [x, KERB_FAR, 'cross']];
  }
  function carOnCrossing() {
    return cars.some(function (c) { return Math.abs(c.g.position.x - ZX) < c.len / 2 + 1.3; });
  }
  function crossingBusy() {
    return people.some(function (p) {
      var x = p.g.position.x, z = p.g.position.z;
      return Math.abs(x - ZX) < 1.5 && (p.wait || p.crossing || (z > KERB_NEAR + 0.3 && z < KERB_FAR - 0.3));
    });
  }

  // Low-poly cars built here from side profiles (extruded across the car's width): a kancil-style
  // hatchback, a sedan, a teksi and a van, in bright flat colours with dark glass and round wheels.
  var CAR_TYPES = {
    hatch: { len: 2.2, wid: 1.2, body: [[-1.1, .28], [1.1, .28], [1.13, .5], [1.0, .66], [.55, .72], [.2, 1.12], [-.95, 1.14], [-1.1, 1.0], [-1.12, .5]],
             glass: [[.53, .74], [.22, 1.08], [-.9, 1.1], [-1.05, .98], [-1.07, .76]], pillar: -.3 },
    sedan: { len: 2.7, wid: 1.25, body: [[-1.35, .28], [1.35, .28], [1.38, .52], [1.25, .68], [.6, .74], [.25, 1.1], [-.55, 1.12], [-.95, .8], [-1.32, .74], [-1.38, .5]],
             glass: [[.58, .76], [.27, 1.06], [-.53, 1.08], [-.9, .79]], pillar: -.12 },
    van:   { len: 2.9, wid: 1.35, body: [[-1.45, .3], [1.45, .3], [1.48, .55], [1.35, .75], [1.05, .85], [.75, 1.45], [-1.4, 1.48], [-1.48, 1.35], [-1.48, .5]],
             glass: [[1.03, .87], [.77, 1.38], [-1.3, 1.4], [-1.3, .92]], pillar: .3 }
  };
  var CAR_COLOURS = [0x3fa7d6, 0xf25f5c, 0xffd166, 0x06d6a0, 0xa06cd5, 0xf78c6b, 0xeeeeee, 0x8d99ae];
  var carGeo = {};
  function profileGeo(pts, wid) {
    var sh = new THREE.Shape();
    pts.forEach(function (p, i) { if (i) sh.lineTo(p[0], p[1]); else sh.moveTo(p[0], p[1]); });
    var g = new THREE.ExtrudeGeometry(sh, { depth: wid, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 1 });
    g.translate(0, 0, -wid / 2); return g;
  }
  function makeCar(kind, colour) {
    var T = CAR_TYPES[kind === 'teksi' ? 'sedan' : kind], L = T.len, W = T.wid, g = new THREE.Group();
    var key = kind === 'teksi' ? 'sedan' : kind;
    carGeo[key] = carGeo[key] || { body: profileGeo(T.body, W - 0.08), glass: profileGeo(T.glass, W - 0.04) };
    g.add(new THREE.Mesh(carGeo[key].body, mat(colour, { roughness: 0.55 })));
    g.add(new THREE.Mesh(carGeo[key].glass, mat(0x26384a, { roughness: 0.25 })));
    var gb = T.glass.reduce(function (b, p) { return [Math.min(b[0], p[1]), Math.max(b[1], p[1])]; }, [9, 0]);
    box(0.1, gb[1] - gb[0], W + 0.0, colour, T.pillar, (gb[0] + gb[1]) / 2, 0, g);                    // middle pillar
    box(0.12, 0.14, W + 0.04, 0x3b3f44, L / 2 + 0.02, 0.34, 0, g); box(0.12, 0.14, W + 0.04, 0x3b3f44, -L / 2 - 0.02, 0.34, 0, g);   // bumpers
    box(0.04, 0.1, W * 0.35, 0x2a2a2a, L / 2 + 0.03, 0.5, 0, g);                                       // grille
    [-1, 1].forEach(function (sd) {
      var head = mat(0xfff6d8, { emissive: 0xffe9a8, emissiveIntensity: 0.3 }), tail = mat(0xd6332b, { emissive: 0xff2a1a, emissiveIntensity: 0.3 });
      carLamps.push(head, tail);
      var h = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.24), head); h.position.set(L / 2 + 0.03, 0.55, sd * (W / 2 - 0.22)); g.add(h);
      var t2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.2), tail); t2.position.set(-L / 2 - 0.03, 0.56, sd * (W / 2 - 0.2)); g.add(t2);
      box(0.12, 0.08, 0.1, colour, (T.glass[0][0] + 0.05), gb[0] + 0.05, sd * (W / 2 + 0.03), g);          // side mirrors
    });
    if (kind === 'teksi') {                                                                              // roof sign
      box(0.55, 0.16, 0.3, 0xffffff, -0.15, 1.2, 0, g); box(0.5, 0.08, 0.31, 0x2f7fd1, -0.15, 1.21, 0, g);
    }
    var wheels = [], wGeo = carGeo.wheel = carGeo.wheel || new THREE.CylinderGeometry(0.27, 0.27, 0.22, 10);
    var hGeo = carGeo.hub = carGeo.hub || new THREE.CylinderGeometry(0.12, 0.12, 0.24, 6);
    [[L / 2 - 0.55, 1], [L / 2 - 0.55, -1], [-L / 2 + 0.55, 1], [-L / 2 + 0.55, -1]].forEach(function (w) {
      var wh = new THREE.Group(); wh.position.set(w[0], 0.27, w[1] * (W / 2 - 0.1));
      var tyre = new THREE.Mesh(wGeo, mat(0x2a2a2a)); tyre.rotation.x = Math.PI / 2; wh.add(tyre);
      var hub = new THREE.Mesh(hGeo, mat(0xd8dde2)); hub.rotation.x = Math.PI / 2; wh.add(hub);
      g.add(wh); wheels.push(wh);
    });
    g.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    return { g: g, wheels: wheels, len: L, v: 0 };
  }
  // Two lanes, driving on the left: cars heading right (+x) use the lane nearer the shop.
  var LANES = [{ dir: 1, z: 4.75 }, { dir: -1, z: 7.05 }], CAR_MAX = 4.5, ROAD_END = 42;
  function buildTraffic() {
    var kinds = ['hatch', 'sedan', 'van', 'teksi', 'sedan', 'hatch'];
    for (var i = 0; i < 6; i++) {
      var ln = LANES[i % 2], c = makeCar(kinds[i], CAR_COLOURS[(i * 3) % CAR_COLOURS.length]);
      c.lane = ln; c.g.rotation.y = ln.dir > 0 ? 0 : Math.PI;
      c.g.position.set(ln.dir * (-ROAD_END + 14 * Math.floor(i / 2) + Math.random() * 6), 0.02, ln.z);
      c.v = CAR_MAX; root.add(c.g); cars.push(c);
    }
  }
  function updateTraffic(dt) {
    if (!dt) return;
    var busy = crossingBusy();
    cars.forEach(function (c) {
      var d = c.lane.dir, x = c.g.position.x, front = x + d * c.len / 2, target = c.vmax || CAR_MAX;
      var toStop = (ZX - d * 2.4 - front) * d;                // distance from the bumper to the stop line
      if (busy && toStop > -0.3 && toStop < 9) target = Math.max(0, Math.min(target, toStop * 0.9));
      cars.forEach(function (o) {                             // keep a gap to the car in front
        if (o === c || o.lane !== c.lane) return;
        var gap = ((o.g.position.x - d * o.len / 2) - front) * d;
        if (gap > 0 && gap < 6) target = Math.min(target, Math.max(0, (gap - 0.9) * 1.2));
      });
      if (c.stopAt != null) target = Math.min(target, deliveryTarget(c));
      c.v += Math.max(-9 * dt, Math.min(3 * dt, target - c.v));
      c.g.position.x += d * c.v * dt;
      c.wheels.forEach(function (w) { if (c.kenney) w.rotation.x += c.v * dt / 0.3; else w.rotation.z -= c.v * dt / 0.27; });
      if (c.g.position.x * d > ROAD_END && c.oneWay) { c.gone = true; return; }
      if (c.g.position.x * d > ROAD_END) {                    // round again, well behind the last car in this lane
        var last = cars.reduce(function (m, o) { return o.lane === c.lane && o !== c ? Math.min(m, o.g.position.x * d) : m; }, ROAD_END);
        c.g.position.x = d * Math.min(-ROAD_END, last - 6 - Math.random() * 10);
      }
    });
    cars.forEach(function (o) { if (o.gone) root.remove(o.g); });
    cars = cars.filter(function (o) { return !o.gone; });
    if (van && van.gone) van = null;
    updateDelivery(dt);
  }

  // ---------- Kenney props (CC0): goods on the shelves, arcade machines, cars ----------
  // models/env/food.glb, arcade.glb and cars.glb are packed by tools/pack_kenney.mjs; each model is a
  // node named after its file. Until they load (or if they can't) the sprites and box versions stay.
  var KM = null, kdims = {};
  function loadKenney(loader) {
    return Promise.all(['food', 'arcade', 'cars'].map(function (n) { return loader.loadAsync('models/env/' + n + '.glb'); }))
      .then(function (list) {
        KM = {};
        list.forEach(function (g) { g.scene.updateMatrixWorld(true); g.scene.children.forEach(function (c) { KM[c.name] = c; }); });
        KR.models.setBag(KM.bag);
        if (cfg.lots != null) buildShop(cfg.lots, cfg.lotProducts, cfg);
        kenneyTown();
      }).catch(function (e) { KM = null; if (window.console) console.warn('Kenney props not loaded, keeping simple ones', e); });
  }
  // Size of a Kenney model: 'y' = height, else its longest side.
  function kdim(name, dim) {
    var b = kdims[name] = kdims[name] || new THREE.Box3().setFromObject(KM[name]).getSize(new THREE.Vector3());
    return dim === 'y' ? b.y : Math.max(b.x, b.y, b.z);
  }
  function kput(name, x, y, z, size, rotY, parent, dim) {
    var o = put(KM[name], x, z, size / kdim(name, dim), rotY, parent || shopGroup);
    o.position.y = y; return o;
  }

  // Goods on the shelves: model, size (longest side), how many per slot, and a flat colour for
  // models that need a different look (a clear-blue bottle for mineral water).
  var GOODS = {
    air:     { m: 'soda-bottle', s: 0.4, n: 3, col: 0x8fd0f5 },
    roti:    { m: 'loaf', s: 0.46, n: 1 },
    maggi:   { m: 'chinese', s: 0.3, n: 2 },
    telur:   { m: 'egg', s: 0.15, n: 3 },
    aiskrim: { m: 'popsicle', s: 0.3, n: 3 },
    cokelat: { m: 'candy-bar', s: 0.3, n: 2 },
    airtin:  { m: 'soda-can', s: 0.24, n: 2 },
    beras:   { m: 'bag', s: 0.44, n: 1 },
    minyak:  { m: 'bottle-oil', s: 0.4, n: 3 },
    gula:    { m: 'carton-small', s: 0.26, n: 2 }
  };
  var goodsMat = {};
  function goods(id, t, y, d, rot) {
    var G = GOODS[id], w = 0.44, n = G.n;
    for (var q = 0; q < n; q++) {
      var off = (q - (n - 1) / 2) * (w / n), dz = (q % 2) * 0.04;
      var o = rot ? kput(G.m, d + dz, y, t + off, G.s, rot) : kput(G.m, t + off, y, d + dz, G.s, rot);
      o.rotation.y = rot + (q - (n - 1) / 2) * 0.15;
      if (G.col) {
        goodsMat[id] = goodsMat[id] || new THREE.MeshStandardMaterial({ color: G.col, roughness: 0.2, transparent: true, opacity: 0.85 });
        o.traverse(function (m) { if (m.isMesh) m.material = goodsMat[id]; });
      }
    }
  }

  // Cars from Kenney's Car Kit join the code-built ones; a flatbed lorry at the kilang and an
  // ambulance parked at the klinik with its lights flashing.
  var ambLights = [];
  function kenneyCar(name, s) {
    var g = new THREE.Group(), body = put(KM[name], 0, 0, s, Math.PI / 2, g), wheels = [];
    body.traverse(function (o) { if (/^wheel/.test(o.name)) wheels.push(o); });
    return { g: g, wheels: wheels, len: kdim(name) * s, v: 0, kenney: true };
  }
  function kenneyTown() {
    ['sedan', 'taxi', 'suv', 'truck'].forEach(function (n, i) {
      var c = kenneyCar(n, 0.92), ln = LANES[i % 2];
      c.lane = ln; c.g.rotation.y = ln.dir > 0 ? 0 : Math.PI;
      var last = cars.reduce(function (m, o) { return o.lane === ln ? Math.min(m, o.g.position.x * ln.dir) : m; }, -ROAD_END);
      c.g.position.set(ln.dir * (last - 7 - Math.random() * 4), 0.02, ln.z);
      c.v = CAR_MAX; root.add(c.g); cars.push(c);
    });
    if (factoryLorry) {
      factoryLorry.visible = false;
      put(KM['truck-flat'], factoryLorry.position.x, factoryLorry.position.z, 1.0, Math.PI);
    }
    put(KM.ambulance, -3.5, -22.0, 0.95, Math.PI / 2);      // parked outside the klinik
    [0xff3b30, 0x2f7fd1].forEach(function (c, j) {
      var m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: c }));
      m.position.set(-3.5 + 1.1, 1.74, -22.0 + (j ? 0.3 : -0.3)); root.add(m); ambLights.push(m);
    });
  }

  // Mid-day restock: a delivery lorry pulls up in front of the shop, drops boxes on the kaki lima
  // and drives off; the boxes are taken inside a little later.
  var van = null, boxes = [], VAN_STOP = 2.6;
  function delivery() {
    if (!ready) return;
    if (van && van.stopAt != null) return;                  // one already on its way
    var c = KM ? kenneyCar('delivery', 0.92) : makeCar('van', 0xffffff), ln = LANES[0];
    c.lane = ln; c.oneWay = true; c.stopAt = VAN_STOP; c.unload = 0;
    var x = -19;                                             // just off screen, behind any car close by
    cars.forEach(function (o) { if (o.lane === ln && Math.abs(o.g.position.x - x) < 5) x = Math.min(x, o.g.position.x - 6); });
    c.g.position.set(x, 0.02, ln.z); c.v = c.vmax = 6.5;
    root.add(c.g); cars.push(c); van = c;
  }
  function deliveryTarget(c) {
    var toStop = (c.stopAt - c.g.position.x) * c.lane.dir;
    return toStop <= 0.05 ? 0 : Math.max(0.6, toStop * 1.1);
  }
  var boxT = 0;
  function updateDelivery(dt) {
    ambLights.forEach(function (m, j) { m.visible = Math.floor(performance.now() / 350) % 2 === j; });
    if (van && van.stopAt != null && van.stopAt - van.g.position.x < 0.3 && van.v < 0.05) {
      van.unload += dt;
      var want = Math.min(3, Math.floor(van.unload / 1.0));
      while (boxes.length < want) {
        var k = boxes.length, bx = KM ? kput('box', 1.5 + (k % 2) * 0.42, 0.13 + (k > 1 ? 0.3 : 0), 2.1, 0.3, k * 0.4, root)
          : box(0.3, 0.3, 0.3, 0xc8935a, 1.5 + (k % 2) * 0.42, 0.28 + (k > 1 ? 0.3 : 0), 2.1);
        boxes.push(bx);
      }
      if (van.unload > 4) { van.stopAt = null; boxT = 4; }
    }
    if (boxT > 0 && (boxT -= dt) <= 0) { boxes.forEach(function (b) { root.remove(b); }); boxes = []; }
  }

  function build() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.localClippingEnabled = true;                // used to cut the front wall off the shop model
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = 'scene3d';
    scene = new THREE.Scene();
    // Angled top-down view: orthographic camera looking down at ~35 degrees.
    camera = new THREE.OrthographicCamera(-10, 10, 7, -7, 0.1, 400);
    hemi = new THREE.HemisphereLight(0xffffff, 0x6f8f5a, 1.1); scene.add(hemi);
    sun = new THREE.DirectionalLight(0xffffff, 1.3); sun.position.set(-10, 18, 8);
    sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 60 });
    scene.add(sun);
    root = new THREE.Group(); scene.add(root);

    // Ground: grass, the main road in front of the row and a side road
    // Roads run well past the edge of the view in every direction (E = how far).
    var E = 200;
    var grass = box(2 * E, 0.1, 2 * E, 0x7fbf5f, 0, -0.06, 0); grass.receiveShadow = true;
    var road = box(2 * E, 0.06, 4.8, 0x5c5f63, 0, -0.01, 5.9); road.receiveShadow = true;
    var side = box(4.2, 0.06, E + 4, 0x5c5f63, -9.5, -0.005, 4 - (E + 4) / 2); side.receiveShadow = true;
    for (var i = -E + 2; i < E; i += 2.5) if (Math.abs(i - ZX) > 2 && Math.abs(i + 9.5) > 2.6) box(1.2, 0.02, 0.15, 0xf2efe6, i, 0.03, 5.9);
    for (var sz = -12; sz > -E; sz -= 2.5) if (Math.abs(sz + 8.6) > 2.2 && Math.abs(sz + 21) > 2.2) box(0.15, 0.02, 1.2, 0xf2efe6, -9.5, 0.03, sz);
    // Kaki lima and kerb stop at the side road's junction, so nothing sticks out over it
    function strip(h, d, c, y, z) {
      return [box(E - 11.6, h, d, c, (-E - 11.6) / 2, y, z), box(E + 7.4, h, d, c, (E - 7.4) / 2, y, z)];
    }
    buildZebra();
    var walk = strip(0.12, 2.2, 0xd9d0bd, 0, 2.4);            // kaki lima
    walk.forEach(function (w) { w.receiveShadow = true; });
    strip(0.14, 0.25, 0x9a9384, 0.02, 3.5);                   // kerb
    box(2 * E, 0.1, 0.5, 0x6d6a60, 0, 0.0, 8.55);              // longkang across the road
    var walk2 = box(2 * E, 0.12, 2.0, 0xd9d0bd, 0, 0, 9.8); walk2.receiveShadow = true;  // pavement across the road

    // The kedai runcit: a linked row of three shop lots. The first is yours; the other two can be
    // rented with the "Besarkan Kedai" upgrade. buildShop() builds the row for the current level.
    var SW = LOT.w / 2;
    // Back lanes: one behind the shops (the second row of houses faces it) and one further back
    // that the klinik, bank and flats face. Both join the side road.
    [-8.6, -21].forEach(function (z) {
      var l = box(E + 9.5, 0.06, 3.4, 0x5c5f63, (E - 9.5) / 2, -0.008, z); l.receiveShadow = true;   // from the side road to the edge
      for (var x = -5; x < E; x += 2.5) box(1.0, 0.02, 0.12, 0xf2efe6, x, 0.03, z);
      box(E + 7.4, 0.1, 0.9, 0xd9d0bd, (E - 7.4) / 2, 0, z - 2.15);   // pavement on the far side, from the side road's edge
    });
    shopLamp = new THREE.PointLight(0xffd9a0, 0, 16); shopLamp.position.set(LOT.w, 3.2, -1.6); scene.add(shopLamp);
    // Kaki lima tiles in front of the row
    var rowW = LOT.w * LOTS, rowX = (LOTS - 1) * LOT.w / 2;
    box(rowW, 0.14, 2.2, 0xd8b98f, rowX, 0, 2.35);
    for (var tx = -SW; tx <= rowX + rowW / 2; tx += 0.8) box(0.04, 0.142, 2.2, 0xc7a67a, tx, 0, 2.35);
    [-SW - 0.35].forEach(function (x) { box(0.45, 0.4, 0.45, 0xb5653b, x, 0.27, 1.65); });

    // Neighbours, a bus stop and a padang (simple versions until the models load)
    prim.houses = new THREE.Group(); root.add(prim.houses);
    house(20.5 + RX, -0.8, 0xbfe3d6, 0xc0453a); house(24.1 + RX, -0.8, 0xf3d9a4, 0x8e5bd1); house(27.9 + RX, -0.8, 0xcfd8f2, 0x2f7fd1);
    house(-16, -0.8, 0xf6c9c9, 0x2f9e6e);
    box(2.6, 0.08, 1.1, 0x2f7fd1, 33 + RX, 2.2, 3.0);              // bus stop roof
    box(0.1, 2.2, 0.1, 0x3b3f44, 31.8 + RX, 1.1, 3.4); box(0.1, 2.2, 0.1, 0x3b3f44, 34.2 + RX, 1.1, 3.4);
    box(2.2, 0.12, 0.45, 0xf2b705, 33 + RX, 0.5, 2.8);            // bench
    var field = box(10, 0.04, 8, 0x6eb24f, -18, 0, -9); field.receiveShadow = true;
    box(0.12, 1.2, 0.12, 0xffffff, -18, 0.6, -12.5); box(0.12, 1.2, 0.12, 0xffffff, -18, 0.6, -5.5);
    prim.trees = new THREE.Group(); root.add(prim.trees);
    TREES.forEach(function (p, j) { tree(p[0], p[1], 0.9 + (j % 3) * 0.15); });
    [-3.9, 12.75, 29.5 + RX].forEach(function (x) {         // street lamps
      box(0.12, 3.2, 0.12, 0x3b3f44, x, 1.6, 3.4); lights.push(box(0.35, 0.15, 0.35, 0xfff3c4, x, 3.2, 3.4));
    });
    // Parked kapcai
    box(0.25, 0.4, 1.1, 0xd6332b, 18.6 + RX, 0.45, 2.7); box(0.1, 0.5, 0.5, 0x222222, 18.6 + RX, 0.25, 2.2); box(0.1, 0.5, 0.5, 0x222222, 18.6 + RX, 0.25, 3.2);

    buildFactory();

    buildTraffic();

    root.traverse(function (o) { if (o.isMesh && o !== grass && o !== road && o !== side && walk.indexOf(o) < 0 && o !== walk2 && o !== field) { o.castShadow = true; o.receiveShadow = true; } });

    // Rain: falling line segments, shown only in wet weather
    var n = 500, pos = new Float32Array(n * 6);
    for (var r = 0; r < n; r++) {
      var x = (Math.random() - 0.5) * 40, y = Math.random() * 12, z = (Math.random() - 0.5) * 30;
      pos.set([x, y, z, x - 0.05, y - 0.5, z], r * 6);
    }
    var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xdfe8f0, transparent: true, opacity: 0.6 }));
    scene.add(rain);
  }

  // ---------- Scenery models ----------
  // Quaternius CC0 "Buildings pack" and "Ultimate Nature Pack" (models/env). Until they load,
  // or if they can't, the simple box versions built above stay.
  var ENV = ['house_a', 'house_b', 'house_c', 'house_d', 'house_e', 'flat_a', 'flat_b', 'bank', 'hospital', 'tree_a', 'tree_b', 'tree_c', 'palm_a', 'palm_b',
             'bush', 'bush_berry', 'flowers', 'plant'];
  function loadEnv() {
    import('../vendor/GLTFLoader.js').then(function (m) {
      var loader = new m.GLTFLoader();
      loadKenney(loader);
      return Promise.all(ENV.map(function (n) {
        return loader.loadAsync('models/env/' + n + '.glb').then(function (g) { return [n, g.scene]; });
      }));
    }).then(function (list) {
      var M = {};
      list.forEach(function (e) { M[e[0]] = e[1]; });
      placeEnv(M);
    }).catch(function (e) { if (window.console) console.warn('Scenery models not loaded, keeping simple ones', e); });
  }

  // Place a copy of a model with its own origin at x, z (models sit on y = 0 and face +z).
  function put(src, x, z, scale, rotY, parent) {
    var o = src.clone(true);
    if (Array.isArray(scale)) o.scale.set(scale[0], scale[1], scale[2]); else o.scale.setScalar(scale);
    o.rotation.y = rotY || 0; o.position.set(x, 0, z);
    o.traverse(function (m) { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    (parent || root).add(o); return o;
  }

  // The house texture is a 32x32 colour palette: swap the wall and roof colours for each house.
  function repaint(o, wall, roof) {
    var mesh = null;
    o.traverse(function (m) { if (m.isMesh && m.material.map) mesh = m; });
    if (!mesh) return;
    var img = mesh.material.map.image, c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    var g = c.getContext('2d'); g.drawImage(img, 0, 0);
    var d = g.getImageData(0, 0, c.width, c.height), px = d.data;
    var W = new THREE.Color(wall), R = new THREE.Color(roof);
    for (var i = 0; i < px.length; i += 4) {
      var key = px[i] + ',' + px[i + 1] + ',' + px[i + 2], to = key === '236,231,217' ? W : key === '73,71,71' ? R : null;
      if (to) { px[i] = to.r * 255; px[i + 1] = to.g * 255; px[i + 2] = to.b * 255; }
    }
    g.putImageData(d, 0, 0);
    var t = new THREE.CanvasTexture(c);
    t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.magFilter = t.minFilter = THREE.NearestFilter;
    mesh.material = mesh.material.clone(); mesh.material.map = t;
  }

  var ENVM = null;
  // The bank model comes without a texture (all one grey). Colour it by part: a slate roof,
  // white pediment and cornice, cream walls and columns, grey steps.
  function paintBank(o) {
    o.traverse(function (m) {
      if (!m.isMesh) return;
      var g = m.geometry, pos = g.attributes.position, nrm = g.attributes.normal, n = pos.count;
      g.computeBoundingBox();
      var top = g.boundingBox.max.y, bot = g.boundingBox.min.y, h = top - bot, col = new Float32Array(n * 3), c = new THREE.Color();
      for (var i = 0; i < n; i++) {
        var y = (pos.getY(i) - bot) / h, ny = nrm ? nrm.getY(i) : 0;
        if (ny > 0.35 && y > 0.62) c.setHex(0x3f6b8a);                    // roof
        else if (y < 0.13) c.setHex(0xb9b4aa);                             // steps and plinth
        else if (y > 0.55) c.setHex(0xfaf6ec);                             // pediment and cornice
        else c.setHex(0xf1e3c2);                                           // walls and columns
        c.toArray(col, i * 3);
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      m.material = m.material.clone(); m.material.vertexColors = true; m.material.color.setHex(0xffffff);
    });
    return o;
  }
  // Shade trees along the roads and around the padang
  var MORE_TREES = [[-38, 10.3], [-17.5, 10.3], [-11, 10.3], [22.5, 10.3], [27.2, 10.3], [33, 10.3], [42, 10.3],
    [-12.8, -3.5], [-12.8, -14], [-12.8, -27], [-12.8, -34], [-6.2, -27], [-6.2, -34],
    [-0.2, -11.6], [5.6, -11.6], [11.5, -11.6], [17, -11.6], [22.6, -11.6], [28.6, -11.6],
    [-23.5, -5.5], [-23.5, -12.5], [-13.2, -12.8], [-18, -13.6], [2, -24], [12, -24], [28.5, -24], [-8, -40], [-17, -22]];
  function placeEnv(M) {
    ['tree_a', 'tree_b', 'tree_c', 'palm_a', 'palm_b', 'bush', 'bush_berry', 'flowers', 'plant'].forEach(function (n) {
      M[n].traverse(function (m) { if (m.isMesh) m.material.color.multiplyScalar(1.9); });   // the pack's greens are very dark
    });
    ENVM = M;
    if (cfg.lots != null) buildShop(cfg.lots, cfg.lotProducts, cfg);   // swap the plain walls for the shop model

    // Neighbours along the row (front walls at z = 1), repainted in kampung colours
    var houses = [];
    function home(m, x, z, front, rot, wall, roof) {
      var o = put(M[m], x, rot ? z + front * 2.64 : z - front * 2.64, 2.64, rot ? Math.PI : 0);
      repaint(o, wall, roof); houses.push(o); return o;
    }
    home('house_d', 20.5 + RX, 1, 0.65, 0, 0xbfe3d6, 0xc0453a); home('house_a', 24.1 + RX, 1, 0.65, 0, 0xf3d9a4, 0x8e5bd1);
    home('house_b', 28.7 + RX, 1, 0.65, 0, 0xcfd8f2, 0x2f7fd1); home('house_c', -16, 1, 1.01, 0, 0xf6c9c9, 0x2f9e6e);
    // Second row behind the shops
    home('house_e', -3, -11.3, 1.06, 0, 0xf6d6a8, 0xc0453a); home('house_a', 2.5, -11.3, 0.65, 0, 0xd7ecf7, 0x2f9e6e);
    home('house_b', 8.6, -11.3, 0.65, 0, 0xf6c9c9, 0x8e5bd1); home('house_d', 14.4, -11.3, 0.65, 0, 0xe2f0c9, 0x2f7fd1);
    home('house_e', 19.6, -11.3, 1.06, 0, 0xcfd8f2, 0xc0453a); home('house_c', 25.5, -11.3, 1.01, 0, 0xf3d9a4, 0x2f9e6e);
    // Taller town buildings sit behind the houses so they never hide the shop row
    // (fronts on the pavement of the back road at z = -21)
    put(M.hospital, -3, -23.3 - 1.97 * 2.0, 2.0, 0); paintBank(put(M.bank, 7, -23.3 - 1.9 * 1.7, 1.7, 0));
    put(M.flat_a, 16, -23.3 - 1.2 * 2.4, 2.4, 0); put(M.flat_b, 24, -23.3 - 0.95 * 2.4, 2.4, 0);
    // Flats along the main road on the left, past the side road, facing the street
    put(M.flat_a, -24, 1 - 1.2 * 2.4, 2.4, 0); put(M.flat_b, -31, 1 - 0.95 * 2.4, 2.4, 0);
    // Across the road: low houses only, facing the street
    home('house_d', -1.5, 11.0, 0.65, 1, 0xd7ecf7, 0x2f9e6e);
    home('house_a', -8, 11.0, 0.65, 1, 0xf3d9a4, 0xc0453a); home('house_b', -14.5, 11.0, 0.65, 1, 0xe2f0c9, 0x2f7fd1);   // the kilang is further left
    home('house_e', 11, 11.0, 1.06, 1, 0xbfe3d6, 0x8e5bd1); home('house_a', 15.6, 11.0, 0.65, 1, 0xf6c9c9, 0xc0453a);
    home('house_d', 20.2, 11.0, 0.65, 1, 0xf3d9a4, 0x2f7fd1); home('house_b', 24.8, 11.0, 0.65, 1, 0xcfd8f2, 0x8e5bd1);
    prim.houses.visible = false;

    var kinds = ['palm_a', 'tree_a', 'palm_b', 'tree_b', 'tree_c'];
    TREES.concat([[-25, -15], [34 + RX, -2], [36, 12], [-36, 14], [11.5, -27], [-14, -17], [20, -27], [-0.5, 20], [13.5, 21]], MORE_TREES)
      .forEach(function (p, j) {
        var k = kinds[j % kinds.length];
        put(M[k], p[0], p[1], k.indexOf('palm') === 0 ? 1.1 : 1.35, j * 1.3);
      });
    prim.trees.visible = false;

    // Greenery around the shop front and the houses
    put(M.plant, -LOT.w / 2 - 0.35, 1.65, 0.6);
    put(M.flowers, -8.3, 1.5, 1.1); put(M.bush, -5.4, 0.0, 0.9);
    [[18.7 + RX, 1.6], [22.3 + RX, 1.6], [26.1 + RX, 1.5], [31.7 + RX, 1.6], [-13.8, 1.4], [-18.2, 1.4]].forEach(function (p, j) {
      put(j % 2 ? M.bush : M.bush_berry, p[0], p[1], 0.75, j);
    });
    [[-6.0, -1.5], [-7.1, -2.8], [7.2, 11.2], [1.6, 11.2], [28.5, 11.2]].forEach(function (p, j) { put(M.bush, p[0], p[1], 1, j); });
  }

  // ---------- The shop row ----------
  // Lots 0..level are the player's (open, with shelves inside); the rest are closed with a
  // "Untuk Disewa" notice. Zoomed in, the roof and front walls of the player's lots are cut
  // away so you can see in; zoomed out you see the roofs.
  var shopGroup = null, cutMats = [], cutaway = true, AISLE = -1.4;   // SPOTS: [x, z, facing, lot]
  var SPOTS = [], spotUsed = [], PAY = [];

  // A shelf unit; the boards stick out 0.3 at the front so goods can stand on them.
  function shelf(w, h, d, x, z, rot) {
    rot = rot || 0;
    var g = box(w, h, d, 0x9c7445, x, h / 2, z, shopGroup); g.rotation.y = rot;
    var ox = Math.sin(rot) * 0.15, oz = Math.cos(rot) * 0.15;
    for (var k = 1; k < 4; k++) box(w + 0.02, 0.04, d + 0.3, 0xc79a62, x + ox, h * k / 4, z + oz, shopGroup).rotation.y = rot;
    return g;
  }

  // opts: lots = rented lots (0..2); lotProducts = product sprites sold in each lot;
  // claw / tcg = the lot 3 extras are installed.
  function buildShop(level, lotProducts, extras) {
    extras = extras || {};
    if (shopGroup) root.remove(shopGroup);
    shopGroup = new THREE.Group(); root.add(shopGroup);
    cutMats = []; SPOTS = []; PAY = [];
    var SW = LOT.w / 2;
    buildRow(level);
    for (var i = 0; i < LOTS; i++) {
      var cx = lotX(i), mine = i <= level, items = (lotProducts && lotProducts[i]) || [], ids = (extras.lotIds && extras.lotIds[i]) || [];
      if (!mine) {                                            // shutter down, "for rent" notice
        box(2 * IN, 0.06, FZ - BK, 0xb9b4aa, cx, 0.12, (BK + FZ) / 2, shopGroup);   // bare floor
        box(LOT.w - 0.5, 2.2, 0.12, 0x9aa3ab, cx, 1.1, FZ - 0.05, shopGroup);
        for (var r = 0.2; r < 2.2; r += 0.25) box(LOT.w - 0.48, 0.03, 0.13, 0x7d868e, cx, r, FZ - 0.04, shopGroup);
        var note = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), new THREE.MeshBasicMaterial({ map: noticeTexture() }));
        note.position.set(cx, 1.4, FZ + 0.03); shopGroup.add(note);
        continue;
      }
      // Floor tiles, joined to the next rented lot
      var fl = cx - IN, fr = i < level ? cx + SW + WALL : cx + IN, fz = (BK + FZ) / 2, fd = FZ - BK;
      if (i > 0) fl = cx - SW - WALL;
      box(fr - fl, 0.06, fd, 0xe9e2d4, (fl + fr) / 2, 0.13, fz, shopGroup);
      for (var fx = fl + 0.8; fx < fr - 0.2; fx += 0.8) box(0.03, 0.062, fd, 0xcfc6b4, fx, 0.13, fz, shopGroup);
      // Layout (z): back shelf against BK, islands, then the aisle (AISLE) customers walk along.
      // Every spot is at least ~0.6 from a shelf face and a wall, so bodies don't go through them.
      var bz = BK + 0.3, spotZ = BK + 1.15, isl = BK + 2.55, isZ = isl + 0.95;
      if (i === 0) {
        shelf(IN + 2.0 - 0.1, 2.1, 0.5, cx + (2.0 - IN + 0.1) / 2, bz);                    // back wall, up to the fridge
        shelf(0.5, 1.9, 2.0, cx - IN + 0.3, -2.6);                                          // left wall, near the front
        shelf(1.4, 1.2, 0.7, cx - 0.5, isl); shelf(1.4, 1.2, 0.7, cx + 1.7, isl);          // islands
        box(0.9, 2.2, 0.7, 0xe8f4fb, cx + IN - 0.55, 1.1, BK + 0.4, shopGroup);             // drinks fridge
        box(0.72, 1.8, 0.05, 0x9fd3ea, cx + IN - 0.55, 1.2, BK + 0.77, shopGroup);
        // Counter on the left of the door, the tauke behind it facing right (towards the door)
        box(0.7, 1.05, 1.3, 0x8a6a3f, cx - 1.0, 0.53, -0.15, shopGroup);
        box(0.72, 0.06, 1.32, 0xc79a62, cx - 1.0, 1.07, -0.15, shopGroup);
        if (KM) kput('cash-register', cx - 1.0, 1.1, -0.15, 0.95, Math.PI / 2);              // till on the counter, facing the customers
        else box(0.45, 0.3, 0.4, 0x3b3f44, cx - 1.1, 1.25, -0.45, shopGroup);
        box(1.2, 0.85, 0.7, 0xf4f7fb, cx + 2.3, 0.43, 0.2, shopGroup);                      // peti ais krim, right of the door
        box(1.22, 0.1, 0.72, 0x2f7fd1, cx + 2.3, 0.9, 0.2, shopGroup);
        SPOTS.push([cx - 1.7, spotZ, Math.PI, 0], [cx + 0.6, spotZ, Math.PI, 0], [cx + IN - 0.55, BK + 1.3, Math.PI, 0],
                   [cx - IN + 1.2, -2.6, -Math.PI / 2, 0], [cx - 0.5, isZ, Math.PI, 0], [cx + 1.7, isZ, Math.PI, 0]);
        PAY.push([cx - 0.25, 0.25, -Math.PI / 2], [cx - 0.25, -0.4, -Math.PI / 2]);        // at the counter, facing the tauke
        shelfItems(items, ids, cx - IN + 0.4, cx + 1.7, bz + 0.27, [0.5, 1.1, 1.7], [0.545, 1.07, 1.595], 0);
        shelfItems(items, ids, -3.4, -1.8, cx - IN + 0.57, [0.45, 1.05, 1.65], [0.495, 0.97, 1.445], Math.PI / 2);
        shelfItems(items, ids, cx - 1.0, cx, isl + 0.37, [0.85], [1.2], 0);
        shelfItems(items, ids, cx + 1.2, cx + 2.2, isl + 0.37, [0.85], [1.2], 0);
      } else {
        var w = 2 * IN - 0.6;
        shelf(w, 2.1, 0.5, cx, bz);
        SPOTS.push([cx - 2.6, spotZ, Math.PI, i], [cx, spotZ, Math.PI, i], [cx + 2.6, spotZ, Math.PI, i],
                   [cx - 1.3, isZ, Math.PI, i], [cx + 1.3, isZ, Math.PI, i]);
        shelfItems(items, ids, cx - w / 2 + 0.3, cx + w / 2 - 0.3, bz + 0.27, [0.5, 1.1, 1.7], [0.545, 1.07, 1.595], 0);
        if (i === 2 && extras.tcg) tcgCase(cx - 1.3, isl);                               // glass case of booster packs
        else { shelf(1.4, 1.2, 0.7, cx - 1.3, isl); shelfItems(items, ids, cx - 1.8, cx - 0.8, isl + 0.37, [0.85], [1.2], 0); }
        if (i === 1) sacks(cx + 1.3, isl);                                                // rice sacks on a pallet
        else if (i === 2 && KM) kput('prizes', cx + 1.3, 0.13, isl, 1.35, 0, null, 'x');     // a rack of prize toys
        else { shelf(1.4, 1.2, 0.7, cx + 1.3, isl); shelfItems(items, ids, cx + 0.8, cx + 1.8, isl + 0.37, [0.85], [1.2], 0); }
        if (i === 2 && extras.claw) { clawMachine(cx + 2.6, 0.0); SPOTS.push([cx + 2.6, -0.95, 0, i]); }
      }
    }
    spotUsed = SPOTS.map(function () { return false; });
    shopLamp.position.x = lotX(level) / 2;
    shopGroup.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    setCutaway(cutaway, true);
  }

  // The shophouse row. Rented lots are open to each other through wide arches in the party walls;
  // an empty lot stays walled off with its shutter down. Everything above LOT.cut (roof, fascia,
  // the kaki lima canopy) is sliced away when zoomed in, so you can see inside.
  function buildRow(level) {
    var cut = [new THREE.Plane(new THREE.Vector3(0, -1, 0), LOT.cut)];
    var mats = {};
    function m(c) {
      if (!mats[c]) { mats[c] = mat(c); mats[c].side = THREE.DoubleSide; mats[c].userData.planes = cut; cutMats.push(mats[c]); }
      return mats[c];
    }
    function part(w, h, d, c, x, y, z) {
      var o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), Array.isArray(c) ? c : m(c));
      o.position.set(x, y, z); shopGroup.add(o); return o;
    }
    var SW = LOT.w / 2, x0 = -SW, x1 = lotX(LOTS - 1) + SW, len = x1 - x0, mid = (x0 + x1) / 2, H = ROW_H;
    var depth = FZ - BZ, zc = (FZ + BZ) / 2;
    var WALLC = 0xf1e3c2, TRIM = 0xd9c49a, ROOF = 0x8a8f94, CANOPY = 0x2f7f80;
    part(len, H, WALL, WALLC, mid, H / 2, BZ + WALL / 2);                                   // back wall
    part(WALL, H, depth, WALLC, x0 + WALL / 2, H / 2, zc); part(WALL, H, depth, WALLC, x1 - WALL / 2, H / 2, zc);   // end walls
    for (var i = 0; i < LOTS - 1; i++) {                      // party walls between the lots
      var px = lotX(i) + SW, open = i < level;
      if (open) {                                             // wide arch: rented lots are one shop inside
        part(2 * WALL, H, 1.2, WALLC, px, H / 2, BZ + 0.6);
        part(2 * WALL, H, 0.5, WALLC, px, H / 2, FZ - 0.25);
        part(2 * WALL, H - 2.5, depth, WALLC, px, 2.5 + (H - 2.5) / 2, zc);
      } else part(2 * WALL, H, depth, WALLC, px, H / 2, zc);
    }
    // Front: pilasters at every lot line, a fascia (sign band) over each open shopfront, a parapet on top
    for (var k = 0; k <= LOTS; k++) part(0.55, H + 0.5, 0.45, TRIM, x0 + k * LOT.w + (k === 0 ? 0.27 : k === LOTS ? -0.27 : 0), (H + 0.5) / 2, FZ + 0.05);
    part(len, 0.5, 0.3, TRIM, mid, H + 0.25, FZ);                                           // front parapet
    part(len, 0.35, 0.2, TRIM, mid, H + 0.17, BZ + 0.1); part(0.2, 0.35, depth, TRIM, x0 + 0.1, H + 0.17, zc); part(0.2, 0.35, depth, TRIM, x1 - 0.1, H + 0.17, zc);
    part(len - 0.1, 0.12, depth - 0.1, ROOF, mid, H - 0.06, zc);                            // flat roof
    for (var j = 0; j < LOTS; j++) {
      var cx = lotX(j), mine = j <= level;
      var face = mine ? new THREE.MeshBasicMaterial({ map: j === 0 ? signTexture(cfg.shopName ? cfg.shopName.toUpperCase() : 'KEDAI RUNCIT')
        : signTexture(KR.i18n.t(j === 1 ? 'BARANG DAPUR' : 'SUDUT HOBI'), j === 1 ? '#c0453a' : '#5b2a9e') }) : m(0xc9b48a);
      if (face.isMeshBasicMaterial) { face.userData.planes = cut; cutMats.push(face); }
      var fm = m(mine ? (j === 0 ? 0x1f7a55 : j === 1 ? 0xc0453a : 0x5b2a9e) : 0xc9b48a);
      var sign = part(LOT.w - 0.6, 0.62, 0.16, [fm, fm, fm, fm, face, fm], cx, 3.15, FZ + 0.06);
      if (j === 0) shopSign = sign;
      part(0.9, 0.5, 0.9, 0x9aa3ab, cx + 2.4, H + 0.25, BZ + 1.2);                       // water tank on the roof
      part(0.12, 0.12, 0.12, 0x6d6a60, cx + 2.4, H + 0.56, BZ + 1.2);
    }
    // Covered kaki lima: a canopy over the five-foot way on posts at the kerb
    part(len, 0.12, 2.35, CANOPY, mid, 2.75, FZ + 1.17);
    part(len, 0.25, 0.08, CANOPY, mid, 2.65, FZ + 2.33);
    for (var c = 0; c <= LOTS; c++) part(0.16, 2.7, 0.16, TRIM, x0 + 0.3 + c * (len - 0.6) / LOTS, 1.35, FZ + 2.25);
  }

  // Lot 2: a pallet of rice sacks. Lot 3: a glass case of TCG packs and a claw machine.
  function sacks(x, z) {
    box(1.4, 0.15, 0.8, 0x9c7445, x, 0.24, z, shopGroup);
    for (var k = 0; k < 3; k++) for (var l = 0; l < 2; l++) {
      var sk = box(0.42, 0.3, 0.34, k % 2 ? 0xf4efe2 : 0xe9e0c8, x - 0.45 + k * 0.45, 0.47 + l * 0.3, z - 0.18 + (l ? 0.1 : 0) + (k % 2) * 0.1, shopGroup);
      sk.rotation.y = (k - 1) * 0.12;
    }
    var label = box(0.3, 0.12, 0.02, 0x2f9e6e, x, 0.62, z + 0.03, shopGroup);
  }
  function tcgCase(x, z) {
    box(1.4, 0.8, 0.7, 0x3b3f44, x, 0.4, z, shopGroup);
    var glass = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.36, 0.66), mat(0xbfe6ff, { transparent: true, opacity: 0.45, roughness: 0.1 }));
    glass.position.set(x, 0.98, z); shopGroup.add(glass);
    var cols = [0x8e5bd1, 0x2f7fd1, 0xf2b705, 0xd6332b, 0x2f9e6e];
    for (var k = 0; k < 5; k++) {
      var pk = box(0.18, 0.26, 0.04, cols[k], x - 0.5 + k * 0.25, 0.95, z, shopGroup);
      pk.rotation.x = -0.5;
    }
    box(0.8, 0.5, 0.05, 0x5b2a9e, x, 1.45, z - 0.3, shopGroup);                         // poster: new set
    box(0.6, 0.12, 0.06, 0xffd23f, x, 1.55, z - 0.27, shopGroup);
  }
  function clawMachine(x, z) {
    if (KM) return kput('claw-machine', x, 0.13, z, 1.55, Math.PI, null, 'y');   // Kenney's, joystick facing inside
    box(0.9, 1.0, 0.9, 0xe86f9a, x, 0.5, z, shopGroup);
    var glass = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.8, 0.86), mat(0xcfe9f3, { transparent: true, opacity: 0.35, roughness: 0.1 }));
    glass.position.set(x, 1.42, z); shopGroup.add(glass);
    box(0.9, 0.12, 0.9, 0xe86f9a, x, 1.88, z, shopGroup);
    box(0.06, 0.3, 0.06, 0xdddddd, x, 1.65, z, shopGroup);                               // the claw
    [[0xffd23f, -0.2, -0.15], [0x2f9e6e, 0.15, 0.1], [0x2f7fd1, -0.05, 0.2], [0xd6332b, 0.22, -0.18]].forEach(function (b) {
      var ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), mat(b[0])); ball.position.set(x + b[1], 1.13, z + b[2]); shopGroup.add(ball);
    });
    box(0.5, 0.08, 0.3, 0x3b3f44, x, 1.04, z - 0.5, shopGroup);                          // joystick panel, facing inside
    box(0.05, 0.14, 0.05, 0xd6332b, x - 0.1, 1.14, z - 0.52, shopGroup);
  }

  // Goods along a shelf, from a to b (x, or z when rot is a quarter turn). at = the shelf's front face.
  // Products with a Kenney model (GOODS) stand on the boards (heights gy); the rest are sprites on
  // the face (heights sy).
  function shelfItems(products, ids, a, b, at, sy, gy, rot) {
    if (!products || !products.length) return;
    var n = Math.max(1, Math.floor((b - a) / 0.55)), k = 0;
    itemGeo = itemGeo || new THREE.PlaneGeometry(0.45, 0.45);
    for (var r = 0; r < sy.length; r++) for (var c = 0; c <= n; c++) {
      var j = k++ % products.length, t = a + (b - a) * c / n;
      if (KM && GOODS[ids[j]]) { goods(ids[j], t, gy[r], gy[r] > 1.1 && sy.length === 1 ? at - 0.25 : at + 0.12, rot); continue; }   // island tops, else the board's lip
      var m = new THREE.Mesh(itemGeo, itemMat(products[j]));
      var f = at + (sy.length > 1 ? 0.3 : 0);                // in front of the boards' lip
      if (rot) m.position.set(f, sy[r], t); else m.position.set(t, sy[r], f);
      m.rotation.y = rot; shopGroup.add(m);
    }
  }
  var itemGeo = null, itemCache = {};
  function itemMat(svg) {
    return itemCache[svg] = itemCache[svg] || new THREE.MeshBasicMaterial({ map: svgTexture(svg), transparent: true });
  }

  function noticeTexture() {
    var c = document.createElement('canvas'); c.width = 320; c.height = 100;
    var g = c.getContext('2d');
    g.fillStyle = '#fff8e6'; g.fillRect(0, 0, 320, 100); g.strokeStyle = '#c0453a'; g.lineWidth = 8; g.strokeRect(4, 4, 312, 92);
    g.fillStyle = '#c0453a'; g.font = '600 40px Fredoka, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(KR.i18n.t('UNTUK DISEWA'), 160, 52, 290);
    var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  function setCutaway(on, force) {
    if (on === cutaway && !force) return;
    cutaway = on;
    cutMats.forEach(function (m) { m.clippingPlanes = on ? m.userData.planes : []; m.needsUpdate = true; });
  }


  function resize(host) {
    var w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    var aspect = w / h, viewH = 22, viewW = viewH * aspect;
    if (viewW < 24) { viewW = 24; viewH = viewW / aspect; }      // phones: keep the shop and its neighbours in view
    Object.assign(camera, { left: -viewW / 2, right: viewW / 2, top: viewH / 2, bottom: -viewH / 2 });
    applyView();
  }

  // ---------- Zoom and pan ----------
  // Mouse wheel / pinch / the + and - buttons zoom; dragging moves around the town.
  // Zoomed in far enough, the shop shows as a cutaway; zoomed out you see its roof.
  var view = { zoom: 1, x: 0, z: 0 }, ZMIN = 0.4, ZMAX = 2.4, CUT_AT = 0.8;
  function applyView() {
    view.zoom = Math.max(ZMIN, Math.min(ZMAX, view.zoom));
    view.x = Math.max(-36, Math.min(42, view.x)); view.z = Math.max(-30, Math.min(16, view.z));
    camera.zoom = view.zoom;
    // Same view direction as before, but the camera sits 3x further back so the near plane never
    // slices off the ground at the bottom of the screen when zoomed right out.
    camera.position.set(1 + view.x + 13 * 3, 0.5 + 19.5 * 3, 0.2 + view.z + 21.8 * 3); camera.lookAt(1 + view.x, 0.5, 0.2 + view.z);
    camera.updateProjectionMatrix();
    setCutaway(view.zoom >= CUT_AT);
  }
  function zoomBy(f) { view.zoom *= f; applyView(); }

  var controlsOn = false;
  function controls(host) {
    if (!host.querySelector('.zoombar')) {
      var bar = document.createElement('div');
      bar.className = 'zoombar';
      bar.innerHTML = '<button type="button" data-z="in" aria-label="' + KR.i18n.t('Zum masuk') + '">+</button><button type="button" data-z="out" aria-label="' + KR.i18n.t('Zum keluar') + '">−</button>';
      bar.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (b) zoomBy(b.dataset.z === 'in' ? 1.25 : 0.8);
      });
      host.appendChild(bar);
    }
    if (controlsOn) return;
    controlsOn = true;
    var el = renderer.domElement, pts = {}, pinch = 0, right = new THREE.Vector3(), up = new THREE.Vector3();
    el.style.touchAction = 'none';
    el.addEventListener('wheel', function (e) { e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1); }, { passive: false });
    el.addEventListener('pointerdown', function (e) { el.setPointerCapture(e.pointerId); pts[e.pointerId] = [e.clientX, e.clientY]; pinch = 0; });
    el.addEventListener('pointermove', function (e) {
      var prev = pts[e.pointerId]; if (!prev) return;
      var ids = Object.keys(pts);
      if (ids.length === 2) {                                 // two fingers: pinch to zoom
        pts[e.pointerId] = [e.clientX, e.clientY];
        var a = pts[ids[0]], b = pts[ids[1]], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pinch) zoomBy(d / pinch);
        pinch = d; return;
      }
      var dx = e.clientX - prev[0], dy = e.clientY - prev[1];
      pts[e.pointerId] = [e.clientX, e.clientY];
      var upp = (camera.right - camera.left) / camera.zoom / el.clientWidth;   // world units per pixel
      right.setFromMatrixColumn(camera.matrix, 0); up.setFromMatrixColumn(camera.matrix, 1); up.y = 0; up.normalize();
      view.x -= (right.x * dx - up.x * dy * 1.6) * upp;
      view.z -= (right.z * dx - up.z * dy * 1.6) * upp;
      applyView();
    });
    function end(e) { delete pts[e.pointerId]; pinch = 0; }
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }

  var host, overlay, builtLots = null, builtProducts = '';
  function start(opts) {
    host = opts.host; overlay = opts.overlay; cfg = opts;
    if (renderer.domElement.parentNode !== host) host.insertBefore(renderer.domElement, host.firstChild);
    clear();
    daySky = new THREE.Color(SKY[opts.weather] || SKY.cerah); dayLight = LIGHT[opts.weather] || 1.2;
    scene.background = daySky.clone(); setHour(8);
    rain.visible = opts.weather === 'hujan' || opts.weather === 'ribut';
    // the "for rent" notice is in the current language
    var key = opts.lotProducts.map(function (l) { return l.join(); }).join('|') + !!opts.claw + !!opts.tcg + KR.i18n.lang();
    if (opts.lots !== builtLots || key !== builtProducts) {
      buildShop(opts.lots, opts.lotProducts, opts); builtLots = opts.lots; builtProducts = key;
    }
    if (shopSign) { shopSign.material[4].map.dispose(); shopSign.material[4].map = signTexture(opts.shopName.toUpperCase()); }
    signFactory();
    passT = 0.5; homeT = 0;
    controls(host);
    resize(host);
    running = true;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  // Evening: from 7pm the sky darkens and the street lamp and shop lights come on.
  var daySky, dayLight, NIGHT = null;
  var curHour = 8;
  function setHour(h) {
    curHour = h;
    if (!daySky) return;
    NIGHT = NIGHT || new THREE.Color(0x1d2747);
    var t = Math.max(0, Math.min(1, (h - 18.5) / 2));
    scene.background.copy(daySky).lerp(NIGHT, t);
    sun.intensity = dayLight * (1 - 0.85 * t);
    hemi.intensity = 1.1 * (1 - 0.6 * t);
    shopLamp.intensity = t * 18;
    lights.forEach(function (m) { m.material.emissive.setHex(0xffd27a); m.material.emissiveIntensity = t * 1.2; });
    carLamps.forEach(function (m) { m.emissiveIntensity = 0.3 + t * 1.6; });
  }

  function stop() { running = false; cancelAnimationFrame(raf); clear(); }

  function dispose(g) { root.remove(g); (g.userData.mixer ? KR.models : KR.chars).dispose(g); }

  function clear() {
    people.forEach(function (p) { dispose(p.g); if (p.bubble) p.bubble.remove(); });
    people = []; queue = []; inside = 0; loiter = 0; spotUsed = SPOTS.map(function () { return false; });
  }

  // ---------- Customers ----------
  // Each customer walks up, joins the line in front of the door, goes inside when there is
  // room, says what happened (bubble above the door), then walks out and off the street.
  // Times are in game milliseconds, so the x2/x4/x8 buttons speed everything up together.
  // Customers come in at the door of the first lot, walk along the aisle (AISLE, between the
  // counter and the islands) to a browsing spot (SPOTS, set by buildShop), then pay at PAY.
  var DOOR = [0.1, 2.0], INSIDE = [0.1, 0.6], WALK_SPEED = 3.0, EDGE = 30, staff = [];
  var queue = [], inside = 0, loiter = 0, cfg = {};

  function slot(i) { return [DOOR[0] - 1.2 - (i % 9) * 1.0, 2.75 + Math.floor(i / 9) * 0.5]; }   // a long line doubles back
  function go(p, pts, then) { p.path = pts.slice(); p.then = then; p.walking = true; }

  function spawn(o) {
    var model = o.from === 'kilang' ? (o.seed % 2 ? 'worker_male' : 'worker_female') : null;   // factory workers in overalls
    var g = KR.models.isReady() ? KR.models.make(o.seed, o.tier || o.rep, model) : KR.chars.make(o.seed);
    var lane = 3.0 + Math.random() * 0.35, fromLeft = o.fromLeft;
    var p = { g: g, o: o, bubble: null, lane: lane, exitLeft: Math.random() < 0.5, path: [], walking: false, timer: 0 };
    var viaSide = fromLeft && Math.random() < 0.35;          // some come up the side road
    var start = viaSide ? [[-9.5, lane]] : [];
    g.position.set(viaSide ? -9.5 : (fromLeft ? -EDGE : EDGE), 0.1, viaSide ? -EDGE : lane);
    if (o.from === 'kilang') {                               // out of the factory gate and over the zebra crossing
      g.position.set(FGATE[0] + (Math.random() - 0.5), 0.1, FGATE[1] + 0.6);
      start = [[FGATE[0], FGATE[1] - 1.2], [FGATE[0] + 0.3, KERB_FAR + 0.2]].concat(crossOver(-0.4, true));
      p.exitLeft = false;
    } else if (o.across) {                                   // from the houses across the road
      g.position.set(fromLeft ? -EDGE : EDGE, 0.1, 9.7 + Math.random() * 0.4);
      p.off = (Math.random() - 0.5) * 1.2;
      start = crossOver(p.off, true);
      viaSide = false;
    }
    root.add(g); people.push(p);
    if (o.giveUp) {                                          // turned away: waits by the end of the line, then leaves
      var end = slot(queue.length + loiter++);
      go(p, start.concat([[end[0], lane], end]), function () { p.state = 'loiter'; p.timer = o.patience; });
    } else {
      queue.push(p); p.state = 'toQueue';
      var s = slot(queue.length - 1);
      go(p, start.concat([[s[0], lane], s]), function () { p.state = 'queue'; });
    }
    return p;
  }

  // A free browsing spot in the lot that sells what they came for (any free spot if that lot is full).
  function freeSpot(lot) {
    var same = [], any = [];
    SPOTS.forEach(function (sp, i) { if (!spotUsed[i]) { any.push(i); if (sp[3] === lot) same.push(i); } });
    var list = same.length ? same : any;
    return list.length ? list[Math.floor(Math.random() * list.length)] : -1;
  }

  // Someone left the line: everyone behind them steps forward.
  function shuffleQueue() {
    queue.forEach(function (p, i) {
      var s = slot(i);
      if (p.state === 'queue') { p.state = 'toQueue'; go(p, [s], function () { p.state = 'queue'; }); }
      else if (p.state === 'toQueue' && p.path.length) p.path[p.path.length - 1] = s;
    });
  }

  function bubble(p, o) {
    var b = document.createElement('div');
    b.className = 'bubble' + (o.bad ? ' bad' : '') + (o.tier && o.tier !== 'common' ? ' ' + o.tier : '');
    b.innerHTML = o.html;
    overlay.appendChild(b); p.bubble = b;
    if (!o.bad) p.g.userData.bag.visible = true;           // walks out carrying a plastic bag
  }

  function leave(p, from) {
    if (p.bubble) { p.bubble.remove(); p.bubble = null; }
    if (p.o.back) {                                          // lunch break over: back over the crossing into the factory
      p.state = 'exit';
      return go(p, from.concat([[ZX - 0.4, p.lane]], crossOver(-0.4, false), [[FGATE[0] + 0.3, KERB_FAR + 0.2], [FGATE[0], FGATE[1] - 1.2], [FGATE[0], FGATE[1] + 0.8]]), function () { remove(p); });
    }
    if (p.o.across) {                                        // home across the road
      p.state = 'exit';
      var back = crossOver(p.off || 0, false), side = p.exitLeft ? -EDGE : EDGE;
      return go(p, from.concat([[ZX + (p.off || 0), p.lane]], back, [[side, back[back.length - 1][1]]]), function () { remove(p); });
    }
    var x = p.exitLeft ? -EDGE : EDGE;
    p.state = 'exit';
    go(p, from.concat([[from.length ? from[from.length - 1][0] + (p.exitLeft ? -1 : 1) : p.g.position.x, p.lane], [x, p.lane]]),
      function () { remove(p); });
  }

  function remove(p) {
    dispose(p.g); if (p.bubble) p.bubble.remove();
    people = people.filter(function (x) { return x !== p; });
  }

  function step(p, dist) {
    var g = p.g;
    p.wait = false;
    while (dist > 0 && p.path.length) {
      var t = p.path[0], dx = t[0] - g.position.x, dz = t[1] - g.position.z, d = Math.hypot(dx, dz);
      if (t[2] === 'cross' && !p.crossing) {                 // at the kerb: wait while a car is going through
        if (carOnCrossing()) { p.wait = true; if (d > 0.001) g.rotation.y = Math.atan2(dx, dz); return; }
        p.crossing = true;
      }
      if (t[2] === 'cross' && d <= dist) p.crossing = false;
      if (d > 0.001) g.rotation.y = Math.atan2(dx, dz);
      if (d <= dist) { g.position.x = t[0]; g.position.z = t[1]; p.path.shift(); dist -= d; }
      else { g.position.x += dx / d * dist; g.position.z += dz / d * dist; dist = 0; }
    }
    if (!p.path.length && p.walking) { p.walking = false; if (p.then) p.then(); }
  }

  // Passers-by: people walking through town who aren't shopping (some rare or unique, so the
  // player sees not every special-looking person is a customer). After 6 petang on weekdays
  // the factory shift ends and workers stream out of the gate on their way home.
  var passT = 1, homeT = 0, PASS_TIER = [['common', 0.6], ['rare', 0.25], ['unique', 0.15]];
  function passTier() { var r = Math.random(); for (var i = 0; i < PASS_TIER.length; i++) { if ((r -= PASS_TIER[i][1]) < 0) return PASS_TIER[i][0]; } return 'common'; }
  function passer(fromGate) {
    if (!KR.models.isReady() || people.length > 45) return;
    var seed = Math.floor(Math.random() * 1000), right = Math.random() < 0.5;
    var g = KR.models.make(seed, fromGate ? 'common' : passTier(), fromGate ? (seed % 2 ? 'worker_male' : 'worker_female') : null);
    var far = fromGate || Math.random() < 0.75, z = far ? 9.6 + Math.random() * 0.5 : 3.25 + Math.random() * 0.15;
    var p = { g: g, o: {}, state: 'pass', path: [], walking: false, lane: z };
    if (fromGate) {
      g.position.set(FGATE[0] + (Math.random() - 0.5), 0.1, FGATE[1] + 0.6);
      go(p, [[FGATE[0], FGATE[1] - 1.2], [FGATE[0] + (right ? 0.6 : -0.6), z], [right ? EDGE : -EDGE, z]], function () { remove(p); });
    } else {
      g.position.set(right ? -EDGE : EDGE, 0.1, z);
      go(p, [[right ? EDGE : -EDGE, z]], function () { remove(p); });
    }
    root.add(g); people.push(p);
  }

  function updatePeople(dt) {                               // dt in game seconds
    if ((passT -= dt) <= 0) { passer(false); passT = 1.2 + Math.random() * 2; }
    if (cfg.factoryDay && curHour >= 18 && curHour < 19.6 && (homeT -= dt) <= 0) { passer(true); homeT = 0.35 + Math.random() * 0.6; }
    // The first person who has reached the line goes in as soon as there is room (someone still
    // walking up doesn't hold the door for everyone behind them).
    var qi = queue.findIndex(function (q) { return q.state === 'queue'; });
    var free = qi >= 0 ? freeSpot(queue[qi].o.lot || 0) : -1;
    if (qi >= 0 && free >= 0 && inside < (cfg.capacity || 2)) {
      var p = queue.splice(qi, 1)[0]; inside++;
      p.state = 'enter'; p.spot = free; spotUsed[free] = true;
      var sp = SPOTS[free];
      go(p, [DOOR, INSIDE, [INSIDE[0], AISLE], [sp[0], AISLE], [sp[0], sp[1]]], function () { p.state = 'browse'; p.face = sp[2]; p.timer = p.o.dwell * 0.6; });
      shuffleQueue();
    }
    people.slice().forEach(function (p) {
      if (p.walking) step(p, WALK_SPEED * dt);
      else if (p.state === 'queue') p.g.rotation.y += (Math.PI / 2 - p.g.rotation.y) * 0.2;   // face the door
      else if (p.face != null) p.g.rotation.y += (p.face - p.g.rotation.y) * 0.2;
      if (p.state === 'browse' && (p.timer -= dt * 1000) <= 0) {
        spotUsed[p.spot] = false; p.face = null;
        var o = p.o.outcome(), out = [[p.g.position.x, AISLE], [INSIDE[0], AISLE]];
        if (o.bad) { bubble(p, o); p.state = 'done'; p.timer = 700; p.exit = [out[0], out[1], INSIDE]; }   // nothing to buy: says why, leaves
        else {
          var pay = PAY[p.spot % PAY.length];
          p.state = 'pay';
          go(p, out.concat([[INSIDE[0], pay[1]], pay]), function () {
            p.face = pay[2] != null ? pay[2] : Math.PI; bubble(p, o); p.state = 'done'; p.timer = p.o.dwell * 0.4 + 400; p.exit = [INSIDE];
          });
        }
      }
      if (p.state === 'done' && (p.timer -= dt * 1000) <= 0) { inside--; p.face = null; leave(p, p.exit.concat([DOOR])); }
      if (p.state === 'loiter' && (p.timer -= dt * 1000) <= 0) {
        if (!p.bubble) { bubble(p, p.o.outcome()); p.timer = 1200; }
        else { loiter--; leave(p, []); }
      }
    });
  }

  // The tauke (and the pembantu once hired) stand behind the counter, left of the door, facing right.
  function updateStaff(dt) {
    var want = cfg.staff || 1;
    if (staff.length !== want && KR.models.isReady()) {
      staff.forEach(function (g) { dispose(g); });
      staff = [];
      for (var i = 0; i < want; i++) {
        var g = KR.models.make(i ? 11 : 4, 0);                  // fixed looks, always a common character
        g.position.set(-1.8, 0.1, i ? 0.35 : -0.4); g.rotation.y = Math.PI / 2;   // behind the counter, facing the door side
        root.add(g); staff.push(g);
      }
    }
    staff.forEach(function (g) { KR.models.animate(g, false, dt); });
  }

  var v = null;
  var lastNow = 0;
  function loop(now) {
    if (!running) return;
    var dt = lastNow ? Math.min(0.1, (now - lastNow) / 1000) : 0; lastNow = now;
    var ts = cfg.timeScale ? cfg.timeScale() : 1;
    resizeIfNeeded();
    updatePeople(dt * ts);
    updateStaff(dt * ts);
    people.forEach(function (p) {
      var g = p.g;
      var moving = p.walking && !p.wait;
      if (g.userData.mixer) KR.models.animate(g, moving, dt * Math.min(ts, 3)); else KR.chars.animate(g, moving, now);
      if (p.bubble) {
        v = v || new THREE.Vector3();
        v.set(g.position.x, g.userData.top + 0.25, g.position.z).project(camera);
        p.bubble.style.left = ((v.x + 1) / 2 * host.clientWidth) + 'px';
        p.bubble.style.top = ((1 - v.y) / 2 * host.clientHeight) + 'px';
      }
    });
    updateTraffic(dt * Math.min(ts, 2));
    if (rain.visible) {
      var arr = rain.geometry.attributes.position.array;
      for (var i = 0; i < arr.length; i += 6) {
        arr[i + 1] -= 0.25; arr[i + 4] -= 0.25;
        if (arr[i + 4] < 0) { arr[i + 1] += 12; arr[i + 4] += 12; }
      }
      rain.geometry.attributes.position.needsUpdate = true;
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }

  var lastW = 0, lastH = 0;
  function resizeIfNeeded() {
    if (host.clientWidth !== lastW || host.clientHeight !== lastH) { lastW = host.clientWidth; lastH = host.clientHeight; resize(host); }
  }

  return {
    load: load, start: start, stop: stop, spawn: spawn, setHour: setHour, delivery: delivery,
    isReady: function () { return ready && wanted(); },
    wanted: wanted, setWanted: setWanted, failed: function () { return failed; },
    _debug: function () { return { THREE: THREE, root: root, camera: camera, people: people, cars: cars, spots: SPOTS, queue: queue }; }
  };
})();
