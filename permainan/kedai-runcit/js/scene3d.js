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
  // The shop: 10% taller than before and wider and deeper so there's room inside.
  var SHOP = { w: 7.9, h: 3.7, cut: 2.3, front: 1.2, back: -3.6 };
  var TREES = [[-5.2, -3.8], [-6.8, 0.2], [4.6, -5.2], [15.5, -3.4], [-12.5, 0.5], [3.5, 9.5], [-3, 9.5], [10, 9.8], [-21, -3], [-6, 9.8], [16, 9.6]];
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
    var grass = box(60, 0.1, 60, 0x7fbf5f, 0, -0.06, 0); grass.receiveShadow = true;
    var road = box(60, 0.06, 3.4, 0x5c5f63, 0, -0.01, 5.2); road.receiveShadow = true;
    var side = box(3.4, 0.06, 40, 0x5c5f63, -9.5, -0.005, -12); side.receiveShadow = true;
    for (var i = -28; i < 30; i += 2.5) box(1.2, 0.02, 0.15, 0xf2efe6, i, 0.03, 5.2);
    var walk = box(60, 0.12, 2.2, 0xd9d0bd, 0, 0, 2.4); walk.receiveShadow = true;   // kaki lima
    box(60, 0.14, 0.25, 0x9a9384, 0, 0.02, 3.5);           // kerb
    box(60, 0.1, 0.5, 0x6d6a60, 0, 0.0, 7.1);              // longkang across the road

    // The kedai runcit, drawn as a cutaway: no front wall and no roof, so you can see inside.
    // Simple walls until the shop model loads (see loadEnv); the rest stays.
    var SW = SHOP.w / 2, front = SHOP.front, back = SHOP.back, H = SHOP.cut;
    prim.shop = new THREE.Group(); root.add(prim.shop);
    box(SHOP.w, H, 0.2, 0xf6e7c8, 0, H / 2, back, prim.shop);
    box(0.2, H, front - back, 0xf6e7c8, -SW, H / 2, (front + back) / 2, prim.shop);
    box(0.2, H, front - back, 0xf6e7c8, SW, H / 2, (front + back) / 2, prim.shop);
    box(SHOP.w - 0.4, 0.06, front - back - 0.3, 0xe9e2d4, 0, 0.13, (front + back) / 2 - 0.1);   // floor tiles
    for (var fx = -SW + 0.6; fx < SW - 0.3; fx += 0.8) box(0.03, 0.062, front - back - 0.3, 0xcfc6b4, fx, 0.13, (front + back) / 2 - 0.1);
    // Signboard on two posts at the corner of the kaki lima
    [-SW - 2.85, -SW - 0.85].forEach(function (x) { box(0.12, 2.6, 0.12, 0x3b3f44, x, 1.3, 1.75); });
    var sign = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.75, 0.12),
      [mat(0x1f7a55), mat(0x1f7a55), mat(0x1f7a55), mat(0x1f7a55), new THREE.MeshBasicMaterial({ map: signTexture('KEDAI RUNCIT') }), mat(0x1f7a55)]);
    sign.position.set(-SW - 1.85, 2.45, 1.8); root.add(sign); shopSign = sign;
    shopLamp = new THREE.PointLight(0xffd9a0, 0, 12); shopLamp.position.set(0, 3.2, -1.2); scene.add(shopLamp);

    // Inside: shelves along the back and left wall, an island, the counter, a drinks fridge
    var WOOD = 0x9c7445;
    box(6.1, 2.2, 0.5, WOOD, -0.5, 1.1, back + 0.4);
    box(0.5, 1.9, 2.6, WOOD, -SW + 0.45, 0.95, back + 2.2);
    box(2.4, 1.2, 0.7, WOOD, -0.9, 0.6, back + 2.6);
    box(0.8, 1.05, 2.0, 0x8a6a3f, SW - 1.7, 0.53, front - 2.2);           // counter
    box(0.5, 0.3, 0.4, 0x3b3f44, SW - 1.7, 1.2, front - 2.6);             // till
    var fridge = box(1.0, 2.2, 0.7, 0xe8f4fb, SW - 0.7, 1.1, back + 0.55);
    box(0.8, 1.8, 0.05, 0x9fd3ea, SW - 0.7, 1.2, back + 0.92);
    box(1.3, 0.85, 0.7, 0xf4f7fb, -SW + 1.3, 0.43, front - 0.6);            // peti ais krim
    box(1.32, 0.1, 0.72, 0x2f7fd1, -SW + 1.3, 0.9, front - 0.6);
    shelfGroup = new THREE.Group(); root.add(shelfGroup);

    // Kaki lima in front: tiles and plant pots by the pillars
    box(SHOP.w + 1, 0.14, 2.2, 0xd8b98f, 0, 0, 2.35);
    for (var tx = -SW - 0.5; tx < SW + 0.6; tx += 0.8) box(0.04, 0.142, 2.2, 0xc7a67a, tx, 0, 2.35);
    [-SW - 0.35, SW + 0.35].forEach(function (x) { box(0.45, 0.4, 0.45, 0xb5653b, x, 0.27, 1.65); });

    // Neighbours, a bus stop and a padang (simple versions until the models load)
    prim.houses = new THREE.Group(); root.add(prim.houses);
    house(6.2, -0.8, 0xbfe3d6, 0xc0453a); house(9.6, -0.8, 0xf3d9a4, 0x8e5bd1); house(13.4, -0.8, 0xcfd8f2, 0x2f7fd1);
    house(-16, -0.8, 0xf6c9c9, 0x2f9e6e);
    box(2.6, 0.08, 1.1, 0x2f7fd1, 18.5, 2.2, 3.0);            // bus stop roof
    box(0.1, 2.2, 0.1, 0x3b3f44, 17.3, 1.1, 3.4); box(0.1, 2.2, 0.1, 0x3b3f44, 19.7, 1.1, 3.4);
    box(2.2, 0.12, 0.45, 0xf2b705, 18.5, 0.5, 2.8);          // bench
    var field = box(10, 0.04, 8, 0x6eb24f, -18, 0, -9); field.receiveShadow = true;
    box(0.12, 1.2, 0.12, 0xffffff, -18, 0.6, -12.5); box(0.12, 1.2, 0.12, 0xffffff, -18, 0.6, -5.5);
    prim.trees = new THREE.Group(); root.add(prim.trees);
    TREES.forEach(function (p, j) { tree(p[0], p[1], 0.9 + (j % 3) * 0.15); });
    box(0.12, 3.2, 0.12, 0x3b3f44, 4.8, 1.6, 3.4);           // street lamp
    var lamp = box(0.35, 0.15, 0.35, 0xfff3c4, 4.8, 3.2, 3.4); lights.push(lamp);
    // Parked kapcai
    box(0.25, 0.4, 1.1, 0xd6332b, 5.8, 0.45, 2.7); box(0.1, 0.5, 0.5, 0x222222, 5.8, 0.25, 2.2); box(0.1, 0.5, 0.5, 0x222222, 5.8, 0.25, 3.2);

    // A car that drives along the main road now and then
    car = new THREE.Group();
    var body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 1.1), mat(0x2f7fd1)); body.position.y = 0.5; car.add(body);
    var cab = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1), mat(0xcfe9f3)); cab.position.set(-0.1, 1.0, 0); car.add(cab);
    car.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    car.position.set(-30, 0, 5.8); root.add(car);

    root.traverse(function (o) { if (o.isMesh && o !== grass && o !== road && o !== side && o !== walk && o !== field) { o.castShadow = true; o.receiveShadow = true; } });

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
  var ENV = ['shop', 'house_a', 'house_b', 'house_c', 'house_d', 'tree_a', 'tree_b', 'tree_c', 'palm_a', 'palm_b',
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
  function put(src, x, z, scale, rotY) {
    var o = src.clone(true);
    if (Array.isArray(scale)) o.scale.set(scale[0], scale[1], scale[2]); else o.scale.setScalar(scale);
    o.rotation.y = rotY || 0; o.position.set(x, 0, z);
    o.traverse(function (m) { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    root.add(o); return o;
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

  function placeEnv(M) {
    ['tree_a', 'tree_b', 'tree_c', 'palm_a', 'palm_b', 'bush', 'bush_berry', 'flowers', 'plant'].forEach(function (n) {
      M[n].traverse(function (m) { if (m.isMesh) m.material.color.multiplyScalar(1.9); });   // the pack's greens are very dark
    });
    // Shop model stretched to the new footprint, with its front wall cut away (clipping plane)
    // so the inside shows. The model's front wall sits at z = 0.72 in its own units.
    var sx = SHOP.w / 2.48, sy = SHOP.h / 1.397, sz = (SHOP.front - SHOP.back) / 1.62, oz = SHOP.front - 0.72 * sz;
    var cut = [new THREE.Plane(new THREE.Vector3(0, 0, -1), oz + 0.64 * sz), new THREE.Plane(new THREE.Vector3(0, -1, 0), SHOP.cut)];
    put(M.shop, 0, oz, [sx, sy, sz]).traverse(function (m) {
      if (m.isMesh) { m.material = m.material.clone(); m.material.clippingPlanes = cut; m.material.side = THREE.DoubleSide; }
    });
    prim.shop.visible = false;

    // Houses 10% bigger than before
    put(M.house_a, 6.2, -0.72, 2.64); put(M.house_d, 9.6, -0.72, 2.64); put(M.house_b, 14.4, -0.72, 2.64);
    put(M.house_c, -16, -1.67, 2.64);
    var colours = [[0xbfe3d6, 0xc0453a], [0xf3d9a4, 0x8e5bd1], [0xcfd8f2, 0x2f7fd1], [0xf6c9c9, 0x2f9e6e]];
    root.children.slice(-4).forEach(function (o, i) { repaint(o, colours[i][0], colours[i][1]); });
    prim.houses.visible = false;

    var kinds = ['palm_a', 'tree_a', 'palm_b', 'tree_b', 'tree_c'];
    TREES.forEach(function (p, j) {
      var k = kinds[j % kinds.length];
      put(M[k], p[0], p[1], k.indexOf('palm') === 0 ? 1.1 : 1.35, j * 1.3);
    });
    prim.trees.visible = false;

    // Greenery around the shop front and the houses
    put(M.plant, -SHOP.w / 2 - 0.35, 1.65, 0.6); put(M.plant, SHOP.w / 2 + 0.35, 1.65, 0.6, 1.2);
    put(M.flowers, -7.3, 1.5, 1.1); put(M.bush, -4.9, 0.0, 0.9);
    [[5.0, 1.6], [7.4, 1.6], [8.6, 1.5], [12.0, 1.6], [16.6, 1.5], [-13.8, 1.4], [-18.2, 1.4]].forEach(function (p, j) {
      put(j % 2 ? M.bush : M.bush_berry, p[0], p[1], 0.75, j);
    });
    [[-5.5, -1.5], [-6.8, -2.6], [5.2, 9.2], [-1.2, 9.4], [12.5, 9.5]].forEach(function (p, j) { put(M.bush, p[0], p[1], 1, j); });
  }

  function resize(host) {
    var w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    var aspect = w / h, viewH = 22, viewW = viewH * aspect;
    if (viewW < 24) { viewW = 24; viewH = viewW / aspect; }      // phones: keep the shop and its neighbours in view
    Object.assign(camera, { left: -viewW / 2, right: viewW / 2, top: viewH / 2, bottom: -viewH / 2 });
    camera.position.set(14, 20, 22); camera.lookAt(1, 0.5, 0.2);
    camera.updateProjectionMatrix();
  }

  var host, overlay;
  function start(opts) {
    host = opts.host; overlay = opts.overlay; cfg = opts;
    if (renderer.domElement.parentNode !== host) host.insertBefore(renderer.domElement, host.firstChild);
    clear();
    daySky = new THREE.Color(SKY[opts.weather] || SKY.cerah); dayLight = LIGHT[opts.weather] || 1.2;
    scene.background = daySky.clone(); setHour(8);
    rain.visible = opts.weather === 'hujan' || opts.weather === 'ribut';
    shopSign.material[4].map.dispose();
    shopSign.material[4].map = signTexture(opts.shopName.toUpperCase());
    while (shelfGroup.children.length) shelfGroup.remove(shelfGroup.children[0]);
    opts.products.forEach(function (svg, i) {
      var p = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: svgTexture(svg), transparent: true }));
      for (var r = 0; r < 3; r++) for (var c = i; c < 11; c += opts.products.length) {   // fill the back shelf
        var q = p.clone(); q.position.set(-SHOP.w / 2 + 1.1 + c * 0.55, 0.55 + r * 0.6, SHOP.back + 0.67); shelfGroup.add(q);
      }
      for (var c2 = i; c2 < 4; c2 += opts.products.length) {                          // and the island
        var q2 = p.clone(); q2.position.set(-1.8 + c2 * 0.6, 0.85, SHOP.back + 2.97); shelfGroup.add(q2);
        var q3 = p.clone(); q3.position.set(-SHOP.w / 2 + 0.71, 0.7 + (c2 % 2) * 0.7, SHOP.back + 1.5 + Math.floor(c2 / 2) * 1.2);
        q3.rotation.y = Math.PI / 2; shelfGroup.add(q3);                                 // and the side shelf
      }
    });
    resize(host);
    running = true;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  // Evening: from 7pm the sky darkens and the street lamp and shop lights come on.
  var daySky, dayLight, NIGHT = null;
  function setHour(h) {
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
  var DOOR = [0.6, 2.0], INSIDE = [0.6, 0.8], COUNTER = [1.3, -1.0], WALK_SPEED = 3.0, EDGE = 26;
  // Where a customer stands to browse, and which way they face.
  var SPOTS = [
    { at: [-1.0, -2.45], rot: Math.PI }, { at: [-0.9, 0.05], rot: Math.PI }, { at: [-2.55, -1.0], rot: -Math.PI / 2 },
    { at: [0.4, -2.45], rot: Math.PI }, { at: [-2.4, -2.45], rot: Math.PI }, { at: [0.1, 0.05], rot: Math.PI },
    { at: [-2.55, -2.0], rot: -Math.PI / 2 }
  ];
  var spotUsed = SPOTS.map(function () { return false; }), staff = [];
  var queue = [], inside = 0, loiter = 0, cfg = {};

  function slot(i) { return [DOOR[0] - 1.2 - (i % 9) * 1.0, 2.75 + Math.floor(i / 9) * 0.5]; }   // a long line doubles back
  function go(p, pts, then) { p.path = pts.slice(); p.then = then; p.walking = true; }

  function spawn(o) {
    var g = KR.models.isReady() ? KR.models.make(o.seed, o.rep) : KR.chars.make(o.seed);
    var lane = 3.0 + Math.random() * 0.35, fromLeft = o.fromLeft;
    var p = { g: g, o: o, bubble: null, lane: lane, exitLeft: Math.random() < 0.5, path: [], walking: false, timer: 0 };
    var viaSide = fromLeft && Math.random() < 0.35;          // some come up the side road
    g.position.set(viaSide ? -9.5 : (fromLeft ? -EDGE : EDGE), 0.1, viaSide ? -EDGE : lane);
    root.add(g); people.push(p);
    var start = viaSide ? [[-9.5, lane]] : [];
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
    b.className = 'bubble' + (o.bad ? ' bad' : '');
    b.innerHTML = o.html;
    overlay.appendChild(b); p.bubble = b;
    if (!o.bad) p.g.userData.bag.visible = true;           // walks out carrying a plastic bag
  }

  function leave(p, from) {
    if (p.bubble) { p.bubble.remove(); p.bubble = null; }
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

  function updatePeople(dt) {                               // dt in game seconds
    var free = spotUsed.indexOf(false);
    if (queue.length && queue[0].state === 'queue' && free >= 0 && inside < (cfg.capacity || 2)) {
      var p = queue.shift(); inside++;
      p.state = 'enter'; p.spot = free; spotUsed[free] = true;
      var sp = SPOTS[free];
      go(p, [DOOR, INSIDE, sp.at], function () { p.state = 'browse'; p.face = sp.rot; p.timer = p.o.dwell * 0.6; });
      shuffleQueue();
    }
    people.slice().forEach(function (p) {
      if (p.walking) step(p, WALK_SPEED * dt);
      else if (p.state === 'queue') p.g.rotation.y += (Math.PI / 2 - p.g.rotation.y) * 0.2;   // face the door
      else if (p.face != null) p.g.rotation.y += (p.face - p.g.rotation.y) * 0.2;
      if (p.state === 'browse' && (p.timer -= dt * 1000) <= 0) {
        spotUsed[p.spot] = false; p.face = null;
        var o = p.o.outcome();
        if (o.bad) { bubble(p, o); p.state = 'done'; p.timer = 700; }            // nothing to buy: says why, leaves
        else {
          p.state = 'pay';
          go(p, [[COUNTER[0] - 0.45 * (p.spot % 2), COUNTER[1] + 0.35 * (p.spot - 3)]], function () {
            p.face = Math.PI / 2; bubble(p, o); p.state = 'done'; p.timer = p.o.dwell * 0.4 + 400;
          });
        }
      }
      if (p.state === 'done' && (p.timer -= dt * 1000) <= 0) { inside--; p.face = null; leave(p, [[0.9, 0.6], [0.9, 1.9]]); }
      if (p.state === 'loiter' && (p.timer -= dt * 1000) <= 0) {
        if (!p.bubble) { bubble(p, p.o.outcome()); p.timer = 1200; }
        else { loiter--; leave(p, []); }
      }
    });
  }

  // The tauke (and the pembantu once hired) stand behind the counter.
  function updateStaff(dt) {
    var want = cfg.staff || 1;
    if (staff.length !== want && KR.models.isReady()) {
      staff.forEach(function (g) { dispose(g); });
      staff = [];
      for (var i = 0; i < want; i++) {
        var g = KR.models.make(i ? 11 : 4, 0);                  // fixed looks, always a common character
        g.position.set(SHOP.w / 2 - 0.9, 0.1, -1.0 + (i ? -1.2 : 0.3)); g.rotation.y = -Math.PI / 2;
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
    wanted: wanted, setWanted: setWanted, failed: function () { return failed; }
  };
})();
