import type { ComponentType, ReactElement } from "react";
import type { LabId } from "@/content/types";

/**
 * Every virtual lab is a self-contained module in `src/labs/<id>/`:
 *
 *   model.ts   – pure, deterministic physics/maths (no React). Unit-tested.
 *   Lab.tsx    – "use client" component rendering the simulation.
 *   index.ts   – exports `lab: LabModule`.
 *   model.test.ts – vitest tests that pin the model to hand-computed values.
 *
 * The generic LabRunner (src/components/lab/LabRunner.tsx) renders the lab
 * next to the week's task list. It receives the lab's latest state through
 * `onState` and evaluates `state` tasks with `checks[key].fn(state, params)`.
 */

export interface LabProps {
  /** Preset key from `presets`; unknown keys fall back to "default". */
  preset?: string;
  /** Called whenever the observable state changes (debounce is fine). */
  onState?: (state: unknown) => void;
  /** Compact layout when embedded inside a lesson step. */
  compact?: boolean;
}

export interface LabCheck<S = unknown> {
  description: string;
  /** Human description of params, e.g. "{ target: A, tol?: relative }". */
  params?: string;
  /** Method syntax on purpose: keeps LabModule<S> assignable to LabModule<unknown>. */
  fn(state: S, params: Record<string, number | string | boolean>): boolean;
}

export interface LabModule<S = unknown> {
  id: LabId;
  title: string; // Thai
  titleEn: string;
  description: string; // one sentence, Thai
  /** Model assumptions & accuracy limits (shown in the lab "ข้อสมมติ" panel). */
  assumptions: string[];
  presets: Record<string, { label: string; description: string }>;
  checks: Record<string, LabCheck<S>>;
  Component: ComponentType<LabProps>;
  /** Readouts worth recording in the lab notebook for the current state (formatted, with units). */
  readouts?(state: S): { label: string; value: string }[]; // method syntax: keeps LabModule<S> assignable to LabModule<unknown>
  /** QA only: the lab's SVG stage for a preset, rendered statically (no hooks
   *  that need a browser). Used by `npm run lab:render` to produce PNGs. */
  previewStage?: (preset: string) => ReactElement;
}

/** Relative/absolute tolerance helper used by checks. */
export function near(value: number, target: number, rel = 0.03, abs = 0): boolean {
  if (!Number.isFinite(value) || !Number.isFinite(target)) return false;
  const diff = Math.abs(value - target);
  return diff <= Math.max(abs, Math.abs(target) * rel);
}
