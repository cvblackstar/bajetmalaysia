# Dresses Quaternius' casual_male as a kedai runcit tauke: songkok, shop apron, white shirt.
# The new pieces are skinned to the existing skeleton and joined into the Body mesh,
# so the GLB keeps the same node names, materials and animations the game expects.
# usage: build_tauke.py in.glb out.glb [out.blend]
import bpy, bmesh, sys, math
from mathutils import Vector, Matrix, kdtree
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index("--") + 1:]
SRC, OUT = argv[0], argv[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
for o in list(bpy.data.objects):
    if o.name.startswith("Icosphere"):          # importer's bone-display shape, not part of the model
        bpy.data.objects.remove(o)
body = bpy.data.objects["Body"]
arm = bpy.data.objects["CharacterArmature"]
sc = bpy.context.scene


def mat(name, rgb, rough=0.7):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    return m


# Colours, flat like the rest of the pack
M = {
    "Songkok": mat("Songkok", (0.025, 0.025, 0.03), 0.85),
    "Apron": mat("Apron", (0.05, 0.30, 0.17), 0.8),           # kedai green
    "ApronTrim": mat("ApronTrim", (0.85, 0.65, 0.12), 0.6),    # mustard piping and pocket
    "ApronDark": mat("ApronDark", (0.03, 0.22, 0.12), 0.8),    # pocket
}
shirt = next(m for m in body.data.materials if m.name.startswith("Shirt"))
shirt.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.92, 0.91, 0.87, 1)
pants = next(m for m in body.data.materials if m.name.startswith("Pants"))
pants.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.13, 0.14, 0.17, 1)

# Flatten the hair crown so it stays hidden under the songkok
hair_idx = {i for p in body.data.polygons if body.data.materials[p.material_index].name.startswith("Hair") for i in p.vertices}
for i in hair_idx:
    v = body.data.vertices[i]
    if v.co.z > 3.18:
        v.co.z = 3.18

# Rest-pose body for fitting
dg = bpy.context.evaluated_depsgraph_get()
bvh = BVHTree.FromObject(body, dg)
bw = body.matrix_world
bverts = [bw @ v.co for v in body.data.vertices]
kd = kdtree.KDTree(len(bverts))
for i, co in enumerate(bverts):
    kd.insert(co, i)
kd.balance()
gname = {g.index: g.name for g in body.vertex_groups}


def body_weights(co, k=4):
    acc = {}
    for _, i, d in kd.find_n(co, k):
        for g in body.data.vertices[i].groups:
            acc[gname[g.group]] = acc.get(gname[g.group], 0) + g.weight / (d + 1e-3)
    s = sum(acc.values())
    return {n: w / s for n, w in acc.items() if w / s > 0.02}


def front_y(x, z):
    hit = bvh.ray_cast(Vector((x, -3, z)), Vector((0, 1, 0)))
    return hit[0].y if hit[0] else None


pieces = []   # (bmesh, material name, weight function)


def new_obj(name, bm, material):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    sc.collection.objects.link(o)
    o.data.materials.append(M[material])
    return o


# ---------- Songkok: oval, slightly tapered, tipped back, sits on the hair ----------
bm = bmesh.new()
seg = 14
rings = [(2.90, 0.575, 0.63), (2.93, 0.58, 0.635), (3.25, 0.555, 0.61), (3.27, 0.53, 0.585)]
cy = -0.05
for z, rx, ry in rings:
    for i in range(seg):
        a = 2 * math.pi * i / seg
        bm.verts.new((rx * math.sin(a), cy - ry * math.cos(a), z))
bm.verts.ensure_lookup_table()
for r in range(len(rings) - 1):
    for i in range(seg):
        j = (i + 1) % seg
        bm.faces.new([bm.verts[r * seg + i], bm.verts[r * seg + j], bm.verts[(r + 1) * seg + j], bm.verts[(r + 1) * seg + i]])
bm.faces.new([bm.verts[3 * seg + i] for i in range(seg)])
bm.faces.new([bm.verts[i] for i in reversed(range(seg))])
bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, cy, 2.9), matrix=Matrix.Rotation(math.radians(-6), 3, "X"))
songkok = new_obj("Songkok", bm, "Songkok")


# ---------- Apron: bib from chest to mid-thigh, hugging the body front ----------
rows = [  # z, half width
    (1.90, 0.22), (1.72, 0.25), (1.52, 0.29), (1.32, 0.33), (1.14, 0.37), (0.96, 0.40), (0.80, 0.42), (0.68, 0.43)]
cols = 7
grid = []
prev_min = None
for z, hw in rows:
    row = []
    for c in range(cols):
        x = -hw + 2 * hw * c / (cols - 1)
        y = front_y(x * 0.9, z)
        row.append([x, y, z])
    ys = [p[1] for p in row if p[1] is not None]
    ymin = min(ys) if ys else prev_min
    if z < 1.15:  # below the belt it hangs straight, never tucking back between the legs
        ymin = min(ymin, prev_min) if prev_min is not None else ymin
    for p in row:     # a clean, gently curved panel rather than every bump of the shirt
        p[1] = ymin + 0.06 * (p[0] / hw) ** 2
    prev_min = ymin if prev_min is None else min(prev_min, ymin)
    grid.append(row)
OFF = 0.035
bm = bmesh.new()
vg = [[bm.verts.new((p[0], p[1] - OFF, p[2])) for p in row] for row in grid]
for r in range(len(rows) - 1):
    for c in range(cols - 1):
        bm.faces.new([vg[r][c], vg[r + 1][c], vg[r + 1][c + 1], vg[r][c + 1]])
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
apron = new_obj("Apron", bm, "Apron")
sol = apron.modifiers.new("s", "SOLIDIFY"); sol.thickness = 0.025; sol.offset = 1

# Pocket across the belly with a mustard trim
def quad_panel(name, material, x0, x1, z0, z1, dy):
    b = bmesh.new()
    zrow = min(range(len(rows)), key=lambda i: abs(rows[i][0] - (z0 + z1) / 2))
    y = grid[zrow][cols // 2][1] - OFF - 0.025 - dy
    v = [b.verts.new(p) for p in ((x0, y, z0), (x1, y, z0), (x1, y, z1), (x0, y, z1))]
    b.faces.new(v)
    bmesh.ops.solidify(b, geom=b.faces[:], thickness=0.015)
    return new_obj(name, b, material)

pocket = quad_panel("Pocket", "ApronDark", -0.24, 0.24, 0.92, 1.12, 0.012)
trim = quad_panel("PocketTrim", "ApronTrim", -0.245, 0.245, 1.10, 1.14, 0.02)
divider = quad_panel("PocketDiv", "ApronTrim", -0.012, 0.012, 0.92, 1.12, 0.02)

# ---------- Neck strap and waist tie (thin square tubes) ----------
def tube(name, material, pts, r=0.025, closed=False):
    b = bmesh.new()
    ringsv = []
    for i, p in enumerate(pts):
        p = Vector(p)
        nxt = Vector(pts[(i + 1) % len(pts)]) if (closed or i + 1 < len(pts)) else p + (p - Vector(pts[i - 1]))
        prv = Vector(pts[i - 1]) if (closed or i > 0) else p - (nxt - p)
        t = (nxt - prv).normalized()
        u = t.cross(Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))).normalized()
        w = t.cross(u).normalized()
        ringsv.append([b.verts.new(p + (u * math.cos(a) + w * math.sin(a)) * r) for a in (0.785, 2.356, 3.927, 5.498)])
    n = len(ringsv) if closed else len(ringsv) - 1
    for i in range(n):
        A, B = ringsv[i], ringsv[(i + 1) % len(ringsv)]
        for k in range(4):
            b.faces.new([A[k], A[(k + 1) % 4], B[(k + 1) % 4], B[k]])
    if not closed:
        b.faces.new(ringsv[0]); b.faces.new(list(reversed(ringsv[-1])))
    bmesh.ops.recalc_face_normals(b, faces=b.faces)
    return new_obj(name, b, material)

ytop = grid[0][0][1] - OFF
strap = tube("NeckStrap", "Apron", [(-0.20, ytop, 1.90), (-0.21, -0.17, 2.03), (-0.17, 0.0, 2.11), (0, 0.13, 2.12),
                                     (0.17, 0.0, 2.11), (0.21, -0.17, 2.03), (0.20, ytop, 1.90)], r=0.028)
# Tie runs from the apron's right edge, round the back, to its left edge
tie_pts = [(0.43 * math.sin(t), 0.05 - 0.33 * math.cos(t), 1.2) for t in [math.radians(d) for d in range(55, 306, 25)]]
yedge = grid[4][0][1] - OFF + 0.02
tie = tube("WaistTie", "Apron", [(0.35, yedge, 1.2)] + tie_pts + [(-0.35, yedge, 1.2)], r=0.025)
bow = tube("Bow", "Apron", [(-0.12, 0.40, 1.24), (0, 0.37, 1.2), (0.12, 0.40, 1.16), (0.1, 0.40, 1.27), (0, 0.37, 1.2), (-0.1, 0.40, 1.13)], r=0.03)

# ---------- Skinning ----------
LEG_Z = 1.05


def weigh(o, fn):
    bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers):
        with bpy.context.temp_override(object=o):
            bpy.ops.object.modifier_apply(modifier=m.name)
    for v in o.data.vertices:
        co = o.matrix_world @ v.co
        for n, w in fn(co).items():
            g = o.vertex_groups.get(n) or o.vertex_groups.new(name=n)
            g.add([v.index], w, "REPLACE")


def head_only(co):
    return {"Head": 1.0}


def apron_w(co):
    if co.z >= LEG_Z:
        return body_weights(co)
    t = min(1, (LEG_Z - co.z) / (LEG_Z - 0.68))       # 0 at belt, 1 at hem
    side = max(-1, min(1, co.x / 0.3))
    legL, legR = max(0, side) * 0.55 * t, max(0, -side) * 0.55 * t
    w = {"Hips": 1 - legL - legR}
    if legL: w["UpperLeg.L"] = legL
    if legR: w["UpperLeg.R"] = legR
    return w


def torso_w(co):
    return body_weights(co, 6)


for o in (songkok,):
    weigh(o, head_only)
for o in (apron, pocket, trim, divider):
    weigh(o, apron_w)
for o in (strap, tie, bow):
    weigh(o, torso_w)

# Join everything into Body so the game still sees a single skinned mesh.
bpy.ops.object.select_all(action="DESELECT")
outfit = [songkok, apron, pocket, trim, divider, strap, tie, bow]
for o in outfit:
    o.select_set(True)
body.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()
print("Body polys now", len(body.data.polygons))

if len(argv) > 2:
    bpy.ops.wm.save_as_mainfile(filepath=argv[2])

bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", export_animations=True,
                          export_animation_mode="ACTIONS", export_skins=True, export_yup=True,
                          export_apply=False)
print("exported", OUT)
