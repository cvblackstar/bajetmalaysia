// Optional 3D street scene (three.js). Loaded in the background after the page starts.
// If WebGL or the module can't load, or the player picks 2D, the SVG scene is used instead.
window.KR = window.KR || {};

KR.scene3d = (function () {
  var THREE = null, ready = false, failed = false;
  var renderer, scene, camera, hemi, sun, rain, root, shopSign, shelfGroup;
  var people = [], running = false, halfW = 8, raf = 0;
  var PREF = 'kedaiRuncit.graphics';

  var SKIN = [0xf3c9a4, 0xe0a87e, 0xc68856, 0x9a6440, 0xf6d5b8];
  var SHIRT = [0xd6332b, 0x2f7fd1, 0x2f9e6e, 0xf2b705, 0x8e5bd1, 0xe86f9a, 0x2a9d8f, 0xf08a24];
  var PANTS = [0x2d3a4a, 0x5a4632, 0x3c4f63, 0x4a4a4a];
  var HEAD = ['hair', 'tudung', 'songkok', 'cap', 'hair', 'tudung', 'bun'];
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
      THREE = mod; build(); ready = true; return true;
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

  function build() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.domElement.className = 'scene3d';
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(35, 2, 0.1, 100);
    hemi = new THREE.HemisphereLight(0xffffff, 0x8a7a66, 1.2); scene.add(hemi);
    sun = new THREE.DirectionalLight(0xffffff, 1.3); sun.position.set(-4, 8, 6); scene.add(sun);
    root = new THREE.Group(); scene.add(root);

    // Street
    box(40, 0.1, 6, 0x5c5f63, 0, -0.05, 5.5);              // road
    box(40, 0.2, 2.6, 0xc9c1ae, 0, 0, 1.3);                 // kaki lima
    for (var i = -18; i < 20; i += 3) box(1.4, 0.02, 0.15, 0xf2efe6, i, 0.01, 5.5); // lane marks
    box(40, 6, 0.4, 0xe8dcc2, 0, 2.5, -2.6);               // back wall of the row

    // Shop
    box(7, 4, 2.2, 0xf6e7c8, 0, 2, -1.2);
    var sign = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.9, 0.25),
      [mat(0x8a6a3f), mat(0x8a6a3f), mat(0x8a6a3f), mat(0x8a6a3f), new THREE.MeshBasicMaterial({ map: signTexture('KEDAI RUNCIT') }), mat(0x8a6a3f)]);
    sign.position.set(0, 4.35, 0); root.add(sign); shopSign = sign;
    for (var k = 0; k < 10; k++) {                         // striped awning
      var a = box(0.74, 0.08, 1.3, k % 2 ? 0xffffff : 0xc0453a, -3.33 + k * 0.74, 3.55, 0.45);
      a.rotation.x = 0.35;
    }
    box(3.4, 2, 0.1, 0x8a6a3f, -1.3, 1.75, 0.02);           // window frame
    var glass = box(3.1, 1.75, 0.05, 0xcfe9f3, -1.3, 1.75, 0.08);
    glass.material.emissive = new THREE.Color(0x203038);
    box(3.1, 0.06, 0.25, 0x8a6a3f, -1.3, 1.25, 0.15);      // shelf
    shelfGroup = new THREE.Group(); root.add(shelfGroup);
    box(1.3, 2.7, 0.12, 0x9c7445, 2.1, 1.35, 0.03);         // door
    box(0.08, 0.08, 0.1, 0xf1b530, 2.55, 1.35, 0.12);       // handle

    // Lamp post and a potted plant
    box(0.12, 3.6, 0.12, 0x3b3f44, -5.2, 1.8, 2.2);
    box(0.7, 0.12, 0.12, 0x3b3f44, -4.9, 3.6, 2.2);
    var lamp = box(0.3, 0.15, 0.3, 0xfff3c4, -4.6, 3.5, 2.2); lamp.material.emissive = new THREE.Color(0x665a20);
    box(0.6, 0.6, 0.6, 0xb5653b, 4.2, 0.4, 0.6);
    var bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), mat(0x3f9b5b)); bush.position.set(4.2, 1.1, 0.6); root.add(bush);

    // Rain: falling line segments, shown only in wet weather
    var n = 260, pos = new Float32Array(n * 6);
    for (var r = 0; r < n; r++) {
      var x = (Math.random() - 0.5) * 24, y = Math.random() * 7, z = Math.random() * 7;
      pos.set([x, y, z, x - 0.05, y - 0.35, z], r * 6);
    }
    var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xdfe8f0, transparent: true, opacity: 0.6 }));
    scene.add(rain);
  }

  function seeded(seed) { return function (n, k) { return Math.abs(Math.floor(Math.sin(seed * 9.13 + k * 3.7) * 10000)) % n; }; }

  // Low-poly customer built from primitives; mirrors the 2D look in art.js.
  function makePerson(seed) {
    var r = seeded(seed), g = new THREE.Group();
    var skin = mat(SKIN[r(SKIN.length, 1)]), shirt = mat(SHIRT[r(SHIRT.length, 2)]);
    var pants = mat(PANTS[r(PANTS.length, 3)]), head = HEAD[r(HEAD.length, 4)], veil = mat(SHIRT[r(SHIRT.length, 5)]);
    var dark = mat(0x2b1d14), black = mat(0x1d1d1d);
    var legs = [];
    [-0.12, 0.12].forEach(function (x) {
      var hip = new THREE.Group(); hip.position.set(x, 0.72, 0);
      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.72, 6), pants); leg.position.y = -0.36;
      hip.add(leg); g.add(hip); legs.push(hip);
    });
    var body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.72, 7), shirt); body.position.y = 1.08; g.add(body);
    [-0.33, 0.33].forEach(function (x) {
      var arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 5), shirt);
      arm.position.set(x, 1.1, 0); arm.rotation.z = x > 0 ? 0.15 : -0.15; g.add(arm);
    });
    var face = new THREE.Mesh(new THREE.IcosahedronGeometry(0.21, 1), skin); face.position.set(0, 1.62, 0.02); g.add(face);
    var eyeGeo = new THREE.SphereGeometry(0.025, 5, 4);
    [-0.07, 0.07].forEach(function (x) { var e = new THREE.Mesh(eyeGeo, black); e.position.set(x, 1.65, 0.21); g.add(e); });
    if (head === 'hair' || head === 'bun') {
      var hair = new THREE.Mesh(new THREE.SphereGeometry(0.225, 7, 5, 0, Math.PI * 2, 0, Math.PI / 2), dark);
      hair.position.set(0, 1.64, -0.02); hair.rotation.x = -0.35; g.add(hair);
      if (head === 'bun') { var b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), dark); b.position.set(0, 1.86, -0.12); g.add(b); }
    } else if (head === 'tudung') {
      var t = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 1), veil); t.position.set(0, 1.64, -0.06); g.add(t);
      var drape = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.36, 0.38, 8), veil); drape.position.y = 1.36; g.add(drape);
      face.position.z = 0.07; face.scale.set(0.85, 0.9, 0.85);
    } else if (head === 'songkok') {
      var s = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.2, 0.16, 8), black); s.position.y = 1.8; g.add(s);
    } else if (head === 'cap') {
      var cap = new THREE.Mesh(new THREE.SphereGeometry(0.225, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), veil); cap.position.y = 1.66; g.add(cap);
      var visor = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.2), veil); visor.position.set(0, 1.68, 0.26); g.add(visor);
    }
    g.userData.legs = legs;
    return g;
  }

  function resize(host) {
    var w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    var fit = 5.2 / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect); // keep ~10.4 units of width in view
    var dist = Math.max(12, fit);
    camera.position.set(0, 3.3, dist); camera.lookAt(0, 1.9, 0);
    camera.updateProjectionMatrix();
    halfW = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect * (dist + 1.5) + 1;
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
      var p = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), new THREE.MeshBasicMaterial({ map: svgTexture(svg), transparent: true }));
      p.position.set(-2.55 + (i % 5) * 0.62, 1.6 + Math.floor(i / 5) * 0.62, 0.2); shelfGroup.add(p);
    });
    resize(host);
    running = true;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function stop() { running = false; cancelAnimationFrame(raf); clear(); }

  function dispose(g) {
    root.remove(g);
    g.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  }

  function clear() {
    people.forEach(function (p) { dispose(p.g); if (p.bubble) p.bubble.remove(); });
    people = [];
  }

  function walkTo(p, x, ms) { p.x0 = p.g.position.x; p.x1 = x; p.t0 = performance.now(); p.dur = Math.max(1, ms); p.walking = true; }

  // Same contract as the 2D walker: walk to the door, say something, walk off.
  function spawn(seed, fromLeft, ms) {
    var g = makePerson(seed);
    var p = { g: g, bubble: null, dir: fromLeft ? 1 : -1 };
    g.position.set(fromLeft ? -halfW : halfW, 0.1, 1.0 + Math.random() * 1.4);
    root.add(g); people.push(p);
    walkTo(p, 1.4 + Math.random() * 1.6 - 0.8, ms);
    return p;
  }

  function say(p, html, bad) {
    var b = document.createElement('div');
    b.className = 'bubble' + (bad ? ' bad' : '');
    b.innerHTML = html;
    overlay.appendChild(b); p.bubble = b;
  }

  function leave(p, ms) {
    if (p.bubble) { p.bubble.remove(); p.bubble = null; }
    walkTo(p, p.dir > 0 ? halfW : -halfW, ms);
  }

  function remove(p) {
    dispose(p.g); if (p.bubble) p.bubble.remove();
    people = people.filter(function (x) { return x !== p; });
  }

  var v = null;
  function loop(now) {
    if (!running) return;
    resizeIfNeeded();
    people.forEach(function (p) {
      var g = p.g, legs = g.userData.legs;
      if (p.walking) {
        var k = Math.min(1, (now - p.t0) / p.dur);
        g.position.x = p.x0 + (p.x1 - p.x0) * k;
        g.rotation.y = (p.x1 > p.x0 ? 1 : -1) * Math.PI / 2;
        var s = Math.sin(now / 90 + g.id);
        legs[0].rotation.x = s * 0.6; legs[1].rotation.x = -s * 0.6;
        g.position.y = 0.1 + Math.abs(s) * 0.05;
        if (k >= 1) p.walking = false;
      } else {
        g.rotation.y *= 0.8;                                 // turn to face the street
        legs[0].rotation.x = legs[1].rotation.x = 0; g.position.y = 0.1;
      }
      if (p.bubble) {
        v = v || new THREE.Vector3();
        v.set(g.position.x, 2.15, g.position.z).project(camera);
        p.bubble.style.left = ((v.x + 1) / 2 * host.clientWidth) + 'px';
        p.bubble.style.top = ((1 - v.y) / 2 * host.clientHeight) + 'px';
      }
    });
    if (rain.visible) {
      var arr = rain.geometry.attributes.position.array;
      for (var i = 0; i < arr.length; i += 6) {
        arr[i + 1] -= 0.25; arr[i + 4] -= 0.25;
        if (arr[i + 4] < 0) { arr[i + 1] += 7; arr[i + 4] += 7; }
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
