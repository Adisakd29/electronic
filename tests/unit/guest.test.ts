import { beforeEach, describe, expect, it } from "vitest";
import { buildSlice } from "@/components/learn/slice";
import { createGuestApi, guestProgress, guestResume, guestWeekPosition, GUEST_QUIZ_MESSAGE } from "@/components/learn/guest";
import { getWeek } from "@/content";

// Minimal browser storage for the node test environment.
class MemStorage {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}
const g = globalThis as unknown as { window: { localStorage: MemStorage } };

const w1 = getWeek(1)!;
const slice = buildSlice(w1, "learn");

describe("guest mode", () => {
  beforeEach(() => {
    g.window = { localStorage: new MemStorage() };
  });

  it("starts empty, unlocked, without quiz", () => {
    const p = guestProgress(slice);
    expect(p.unlocked).toBe(true);
    expect(p.stagesDone).toEqual([]);
    expect(p.quiz.passed).toBe(false);
    expect(p.submissions).toEqual({});
  });

  it("stages open in order: learn is closed until the intro is done", async () => {
    const api = createGuestApi(slice);
    expect(guestProgress(slice).stagesOpen).toEqual(["intro", "quiz"]);
    const r = await api.markStepComplete(1, slice.stepMeta[0].id);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/บทนำ/);
    expect((await api.completeStage(1, "intro")).ok).toBe(true);
    expect(guestProgress(slice).stagesOpen).toEqual(["intro", "learn", "quiz"]);
  });

  it("learn stage needs every step; progress persists across api instances", async () => {
    const api = createGuestApi(slice);
    await api.completeStage(1, "intro");
    expect((await api.completeStage(1, "learn")).ok).toBe(false);
    for (const s of slice.stepMeta) expect((await api.markStepComplete(1, s.id)).ok).toBe(true);
    const r = await api.completeStage(1, "learn");
    expect(r.ok && r.data.stagesDone).toContain("learn");
    expect(guestProgress(slice).stepsDone.length).toBe(slice.stepMeta.length);
    expect(guestProgress(buildSlice(w1, "intro")).stagesDone).toContain("learn");
  });

  it("rejects unknown ids and other weeks", async () => {
    const api = createGuestApi(slice);
    expect((await api.markStepComplete(1, "NOPE")).ok).toBe(false);
    expect((await api.markStepComplete(2, slice.stepMeta[0].id)).ok).toBe(false);
    expect((await api.recordLabTask(1, "NOPE", true)).ok).toBe(false);
  });

  it("practice and lab require all items correct; wrong answers are not stored", async () => {
    const ps = buildSlice(w1, "practice");
    const api = createGuestApi(ps);
    await api.completeStage(1, "intro");
    for (const s of slice.stepMeta) await api.markStepComplete(1, s.id);
    await api.completeStage(1, "learn");
    await api.recordInteraction(1, ps.practiceIds[0], false);
    expect(guestProgress(ps).interactionsCorrect).toEqual([]);
    for (const id of ps.practiceIds) await api.recordInteraction(1, id, true);
    expect((await api.completeStage(1, "practice")).ok).toBe(true);

    const ls = buildSlice(w1, "lab");
    const lapi = createGuestApi(ls);
    expect((await lapi.completeStage(1, "lab")).ok).toBe(false);
    for (const id of ls.labTaskIds) await lapi.recordLabTask(1, id, true);
    expect((await lapi.completeStage(1, "lab")).ok).toBe(true);
  });

  it("quiz, uploads are refused; complete needs intro+learn+practice+lab only", async () => {
    const api = createGuestApi(slice);
    const q = await api.startQuiz(1, "post");
    expect(q.ok).toBe(false);
    if (!q.ok) expect(q.error).toBe(GUEST_QUIZ_MESSAGE);
    expect((await api.completeStage(1, "quiz")).ok).toBe(false);
    expect((await api.submitAssignment(new FormData())).ok).toBe(false);
    const c = await api.completeStage(1, "complete");
    expect(c.ok).toBe(false);
    if (!c.ok) expect(c.error).toMatch(/บทนำ/);
  });

  it("lab notebook round-trips and is capped at 60 rows", async () => {
    const ls = buildSlice(w1, "lab");
    const api = createGuestApi(ls);
    const note = { at: "2026-01-01T00:00:00.000Z", label: "ครั้งที่ 1", values: [{ k: "V", v: "12 V" }] };
    expect((await api.saveLabNotes(1, [note])).ok).toBe(true);
    expect(guestProgress(ls).labNotes).toEqual([note]);
    expect((await api.saveLabNotes(1, Array.from({ length: 70 }, () => note))).ok).toBe(true);
    expect(guestProgress(ls).labNotes.length).toBe(60);
    expect(guestProgress(buildSlice(getWeek(2)!, "lab")).labNotes).toEqual([]);
  });

  it("remembers the last position", async () => {
    const api = createGuestApi(slice);
    await api.savePosition(1, "learn", 3);
    expect(guestResume()).toEqual({ week: 1, stage: "learn", stepIndex: 3 });
    expect(guestWeekPosition(1)).toEqual({ stage: "learn", stepIndex: 3 });
    expect(guestWeekPosition(2)).toBeNull();
  });

  it("survives corrupt or unavailable storage", async () => {
    g.window.localStorage.setItem("eelearn.guest.v1", "{not json");
    expect(guestProgress(slice).stagesDone).toEqual([]);
    g.window = { localStorage: { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() {} } as unknown as MemStorage };
    const api = createGuestApi(slice);
    // Nothing can be remembered, so the intro is the only open stage; writes still fail softly, not with an exception.
    expect((await api.completeStage(1, "intro")).ok).toBe(true);
    const r = await api.markStepComplete(1, slice.stepMeta[0].id);
    expect(r.ok).toBe(false);
    expect(guestResume()).toBeNull();
  });
});
