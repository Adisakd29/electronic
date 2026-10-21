# Independent review: trade-support content, weeks 1–6

Reviewer role: Thai vocational electrical instructor (cross-trade). Scope: `plain`, `track`, `intro.trackHooks` and `deeper` blocks in `src/content/weeks/w01.ts` … `w06.ts`. The spec is CONTENT_GUIDE.md, section "Learners from other trades".

## What was checked

| Item | Count |
|---|---|
| `plain` blocks | 59 |
| `track` blocks (6 notes each) | 18 (108 notes) |
| `intro.trackHooks` (6 each) | 6 weeks (36 hooks) |
| `deeper` blocks (grepped against the quiz, interactions, examples, lab, activities and summary) | 9 |
| Numeric results recomputed in Python | 55+ (all of them correct, see below) |

**Numbers.** Every arithmetic result in the track notes was recomputed and matches when rounded. The checks covered these items:
- W01 extension-cord totals: 12.17, 12.61, 19.57, 5.22, 4.61, 7.83 and 12.4 A
- W03 power and energy: 5 A, 2.4 Ω, 387.2 kWh, 120 kWh, 1.74 A, 11.76 Ω, 67.5 kWh, 240 kWh, 10 W, 60 W, 52.8 kWh
- W03 battery energy: 90, 72, 2,400, 44.4 and 84 Wh
- W04: 4.6 A, 9.2 A, 8.7 A, 4.3 A, 13 A, 0.39 A, 0.8 A
- W05: 1.7 A, 135 kWh, 396 kWh, 5 W
- W06: 15.3 A, 153 V, 7.8 A, 12.2 A, 288 W, 1.25 A, 4.8 A, 10.9 A

**Trade facts.** These were confirmed correct:
- 12.6 V at rest and 13.8–14.4 V while charging
- Relay pins 30/85/86/87/87a (DIN 72552)
- Blade-fuse colours: 10 A red, 15 A blue, 20 A yellow
- Wire colours to TIS (มอก.) 11-2553: brown, blue, green-yellow, and L1/L2/L3 brown/black/grey
- RCD 30 mA
- ATX PSU wire colours: yellow 12 V, red 5 V, orange 3.3 V
- USB-PD 20 V × 3 A = 60 W
- ESD strap about 1 MΩ
- Earth rod ≥ 16 mm × 2.4 m, ≤ 5 Ω (matches the W06 md and quiz)
- Insulation test at 500 V DC
- Class D for magnesium fires, fire number 199
- Shaft power vs input power on a motor nameplate

**Deeper blocks.** None of the moved material is assessed. The terms were grepped from `interactions:` to the end of each file:
- W01 √3 / 120°: the 400 V fact stays in visible md
- W02 law names: they appear only in `resources`
- W03 6.24×10¹⁸ and solar-cell detail
- W04 analog-meter zero adjust (appears only in `sourceNotes`) and the low-ohm colour code (appears only in `sourceNotes`)
- W05 SI definition of the candela (appears only in `sourceNotes`)
- W06 MCCB table (MCCB appears only as a glossary keyterm, not in assessment) and TN-S/TN-C/TT (not assessed)

Nothing had to be moved back.

## Issues and fixes

Severity: **S** = safety, **T** = technical error or misconception, **C** = consistency, wording or hedging.

| # | Sev | Week | Block / step | Trade | Problem | Fix | Source |
|---|---|---|---|---|---|---|---|
| 1 | S | W03 | S07 track | hvac | "ต้องรอคายประจุตามคู่มือและวัดยืนยันก่อนแตะ" reads as an instruction to the student to discharge and touch an inverter board (high-voltage DC bus). | Now says that students must not open or touch the board, and that a trained technician or the teacher discharges it and verifies first. | Spec (safety rule) |
| 2 | S | W02 | S02 track (LOTO) | hvac | The steps for opening a live outdoor unit had no supervision clause. | Framed as the air-conditioning technician's procedure, plus "(นักเรียนทำภายใต้การดูแลของครูเท่านั้น)". | Spec |
| 3 | S | W03 | S10 track | hvac | The note did not say who discharges the run capacitor. | Changed to "หลังครูหรือช่างคายประจุคาปาซิเตอร์". | Spec |
| 4 | S | W01 | S06 track | comp | The note explained the tingling from a 2-pin adapter but never said not to use one. | Added "จึงห้ามใช้หัวแปลงที่ตัดขาดินทิ้ง". | — |
| 5 | T | W05 | S10 plain | — | "LED … ไม่ต้องร้อน" teaches that LEDs do not heat up. | Changed to: it does not need to heat anything until it glows, and the chip still gets warm so it needs a heatsink. Also "ทุกหลอด…ซ่อนอยู่ในขั้ว" became "มักซ่อนอยู่ในขั้วหลอดหรือในตัวโคม", because some drivers are external. | — |
| 6 | T | W01 | S02 plain | — | "แรงดันน้ำเป็นแค่ตัวดัน" implies voltage does not matter, which works against the later Ohm's-law step. | Added the limit: no pressure means no flow, and high voltage is dangerous because it drives a large current. | — |
| 7 | T | W03 | S08 plain | — | Squeezing a hose nozzle makes the jet stronger, so students experience it as "more", which is a confusing analogy for higher resistance. | Replaced with "ใช้ท่อที่เล็กและยาวกว่าเดิม น้ำก็ไหลน้อยลง". | — |
| 8 | T | W02 | S01 plain | — | "แรงดันสูงกว่าไฟบ้านหลายสิบเท่า" understates it: the md says 12–33 kV, which is about 52–143 × 230 V. The note also blurred the low-voltage street lines with the high-voltage ones. | Changed to "สายไฟฟ้าแรงสูงเส้นบนสุด…หลายสิบถึงกว่าร้อยเท่า". | Python: 22,000/230 ≈ 96 |
| 9 | T | W06 | S02 track | mech | "(gG/aM, F/T)" mixes industrial fuse classes with F/T speed codes, which belong to miniature glass fuses. | Changed to "(เช่น gG หรือ aM)". | IEC 60269 / IEC 60127 |
| 10 | T | W04 | S03 track | hvac | Said the compressor and fan are always paralleled after the contactor, which is not true of inverter units. | Added the hedge "แบบธรรมดา (ไม่ใช่อินเวอร์เตอร์) … มักต่อ". | — |
| 11 | T | W04 | S10 track | hvac | Measuring winding continuity does not work on DC fan motors that have their own board. | Added a clause limiting it to plain AC motors. | — |
| 12 | T | W03 | S10 track | comp | A brief beep between 5 V and GND (from board capacitors charging) could be misread as a short. | Added "ถ้าดังสั้น ๆ แล้วเงียบ อาจเป็นตัวเก็บประจุ…". | — |
| 13 | T | W03 | S09 track | comp | "พอร์ต USB 5 V จ่าย 2 A" is wrong for ordinary computer ports (0.5–0.9 A). | Changed to "ที่ชาร์จ USB 5 V 2 A". | USB 2.0/3.x specs |
| 14 | C | W06 | trackHooks | hvac | "ต้องมี…Type C" was absolute, but S09 says to follow the manufacturer. | Changed to "มักใช้ Type C ตามคู่มือผู้ผลิต". | — |
| 15 | C | W06 | S09 track | comp | The reasons for splitting 10 PCs over two circuits left out the accumulated PSU leakage that trips a 30 mA RCD. | Added that reason. | — |
| 16 | C | W06 | S02 track | comp | "มีฟิวส์หลอดชนิด T" was absolute. | Changed to "มักมี". | — |
| 17 | C | W06 | S07 track | build | "ราว 15 A" did not match the 15.3 A used in the example and quiz. | Changed to 15.3 A. | — |
| 18 | C | W03/W04 | S07 tracks | hvac | The remote-control batteries were AAA in W03 and AA in W04. | Both now say "AA หรือ AAA". | — |
| 19 | C | W03 | S09 track | hvac | "หมายเหตุเรื่องเทอร์โมสตัทด้านบน" points up, but the callout comes after the track. | Changed to "ในกรอบถัดไป". | — |

Sources for the relay-pin and fuse-colour checks:
- [DIN 72552 (Wikipedia)](https://en.wikipedia.org/wiki/DIN_72552)
- [Littelfuse 10 A red blade fuse (RS)](https://uk.rs-online.com/web/p/car-fuses/7874101)
- [Littelfuse 20 A yellow blade fuse (RS)](https://befr.rs-online.com/web/p/car-fuses/7874136)

## Checked and left unchanged

- **W01-S09 hvac (1,200 W A/C).** The note already warns that the formula suits heating loads and that motors draw an inrush current.
- **W05-S04 build (old wire colours).** These are hedged with "อาจ" and the note requires measuring.
- **W02-S09 comp (Li-ion fire).** The advice is hedged: use the extinguisher only on a small fire, then retreat and call 199.
- **W06-S06 plain "ไหลกลับทางสายดิน… แทนที่จะไหลผ่านคน".** This is an acceptable simplification at ปวช. 1 level and matches the technical text.
- **Reworded md.** There is no pre-edit baseline in the repo (no git history), so I could not diff the reworded md. I spot-checked the md next to every plain block and found no change of facts, numbers or ids.

## Verification

For W01–W06, `npx tsx scripts/validate-content.ts --week N` gives 0 errors and 0 warnings, and `bash scripts/tc.sh src/content/weeks/w0N.ts` exits 0.
