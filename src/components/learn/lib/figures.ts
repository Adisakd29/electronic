/**
 * Figure numbering: "รูปที่ {week}.{n}" in order of first appearance.
 * Pure helpers (unit-tested in figures.test.ts).
 */
import type { Block, FigureRef, Interaction, WorkedExample } from "@/content/types";

export interface FigureResolver {
  interaction: (id: string) => Interaction | undefined;
  example: (id: string) => WorkedExample | undefined;
}

/** Figure keys an interaction shows in its main body (scenario nodes included). */
export function interactionFigures(it: Interaction): FigureRef[] {
  const out: FigureRef[] = [];
  if (it.figure) out.push(it.figure);
  if (it.kind === "predict" && it.revealFigure) out.push(it.revealFigure);
  if (it.kind === "scenario") {
    // start node first, then the rest in declaration order
    const keys = [it.start, ...Object.keys(it.nodes).filter((k) => k !== it.start)];
    for (const k of keys) {
      const f = it.nodes[k]?.figure;
      if (f) out.push(f);
    }
  }
  return out;
}

export function exampleFigures(ex: WorkedExample, r: FigureResolver): FigureRef[] {
  const out: FigureRef[] = [];
  if (ex.figure) out.push(ex.figure);
  if (ex.tryIt) {
    const it = r.interaction(ex.tryIt);
    if (it) out.push(...interactionFigures(it));
  }
  return out;
}

/** Ordered figure keys appearing in a list of blocks. */
export function blockFigureKeys(blocks: Block[], r: FigureResolver): string[] {
  const keys: string[] = [];
  for (const b of blocks) {
    if (b.type === "figure") keys.push(b.figure);
    else if (b.type === "deeper") keys.push(...blockFigureKeys(b.blocks, r));
    else if (b.type === "interaction") {
      const it = r.interaction(b.ref);
      if (it) keys.push(...interactionFigures(it).map((f) => f.figure));
    } else if (b.type === "example") {
      const ex = r.example(b.ref);
      if (ex) keys.push(...exampleFigures(ex, r).map((f) => f.figure));
    }
  }
  return keys;
}

/** Assign 1-based numbers to keys in order of first appearance (repeats keep their number). */
export function numberFigures(keys: string[], start = 1): Record<string, number> {
  const out: Record<string, number> = {};
  let n = start;
  for (const k of keys) {
    if (!(k in out)) out[k] = n++;
  }
  return out;
}

export function figureLabel(week: number, n: number | undefined): string | null {
  return n ? `รูปที่ ${week}.${n}` : null;
}
