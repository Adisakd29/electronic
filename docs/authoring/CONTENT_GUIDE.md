# Content Authoring Guide — งานไฟฟ้าและอิเล็กทรอนิกส์เบื้องต้น (20100-1005)

You are writing one week of a real course for Thai vocational students (ปวช. year 1, age ~15–16). Teachers will teach from it. Quality and correctness matter more than speed.

## Files you own (and ONLY these)

* `src/content/weeks/wNN.ts` — `export const week: Week = {...}; export default week;` (types in `src/content/types.ts`; replace the stub entirely, do not import `../stub`).
* `src/content/figures/wNN.tsx` — SVG figure components (see `docs/authoring/FIGURE_GUIDE.md`, primitives in `src/content/figures/kit.tsx`).

Do not edit any other file. If you think something else must change, say so in your final report.

## Inputs

* Your week's section in `/home/claude/analysis/WEEK_SPECS.md` — the authoring brief (steps, corrections, worked examples, figures, interactions, activities, quiz topics, lab tasks, vocab, resources). Follow it closely; you may improve on it.
* The source lesson analysis `/home/claude/analysis/lessonNN.md` named in the brief — transcription of the original textbook + error audit. Use it to know **what must be covered** and **what was wrong**. Do not copy textbook sentences; rewrite in clear modern Thai. Never reproduce an error flagged in the audit.
* `/home/claude/analysis/CURRICULUM_REPORT.md` §5 (standards policy) and §2 (mapping) for consistency.
* `docs/authoring/LAB_SPEC.md` — the lab you bind to: use only listed presets and check keys.

## Quality bar (what "done" means)

1. **Real teaching content**, not summaries. Each Learn step explains concept → how it works → symbol/formula → worked numbers or real example → limits / common mistakes. 6–10 steps, each 3–8 minutes of reading/doing, each with ≥ 1 figure, interaction, or embedded lab. Avoid walls of text: split long explanations across `md` blocks, tables, `compare`, `procedure`, callouts.
2. **Correct engineering.** Verify every formula, unit, prefix, symbol, standard and number. **Recompute every numeric answer with a script** (e.g. `node -e` or a scratch `.ts` run with `npx tsx`) before writing it — worked examples, fill interactions, quiz questions, lab numeric tasks. State rounding (e.g. "≈ 0.53 A (ปัดเป็น 2 ตำแหน่ง)") and set tolerances that accept correct rounding.
3. **Standards:** 230 V / 400 V 50 Hz (Thailand) · wire colours มอก. 11-2553 (L brown, N blue, PE green–yellow; L1/L2/L3 brown/black/grey) · RCD 30 mA for personal protection · earth electrode resistance ≤ 5 Ω (วสท.) · CPR per current guidelines, Thai EMS 1669 · IEC 60617 symbols · SI units with correct prefixes (µ not u; kΩ; mA) · IEC 60062 colour code · EIA capacitor codes · IEC 61010 CAT ratings.
4. **Safety first.** Any activity with mains, heat, chemicals, or stored energy carries the right `safety` level (S0–S3) and specific safety notes. Students never work on live mains; mains appears only as teacher demonstration (S3) or simulation. Web instructions must never invite students to experiment with a wall socket.
5. **Language.** Thai first, English technical term in parentheses on first use: "ความต่างศักย์ (potential difference)". Short sentences. Explain every new term the first time it appears. Address the learner directly and practically ("ลองคิดดูว่า…", "ในงานจริง ช่าง…"). Thai numerals not needed; use Arabic numerals. Units after a space: `12 V`, `4.7 kΩ`, `25 °C`; percent without a space: `±5%`.
6. **Interactions teach.** Every wrong option has `feedback` explaining *why it is wrong* (the misconception), not just "ผิด". Use varied kinds: mcq, fill (with `commonErrors` for typical slips like forgetting to convert mA→A), match, order, predict (commit before reveal), hotspot (explore or find), findFault, classify, scenario (branching). Practice stage ≥ 6 interactions using ≥ 3 kinds; plus inline checkpoints inside Learn steps.
7. **Worked examples ≥ 3** (more for calculation weeks), each: problem → given/find → steps (formula → substitution with units → result) → answer → reasonableness check. Graduated basic → advanced. Link a `tryIt` fill interaction where useful.
8. **Quiz bank ≥ 25 (aim 30)** questions; mix Bloom levels per the brief; `drawCount` 12–15 with a `mix` that the bank can satisfy ≥ 2× per level; mcq has exactly 4 plausible choices built from real misconceptions; `feedback` per wrong choice; explanation ≤ 60 words; numeric questions with unit and tolerance. No "all of the above"/"none of the above". Avoid negative stems unless bolded (**ไม่**).
9. **Lab binding:** objective, assumptions (accuracy limits of the model), step instructions, ≥ 4 tasks mixing `state` checks (from LAB_SPEC), `numeric` (answer computed from the model formulas — verify!), and `mcq` (interpretation), plus 2–3 reflection questions.
10. **Activities (ใบงาน) ≥ 2:** realistic for a Thai vocational workshop: objective, equipment list, safety notes, numbered procedure, recording table, questions, 4-level rubric with weights, expected result, `submit: true` when the student uploads the worksheet/photo.
11. **Summary:** key points, mind map (center + 3–6 branches), formulas, vocabulary ≥ 8 (th, en, definition).
12. **Resources ≥ 3:** real, stable pages only (e.g. https://phet.colorado.edu/en/simulations/..., https://www.allaboutcircuits.com/textbook/..., https://eit.or.th, https://www.pea.co.th, https://www.mea.or.th, https://www.niems.go.th, https://www.tisi.go.th, Khan Academy). If you are not certain the exact URL exists, give the site's home page or omit `url` and describe how to find it. Never invent deep links.
13. **Teacher notes:** pacing for the 1 h theory + 3 h practice, preparation, misconceptions to watch, how to run the activities safely, and how the web stages map to the class session.
14. **Source notes:** list the corrections you applied relative to the original lesson (original → corrected → reason; `safety: true` for safety-critical).
15. **No placeholders, no duplication.** Don't pad with repeated content or content that belongs to another week (see WEEK_SPECS Appendix A for topic ownership); briefly review earlier weeks only where needed and say "(ทบทวนจากสัปดาห์ที่ N)".

## Ids

`WNN-K1/S1/A1` objectives · `WNN-S01` steps · `WNN-I01` interactions · `WNN-E01` examples · `WNN-L01` lab tasks · `WNN-A01` activities · `WNN-Q01` questions · `WNN-F01` figures. All unique within the week.

## Markdown & math

* GFM markdown in every `Md` string. Lists, **bold**, tables allowed. Keep headings out of `md` blocks (the step title is the heading); use `**…**` lead-ins instead.
* KaTeX math: inline `$I = \dfrac{V}{R}$`, display `$$P = I^2R$$`. Use `\,` before units inside math: `$I = 12\,\text{mA}$`; Ohm sign `\Omega`, micro `\mu`. Escape literal dollar signs as `\$`. In TypeScript strings remember to escape backslashes: write `"$I = \\dfrac{V}{R}$"` in normal quotes, or use template literals `String.raw\`…\``. Recommended: use `String.raw` for any string containing LaTeX.

## Self-check loop (must pass before you finish)

1. `bash scripts/tc.sh src/content/weeks/wNN.ts src/content/figures/wNN.tsx` → no type errors (never run a full-project `tsc`/`next build`: the machine has 2 CPUs shared by many authors).
2. `npm run content:check -- --week N` → **0 errors** (fix warnings where reasonable).
3. `npm run fig:render -- --week N` → open every PNG in `.figcheck/wNN/` (both normal and `@phone`) with the Read tool and fix overlaps, clipping, tiny text, wrong symbols, or values that disagree with the text.
4. Re-read your quiz bank and interactions once more specifically to check each answer key is correct and each numeric answer was computed.

Final report (≤ 12 lines): counts (steps, interactions, examples, quiz, figures, activities, lab tasks), validator result, key corrections applied, anything you could not do or that needs another file changed.

## ระดับความยากและโจทย์สุ่มค่า (เพิ่ม ต.ค. 2569)

### `level` ของกิจกรรม (ทุกชนิด)
ทุกกิจกรรมใน `practice` ต้องมี `level`: `"basic"` (จำ/เข้าใจ ใช้ความรู้ขั้นเดียว) · `"apply"` (นำกฎ/สูตรไปใช้กับกรณีใหม่) · `"analyze"` (รวมหลายแนวคิด วินิจฉัย ตัดสินใจ เช่น findFault, scenario, วงจรผสม). กิจกรรม inline ในขั้นเรียนรู้ใส่ได้ตามสะดวก validator เตือนเมื่อ practice ไม่มี level หรือมีไม่ครบ 3 ระดับ

### โจทย์สุ่มค่า (`fill` เท่านั้น)
```ts
{
  id: "W03-I12", kind: "fill", level: "apply",
  prompt: "ตัวต้านทาน {{R}} Ω ต่อกับแหล่งจ่าย {{V}} V กระแสเท่าใด",
  vars: { V: { default: 12, min: 3, max: 24, step: 1.5 }, R: { default: 1000, min: 100, max: 2200, step: 100 } },
  fields: [{ id: "i", label: "$I$ =", answer: 12, formula: "V / R * 1000", unit: "mA", tolerance: 0.02,
             commonErrors: [{ value: 0.012, formula: "V / R", feedback: "นั่นคือค่าในหน่วย A โจทย์ถามเป็น mA" }] }],
  explanation: "…",
}
```
กติกา: `default` ต้องเป็นค่าของโจทย์เดิม (คำตอบคงที่ `answer` ยังถูกตรวจด้วยมือ) และ validator ตรวจว่า `formula(defaults) == answer` ภายใน tolerance; ทุก field ต้องมี `formula` เมื่อมี `vars`; `{{ชื่อ}}` ใช้ได้ใน prompt, label, hint, explanation; `commonErrors[].formula` ไม่บังคับ (ข้อที่ไม่มีจะไม่ใช้ตอนสุ่ม); เลือกช่วงค่าที่สมเหตุสมผลทางวิศวกรรม (เช่น R ในชุด E12, V ที่ปลอดภัย) และหลีกเลี่ยงค่าที่ทำให้หารด้วยศูนย์. นิพจน์รองรับ `+ - * / ^ ( )`, `sqrt abs round(x,d) floor ceil min max pow log10 ln exp sin cos tan atan`, ค่าคงที่ `pi`. อย่าใช้กับโจทย์ที่ค่าไม่ควรเปลี่ยน (ค่ามาตรฐาน ข้อเท็จจริง).

### ระดับภารกิจห้องทดลอง (`LabTask.level`)
`1` เรียนรู้เครื่องมือ (ตั้งค่า/อ่านค่า) · `2` ทดลองตามขั้นตอน · `3` แก้โจทย์ที่กำหนด (ต้องคำนวณ/หาค่า) · `4` Challenge (วิเคราะห์ วินิจฉัย ออกแบบ). ทุกสัปดาห์ควรมีอย่างน้อยระดับ 1–3 และระดับ 4 หนึ่งภารกิจ

## Learners from other trades (ผู้เรียนต่างแผนก)

20100-1005 is a common subject: most learners are first-year ปวช. students from **non-electronics trades** (ช่างยนต์, ช่างกล/เชื่อม, ช่างก่อสร้าง, ช่างไฟฟ้ากำลัง, ช่างเครื่องทำความเย็นและปรับอากาศ, ช่างเทคนิคคอมพิวเตอร์). Assume ม.3 mathematics, no prior electronics, possibly never held a multimeter. Competencies, assessment, ids and numbers stay the same for everyone — we change **how** it is explained, not **what** is assessed.

Three block types (see `src/content/types.ts`):

1. **`{ type: "plain", md }` — "เข้าใจแบบง่าย ๆ ก่อน".** Put it as the FIRST block of every step that introduces a technical idea (at least half the steps of a week; normally all except pure procedure/safety-rule steps). 2–5 short sentences, everyday words, one concrete analogy or familiar object (น้ำในท่อ, ถังเก็บน้ำ, สปริง, ประตูทางเดียว, ด่านเก็บเงิน…), say *why* before *what*, and name the technical word the step will use next. No formulas, no `$`. If an analogy has a limit, say so in one clause. Never contradict the technical text that follows.
2. **`{ type: "deeper", title, blocks }` — "ลงลึก (อ่านเพิ่ม · ไม่ออกสอบ)",** collapsed by default. Move into it only material that NO quiz question, practice/inline interaction, worked example, lab task or worksheet depends on (search the week's quiz stems/explanations, interactions, lab tasks and activities for the key terms first). Never put safety rules, formulas used in calculations, or anything referenced later into it. Typically 0–2 per week. May contain md/callout/formula/figure/table/compare/procedure/keyterms only.
3. **`{ type: "track", title?, notes }` — "ในงานแผนกของคุณ".** ≥ 2 per week (aim 3), placed in the step whose concept they apply, with notes for **all six** trades (`auto`, `mech`, `build`, `power`, `hvac`, `comp`). Each note 2–4 sentences about real equipment/situations of that trade, ideally with one realistic, recomputed number. Same concept as the step, correct, and safe: students never work on live mains; mains work is described as qualified-electrician/teacher-supervised.

Also: **`intro.trackHooks`** — for all six trades, 2–3 sentences on where they will meet this week's topic in their own work. And where the existing `md` text is needlessly dense, shorten sentences and define each term at first use — without changing facts, numbers, ids or meaning, and keeping the English term in parentheses.

Typical, safe trade facts to draw on (don't invent beyond common knowledge; if unsure, leave the number out):
- **auto**: 12 V lead-acid battery (≈ 12.6 V rested, ≈ 13.8–14.4 V while the alternator charges); motorcycles 12 V; blade fuses 5–30 A; horn/headlamp/starter relays (85/86 coil, 30/87 contacts); headlamp bulbs H4 60/55 W; LED retrofits; sensors (coolant temperature NTC, oxygen sensor); diodes in the alternator rectifier; starter motor draws 100+ A.
- **mech**: 3-phase 400 V motors on machines, magnetic contactor + overload relay, emergency-stop (NC, mushroom head), limit switches, proximity sensors 24 V DC, PLC/24 V control circuits, welding machines (inverter type, 230 V 1-phase or 400 V 3-phase input), earthing of machine frames, lockout-tagout.
- **build**: building circuits 230 V 50 Hz, consumer unit, MCB/RCBO 30 mA, PE earthing, wire colours (brown L, blue N, green-yellow PE), temporary site supply with RCD, power tools (double-insulated), extension-cord sizing, lighting circuits, two-way switches on stairs.
- **power**: wiring per วสท., cable sizing, MCB/MCCB, transformers, contactors and motor starters, insulation testing (megger, teacher-supervised), measuring with CAT III meters.
- **hvac**: compressor motor with run capacitor (tens of µF, 370–450 V AC), start capacitor/relay, PTC starter, fan motors, thermostat/NTC sensors, contactor in the outdoor unit, inverter boards (high-voltage DC bus — discharge before touching), capacitor safety.
- **comp**: PC power supply rails 12 V / 5 V / 3.3 V, USB 5 V (USB-PD up to 20 V and beyond), adapters/chargers, UPS with 12 V batteries, ESD, LEDs and resistors on boards, Arduino/ESP32 projects at 3.3–5 V, multimeter checks on cables and fuses.

## Real photos (ภาพถ่ายของจริง)

Photos are registered by figure key in `src/content/photos.ts`; week files do not change.

- `mode: "replace"`: the photo takes the drawing's place. Use it only for figures that appear in step blocks or the intro. The validator rejects it for figures used by interactions, examples or the quiz.
- `mode: "with"`: the photo is shown above the drawing. Use it for cut-aways, labelled parts, code tables, and every hotspot or findFault figure.
- Files go in `public/photos/` (jpg/png/webp, longest side ≤ 1600 px).
- Every entry needs `alt` describing the photo itself, `author`, an allowed `license`, `sourceUrl` (a Commons file page) and `title`.
- Record any crop or resize in `modified`.
- Only openly licensed (CC0/PD/CC BY/CC BY-SA) or school-owned photos are allowed, and each one must be checked by eye before adding.
- The plan and list are in `docs/curriculum/PHOTO_PLAN.md`.
