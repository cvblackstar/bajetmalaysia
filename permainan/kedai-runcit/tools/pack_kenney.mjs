// Packs chosen Kenney GLB models (CC0) into one .glb per kit, for models/env.
// Each model ends up under a node named after its file, so the game finds it with getObjectByName().
// Usage: node pack_kenney.mjs <kit's "Models/GLB format" folder> <out.glb> name1 name2 ...
// Needs @gltf-transform/core and @gltf-transform/functions and @gltf-transform/extensions (v4).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mergeDocuments, dedup, prune, weld, quantize, unpartition } from '@gltf-transform/functions';
import path from 'node:path';

const [dir, out, ...names] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(path.join(dir, names[0] + '.glb'));
for (const n of names.slice(1)) mergeDocuments(doc, await io.read(path.join(dir, n + '.glb')));

// One scene; every model's root nodes go under a node named after the model.
const root = doc.getRoot(), scenes = root.listScenes(), main = scenes[0];
scenes.forEach((s, i) => {
  const holder = doc.createNode(names[i]);
  s.listChildren().forEach((c) => { s.removeChild(c); holder.addChild(c); });
  main.addChild(holder);
  if (s !== main) s.dispose();
});
main.setName('kenney');                     // so the scene's name doesn't clash with the first model's
root.setDefaultScene(main);
// TANGENT isn't used (no normal maps)
root.listMeshes().forEach((m) => m.listPrimitives().forEach((p) => { const t = p.getAttribute('TANGENT'); if (t) p.setAttribute('TANGENT', null); }));
await doc.transform(dedup(), prune(), weld(), quantize(), unpartition());
await io.write(out, doc);
console.log('wrote', out, names.length, 'models');
