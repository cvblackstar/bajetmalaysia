// Rigged, animated customers from Quaternius' "Ultimate Animated Character Pack" (CC0).
// Each customer is a clone of one of the models exactly as provided. Common customers
// (casual, worker, suit) always come; rare ones (doctors) need reputation 80+, and the
// unique kimono pair need 95+ (only one of them on the street at a time).
// If the models can't load, scene3d.js keeps using the code-built chibi characters.
window.KR = window.KR || {};

KR.models = (function () {
  var T = null, SU = null, base = {}, ready = false, geo = {};
  // Customer tiers. Rare ones only turn up when reputation is 80+, unique ones at 95+.
  var TIERS = {
    common: ['casual_male', 'casual_female', 'casual2_male', 'casual2_female', 'casual3_male', 'casual3_female',
             'worker_male', 'worker_female', 'suit_male', 'suit_female'],
    rare: ['doctor_male_young', 'doctor_male_old', 'doctor_female_young', 'doctor_female_old'],
    unique: ['kimono_male', 'kimono_female']
  };
  var RARE = { rep: 80, chance: 0.08 }, UNIQUE = { rep: 95, chance: 0.03 };
  var SCALE = 0.85, HEIGHT = 0.855, uniqueOut = 0;          // HEIGHT squashes only the vertical

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

  function make(seed, rep) {
    var tier = pickTier(rep || 0, Math.random());
    var list = TIERS[tier], src = base[list[seed % list.length]];
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
    var bag = new T.Mesh(geo.bag, new T.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.9 }));
    bag.position.set(fr.x, fr.y - 0.22, fr.z);
    model.add(bag); model.updateMatrixWorld(true); hand.attach(bag);
    bag.castShadow = true; bag.visible = false;

    var g = new T.Group();
    g.add(model);
    g.scale.set(SCALE, SCALE * HEIGHT, SCALE);
    if (tier === 'unique') uniqueOut++;

    var head = model.getObjectByName('Head').getWorldPosition(new T.Vector3());
    var mixer = new T.AnimationMixer(model), actions = {};
    ['Idle', 'Walk'].forEach(function (n) {
      var clip = src.animations.find(function (a) { return a.name === n; });
      if (clip) actions[n] = mixer.clipAction(clip);
    });
    actions.Idle.play();
    mixer.update(Math.random());                                // so neighbours aren't in lockstep
    g.userData = { mixer: mixer, actions: actions, current: 'Idle', bag: bag, skin: skin, tier: tier, top: (head.y + 1.3) * SCALE * HEIGHT };
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
  }

  function dispose(g) {
    g.userData.mixer.stopAllAction();
    if (g.userData.tier === 'unique') uniqueOut--;
    g.userData.bag.material.dispose();
    g.userData.skin.dispose();
  }

  return { load: load, isReady: function () { return ready; }, make: make, pickTier: pickTier, TIERS: TIERS, animate: animate, dispose: dispose };
})();
