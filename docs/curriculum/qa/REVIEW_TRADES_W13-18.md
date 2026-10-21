# Independent review: trade-support content, weeks 13–18

Reviewer: independent Thai vocational electrical instructor, with background in automotive, machine-shop/welding, building, power, HVAC and computer-technician work. I did not write this content.

**Scope:** the new `plain`, `track`, `intro.trackHooks` and `deeper` blocks in `src/content/weeks/w13.ts` to `w18.ts`, checked against the last section of `docs/authoring/CONTENT_GUIDE.md`.

**Final assessment:** W18-S10 has no new blocks and was not edited.

## Method

- **Coverage:** I read every new block in W13–W18:
  - 36 trackHooks
  - 60 plain blocks
  - 18 track blocks, which hold 108 trade notes
  - 8 deeper blocks
- **Numbers:** I recomputed every numeric claim in Python (about 45 values). Results:
  - √2·24 = 33.94 V; 0.636·32.54 = 20.70 V
  - √2·230 = 325.3 V
  - LED resistors: 620 Ω / 680 Ω → 18.2 mA and 15.6 mA, 0.226 W; 2.2 kΩ, 0.22 W; 120 Ω; 180 Ω; 130 Ω / 150 Ω → 8.67 mA
  - Coils: 5/70 = 71 mA; 2/24 = 83 mA
  - Heater and drill: 2000/230 = 8.70 A; 500/230 = 2.17 A
  - Motor model: 6 A stall vs 0.25 A no-load = 24×, consistent with `src/labs/motor/model.ts` (RA = 2 Ω, T_f/k = 0.25 A)
  - 2.5 µF ±5% = 2.375–2.625 µF
  - ABS: 10 × 48 = 480 Hz
  - Periods: 25 Hz → 40 ms; 60 Hz → 16.7 ms; 25 kHz → 40 µs, so 40% duty → 16 µs
  - 4–20 mA × 250 Ω = 1–5 V
  - CT 100/5: 2.5 A → 50 A
  - INA219: 0.5 A × 0.1 Ω = 50 mV
  - analogWrite(128) → 2.51 V
  - ESD strap: 230 V / 1 MΩ = 0.23 mA
- **Deeper blocks:** for each one, I searched the whole week file for the moved key terms. The search covered quiz stems, options, feedback and explanations, interactions, examples, lab tasks, activities, summary and vocab.
- **Validation:** `validate-content --week N` gives 0 errors and 0 warnings for weeks 13–18, and `scripts/tc.sh` exits 0 for all six files.

## Items the authors asked me to verify

| Item | Verdict | Source / note |
|---|---|---|
| Arduino Uno has a reverse-polarity diode behind the DC jack | **Correct.** It is the M7 (1N400x-class SMD) diode in series with the jack. Its drop is nearer 0.7–1 V, so the text now says "0.7–1 V". | Arduino forum thread "Burn M7" (forum.arduino.cc/t/burn-m7/699970); Uno R3 schematic |
| Diode-type car relays "usually + on pin 86" | Acceptable as worded. The text already hedges ("ตามที่พิมพ์ข้างรีเลย์ (มักเป็นขา 86)"). | Common Bosch and Hella convention. The relay label is authoritative. |
| Car relay coil 70–90 Ω | **Too narrow.** Bosch micro relays are 97–123 Ω. Changed to "70–120 Ω แล้วแต่รุ่น, 0.1–0.17 A". | Bosch Micro Relays F datasheet (dalroad.com PDF) |
| NTC 10 kΩ at 25 °C | Acceptable. It is hedged ("หลายรุ่น") and the note says to check the model's table. | Common value; AC units also use 5, 15 and 20 kΩ |
| ATX rails 11.4–12.6 V and 4.75–5.25 V | Correct (±5%). | ATX12V Power Supply Design Guide, DC output tolerance table |
| 325 V inverter DC bus from 230 V | Correct as the peak value. Units with PFC boost reach about 380–400 V, so the W13 note now says "ราว 300–400 V", matching W16 and W17. | Calculation |
| 24 V bridge: 33.9 V peak, 20.7 V average | Correct. The 34 V PIV and 1N4002 (100 V) are also correct. | Python |
| LED resistors at 14.4 V / 24 V / 5 V / 3.3 V | All correct, including the E12 choices and power ratings. | Python |
| RLA 5 A / LRA 25 A | Plausible example (LRA is typically about 4–7 × RLA). | — |
| 2.5 µF run capacitor | Plausible for an outdoor fan motor (typical 1.5–5 µF). Tolerance band is correct. | — |
| Compressor windings 2 / 4 / 6 Ω | Correct pattern: C–R < C–S, and S–R ≈ C–S + C–R. Wording changed from "must equal" to "≈". | — |
| ABS 480 Hz | Correct. A 48-tooth ring is realistic. | — |
| Silver brazing "above 450 °C" | Correct. 450 °C (840 °F) is the AWS boundary between soldering and brazing. | AWS A3.0 definition |
| CAT ratings and IEC 61010 impulse table (deeper block) | Correct. The table gives 2.5, 4, 6 kV at 300 V and 4, 6, 8 kV at 600 V; reading the table diagonally is correct. | IEC 61010-1 Table (overvoltage categories) |

## Issues found and fixed

| # | Sev | Week | Block / step | Trade | Problem | Fix |
|---|---|---|---|---|---|---|
| 1 | major | W14 | S04 deeper "ชนิดฟลักซ์ R/RMA/RA/no-clean" | — | Assessed material was hidden. The summary (`R/RMA/RA/no-clean` in the key-points and cheat-sheet sections) and a classification interaction ("ฟลักซ์ปากกาชนิด no-clean") depend on it. | Moved the table back out of `deeper` as a normal `table` block. W14 now has 0 deeper blocks. |
| 2 | major | W13 | S09 track | auto | The coil range 70–90 Ω / 0.13–0.17 A is too narrow (Bosch micro relays are 97–123 Ω). It also seemed to contradict the step text, which says a 12 V relay draws 30–70 mA. | Changed to "70–120 Ω แล้วแต่รุ่น … 0.1–0.17 A (มากกว่ารีเลย์ตัวเล็กบนแผ่นวงจรในขั้นนี้)". |
| 3 | major (safety) | W13 | S09 track | hvac | The note invited learners to measure relay coils on an inverter AC board after "unplug and discharge", with no supervision stated. | Added that work on this board is done by the teacher or a qualified technician, because the board has high-voltage capacitors. |
| 4 | major (safety) | W15 | S07 track | hvac | Compressor winding check said "after unplugging and discharging the capacitor", which implies the learner discharges a run capacitor. | Now says the teacher or a qualified technician discharges the capacitor first. |
| 5 | minor (safety) | W15 | S09 track | comp | "ดูตัวเก็บประจุบวม" was ambiguous and could be read as opening the PSU. | Now "ตัวเก็บประจุบนเมนบอร์ด … (ไม่เปิดฝาพาวเวอร์ซัพพลาย)". |
| 6 | minor | W13 | S02 plain | — | "ดันกลับแรงเกินไป ประตูจะพัง" implies breakdown always destroys the diode, which contradicts the Zener diode in S05. | Now names breakdown and says ordinary diodes fail but Zener diodes are designed to work there. |
| 7 | minor (analogy) | W13 | S07 plain | — | The tap analogy had no stated limit, which can lead to the misconception that I_C = βI_B always (even in saturation). It was also not stated that the current directions are for NPN. | Added "ในชนิด NPN" and a limit clause: at "เปิดสุด", more base current does not raise the collector current (see S08). |
| 8 | minor | W13 | S04 track | hvac | The 325 V bus value ignores PFC boost and was inconsistent with W16 and W17 ("300–400 V"). | Now "ราว 300–400 V (… ≈ 325 V และบางรุ่นมีวงจรเพิ่มแรงดันขึ้นอีก)". |
| 9 | minor | W13 | S04 track | comp | The M7 diode drop was given as 0.7 V. | Now 0.7–1 V. |
| 10 | minor (analogy) | W14 | S03 plain | — | "เตารีดไม่มีตัวควบคุมจะร้อนขึ้นเรื่อย ๆ" is a misconception: an unregulated iron settles at an equilibrium temperature. | Now says it settles at a fixed level it cannot adjust, and overheats when left idle. |
| 11 | minor | W16 | S07 plain | — | "shoot-through ฟิวส์ขาดทันที": the transistors or switches can fail first. | Now "กระแสสูงมากจนฟิวส์ขาดหรือสวิตช์เสียหายทันที". |
| 12 | minor | W17 | S08 track | hvac | "S–R ต้องเท่ากับ C–S + C–R" overstates the rule, and "ขั้วใดอ่าน OL" uses the wrong word for a pair of terminals. | Now "ควรประมาณเท่ากับ" and "คู่ใด". |
| 13 | minor | W17 | S09 track | comp | "จึงไม่จัดเป็น CAT (O)" was confusing. | Now "ไม่จัดอยู่ใน CAT II–IV (มาตรฐานฉบับใหม่เรียกกลุ่มนี้ว่า O)", consistent with the step's table. |
| 14 | minor | W18 | S08 track | auto | A battery-sensor shunt of 0.01 Ω is unrealistic (it would dissipate 100 W+ at starter current). Real sensors are around 0.1 mΩ. | Now 0.001 Ω × 20 A = 0.02 V (20 mV), plus "ชันต์จริงในรถมักมีค่าต่ำกว่านี้อีก". |
| 15 | minor (language) | W13 S01–S08; W14 S01, S03, S04, S08, S09; W15 S01, S08 | plain | — | The plain block is the first use of each key term, but the bold Thai terms had no English in parentheses. W16–W18 already had it. | Added English terms, for example (semiconductor), (doping), (hole), (P-type), (PN junction), (forward/reverse bias), (anode, A), (rectification), (ripple), (Zener diode), (base, B), (cutoff/active/saturation), (biasing), (wetting), (soldering station), (solder), (flux), (desoldering pump/wick), (perfboard), (schematic), (component layout), (current limit). |

## Deeper blocks: assessment check

| Week / step | Deeper title | Key terms searched | Result |
|---|---|---|---|
| W13-S06 | โฟโตทรานซิสเตอร์ | โฟโตทรานซิสเตอร์, phototransistor | Not assessed. OK |
| W13-S08 | ไบอัสป้อนกลับจากคอลเล็กเตอร์ | ป้อนกลับ, collector-feedback, self bias | Not assessed. OK |
| W14-S04 | ฟลักซ์ R/RMA/RA/no-clean | RMA, RA, no-clean, rosin | **Assessed.** Moved back out (issue 1). |
| W15-S03 | ออกแบบลายด้วย KiCad/EasyEDA | KiCad, EasyEDA, footprint, DRC, B.Cu | Not assessed. The trace and pad widths and the mirror rule still appear in the visible procedure, quiz and md. "footprint" is in vocab with its own definition. OK |
| W16-S01 | BLDC / สเต็ปเปอร์ / เซอร์โว | BLDC, stepper, servo | Not assessed (only a resource link). OK |
| W16-S09 | ห้องดับอาร์กและวงแหวนบังเงา | arc, อาร์ก, shading, บังเงา | Not assessed. Figure W16-F10 labels both parts, so the deeper block explains them. OK |
| W17-S09 | ตัวเลขใน IEC 61010 | 2-030, 2-033, อิมพัลส์, 6,000/8,000 | Not assessed. The CAT quizzes rely on the visible "พิกัดชุดวัด = ค่าที่ต่ำกว่า" rule. OK |
| W18-S02 | ชนิดของเครื่องกำเนิดสัญญาณ | AF/RF/pulse generator, arbitrary | Not assessed. OK |

## Checked and found correct (no change)

- **Safety framing (all weeks):**
  - Mains, motor, contactor, VFD and inverter work is consistently teacher- or qualified-person-only.
  - Notes never ask learners to open a PSU, adapter or inverter board, or to put a scope on mains.
  - The CT open-secondary warning, LOTO, ESD and the RCD on site soldering are all correct.
  - The soldering items are correct: 300–380 °C tips, lead-free 217–227 °C, Sn63 183 °C, hydrogen near batteries, acid flux forbidden, and ferrules rather than tinned wire in screw terminals.
- **Analogies:**
  - Diode as a one-way gate: states the threshold and says current is limited only by the load.
  - Transistor test with two diodes: explicitly says the transistor does not work like two diodes.
  - Oscilloscope as a video camera, triggering as a strobe photo, probe ground as a pipe already connected to the drain: all sound.
  - No formulas appear in plain blocks.
- **Cross-references:** all match the step content, including:
  - "ตารางในขั้นที่ 3" (stud diodes)
  - "ตัวอย่าง W14-E05"
  - TP1–TP2
  - the S07 shoot-through text
  - "jog" in W16-S10
  - the 7.6 A overload and the 8-part PMDC
  - "S3" teacher demo in W18
- **Final assessment:** W18-S10 contains no plain, track or deeper blocks.

## Not resolved

- The md was "lightly reworded", but the project has no git history or backup, so I could not diff it against the original. I spot-checked the reworded md in the steps I read and found no change of fact or number.
- `docs/curriculum/qa/TRADES_CONTENT_DUMP.md` still shows the pre-review text for the edited notes. It should be regenerated if it is used again.
