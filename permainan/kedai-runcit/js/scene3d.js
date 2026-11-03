// Optional 3D street scene (three.js). Loaded in the background after the page starts.
// If WebGL or the module can't load, or the player picks 2D, the SVG scene is used instead.
window.KR = window.KR || {};

KR.scene3d = (function () {
  var THREE = null, ready = false, failed = false;
  var renderer, scene, camera, hemi, sun, rain, root, shopSign, shopLamp, shelfGroup, car, lights = [];
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

  function signTexture(text) {
    var c = document.createElement('canvas'); c.width = 1024; c.height = 128;
    var g = c.getContext('2d');
    g.fillStyle = '#1f7a55'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#fff'; g.font = 'bold 64px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
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
  var FAC = { x: -12, z: 16.8, w: 11, d: 8 }, FGATE = [-12, 12.6], factorySign = null, factoryLang = '';
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
    var lorry = new THREE.Group(); g.add(lorry);                                                    // a lorry at the loading bay
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
  var LOT = { w: 7.0, h: 3.7, cut: 2.3, front: 1.2, back: -6.0 }, LOTS = 3;
  function lotX(i) { return i * LOT.w; }
  var TREES = [[-5.8, -5], [4.6, -8.2], [19.5, -6.5], [3.5, 10.9], [-3.6, 11.4], [10, 11.2], [-21, -3], [16, 11]];
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

  function build() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.localClippingEnabled = true;                // used to cut the front wall off the shop model
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = 'scene3d';
    scene = new THREE.Scene();
    // Angled top-down view: orthographic camera looking down at ~35 degrees.
    camera = new THREE.OrthographicCamera(-10, 10, 7, -7, 0.1, 200);
    hemi = new THREE.HemisphereLight(0xffffff, 0x6f8f5a, 1.1); scene.add(hemi);
    sun = new THREE.DirectionalLight(0xffffff, 1.3); sun.position.set(-10, 18, 8);
    sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 60 });
    scene.add(sun);
    root = new THREE.Group(); scene.add(root);

    // Ground: grass, the main road in front of the row and a side road
    var grass = box(160, 0.1, 160, 0x7fbf5f, 0, -0.06, 0); grass.receiveShadow = true;
    var road = box(160, 0.06, 4.8, 0x5c5f63, 0, -0.01, 5.9); road.receiveShadow = true;
    var side = box(4.2, 0.06, 80, 0x5c5f63, -9.5, -0.005, -36); side.receiveShadow = true;
    for (var i = -78; i < 80; i += 2.5) box(1.2, 0.02, 0.15, 0xf2efe6, i, 0.03, 5.9);
    var walk = box(160, 0.12, 2.2, 0xd9d0bd, 0, 0, 2.4); walk.receiveShadow = true;   // kaki lima
    box(160, 0.14, 0.25, 0x9a9384, 0, 0.02, 3.5);          // kerb
    box(160, 0.1, 0.5, 0x6d6a60, 0, 0.0, 8.55);            // longkang across the road
    var walk2 = box(160, 0.12, 2.0, 0xd9d0bd, 0, 0, 9.8); walk2.receiveShadow = true;  // pavement across the road

    // The kedai runcit: a row of three shop lots. The first is yours; the other two can be
    // rented with the "Besarkan Kedai" upgrade. buildShop() fills them in for the current level.
    var SW = LOT.w / 2;
    [-SW - 2.85, -SW - 0.85].forEach(function (x) { box(0.12, 2.6, 0.12, 0x3b3f44, x, 1.3, 1.75); });   // signboard posts
    var sign = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.75, 0.12),
      [mat(0x1f7a55), mat(0x1f7a55), mat(0x1f7a55), mat(0x1f7a55), new THREE.MeshBasicMaterial({ map: signTexture('KEDAI RUNCIT') }), mat(0x1f7a55)]);
    sign.position.set(-SW - 1.85, 2.45, 1.8); root.add(sign); shopSign = sign;
    shopLamp = new THREE.PointLight(0xffd9a0, 0, 16); shopLamp.position.set(LOT.w, 3.2, -1.6); scene.add(shopLamp);
    // Kaki lima tiles in front of the row
    var rowW = LOT.w * LOTS, rowX = (LOTS - 1) * LOT.w / 2;
    box(rowW, 0.14, 2.2, 0xd8b98f, rowX, 0, 2.35);
    for (var tx = -SW; tx <= rowX + rowW / 2; tx += 0.8) box(0.04, 0.142, 2.2, 0xc7a67a, tx, 0, 2.35);
    [-SW - 0.35].forEach(function (x) { box(0.45, 0.4, 0.45, 0xb5653b, x, 0.27, 1.65); });

    // Neighbours, a bus stop and a padang (simple versions until the models load)
    prim.houses = new THREE.Group(); root.add(prim.houses);
    house(20.5, -0.8, 0xbfe3d6, 0xc0453a); house(24.1, -0.8, 0xf3d9a4, 0x8e5bd1); house(27.9, -0.8, 0xcfd8f2, 0x2f7fd1);
    house(-16, -0.8, 0xf6c9c9, 0x2f9e6e);
    box(2.6, 0.08, 1.1, 0x2f7fd1, 33, 2.2, 3.0);              // bus stop roof
    box(0.1, 2.2, 0.1, 0x3b3f44, 31.8, 1.1, 3.4); box(0.1, 2.2, 0.1, 0x3b3f44, 34.2, 1.1, 3.4);
    box(2.2, 0.12, 0.45, 0xf2b705, 33, 0.5, 2.8);            // bench
    var field = box(10, 0.04, 8, 0x6eb24f, -18, 0, -9); field.receiveShadow = true;
    box(0.12, 1.2, 0.12, 0xffffff, -18, 0.6, -12.5); box(0.12, 1.2, 0.12, 0xffffff, -18, 0.6, -5.5);
    prim.trees = new THREE.Group(); root.add(prim.trees);
    TREES.forEach(function (p, j) { tree(p[0], p[1], 0.9 + (j % 3) * 0.15); });
    [-3.9, 10.5, 29.5].forEach(function (x) {                // street lamps
      box(0.12, 3.2, 0.12, 0x3b3f44, x, 1.6, 3.4); lights.push(box(0.35, 0.15, 0.35, 0xfff3c4, x, 3.2, 3.4));
    });
    // Parked kapcai
    box(0.25, 0.4, 1.1, 0xd6332b, 18.6, 0.45, 2.7); box(0.1, 0.5, 0.5, 0x222222, 18.6, 0.25, 2.2); box(0.1, 0.5, 0.5, 0x222222, 18.6, 0.25, 3.2);

    buildFactory();

    // A car that drives along the main road now and then
    car = new THREE.Group();
    var body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 1.1), mat(0x2f7fd1)); body.position.y = 0.5; car.add(body);
    var cab = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1), mat(0xcfe9f3)); cab.position.set(-0.1, 1.0, 0); car.add(cab);
    car.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    car.position.set(-30, 0, 6.6); root.add(car);

    root.traverse(function (o) { if (o.isMesh && o !== grass && o !== road && o !== side && o !== walk && o !== walk2 && o !== field) { o.castShadow = true; o.receiveShadow = true; } });

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
  var ENV = ['shop', 'house_a', 'house_b', 'house_c', 'house_d', 'house_e', 'flat_a', 'flat_b', 'bank', 'hospital', 'tree_a', 'tree_b', 'tree_c', 'palm_a', 'palm_b',
             'bush', 'bush_berry', 'flowers', 'plant'];
  function loadEnv() {
    import('../vendor/GLTFLoader.js').then(function (m) {
      var loader = new m.GLTFLoader();
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
  function placeEnv(M) {
    ['tree_a', 'tree_b', 'tree_c', 'palm_a', 'palm_b', 'bush', 'bush_berry', 'flowers', 'plant'].forEach(function (n) {
      M[n].traverse(function (m) { if (m.isMesh) m.material.color.multiplyScalar(1.9); });   // the pack's greens are very dark
    });
    ENVM = M;
    if (cfg.lots != null) buildShop(cfg.lots, cfg.products);   // swap the plain walls for the shop model

    // Neighbours along the row (front walls at z = 1), repainted in kampung colours
    var houses = [];
    function home(m, x, z, front, rot, wall, roof) {
      var o = put(M[m], x, rot ? z + front * 2.64 : z - front * 2.64, 2.64, rot ? Math.PI : 0);
      repaint(o, wall, roof); houses.push(o); return o;
    }
    home('house_d', 20.5, 1, 0.65, 0, 0xbfe3d6, 0xc0453a); home('house_a', 24.1, 1, 0.65, 0, 0xf3d9a4, 0x8e5bd1);
    home('house_b', 28.7, 1, 0.65, 0, 0xcfd8f2, 0x2f7fd1); home('house_c', -16, 1, 1.01, 0, 0xf6c9c9, 0x2f9e6e);
    // Second row behind the shops
    home('house_e', -3, -12, 1.06, 0, 0xf6d6a8, 0xc0453a); home('house_a', 2.5, -12, 0.65, 0, 0xd7ecf7, 0x2f9e6e);
    home('house_b', 8.6, -12, 0.65, 0, 0xf6c9c9, 0x8e5bd1); home('house_d', 14.4, -12, 0.65, 0, 0xe2f0c9, 0x2f7fd1);
    home('house_e', 19.6, -12, 1.06, 0, 0xcfd8f2, 0xc0453a); home('house_c', 25.5, -12, 1.01, 0, 0xf3d9a4, 0x2f9e6e);
    // Taller town buildings sit behind the houses so they never hide the shop row
    put(M.hospital, -3, -21, 2.0, 0); put(M.bank, 7, -20, 1.7, 0);
    put(M.flat_a, 16, -21, 2.4, 0); put(M.flat_b, 24, -21, 2.4, 0);
    put(M.flat_a, -30, -8, 2.4, Math.PI / 2); put(M.flat_b, -30, 1, 2.4, Math.PI / 2);
    // Across the road: low houses only, facing the street
    home('house_d', -1.5, 13.4, 0.65, 1, 0xd7ecf7, 0x2f9e6e);              // the kilang takes the plots further left
    home('house_e', 11, 13.4, 1.06, 1, 0xbfe3d6, 0x8e5bd1); home('house_a', 15.6, 13.4, 0.65, 1, 0xf6c9c9, 0xc0453a);
    home('house_d', 20.2, 13.4, 0.65, 1, 0xf3d9a4, 0x2f7fd1); home('house_b', 24.8, 13.4, 0.65, 1, 0xcfd8f2, 0x8e5bd1);
    prim.houses.visible = false;

    var kinds = ['palm_a', 'tree_a', 'palm_b', 'tree_b', 'tree_c'];
    TREES.concat([[-25, -15], [-25, 0], [34, -2], [36, 12], [-26, 14], [11.5, -27], [-14, -17], [20, -27], [-0.5, 20], [13.5, 21]])
      .forEach(function (p, j) {
        var k = kinds[j % kinds.length];
        put(M[k], p[0], p[1], k.indexOf('palm') === 0 ? 1.1 : 1.35, j * 1.3);
      });
    prim.trees.visible = false;

    // Greenery around the shop front and the houses
    put(M.plant, -LOT.w / 2 - 0.35, 1.65, 0.6);
    put(M.flowers, -7.3, 1.5, 1.1); put(M.bush, -4.9, 0.0, 0.9);
    [[18.7, 1.6], [22.3, 1.6], [26.1, 1.5], [31.7, 1.6], [-13.8, 1.4], [-18.2, 1.4]].forEach(function (p, j) {
      put(j % 2 ? M.bush : M.bush_berry, p[0], p[1], 0.75, j);
    });
    [[-5.5, -1.5], [-6.6, -2.8], [7.2, 11.2], [1.6, 11.2], [28.5, 11.2]].forEach(function (p, j) { put(M.bush, p[0], p[1], 1, j); });
  }

  // ---------- The shop row ----------
  // Lots 0..level are the player's (open, with shelves inside); the rest are closed with a
  // "Untuk Disewa" notice. Zoomed in, the roof and front walls of the player's lots are cut
  // away so you can see in; zoomed out you see the roofs.
  var shopGroup = null, cutMats = [], cutaway = true, AISLE = -1.4;
  var SPOTS = [], spotUsed = [], PAY = [];

  function shelf(w, h, d, x, z, rot) {
    var g = box(w, h, d, 0x9c7445, x, h / 2, z, shopGroup); g.rotation.y = rot || 0;
    for (var k = 1; k < 4; k++) box(w + 0.02, 0.04, d + 0.02, 0xc79a62, x, h * k / 4, z, shopGroup).rotation.y = rot || 0;
    return g;
  }

  function buildShop(level, products) {
    if (shopGroup) root.remove(shopGroup);
    shopGroup = new THREE.Group(); root.add(shopGroup);
    cutMats = []; SPOTS = []; PAY = [];
    var SW = LOT.w / 2, back = LOT.back, front = LOT.front, depth = front - back;
    for (var i = 0; i < LOTS; i++) {
      var cx = lotX(i), mine = i <= level;
      if (ENVM) {
        var sx = LOT.w / 2.48, sy = LOT.h / 1.397, sz = depth / 1.8, oz = front - 0.72 * sz;
        var planes = [new THREE.Plane(new THREE.Vector3(0, 0, -1), oz + 0.64 * sz), new THREE.Plane(new THREE.Vector3(0, -1, 0), LOT.cut)];
        if (mine && i > 0) planes.push(new THREE.Plane(new THREE.Vector3(1, 0, 0), -(cx - 0.85 * sx)));          // open to the lot on the left
        if (mine && i < level) planes.push(new THREE.Plane(new THREE.Vector3(-1, 0, 0), cx + 0.85 * sx));        // and on the right
        if (!mine) planes = [planes[1]];                       // empty lots: just the roof comes off, so they don't hide your shop
        put(ENVM.shop, cx, oz, [sx, sy, sz], 0, shopGroup).traverse(function (m) {
          if (!m.isMesh) return;
          m.material = m.material.clone(); m.material.side = THREE.DoubleSide;
          m.material.userData.planes = planes; cutMats.push(m.material);
        });
      } else {                                                // plain walls until the model loads
        box(LOT.w - 0.1, LOT.cut, 0.2, 0xf6e7c8, cx, LOT.cut / 2, back, shopGroup);
        if (i === 0 || !mine) box(0.2, LOT.cut, depth, 0xf6e7c8, cx - SW, LOT.cut / 2, (front + back) / 2, shopGroup);
        if (i === LOTS - 1 || i >= level) box(0.2, LOT.cut, depth, 0xf6e7c8, cx + SW, LOT.cut / 2, (front + back) / 2, shopGroup);
      }
      if (!mine) {                                            // shutter down, "for rent" notice
        box(LOT.w - 0.3, 0.06, depth - 0.3, 0xb9b4aa, cx, 0.12, (front + back) / 2 - 0.1, shopGroup);   // bare floor
        box(LOT.w - 0.5, 2.2, 0.12, 0x9aa3ab, cx, 1.1, front + 0.12, shopGroup);
        for (var r = 0.2; r < 2.2; r += 0.25) box(LOT.w - 0.48, 0.03, 0.13, 0x7d868e, cx, r, front + 0.13, shopGroup);
        var note = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), new THREE.MeshBasicMaterial({ map: noticeTexture() }));
        note.position.set(cx, 1.4, front + 0.2); shopGroup.add(note);
        continue;
      }
      // Floor tiles
      var fw = LOT.w - 0.3 + (i < level ? 0.3 : 0);           // join the floor to the next rented lot
      box(fw, 0.06, depth - 0.3, 0xe9e2d4, cx + (i < level ? 0.15 : 0), 0.13, (front + back) / 2 - 0.1, shopGroup);
      for (var fx = cx - SW + 0.6; fx < cx + SW - 0.3; fx += 0.8) box(0.03, 0.062, depth - 0.3, 0xcfc6b4, fx, 0.13, (front + back) / 2 - 0.1, shopGroup);
      var b0 = back + 0.45, spotZ = back + 1.3, isl = -3.2, isZ = isl + 0.7;
      if (i === 0) {
        shelf(5.2, 2.1, 0.5, cx - 0.6, b0);                                             // back wall
        shelf(0.5, 1.9, 3.4, cx - SW + 0.45, back + 2.9);                                // left wall
        shelf(1.8, 1.2, 0.7, cx - 1.1, isl); shelf(1.4, 1.2, 0.7, cx + 1.6, isl);       // islands
        box(1.0, 2.2, 0.7, 0xe8f4fb, cx + 2.75, 1.1, back + 0.55, shopGroup);            // drinks fridge
        box(0.8, 1.8, 0.05, 0x9fd3ea, cx + 2.75, 1.2, back + 0.92, shopGroup);
        box(0.7, 1.05, 1.6, 0x8a6a3f, cx + 1.9, 0.53, -0.1, shopGroup);                  // counter, right of the door
        box(0.4, 0.3, 0.45, 0x3b3f44, cx + 2.0, 1.2, -0.3, shopGroup);                   // till
        box(1.2, 0.85, 0.7, 0xf4f7fb, cx - 2.4, 0.43, 0.2, shopGroup);                   // peti ais krim
        box(1.22, 0.1, 0.72, 0x2f7fd1, cx - 2.4, 0.9, 0.2, shopGroup);
        SPOTS.push([cx - 2.5, spotZ, Math.PI], [cx + 0.35, spotZ, Math.PI], [cx - 2.5, back + 2.9, -Math.PI / 2],
                   [cx - 1.1, isZ, Math.PI], [cx + 1.6, isZ, Math.PI], [cx + 2.75, spotZ, Math.PI]);
        PAY.push([cx + 1.15, 0.25, Math.PI / 2], [cx + 1.15, -0.35, Math.PI / 2]);        // queue at the counter, facing the tauke
        shelfItems(products, cx - 3.0, cx + 1.8, b0 + 0.27, 3, 0.5, 0);
        shelfItems(products, back + 1.4, back + 4.4, cx - SW + 0.71, 3, 0.45, Math.PI / 2);
        shelfItems(products, cx - 1.8, cx - 0.4, isl + 0.37, 1, 0.85, 0);
        shelfItems(products, cx + 1.1, cx + 2.1, isl + 0.37, 1, 0.85, 0);
      } else {
        shelf(LOT.w - 0.9, 2.1, 0.5, cx, b0);
        shelf(1.8, 1.2, 0.7, cx - 1.5, isl); shelf(1.8, 1.2, 0.7, cx + 1.5, isl);
        if (i === 2) { box(1.2, 0.85, 0.7, 0xf4f7fb, cx, 0.43, 0.2, shopGroup); box(1.22, 0.1, 0.72, 0x2f7fd1, cx, 0.9, 0.2, shopGroup); }
        SPOTS.push([cx - 2.9, spotZ, Math.PI], [cx, spotZ, Math.PI], [cx + 2.9, spotZ, Math.PI],
                   [cx - 1.5, isZ, Math.PI], [cx + 1.5, isZ, Math.PI]);
        shelfItems(products, cx - SW + 0.7, cx + SW - 0.7, b0 + 0.27, 3, 0.5, 0);
        shelfItems(products, cx - 2.2, cx - 0.8, isl + 0.37, 1, 0.85, 0);
        shelfItems(products, cx + 0.8, cx + 2.2, isl + 0.37, 1, 0.85, 0);
      }
    }
    spotUsed = SPOTS.map(function () { return false; });
    shopLamp.position.x = lotX(level) / 2;
    shopGroup.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    setCutaway(cutaway, true);
  }

  // Product sprites along a shelf face, from a to b (x, or z when rot is a quarter turn).
  function shelfItems(products, a, b, at, rows, y0, rot) {
    if (!products || !products.length) return;
    var n = Math.max(1, Math.floor((b - a) / 0.55)), k = 0;
    itemGeo = itemGeo || new THREE.PlaneGeometry(0.45, 0.45);
    for (var r = 0; r < rows; r++) for (var c = 0; c <= n; c++) {
      var m = new THREE.Mesh(itemGeo, itemMat(products[k++ % products.length]));
      var t = a + (b - a) * c / n;
      if (rot) m.position.set(at, y0 + r * 0.6, t); else m.position.set(t, y0 + r * 0.6, at);
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
    g.fillStyle = '#c0453a'; g.font = 'bold 40px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
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
    view.x = Math.max(-32, Math.min(42, view.x)); view.z = Math.max(-22, Math.min(16, view.z));
    camera.zoom = view.zoom;
    camera.position.set(14 + view.x, 20, 22 + view.z); camera.lookAt(1 + view.x, 0.5, 0.2 + view.z);
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
    shopSign.material[4].map.dispose();
    shopSign.material[4].map = signTexture(opts.shopName.toUpperCase());
    var key = opts.products.join() + KR.i18n.lang();                  // the "for rent" notice is in the current language
    if (opts.lots !== builtLots || key !== builtProducts) {
      buildShop(opts.lots, opts.products); builtLots = opts.lots; builtProducts = key;
    }
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
  var DOOR = [0.5, 2.0], INSIDE = [0.5, 0.6], WALK_SPEED = 3.0, EDGE = 30, staff = [];
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
    if (o.from === 'kilang') {                               // out of the factory gate and across the road
      g.position.set(FGATE[0] + (Math.random() - 0.5), 0.1, FGATE[1] + 0.6);
      start = [[FGATE[0], FGATE[1] - 1.2], [FGATE[0] + 0.5, 9.8], [FGATE[0] + 2, lane]];
      p.exitLeft = false;
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
    if (p.o.back) {                                          // lunch break over: back across the road into the factory
      p.state = 'exit';
      return go(p, from.concat([[FGATE[0] + 2, p.lane], [FGATE[0] + 0.5, 9.8], [FGATE[0], FGATE[1] - 1.2], [FGATE[0], FGATE[1] + 0.8]]), function () { remove(p); });
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
    while (dist > 0 && p.path.length) {
      var t = p.path[0], dx = t[0] - g.position.x, dz = t[1] - g.position.z, d = Math.hypot(dx, dz);
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
    var free = spotUsed.indexOf(false);
    if (queue.length && queue[0].state === 'queue' && free >= 0 && inside < (cfg.capacity || 2)) {
      var p = queue.shift(); inside++;
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

  // The tauke (and the pembantu once hired) stand behind the counter, right of the door, facing in.
  function updateStaff(dt) {
    var want = cfg.staff || 1;
    if (staff.length !== want && KR.models.isReady()) {
      staff.forEach(function (g) { dispose(g); });
      staff = [];
      for (var i = 0; i < want; i++) {
        var g = KR.models.make(i ? 11 : 4, 0);                  // fixed looks, always a common character
        g.position.set(2.6, 0.1, i ? 0.45 : -0.3); g.rotation.y = -Math.PI / 2;   // behind the counter, facing the door
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
      if (g.userData.mixer) KR.models.animate(g, p.walking, dt * Math.min(ts, 3)); else KR.chars.animate(g, p.walking, now);
      if (p.bubble) {
        v = v || new THREE.Vector3();
        v.set(g.position.x, g.userData.top + 0.25, g.position.z).project(camera);
        p.bubble.style.left = ((v.x + 1) / 2 * host.clientWidth) + 'px';
        p.bubble.style.top = ((1 - v.y) / 2 * host.clientHeight) + 'px';
      }
    });
    car.position.x += 0.12;                                // the car loops along the road
    if (car.position.x > 34) car.position.x = -34 - Math.random() * 40;
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
    load: load, start: start, stop: stop, spawn: spawn, setHour: setHour,
    isReady: function () { return ready && wanted(); },
    wanted: wanted, setWanted: setWanted, failed: function () { return failed; },
    _debug: function () { return { THREE: THREE, root: root, camera: camera }; }
  };
})();
