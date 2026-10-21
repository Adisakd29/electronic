/**
 * Geometry for the 18-week PCB roadmap: pads on a serpentine path, traces with
 * 45° chamfered bends at row ends. Pure (unit-tested in roadmap.test.ts).
 */

export interface Board {
  width: number;
  height: number;
  r: number;
  pads: { week: number; x: number; y: number; row: number }[];
  /** traces[i] connects pads[i] → pads[i+1] */
  traces: string[];
  /** small via dots placed on straight traces */
  vias: { x: number; y: number; seg: number }[];
}

export function buildBoard(n: number, cols: number, opts: { dx: number; dy: number; margin: number; r: number; top?: number }): Board {
  const { dx, dy, margin, r } = opts;
  const top = opts.top ?? margin;
  const rows = Math.ceil(n / cols);
  const width = margin * 2 + dx * (cols - 1);
  const height = top * 2 + dy * (rows - 1);
  const pads = Array.from({ length: n }, (_, i) => {
    const row = Math.floor(i / cols);
    const k = i % cols;
    const col = row % 2 === 0 ? k : cols - 1 - k;
    return { week: i + 1, x: margin + col * dx, y: top + row * dy, row };
  });
  const traces: string[] = [];
  const vias: Board["vias"] = [];
  const b = 18; // horizontal run before the bend
  const c = Math.min(28, (dy - 2 * r) / 2 + 8); // chamfer size
  for (let i = 0; i < n - 1; i++) {
    const p = pads[i];
    const q = pads[i + 1];
    if (p.row === q.row) {
      const dir = Math.sign(q.x - p.x);
      traces.push(`M ${p.x + dir * r} ${p.y} L ${q.x - dir * r} ${q.y}`);
      if (i % 2 === 1) vias.push({ x: (p.x + q.x) / 2, y: p.y, seg: i });
    } else {
      // row change: route outside the end pad with two 45° bends
      const dir = p.row % 2 === 0 ? 1 : -1; // right end on even rows
      const x0 = p.x + dir * r;
      const x1 = x0 + dir * b;
      const x2 = x1 + dir * c;
      traces.push(
        `M ${x0} ${p.y} L ${x1} ${p.y} L ${x2} ${p.y + c} L ${x2} ${q.y - c} L ${x1} ${q.y} L ${q.x + dir * r} ${q.y}`,
      );
      vias.push({ x: x2, y: (p.y + q.y) / 2, seg: i });
    }
  }
  return { width, height, r, pads, traces, vias };
}
