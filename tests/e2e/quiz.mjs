// Fill the quiz on screen with correct (or deliberately wrong) answers looked up in the DB bank.
import { assert, mdPieces, sql, squash } from "./lib.mjs";

export async function bank(week) {
  return sql()`select id, type, stem, answer, choices from question where week = ${week} and active`;
}

/** Best-matching bank question for a rendered question: every text piece of the stem must be on screen. */
function identify(qs, text) {
  const t = squash(text);
  let best = null;
  for (const q of qs) {
    const pieces = mdPieces(q.stem);
    if (!pieces.length) continue;
    const hit = pieces.filter((p) => t.includes(p)).reduce((a, p) => a + p.length, 0);
    const miss = pieces.filter((p) => !t.includes(p)).reduce((a, p) => a + p.length, 0);
    const score = hit - 3 * miss;
    if (hit >= 6 && (!best || score > best.score)) best = { q, score };
  }
  return best?.q ?? null;
}

/** Answers every question currently shown. mode "correct" | "wrong". Returns count identified. */
export async function answerAll(page, week, mode = "correct") {
  const qs = await bank(week);
  // show all questions at once
  await page.getByRole("group", { name: "รูปแบบการแสดงข้อสอบ" }).getByRole("button", { name: "ทุกข้อ" }).click();
  const sets = page.locator("fieldset.ee-quiz-q");
  await sets.first().waitFor();
  const n = await sets.count();
  let found = 0;
  for (let i = 0; i < n; i++) {
    const fs = sets.nth(i);
    const q = identify(qs, await fs.innerText());
    assert.ok(q, `quiz question ${i + 1} not found in bank: ${(await fs.innerText()).slice(0, 80)}`);
    found++;
    if (q.type === "numeric") {
      const v = mode === "correct" ? String(q.answer) : String(Number(q.answer) * 7 + 13);
      await fs.locator("input[inputmode=decimal]").fill(v);
    } else {
      const ids = q.type === "tf" ? ["true", "false"] : ["a", "b", "c", "d"];
      const v = mode === "correct" ? String(q.answer) : ids.find((x) => x !== String(q.answer));
      await fs.locator(`input[type=radio][value="${v}"]`).check();
    }
  }
  return found;
}

export async function submit(page) {
  await page.getByRole("button", { name: "ส่งคำตอบ" }).first().click();
  const dlg = page.getByRole("dialog");
  await dlg.waitFor();
  await dlg.getByRole("button", { name: "ส่งคำตอบ" }).click();
  await page.locator("#quiz-result-h").waitFor({ timeout: 20000 });
  return page.locator("#quiz-result-h").innerText();
}
