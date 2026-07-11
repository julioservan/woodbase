// Parser de archivos STEP (ISO 10303-21) orientado a despieces de madera.
// Corre en el navegador: extrae cada sólido con su nombre, calcula la caja
// orientada de menor volumen (normales de caras planas + PCA de vértices) y
// agrupa piezas idénticas. Calibrado contra exportaciones de Shapr3D.

const MM_PER_INCH = 25.4;
const GROUP_TOLERANCE_IN = 1 / 32;

export interface DetectedPart {
  name: string;
  quantity: number;
  /** Dimensiones de la caja en pulgadas, de mayor a menor. */
  dims: [number, number, number];
}

type Vec = [number, number, number];

function normalize(v: Vec): Vec {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
}

function cross(a: Vec, b: Vec): Vec {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a: Vec, b: Vec): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function extentAlong(points: Vec[], axis: Vec): number {
  let min = Infinity;
  let max = -Infinity;
  for (const p of points) {
    const t = dot(p, axis);
    if (t < min) min = t;
    if (t > max) max = t;
  }
  return max - min;
}

function dimsForAxes(points: Vec[], axes: [Vec, Vec, Vec]): [number, number, number] {
  const d = axes.map((ax) => extentAlong(points, ax));
  d.sort((a, b) => b - a);
  return d as [number, number, number];
}

/** Autovectores de la covarianza 3×3 por iteración de Jacobi. */
function pcaAxes(points: Vec[]): [Vec, Vec, Vec] {
  const n = points.length;
  const mean: Vec = [0, 0, 0];
  for (const p of points) {
    mean[0] += p[0];
    mean[1] += p[1];
    mean[2] += p[2];
  }
  mean[0] /= n;
  mean[1] /= n;
  mean[2] /= n;

  const a = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (const p of points) {
    const d = [p[0] - mean[0], p[1] - mean[1], p[2] - mean[2]];
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) a[i][j] += (d[i] * d[j]) / n;
  }

  let v = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const mul = (x: number[][], y: number[][]) =>
    x.map((row, i) => row.map((_, j) => row.reduce((s, _c, k) => s + x[i][k] * y[k][j], 0)));
  for (let iter = 0; iter < 60; iter++) {
    let p = 0;
    let q = 1;
    let max = Math.abs(a[0][1]);
    if (Math.abs(a[0][2]) > max) {
      p = 0;
      q = 2;
      max = Math.abs(a[0][2]);
    }
    if (Math.abs(a[1][2]) > max) {
      p = 1;
      q = 2;
      max = Math.abs(a[1][2]);
    }
    if (max < 1e-10) break;
    const theta = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]);
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const r = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    r[p][p] = c;
    r[q][q] = c;
    r[p][q] = s;
    r[q][p] = -s;
    const rt = r[0].map((_, i) => r.map((row) => row[i]));
    const na = mul(rt, mul(a, r));
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) a[i][j] = na[i][j];
    v = mul(v, r);
  }
  return [
    [v[0][0], v[1][0], v[2][0]],
    [v[0][1], v[1][1], v[2][1]],
    [v[0][2], v[1][2], v[2][2]],
  ] as [Vec, Vec, Vec];
}

export function parseStep(text: string): DetectedPart[] {
  // 1. Mapa de entidades #id → cuerpo.
  const entities = new Map<number, string>();
  const entityRe = /#(\d+)\s*=\s*([\s\S]*?);\s*[\r\n]/g;
  let match: RegExpExecArray | null;
  while ((match = entityRe.exec(text))) {
    entities.set(Number(match[1]), match[2]);
  }
  if (entities.size === 0) throw new Error("No parece un archivo STEP válido");

  // 2. Factor de unidades: Shapr3D exporta en milímetros, pero se comprueba.
  let unitToInch = 1 / MM_PER_INCH;
  for (const body of entities.values()) {
    if (body.includes("SI_UNIT") && body.includes("LENGTH_UNIT")) {
      if (body.includes(".MILLI.")) unitToInch = 1 / MM_PER_INCH;
      else if (body.includes(".CENTI.")) unitToInch = 10 / MM_PER_INCH;
      else if (!body.includes("PLANE_ANGLE") && body.includes(".METRE.") && !body.includes(".MILLI.") && !body.includes(".CENTI."))
        unitToInch = 1000 / MM_PER_INCH;
      break;
    }
  }

  // 3. Sólidos con nombre.
  const solids: { id: number; name: string }[] = [];
  for (const [id, body] of entities) {
    if (body.startsWith("MANIFOLD_SOLID_BREP")) {
      const raw = body.match(/^MANIFOLD_SOLID_BREP\('((?:[^']|'')*)'/)?.[1];
      solids.push({
        id,
        name: raw ? raw.replace(/''/g, "'") : `Pieza ${solids.length + 1}`,
      });
    }
  }
  if (solids.length === 0) {
    throw new Error("El STEP no contiene sólidos (¿exportaste un boceto 2D?)");
  }

  const parseVec = (id: number): Vec | null => {
    const body = entities.get(id);
    if (!body) return null;
    const nums = body.match(/\(([-0-9.,Ee+ ]+)\)\s*\)$/)?.[1];
    if (!nums) return null;
    const v = nums.split(",").map(Number);
    return v.length === 3 && v.every(Number.isFinite) ? (v as Vec) : null;
  };

  const measured: { name: string; dims: [number, number, number] }[] = [];

  for (const solid of solids) {
    // Clausura de referencias del sólido.
    const seen = new Set<number>([solid.id]);
    const queue = [solid.id];
    const points: Vec[] = [];
    const planeNormals: Vec[] = [];
    while (queue.length) {
      const id = queue.pop()!;
      const body = entities.get(id);
      if (!body) continue;
      if (body.startsWith("CARTESIAN_POINT")) {
        const p = parseVec(id);
        if (p) points.push(p);
      } else if (body.startsWith("PLANE")) {
        const axisId = Number(body.match(/#(\d+)/)?.[1]);
        const axisBody = entities.get(axisId);
        const refs = [...(axisBody ?? "").matchAll(/#(\d+)/g)].map((r) =>
          Number(r[1]),
        );
        if (refs.length >= 2) {
          const normal = parseVec(refs[1]);
          if (normal) planeNormals.push(normalize(normal));
        }
      }
      for (const ref of body.matchAll(/#(\d+)/g)) {
        const rid = Number(ref[1]);
        if (!seen.has(rid)) {
          seen.add(rid);
          queue.push(rid);
        }
      }
    }
    if (points.length < 4) continue;

    // Candidatos de ejes: globales y normales de los planos dominantes.
    // El PCA solo entra si la pieza no tiene caras planas (totalmente curva):
    // sus cajas diagonales son menores pero no se pueden cortar así en madera.
    const candidates: [Vec, Vec, Vec][] = [
      [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ],
    ];
    const families: { n: Vec; count: number }[] = [];
    for (const n of planeNormals) {
      const fam = families.find((f) => Math.abs(dot(f.n, n)) > 0.999);
      if (fam) fam.count++;
      else families.push({ n, count: 1 });
    }
    families.sort((a, b) => b.count - a.count);
    for (const fam of families.slice(0, 3)) {
      const z = fam.n;
      let x: Vec | null = null;
      for (const other of families) {
        if (Math.abs(dot(other.n, z)) < 0.01) {
          x = other.n;
          break;
        }
      }
      if (!x) {
        const helper: Vec = Math.abs(z[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
        x = normalize(cross(z, helper));
      }
      const y = normalize(cross(z, x));
      candidates.push([x, y, z]);
    }
    if (families.length === 0) candidates.push(pcaAxes(points));

    let best: [number, number, number] | null = null;
    for (const axes of candidates) {
      const d = dimsForAxes(points, axes);
      if (!best || d[0] * d[1] * d[2] < best[0] * best[1] * best[2]) best = d;
    }

    measured.push({
      name: solid.name,
      dims: best!.map((d) => d * unitToInch) as [number, number, number],
    });
  }

  // 4. Agrupar piezas idénticas: mismo nombre base y mismas medidas.
  const groups: DetectedPart[] = [];
  for (const piece of measured) {
    const base = piece.name.replace(/\s+\d+$/, "").trim() || piece.name;
    const existing = groups.find(
      (g) =>
        g.name === base &&
        g.dims.every((d, i) => Math.abs(d - piece.dims[i]) <= GROUP_TOLERANCE_IN),
    );
    if (existing) existing.quantity += 1;
    else groups.push({ name: base, quantity: 1, dims: piece.dims });
  }
  return groups;
}
