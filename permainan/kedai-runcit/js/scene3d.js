// Optional 3D street scene (three.js). Loaded in the background after the page starts.
// If WebGL or the module can't load, or the player picks 2D, the SVG scene is used instead.
window.KR = window.KR || {};

KR.scene3d = (function () {
  var THREE = null, ready = false, failed = false;
  var renderer, scene, camera, hemi, sun, rain, root, shopSign, shelfGroup, car;
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

  function prism(len, h, depth, color, x, y, z) {          // gable roof, ridge running along x
    var sh = new THREE.Shape();
    sh.moveTo(-depth / 2, 0); sh.lineTo(depth / 2, 0); sh.lineTo(0, h); sh.lineTo(-depth / 2, 0);
    var geo = new THREE.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false });
    geo.translate(0, 0, -len / 2);
    var m = new THREE.Mesh(geo, mat(color));
    m.rotation.y = Math.PI / 2; m.position.set(x, y, z); root.add(m); return m;
  }
  function tree(x, z, s) {
    s = s || 1;
    box(0.25 * s, 1.2 * s, 0.25 * s, 0x7a5233, x, 0.6 * s, z);
    var c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 * s, 0), mat(0x3f9b5b));
    c.position.set(x, 1.7 * s, z); c.castShadow = true; root.add(c);
  }
  function house(x, z, wall, roof) {                       // rumah teres unit
    box(3, 2.4, 3.6, wall, x, 1.2, z);
    prism(3.2, 1.3, 4.2, roof, x, 2.4, z);
    box(0.9, 1.6, 0.08, 0x9c7445, x - 0.6, 0.8, z + 1.82);
    box(1, 0.8, 0.08, 0xcfe9f3, x + 0.7, 1.3, z + 1.82);
    box(3, 0.6, 0.08, 0xf2efe6, x, 0.3, z + 3.2);           // low front gate wall
  }

  function build() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
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

    // The kedai runcit
    box(6, 3.4, 4, 0xf6e7c8, 0, 1.7, -0.8);
    box(6.4, 0.3, 4.4, 0xb5653b, 0, 3.55, -0.8);            // flat roof edge
    var sign = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.8, 0.25),
      [mat(0x8a6a3f), mat(0x8a6a3f), mat(0x8a6a3f), mat(0x8a6a3f), new THREE.MeshBasicMaterial({ map: signTexture('KEDAI RUNCIT') }), mat(0x8a6a3f)]);
    sign.position.set(0, 3.0, 1.3); root.add(sign); shopSign = sign;
    for (var k = 0; k < 8; k++) {                          // striped awning
      var a = box(0.78, 0.08, 1.3, k % 2 ? 0xffffff : 0xc0453a, -2.73 + k * 0.78, 2.35, 1.85);
      a.rotation.x = 0.3;
    }
    box(2.8, 1.6, 0.1, 0x8a6a3f, -1.3, 1.25, 1.22);         // window frame
    var glass = box(2.5, 1.35, 0.05, 0xcfe9f3, -1.3, 1.25, 1.28);
    glass.material.emissive = new THREE.Color(0x203038);
    shelfGroup = new THREE.Group(); root.add(shelfGroup);
    box(1.2, 2.2, 0.1, 0x9c7445, 1.6, 1.1, 1.22);           // door
    box(2.4, 0.9, 0.8, 0x8a6a3f, -1.3, 0.45, 1.8);          // display crates outside
    [0xd6332b, 0xf2b705, 0x2f9e6e].forEach(function (c, j) { box(0.6, 0.3, 0.5, c, -2.1 + j * 0.8, 1.05, 1.8); });

    // Rumah teres next door, a bus stop, trees and a padang
    house(6, -0.8, 0xbfe3d6, 0xc0453a); house(9.2, -0.8, 0xf3d9a4, 0x8e5bd1); house(12.4, -0.8, 0xcfd8f2, 0x2f7fd1);
    house(-14, -0.8, 0xf6c9c9, 0x2f9e6e);
    box(2.6, 0.08, 1.1, 0x2f7fd1, -5, 2.2, 3.0);             // bus stop roof
    box(0.1, 2.2, 0.1, 0x3b3f44, -6.2, 1.1, 3.4); box(0.1, 2.2, 0.1, 0x3b3f44, -3.8, 1.1, 3.4);
    box(2.2, 0.12, 0.45, 0xf2b705, -5, 0.5, 2.8);           // bench
    var field = box(10, 0.04, 8, 0x6eb24f, -17, 0, -8); field.receiveShadow = true;
    box(0.12, 1.2, 0.12, 0xffffff, -17, 0.6, -11.5); box(0.12, 1.2, 0.12, 0xffffff, -17, 0.6, -4.5);
    [[-4, -3.5], [-6.5, 0.5], [4, -4.5], [15.5, 1.5], [-12, 1], [3.5, 9.5], [-3, 9.5], [10, 9.8], [-20, -3]].forEach(function (p, j) {
      tree(p[0], p[1], 0.9 + (j % 3) * 0.15);
    });
    var post = box(0.12, 3.2, 0.12, 0x3b3f44, 3.4, 1.6, 3.4);
    var lamp = box(0.35, 0.15, 0.35, 0xfff3c4, 3.4, 3.2, 3.4); lamp.material.emissive = new THREE.Color(0x665a20);
    // Parked kapcai in front of the shop
    box(0.25, 0.4, 1.1, 0xd6332b, 2.9, 0.45, 2.6); box(0.1, 0.5, 0.5, 0x222222, 2.9, 0.25, 2.1); box(0.1, 0.5, 0.5, 0x222222, 2.9, 0.25, 3.1);

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

  function resize(host) {
    var w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    var aspect = w / h, viewH = 16, viewW = viewH * aspect;
    if (viewW < 17) { viewW = 17; viewH = viewW / aspect; }      // phones: keep the shop and its neighbours in view
    Object.assign(camera, { left: -viewW / 2, right: viewW / 2, top: viewH / 2, bottom: -viewH / 2 });
    camera.position.set(14, 16, 22); camera.lookAt(1, 0.5, 1.2);
    camera.updateProjectionMatrix();
  }

  var host, overlay;
  function start(opts) {
    host = opts.host; overlay = opts.overlay;
    if (renderer.domElement.parentNode !== host) host.insertBefore(renderer.domElement, host.firstChild);
    clear();
    scene.background = new THREE.Color(SKY[opts.weather] || SKY.cerah);
    sun.intensity = LIGHT[opts.weather] || 1.2;
    rain.visible = opts.weather === 'hujan' || opts.weather === 'ribut';
    shopSign.material[4].map.dispose();
    shopSign.material[4].map = signTexture(opts.shopName.toUpperCase());
    while (shelfGroup.children.length) shelfGroup.remove(shelfGroup.children[0]);
    opts.products.forEach(function (svg, i) {
      var p = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: svgTexture(svg), transparent: true }));
      p.position.set(-2.2 + (i % 4) * 0.6, 1.5 - Math.floor(i / 4) * 0.55, 1.33); shelfGroup.add(p);
    });
    resize(host);
    running = true;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function stop() { running = false; cancelAnimationFrame(raf); clear(); }

  function dispose(g) { root.remove(g); (g.userData.mixer ? KR.models : KR.chars).dispose(g); }

  function clear() {
    people.forEach(function (p) { dispose(p.g); if (p.bubble) p.bubble.remove(); });
    people = [];
  }

  // Walk along a list of [x, z] points, taking ms in total.
  function walkPath(p, pts, ms) {
    var from = [p.g.position.x, p.g.position.z], segs = [], total = 0;
    pts.forEach(function (pt) { var d = Math.hypot(pt[0] - from[0], pt[1] - from[1]); segs.push({ a: from, b: pt, d: d }); total += d; from = pt; });
    p.segs = segs; p.total = total || 1; p.t0 = performance.now(); p.dur = Math.max(1, ms); p.walking = true;
  }

  var EDGE = 26;
  // Same contract as the 2D walker: walk to the shop front, say something, walk off.
  function spawn(seed, fromLeft, ms, rep) {
    var g = KR.models.isReady() ? KR.models.make(seed, rep) : KR.chars.make(seed);
    var lane = 1.8 + Math.random() * 1.2, door = [-0.4 + Math.random() * 2.4, 2.0 + Math.random() * 0.6];
    var p = { g: g, bubble: null, lane: lane, exitLeft: Math.random() < 0.5 };
    var viaSide = fromLeft && Math.random() < 0.35;          // some come up the side road
    g.position.set(viaSide ? -9 : (fromLeft ? -EDGE : EDGE), 0.1, viaSide ? -EDGE : lane);
    root.add(g); people.push(p);
    walkPath(p, viaSide ? [[-9, lane], door] : [[door[0] + (fromLeft ? -1.5 : 1.5), lane], door], ms);
    return p;
  }

  function say(p, html, bad) {
    var b = document.createElement('div');
    b.className = 'bubble' + (bad ? ' bad' : '');
    b.innerHTML = html;
    overlay.appendChild(b); p.bubble = b;
    if (!bad) p.g.userData.bag.visible = true;              // walks off carrying a plastic bag
  }

  function leave(p, ms) {
    if (p.bubble) { p.bubble.remove(); p.bubble = null; }
    var x = p.exitLeft ? -EDGE : EDGE;
    walkPath(p, [[p.g.position.x + (p.exitLeft ? -1 : 1), p.lane], [x, p.lane]], ms);
  }

  function remove(p) {
    dispose(p.g); if (p.bubble) p.bubble.remove();
    people = people.filter(function (x) { return x !== p; });
  }

  var v = null;
  var lastNow = 0;
  function loop(now) {
    if (!running) return;
    var dt = lastNow ? Math.min(0.1, (now - lastNow) / 1000) : 0; lastNow = now;
    resizeIfNeeded();
    people.forEach(function (p) {
      var g = p.g;
      if (p.walking) {
        var dist = Math.min(1, (now - p.t0) / p.dur) * p.total, seg = null;
        for (var i = 0; i < p.segs.length; i++) { seg = p.segs[i]; if (dist <= seg.d || i === p.segs.length - 1) break; dist -= seg.d; }
        var f = seg.d ? Math.min(1, dist / seg.d) : 1;
        g.position.x = seg.a[0] + (seg.b[0] - seg.a[0]) * f;
        g.position.z = seg.a[1] + (seg.b[1] - seg.a[1]) * f;
        g.rotation.y = Math.atan2(seg.b[0] - seg.a[0], seg.b[1] - seg.a[1]);
        if (now - p.t0 >= p.dur) p.walking = false;
      } else {
        g.rotation.y += (Math.PI - g.rotation.y) * 0.15;     // turn to face the shop
      }
      if (g.userData.mixer) KR.models.animate(g, p.walking, dt); else KR.chars.animate(g, p.walking, now);
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
    load: load, start: start, stop: stop, spawn: spawn, say: say, leave: leave, remove: remove,
    isReady: function () { return ready && wanted(); },
    wanted: wanted, setWanted: setWanted, failed: function () { return failed; }
  };
})();
