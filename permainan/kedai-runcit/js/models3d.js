// Rigged, animated customers from Quaternius' "Ultimate Animated Character Pack" (CC0).
// Each customer is a clone of one of four base models, recoloured from the same outfit
// descriptions as characters3d.js, with Malaysian pieces (tudung, songkok, kopiah, kain,
// baju kurung / baju Melayu, samping) attached to the skeleton's bones.
// If the models can't load, scene3d.js keeps using the code-built chibi characters.
window.KR = window.KR || {};

KR.models = (function () {
  var T = null, SU = null, base = {}, ready = false, geo = {};
  var FILES = { m1: 'casual_male', m2: 'casual2_male', f1: 'casual_female', f2: 'casual2_female' };
  var SCALE = 0.85;

  function load(THREE) {
    T = THREE;
    return Promise.all([import('../vendor/GLTFLoader.js'), import('../vendor/SkeletonUtils.js')]).then(function (mods) {
      SU = mods[1];
      var loader = new mods[0].GLTFLoader();
      return Promise.all(Object.keys(FILES).map(function (k) {
        return loader.loadAsync('models/' + FILES[k] + '.glb').then(function (g) { base[k] = g; });
      }));
    }).then(function () {
      geo.tudung = new T.SphereGeometry(0.6, 24, 18);
      geo.drape = new T.CylinderGeometry(0.42, 0.62, 0.42, 20, 1, true);
      geo.songkok = new T.CylinderGeometry(0.5, 0.52, 0.3, 20);
      geo.kopiah = new T.SphereGeometry(0.5, 20, 8, 0, Math.PI * 2, 0, Math.PI * 0.3);
      geo.tube = new T.CylinderGeometry(1, 1.15, 1, 20, 1, true);
      geo.bag = new T.BoxGeometry(0.28, 0.32, 0.18);
      ready = true;
    }).catch(function (e) { ready = false; if (window.console) console.warn('Character models not loaded, using built-in ones', e); });
  }

  function mat(color, rough) { return new T.MeshStandardMaterial({ color: color, roughness: rough == null ? 0.75 : rough, side: T.DoubleSide }); }

  // Put a mesh at a position measured in the model's own space, then parent it to a bone
  // so it follows the animation.
  function attach(model, boneName, mesh, x, y, z) {
    var bone = model.getObjectByName(boneName);
    mesh.position.set(x, y, z);
    model.add(mesh);
    model.updateMatrixWorld(true);
    bone.attach(mesh);
    mesh.castShadow = true;
    return mesh;
  }

  function make(seed) {
    var d = KR.chars.randomLook(seed);
    var female = d.head === 'tudung' || d.head === 'long' || d.head === 'bun' || d.top === 'kurung';
    var key = (female ? 'f' : 'm') + (seed % 2 ? '1' : '2');
    var src = base[key];
    var model = SU.clone(src.scene);

    // Recolour the model's own material slots.
    model.traverse(function (o) {
      if (!o.isMesh) return;
      o.material = o.material.clone();
      var n = o.material.name;
      if (n === 'Skin') o.material.color.set(d.skin);
      if (n === 'Shirt') o.material.color.set(d.top === 'pagoda' ? 0xf5f5f0 : d.topColor);
      if (n === 'Pants') o.material.color.set(d.bottom === 'seluar' || d.bottom === 'shorts' ? d.bottomColor : d.skin);
      if (n === 'Hair') { o.material.color.set(d.hair); if (d.head === 'tudung' || d.head === 'bald') o.visible = false; }
      if (n === 'Belt' && d.samping) o.material.color.set(d.samping);
      o.castShadow = true;
      o.frustumCulled = false;                                  // skinned bounds are unreliable when animated
    });

    // Bone positions in the bind pose, in model space.
    model.updateMatrixWorld(true);
    var hp = model.getObjectByName('Head').getWorldPosition(new T.Vector3());
    var hip = model.getObjectByName('Hips').getWorldPosition(new T.Vector3());
    var hy = hp.y, cy = hp.y + 0.55;                            // head base and head centre

    if (d.head === 'tudung') {
      var cloth = mat(d.headColor, 0.85);
      attach(model, 'Head', new T.Mesh(geo.tudung, cloth), 0, cy + 0.05, -0.17);
      attach(model, 'Head', new T.Mesh(geo.drape, cloth), 0, hy - 0.05, -0.02);
    }
    if (d.head === 'songkok') attach(model, 'Head', new T.Mesh(geo.songkok, mat(0x151515, 0.3)), 0, cy + 0.2, -0.04);
    if (d.head === 'kopiah') attach(model, 'Head', new T.Mesh(geo.kopiah, mat(0xf7f7f2, 0.9)), 0, cy + 0.12, -0.04);
    if (d.head === 'cap') attach(model, 'Head', new T.Mesh(geo.kopiah, mat(d.headColor)), 0, cy - 0.08, 0.06).scale.set(1.15, 1.6, 1.15);

    // Long tunic (baju kurung / baju Melayu) and kain or skirt, hanging from the hips.
    function tube(color, top, bottom, rTop) {
      var h = top - bottom, m = new T.Mesh(geo.tube, mat(color));
      m.scale.set(rTop, h, rTop * 0.85);
      return attach(model, 'Hips', m, hip.x, bottom + h / 2, hip.z);
    }
    if (d.top === 'kurung' || d.top === 'melayu') tube(d.topColor, hip.y + 0.2, hip.y - (d.top === 'kurung' ? 0.55 : 0.3), 0.46);
    if (d.bottom === 'kain') tube(d.bottomColor, hip.y - 0.05, 0.12, 0.43);
    if (d.bottom === 'skirt') tube(d.bottomColor, hip.y + 0.05, hip.y - 0.45, 0.46);
    if (d.samping) tube(d.samping, hip.y + 0.1, hip.y - 0.2, 0.5);

    // Plastic bag in the right hand, shown after buying.
    var fr = model.getObjectByName('FistR').getWorldPosition(new T.Vector3());
    var bag = attach(model, 'FistR', new T.Mesh(geo.bag, mat(0xfafafa, 0.9)), fr.x, fr.y - 0.22, fr.z);
    bag.visible = false;

    var g = new T.Group();
    g.add(model);
    g.scale.setScalar(SCALE * (d.kid ? 0.75 : 1));

    var mixer = new T.AnimationMixer(model), actions = {};
    ['Idle', 'Walk', 'Walk_Carry'].forEach(function (n) {
      var clip = src.animations.find(function (a) { return a.name === n; });
      if (clip) actions[n] = mixer.clipAction(clip);
    });
    actions.Idle.play();
    mixer.update(Math.random());                                // so neighbours aren't in lockstep
    g.userData = { mixer: mixer, actions: actions, current: 'Idle', bag: bag, top: (cy + 0.75) * g.scale.y };
    return g;
  }

  function animate(g, walking, dt) {
    var u = g.userData;
    var want = walking ? (u.bag.visible && u.actions.Walk_Carry ? 'Walk_Carry' : 'Walk') : 'Idle';
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
    g.traverse(function (o) { if (o.isMesh && o.material) o.material.dispose(); });
  }

  return { load: load, isReady: function () { return ready; }, make: make, animate: animate, dispose: dispose };
})();
