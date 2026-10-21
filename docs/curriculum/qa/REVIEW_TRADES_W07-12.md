# Independent review: trade-support content, W07–W12

Reviewer stance: Thai vocational electrical instructor with cross-trade knowledge (auto, mech/welding, building, power, HVAC, computer technician). I did not write this content.
Scope: the new `plain`, `track`, `intro.trackHooks` and `deeper` blocks, and the reworded `md`, in `src/content/weeks/w07.ts` … `w12.ts`. I checked them against the last section of `docs/authoring/CONTENT_GUIDE.md`.
Date: 2026-10-18

## What was checked

| Item | W07 | W08 | W09 | W10 | W11 | W12 | Total |
|---|---|---|---|---|---|---|---|
| `plain` blocks | 10 | 10 | 10 | 10 | 10 | 10 | 60 |
| `track` blocks (6 notes each) | 3 | 3 | 3 | 3 | 3 | 3 | 18 (108 notes) |
| `trackHooks` (6 trades) | 6 | 6 | 6 | 6 | 6 | 6 | 36 |
| `deeper` blocks | 2 | 1 | 1 | 2 | 1 | 0 | 7 |
| Reworded `md` / moved blocks | 1 | 0 | 1 | 1 (+ W10-I18 moved) | 1 | 0 | 5 |

- **Numbers.** I recomputed every number in python. All arithmetic was correct: ½CV² energies of 1.8, 36 and 17 J; transformer VA and current pairs; X_L of 314 and 31.4 Ω; 230 √2 ≈ 325 V; 400 √2 ≈ 566 V; LED resistor 1.1 kΩ / 0.44 W; 100 V-line impedance 1 kΩ; NIOSH 3 dB exchange: 94 dB(A) → 1 h, 100 dB(A) → 15 min; and so on.
- **Deeper blocks.** For each one I grepped the moved key terms across the whole week file: quiz stems, options, feedback and explanations, interactions, examples, lab tasks, activities and summary. None of the moved material is assessed. The only other hits are in `sourceNotes`, `teacherNotes` or lab `assumptions`, which are not assessed:
  - W07: Å / wavelength; IEC 60062:2016 tolerance colours
  - W08: colour bands on old capacitors
  - W09: 90° lag
  - W10: Nomex / kraft / varnish; balun
  - W11: RC snubber / varistor on AC coils
  - W10-I18 was moved within S08 and is still referenced.
- **Validation.** `npx tsx scripts/validate-content.ts --week N` gives 0 errors and 0 warnings for weeks 7–12. `bash scripts/tc.sh src/content/weeks/wNN.ts` exits 0 for each file.

## Issues found and fixed

Severity key: **Major** = teaches a misconception or is unsafe. **Moderate** = technically misleading. **Minor** = hedging, precision or style.

| # | Week | Block / step | Trade | Problem | Fix | Severity | Source |
|---|---|---|---|---|---|---|---|
| 1 | W08 | S01 `plain` | – | The air-tank analogy's limit clause ("ไฟฟ้าไม่ได้ทะลุผ่านฉนวน… แต่ไหลอ้อมไปตามสายภายนอก") was confusing. It still let students read that the capacitor "stores current/charge" like a tank stores air. | Rewrote the clause: nothing passes through the dielectric; one plate gains as many electrons as the other loses, through the external wire; what is stored is **energy**, not "current". | Major | Physics |
| 2 | W08 | S10 `track` | auto | Points condenser: "ถ้ารั่วหรือขาด → หน้าทองขาวมีประกายไฟมากและไหม้" merged two different faults into one symptom. "DMM ย่าน F" was unclear. | Split the symptoms: open → heavy arcing and burnt points; leaky or shorted → weak or no spark. Changed to "ย่านวัดความจุ (F)". I verified 0.2–0.3 µF and kept it. | Moderate | smokstak.com capacitor article ("0.2 to 0.33 µF; most automotive 0.25–0.29 µF"); fordgarage.com (Model A 0.20–0.30 µF) |
| 3 | W09 | S07 `track` | power | "มอเตอร์มีรีแอกแตนซ์ของขดลวดที่จำกัดกระแสขณะหมุนปกติ" is misleading. Running current is set mainly by back-EMF and slip, not winding reactance. | Replaced it with a correct, step-relevant point: an ohmmeter (DC) reads a very low winding resistance because it does not see the AC reactance. | Moderate | Machine theory |
| 4 | W10 | S08 `track` | hvac | It described bench-powering an open inverter board through a 1:1 isolation transformer, with no statement of who may do it. | Added: powering an open board is for trained technicians only; students do not power an open air-con board. Unplug and discharge before touching. | Moderate (safety) | Guide §track safety |
| 5 | W08 | S09 `plain` | – | "ต้องคายประจุ… ค่อย ๆ ปล่อยผ่านตัวต้านทาน" could read as inviting students to discharge mains-side capacitors. | Added: students only discharge low-voltage training-kit capacitors; capacitors inside mains appliances are for the teacher or a trained technician. This matches the S09 safety callout. | Minor (safety) | Guide §track safety |
| 6 | W08 | S09 `track` | hvac | The inverter-board discharge procedure had no "who does it" statement. | Added "ช่างแอร์ที่ผ่านการฝึก" and "นักเรียนไม่เปิดบอร์ดอินเวอร์เตอร์เอง". | Minor (safety) | – |
| 7 | W09 | S10 `track` | hvac | It implied the multimeter MΩ range is enough for a compressor insulation check, with no supervision. | Changed to "ย่าน MΩ หรือเมกเกอร์ภายใต้การดูแลของครู". | Minor (safety) | – |
| 8 | W11 | S07 `track` | mech | The note used the relay's "10 A 30 VDC" rating directly for a 24 V DC solenoid. Datasheet contact ratings are usually for resistive loads. | Added: the label is usually a resistive-load rating; derate for coil loads (see datasheet). | Minor | Relay datasheet practice |
| 9 | W10 | S07 `plain` | – | "สลับเร็วขึ้นหลายพันเท่า" overstated the ratio. SMPS run at tens of kHz to about 100 kHz, which is about 400–2,000× 50 Hz, and the step md itself says "หลายร้อยเท่า". | Changed to "หลายร้อยถึงหลายพันเท่า". | Minor | – |
| 10 | W07 | S09 `track` | auto | The TPS figures of 0.5 V closed and 4.5 V wide open were stated without a hedge. Real values vary, for example 0.5–1.0 V closed and 4.0–4.7 V wide open. | Added "(ค่าจริงต่างกันตามรุ่น ให้ดูคู่มือซ่อม)". | Minor | – |
| 11 | W10 | intro `trackHooks` | build | Stated "22 kV" as universal. MEA areas use 12/24 kV and PEA areas use 22/33 kV. | Changed to "ไฟแรงสูง (เช่น 22 kV)". | Minor | – |
| 12 | W07 | S02 `plain` | – | Material names had no English term at first use. | Added (carbon film), (metal film), (wirewound). | Minor (style) | – |
| 13 | W07 | S03 `plain` | – | Same issue. | Added (potentiometer), (trimpot). | Minor (style) | – |
| 14 | W07 | S04 `plain` | – | Same issue. | Added (light-dependent resistor), (thermistor), (varistor). | Minor (style) | – |
| 15 | W08 | S03 `plain` | – | Same issue. | Added non-polar / polarized. | Minor (style) | – |

## Flagged numbers checked and kept unchanged

| Week / block | Claim | Verdict |
|---|---|---|
| W09-S09 `track` auto | Diode-type car relay: "ส่วนใหญ่ขา 86 เป็นบวก", and the note says to follow the printed diagram | Correct. Hella diode mini-relay page: "86/1 Positive … 85/2 Earth". |
| W11-S01 `track` auto | Car relay coil ≈ 80 Ω → 0.15 A | Acceptable ("ราว"). Hella lists 170 mA at 12 V, which is about 70 Ω; typical coils are 70–90 Ω. |
| W11-S01 `track` comp | 5 V relay module coil ≈ 70 Ω → about 71 mA; contacts 10 A | Matches the common SRD-05VDC-SL-C datasheet (70 Ω, 71.4 mA, 10 A). |
| W08-S10 `track` mech | Start capacitor printed as a range such as 130–156 µF | Correct. This is a standard catalogue range for CD60-type start capacitors. |
| W09-S10 `track` auto | High-impedance injector 12–16 Ω; ignition-coil primary < 2 Ω | Correct as typical values, hedged with "มัก" and "เทียบคู่มือ". |
| W08-S06 / S09 / S10 `track` | 1.5–2× voltage derating; 370 VAC vs 450 VAC substitution direction; energies 1.8 / 36 / 17 J; ±5% → 33.25–36.75 µF | Correct. |
| W10-S04 / S06 `track` | VA and current pairs; 22 kV : 400 V = 55 : 1 (line-to-line, so the current ratio holds for Dyn) | Correct. |
| W11-S07 `track` power | 5.5 kW, 400 V motor ≈ 11 A (AC-3) | Correct. Typical nameplate is 10.5–11.5 A. |
| W12-S08 `track` | 100 V line: Z = V²/P = 1 kΩ at 10 W; 10 × 15 W and 20 × 6 W tap sums; heaters in series → ¼ power | Correct. |
| W12-S09 `track` | 85 dB(A) / 8 h with a 3 dB exchange rate (94 dB(A) → 1 h, 100 dB(A) → 15 min) | Consistent with the week's NIOSH figure W12-F12, example and quiz. |

## Analogies (`plain`): no other problems

These analogies are sound and each states its limit where needed:
- hose (R)
- flywheel (L and X_L), with the "nothing rotates" limit
- water hammer (kickback)
- gearbox (transformer does not create power)
- engine idling vs load (core vs copper loss)
- railway points (COM/NO/NC)
- spring door (pull-in / drop-out)
- door wedge (self-holding / no-volt release)

None of the 60 blocks contains formulas or `$`.

## Open items

None. All 15 issues are fixed in the week files.
