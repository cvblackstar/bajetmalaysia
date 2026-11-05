// Rigged, animated customers from Quaternius' "Ultimate Animated Character Pack" (CC0).
// Each customer is a clone of one of the models exactly as provided. Common customers
// (casual, worker, suit, and a tauke in songkok and apron) always come; rare ones (doctors) need reputation 80+, and the
// unique kimono pair need 95+ (only one of them on the street at a time).
// If the models can't load, scene3d.js keeps using the code-built chibi characters.
window.KR = window.KR || {};

KR.models = (function () {
  var T = null, SU = null, base = {}, ready = false, geo = {};
  // Customer tiers. Rare ones only turn up when reputation is 80+, unique ones at 95+.
  var TIERS = {
    common: ['casual_male', 'casual_female', 'casual2_male', 'casual2_female', 'casual3_male', 'casual3_female',
             'worker_male', 'worker_female', 'suit_male', 'suit_female', 'tauke_male'],
    rare: ['doctor_male_young', 'doctor_male_old', 'doctor_female_young', 'doctor_female_old'],
    unique: ['kimono_male', 'kimono_female']
  };
  var RARE = { rep: 80, chance: 0.08 }, UNIQUE = { rep: 95, chance: 0.03 };
  var SCALE = 0.85, HEIGHT = 0.77,  uniqueOut = 0;          // HEIGHT squashes only the vertical

  // Auras for special customers: rare = a light blue outline, unique = a purple outline with a
  // soft glow around it. Each is an "inverted hull": a copy of the mesh on the same skeleton,
  // pushed out along its normals and drawn from the back, so it reads as an outline.
  // width is in world units; the meshes' own units are the character's before SCALE.
  var AURA = {
    rare:   [{ color: 0x8fdcff, width: 0.018, opacity: 1 }],
    unique: [{ color: 0xb46cff, width: 0.02, opacity: 1 }, { color: 0xc58bff, width: 0.06, opacity: 0.3 }]
  };
  function addAura(model, layers, bag) {
    var meshes = [];
    model.traverse(function (o) { if (o.isSkinnedMesh && o !== bag) meshes.push(o); });
    return layers.map(function (L) {
      var m = new T.MeshBasicMaterial({ color: L.color, side: T.BackSide, transparent: L.opacity < 1, opacity: L.opacity, depthWrite: L.opacity >= 1 });
      meshes.forEach(function (o) {
        var w = L.width / SCALE;
        var mm = m.clone();
        mm.onBeforeCompile = function (sh) {
          sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>',
            '#include <begin_vertex>\n transformed += normalize(normal) * ' + w.toFixed(5) + ';');
        };
        mm.customProgramCacheKey = function () { return 'aura' + w.toFixed(5); };
        var hull = new T.SkinnedMesh(o.geometry, mm);
        hull.bind(o.skeleton, o.bindMatrix);
        hull.position.copy(o.position); hull.quaternion.copy(o.quaternion); hull.scale.copy(o.scale);
        hull.frustumCulled = false; hull.renderOrder = -1;
        o.parent.add(hull);
        m.userData.copies = (m.userData.copies || []).concat(mm);
      });
      return m.userData.copies ? proxy(m.userData.copies) : m;
    });
  }
  // One handle for every copy of a layer's material, so opacity and dispose reach them all.
  function proxy(list) {
    return {
      set opacity(v) { list.forEach(function (m) { m.opacity = v; }); },
      get opacity() { return list[0].opacity; },
      dispose: function () { list.forEach(function (m) { m.dispose(); }); }
    };
  }

  function load(THREE) {
    T = THREE;
    var names = [].concat(TIERS.common, TIERS.rare, TIERS.unique);
    return Promise.all([import('../vendor/GLTFLoader.js'), import('../vendor/SkeletonUtils.js')]).then(function (mods) {
      SU = mods[1];
      var loader = new mods[0].GLTFLoader();
      return Promise.all(names.map(function (n) {
        return loader.loadAsync('models/' + n + '.glb').then(function (g) { base[n] = g; });
      }));
    }).then(function () {
      geo.bag = new T.BoxGeometry(0.28, 0.32, 0.18);
      ready = true;
    }).catch(function (e) { ready = false; if (window.console) console.warn('Character models not loaded, using built-in ones', e); });
  }

  // Pick which tier a new customer comes from, given today's reputation (0-100).
  function pickTier(rep, r) {
    if (rep >= UNIQUE.rep && !uniqueOut && r < UNIQUE.chance) return 'unique';
    if (rep >= RARE.rep && r < UNIQUE.chance + RARE.chance) return 'rare';
    return 'common';
  }

  // tier: 'common' / 'rare' / 'unique' as decided by the game rules (sim.js), or a reputation
  // number to pick one here.
  // model: a specific model name (e.g. 'worker_male' for factory workers), else picked from the tier.
  function make(seed, tier, model) {
    if (typeof tier !== 'string') tier = pickTier(tier || 0, Math.random());
    var list = TIERS[tier], src = base[model || list[seed % list.length]];
    var model = SU.clone(src.scene);                            // the model as provided, no add-ons
    // The pack ships skin as a near-black placeholder meant to be tinted, so give it a real skin tone.
    var skin = new T.MeshStandardMaterial({ color: KR.chars.randomLook(seed).skin, roughness: 0.6, side: T.DoubleSide });
    model.traverse(function (o) {
      if (!o.isMesh) return;
      if (o.material.name === 'Skin') o.material = skin;
      o.castShadow = true;
      o.frustumCulled = false;                                  // skinned bounds are unreliable when animated
    });

    // Plastic bag in the right hand, shown after buying.
    model.updateMatrixWorld(true);
    var hand = model.getObjectByName('FistR');
    var fr = hand.getWorldPosition(new T.Vector3());
    var bag = new T.Mesh(geo.bag, geo.bagMat || new T.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.9 }));
    bag.position.set(fr.x, fr.y - 0.22, fr.z);
    model.add(bag); model.updateMatrixWorld(true); hand.attach(bag);
    bag.castShadow = true; bag.visible = false;

    var g = new T.Group();
    g.add(model);
    g.scale.set(SCALE, SCALE * HEIGHT, SCALE);
    if (tier === 'unique') uniqueOut++;
    var aura = AURA[tier] ? addAura(model, AURA[tier], bag) : [];

    var head = model.getObjectByName('Head').getWorldPosition(new T.Vector3());
    var mixer = new T.AnimationMixer(model), actions = {};
    ['Idle', 'Walk'].forEach(function (n) {
      var clip = src.animations.find(function (a) { return a.name === n; });
      if (clip) actions[n] = mixer.clipAction(clip);
    });
    actions.Idle.play();
    mixer.update(Math.random());                                // so neighbours aren't in lockstep
    g.userData = { mixer: mixer, actions: actions, current: 'Idle', bag: bag, skin: skin, tier: tier, aura: aura, t: Math.random() * 6, top: (head.y + 1.3) * SCALE * HEIGHT };
    return g;
  }

  function animate(g, walking, dt) {
    var u = g.userData;
    var want = walking ? 'Walk' : 'Idle';      // plain walk even with a bag, so the arms swing normally
    if (want !== u.current) {
      var next = u.actions[want], prev = u.actions[u.current];
      next.reset().play();
      prev.crossFadeTo(next, 0.2, false);
      u.current = want;
    }
    u.mixer.update(dt);
    if (u.aura.length > 1) {                                    // unique: the outer glow breathes gently
      u.t += dt;
      u.aura[1].opacity = 0.22 + 0.12 * Math.sin(u.t * 3);
    }
  }

  function dispose(g) {
    g.userData.mixer.stopAllAction();
    if (g.userData.tier === 'unique') uniqueOut--;
    if (g.userData.bag.material !== geo.bagMat) g.userData.bag.material.dispose();
    g.userData.aura.forEach(function (m) { m.dispose(); });
    g.userData.skin.dispose();
  }

  // The shape of Kenney's shopping bag (food kit) replaces the plain box bag once it has loaded.
  function setBag(src) {
    if (!src || !T) return;
    var mesh = null;
    src.traverse(function (o) { if (o.isMesh && !mesh) mesh = o; });
    if (!mesh) return;
    var g = mesh.geometry.clone();
    ['position', 'normal'].forEach(function (k) {             // quantized in the file: back to floats so it can be moved
      var a = g.attributes[k], f = new Float32Array(a.count * 3);
      for (var i = 0; i < a.count; i++) { f[i * 3] = a.getX(i); f[i * 3 + 1] = a.getY(i); f[i * 3 + 2] = a.getZ(i); }
      g.setAttribute(k, new T.BufferAttribute(f, 3));
    });
    src.updateMatrixWorld(true);
    g.applyMatrix4(mesh.matrixWorld);
    g.computeBoundingBox();
    var b = g.boundingBox, s = 0.44 / (b.max.y - b.min.y);
    g.center(); g.scale(s, s, s); g.rotateY(Math.PI / 2);
    geo.bag = g; geo.bagMat = new T.MeshStandardMaterial({ color: 0xf7f7f2, roughness: 0.85 });   // white, like a kedai's plastic bag
  }

  return { load: load, setBag: setBag, isReady: function () { return ready; }, make: make, pickTier: pickTier, TIERS: TIERS, animate: animate, dispose: dispose };
})();
