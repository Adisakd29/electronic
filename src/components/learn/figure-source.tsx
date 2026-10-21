"use client";
/**
 * Lazy figure modules. Production uses `figureLoaders` (one chunk per week);
 * the dev harness provides its own fixture figures through FigureSourceProvider.
 */
import { createContext, use, useEffect, useState, type ReactNode } from "react";
import type { FigureMap } from "@/content/types";
import { figureLoaders } from "@/content/figures";

export type FigureSource = (week: number) => Promise<FigureMap>;

const defaultSource: FigureSource = async (week) => {
  const load = figureLoaders[week];
  if (!load) return {};
  const mod = await load();
  return mod.figures ?? {};
};

const SourceCtx = createContext<FigureSource>(defaultSource);

export function FigureSourceProvider({ source, children }: { source: FigureSource; children: ReactNode }) {
  return <SourceCtx value={source}>{children}</SourceCtx>;
}

type Entry = { status: "pending"; promise: Promise<void> } | { status: "ok"; map: FigureMap } | { status: "error" };
const caches = new WeakMap<FigureSource, Map<number, Entry>>();

function entryFor(source: FigureSource, week: number): Entry {
  let byWeek = caches.get(source);
  if (!byWeek) {
    byWeek = new Map();
    caches.set(source, byWeek);
  }
  const hit = byWeek.get(week);
  if (hit && hit.status !== "error") return hit;
  const m = byWeek;
  const promise = source(week).then(
    (map) => void m.set(week, { status: "ok", map }),
    (err) => {
      console.error(err);
      m.set(week, { status: "error" });
    },
  );
  const e: Entry = { status: "pending", promise };
  m.set(week, e);
  return e;
}

/** Figure map for a week: `undefined` while loading, `null` when the module failed to load. */
export function useFigureMap(week: number): FigureMap | null | undefined {
  const source = use(SourceCtx);
  const [, force] = useState(0);
  const cached = caches.get(source)?.get(week);
  useEffect(() => {
    const e = entryFor(source, week);
    if (e.status === "pending") {
      let alive = true;
      e.promise.then(() => alive && force((n) => n + 1));
      return () => {
        alive = false;
      };
    }
  }, [source, week]);
  if (!cached || cached.status === "pending") return undefined;
  return cached.status === "ok" ? cached.map : null;
}
