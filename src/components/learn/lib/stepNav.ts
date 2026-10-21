/**
 * Learn-stage step navigation (pure; unit-tested in stepNav.test.ts).
 */

export interface StepNavState {
  index: number;
  total: number;
}

export type StepNavAction = { type: "next" } | { type: "prev" } | { type: "goto"; index: number } | { type: "total"; total: number };

export function clampStep(index: number, total: number): number {
  if (total <= 0) return 0;
  if (!Number.isFinite(index)) return 0;
  return Math.min(Math.max(0, Math.trunc(index)), total - 1);
}

export function stepNavReducer(state: StepNavState, action: StepNavAction): StepNavState {
  switch (action.type) {
    case "next":
      return { ...state, index: clampStep(state.index + 1, state.total) };
    case "prev":
      return { ...state, index: clampStep(state.index - 1, state.total) };
    case "goto":
      return { ...state, index: clampStep(action.index, state.total) };
    case "total":
      return { total: action.total, index: clampStep(state.index, action.total) };
  }
}

/**
 * `?step=N` is 1-based in the URL (friendlier to read); returns a 0-based index.
 * Falls back to `fallback` (0-based) when the param is missing or invalid.
 */
export function parseStepParam(param: string | null | undefined, total: number, fallback = 0): number {
  if (param === null || param === undefined || param === "") return clampStep(fallback, total);
  const n = Number(param);
  if (!Number.isInteger(n) || n < 1) return clampStep(fallback, total);
  return clampStep(n - 1, total);
}

/** First step not yet done (0-based), or the last step when all are done. */
export function firstIncompleteStep(stepIds: string[], done: string[]): number {
  const i = stepIds.findIndex((id) => !done.includes(id));
  return i === -1 ? Math.max(0, stepIds.length - 1) : i;
}

export function allStepsDone(stepIds: string[], done: string[]): boolean {
  return stepIds.length > 0 && stepIds.every((id) => done.includes(id));
}
