// Answer any lesson interaction through the UI, using the content definition as the answer key.
import { seededPermutation } from "../../src/components/learn/lib/grading.ts";
import { assert, mdSignature, squash } from "./lib.mjs";

const checkBtn = (s) => s.getByRole("button", { name: /^ตรวจคำตอบ/ });

async function expectCorrect(section) {
  // The result line or the green explanation box confirms the attempt.
  await section.locator("text=/ถูกต้อง|ทำนายถูก|สำรวจครบทุกจุดแล้ว|หาครบทุกจุดแล้ว|หาจุดบกพร่องได้ครบ|จบสถานการณ์ด้วยผลที่ปลอดภัย/").first().waitFor({ timeout: 8000 });
  await section.getByText("คำอธิบาย", { exact: true }).first().waitFor({ timeout: 5000 });
}

/** Scenario: find a path from start to a non-bad terminal node (prefer "good"). */
function scenarioPath(it, mode = "good") {
  const seen = new Set();
  const ok = (end) => (mode === "good" ? end === "good" : mode === "bad" ? end === "bad" : end !== "bad");
  const dfs = (id) => {
    const n = it.nodes[id];
    if (!n || seen.has(id)) return null;
    if (!n.choices || !n.choices.length) return ok(n.end ?? "neutral") ? [] : null;
    seen.add(id);
    for (let i = 0; i < n.choices.length; i++) {
      const p = dfs(n.choices[i].next);
      if (p) return [i, ...p];
    }
    seen.delete(id);
    return null;
  };
  return dfs(it.start) ?? (mode === "good" ? scenarioPath(it, "nonbad") : null);
}

/** Answers `it` correctly inside `section` (the .ee-interaction element). */
export async function solve(page, section, it) {
  await section.scrollIntoViewIfNeeded();
  switch (it.kind) {
    case "mcq":
    case "predict": {
      for (const o of it.options.filter((o) => o.correct)) await section.locator(`input[value="${o.id}"]`).check();
      if (it.kind === "predict") await section.getByRole("button", { name: "ยืนยันคำทำนาย" }).click();
      else await checkBtn(section).click();
      break;
    }
    case "fill": {
      const inputs = section.locator('input[inputmode="decimal"]');
      for (let i = 0; i < it.fields.length; i++) await inputs.nth(i).fill(String(it.fields[i].answer));
      await checkBtn(section).click();
      break;
    }
    case "match": {
      const texts = [...it.pairs.map((p) => p.right), ...(it.distractors ?? [])];
      const pool = seededPermutation(texts.length, it.id).map((i) => texts[i]);
      const used = new Set();
      const poolBox = section.locator("div", { has: page.locator(':scope > p:text-is("ตัวเลือกที่ยังไม่ใช้")') }).last();
      for (let i = 0; i < it.pairs.length; i++) {
        const target = pool.findIndex((t, k) => t === it.pairs[i].right && !used.has(k));
        const remaining = pool.map((_, k) => k).filter((k) => !used.has(k));
        const pos = remaining.indexOf(target);
        // select the chip, then the (first empty) slot of pair i
        await poolBox.locator("button[aria-pressed]").nth(pos).click();
        await section.locator('button[aria-label^="ช่องคำตอบของ"]').first().click();
        used.add(target);
      }
      await checkBtn(section).click();
      break;
    }
    case "order": {
      const cur = seededPermutation(it.items.length, it.id, true);
      for (let p = 0; p < cur.length; p++) {
        let j = cur.indexOf(p);
        while (j > p) {
          await section.locator('button[aria-label^="เลื่อนขึ้น"]').nth(j).click();
          [cur[j - 1], cur[j]] = [cur[j], cur[j - 1]];
          j--;
        }
      }
      await checkBtn(section).click();
      break;
    }
    case "hotspot": {
      const spots = section.locator(".ee-spot");
      for (let i = 0; i < it.spots.length; i++) {
        if (it.mode === "find" && !it.spots[i].target) continue;
        await spots.nth(i).click({ force: true });
        await page.keyboard.press("Escape");
      }
      break;
    }
    case "findFault": {
      const spots = section.locator(".ee-spot");
      for (let i = 0; i < it.spots.length; i++) if (it.spots[i].fault) await spots.nth(i).click({ force: true });
      await checkBtn(section).click();
      break;
    }
    case "classify": {
      const order = seededPermutation(it.items.length, it.id);
      const poolBin = section.locator("div", { has: page.locator(':scope > div > p:text-matches("^ยังไม่จัดกลุ่ม")') }).last();
      for (const idx of order) {
        await poolBin.locator("li button[aria-pressed]").first().click();
        await section.getByRole("button", { name: "วางที่นี่" }).nth(it.items[idx].category).click();
      }
      await checkBtn(section).click();
      break;
    }
    case "scenario": {
      const p = scenarioPath(it);
      assert.ok(p, `scenario ${it.id} has no good path`);
      for (const i of p) await section.locator("button.justify-start").nth(i).click();
      break;
    }
    default:
      throw new Error(`unknown kind ${it.kind}`);
  }
  await expectCorrect(section);
}

/** Answer a choice interaction wrongly and return the Thai feedback that must appear. */
export async function answerWrong(page, section, it) {
  const wrong = it.options.find((o) => !o.correct);
  await section.locator(`input[value="${wrong.id}"]`).check();
  if (it.kind === "predict") await section.getByRole("button", { name: "ยืนยันคำทำนาย" }).click();
  else await checkBtn(section).click();
  await section.locator("text=/ยังไม่ถูก|คำทำนายยังไม่ตรง/").first().waitFor();
  const text = squash(await section.innerText());
  const sig = mdSignature(wrong.feedback);
  assert.ok(sig.length > 5 && text.includes(sig), `wrong-answer feedback not shown: ${sig}`);
  assert.ok(/[฀-๿]/.test(sig), "feedback is not Thai");
  return wrong.feedback;
}

export { scenarioPath };
