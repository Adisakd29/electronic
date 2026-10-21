# QA Review — 20100-1005 Weeks 1–6

Reviewer: independent EE instructor / educational QA (ปวช.)
Date: 2026-10-15

Scope: `src/content/weeks/w01–w06.ts` and `src/content/figures/w01–w06.tsx`.

Method:
- Recomputed every worked example, quiz numeric/fill answer and lab target by hand.
- Ran the ohms and circuit lab models (`compute()`) against each lab task check.
- Rendered all figures to PNG with `scripts/render-figures.tsx` and inspected them.
- Checked safety content against course policy (CURRICULUM_REPORT §5):
  - 230/400 V 50 Hz, TN-C-S
  - มอก. 11-2553 wire colours
  - RCD ≤30 mA
  - IEC 60479
  - C-A-B CPR with AED, 1669
- Confirmed W01 and W02 don't duplicate each other.
- Opened every resource URL with WebFetch.

Post-fix status:
- `validate-content.ts --week 1..6`: 0 errors, 0 warnings for every week.
- `tc.sh` (per week, ts + tsx): exit 0 for every week.

## Summary

| Severity | Count |
|---|---|
| critical | 0 |
| major | 3 |
| minor | 9 |

## Week 1 — ความปลอดภัยทางไฟฟ้าในบ้าน

| issue | severity | location | fix applied |
|---|---|---|---|
| The daisy-chained power-strip hazard described in the text and hotspot isn't visible in the figure (the second strip has no outlets) | minor | figures/w01.tsx `HomeHazards` (W01-F06) | Added outlet marks to the second strip so the chained strip is visible; re-rendered and checked |
| The explanation says the hotspots cover "อันตรายครบ 3 กลุ่ม", but the items only cover 2 groups (shock / fire–overload) | minor | w01.ts W01-I16 explanation | Changed to "อันตราย 2 กลุ่มหลัก" and noted that some points can also cause arcing |

All W01 numbers are correct: E01–E05, I05, I17, I22, Q18–Q24, and the lab tasks against the ohms `body` preset.

## Week 2 — ไฟฟ้าดูดกับร่างกาย การช่วยเหลือ และปฐมพยาบาล

| issue | severity | location | fix applied |
|---|---|---|---|
| The lab almost duplicated the W01 lab (same body-resistance V/R tasks), which breaks the no-duplication rule between W1 and W2 | major | w02.ts `lab` | Rewrote the lab around the rescuer (tasks L01–L08). Tasks:<br>• L01–L02: wet-skin path 230 V / 1.5 kΩ → 153.3 mA<br>• L03–L04: rescuer using a wet stick, 5 kΩ + 1 kΩ = 6 kΩ → 38.3 mA<br>• L05–L06: find R so that I < 10 mA → ≥23 kΩ<br>• L07: compare ≥4 R values<br>• L08: MCQ on why wet wood is not an insulator<br>Updated the objective and assumptions to match |
| The inline lab text in S03 no longer matched the new lab values | minor | w02.ts step S03 | Updated to 1.5 kΩ / 6 kΩ / 1 MΩ; changed one reflection question to ask about the wet-stick result |

CPR content is correct: C-A-B, 5–6 cm, 100–120/min, 30:2, AED, 1669. The IEC 60479 current thresholds and E01–E06, I08, I18, Q19, Q20 and Q24 are all correct.

## Week 3 — ปริมาณไฟฟ้าพื้นฐาน (V, I, R, P, W)

| issue | severity | location | fix applied |
|---|---|---|---|
| No issues found | — | — | — |

Verified E01–E09, I09–I29, the lab targets and the expected currents in A02. Resistor colour codes and energy/cost calculations are correct.

## Week 4 — วงจรอนุกรม ขนาน ผสม / KVL–KCL

| issue | severity | location | fix applied |
|---|---|---|---|
| No issues found | — | — | — |

Ran the lab checks through `circuit/model.compute()`:
- Series: Req = 2510 Ω, I = 3.984 mA, V_R3 = 2.032 V.
- Parallel: 500 Ω, 20 mA, P = 0.1 W.
- Mixed: 2025 Ω.

All match the answer keys. Also correct: E01–E08, I05–I27 and the quiz.

## Week 5 — สวิตช์ ฟิวส์ และวงจรแสงสว่าง

| issue | severity | location | fix applied |
|---|---|---|---|
| A student task had students touching tester probes to a live 230 V panel to prove the tester (not allowed for students; must be S3 or done with a proving unit) | major (safety) | w05.ts activity A04 safetyNotes and procedure step 3 | Added a battery proving unit to the equipment. Students prove the tester on the proving unit and do not touch live 230 V. If there is no proving unit, the teacher does the live prove step |
| The table said "นิยมใช้สาย 1.5–2.5 mm²" for socket/branch circuits, but วสท. sets a 2.5 mm² minimum for branch circuits | major | w05.ts step S04 table | Changed to: branch circuit ≥ 2.5 mm² per วสท. |
| The equipment list used a cable smaller than the 2.5 mm² minimum | minor | w05.ts A04 equipment | Changed to 2.5 mm² |
| The "saves 12 kWh" claim in whyItMatters didn't state the usage assumption | minor | w05.ts whyItMatters | Added "(ถ้าเปิดวันละ 8 ชั่วโมง — ดูตัวอย่าง W05-E04)" |

All of these are correct: E01–E06, I05, I09, the I12 two-way switch truth table, I22, Q15–Q26, lab L01–L06, and the L/N/PE switching of the line conductor in the figures.

## Week 6 — การต่อลงดิน RCD/MCB และการป้องกัน

| issue | severity | location | fix applied |
|---|---|---|---|
| Resource gave the wrong name for EIT ("สมาคม…") | minor | w06.ts resources | Changed to "วิศวกรรมสถานแห่งประเทศไทย ในพระบรมราชูปถัมภ์ (วสท.)" |
| The prompt's rounding instruction didn't match the answer-key precision | minor | w06.ts W06-I12 prompt | Now says 2 decimals for current and 1 decimal for voltage |
| A motor/inrush scenario used a Type B MCB, which can trip magnetically at ~3×In on inrush | minor | w06.ts activity A06 | Changed to Type C, with the reason given |
| Cable size in the equipment list was below the 2.5 mm² minimum | minor | w06.ts activity A02 | Changed to 2.5 mm² for branch circuits and 4 mm² for the main feed |

All of these are correct:
- E01–E08, I10, I12, I15–I17, I24.
- The lab answers: 1.164 A, 10.31 Ω, 13.97 W, 0.874 A.
- The A03 expected values.
- RCD 30 mA (≤300 ms at IΔn, ≤40 ms at 5×IΔn), ground rod ≤5 Ω, I_B ≤ I_n ≤ I_Z, U_L 50 V.

## Figures (W01–W06)

All PNGs were rendered and inspected. Symbols, current direction, polarity, L/N/PE colours (brown/blue/green-yellow per มอก. 11-2553), switch logic and hotspot coordinates are all correct.

Cosmetic only, not changed: the resvg preview renders the "/" and "∥" glyphs in a fallback font. The browser render is not affected.

## Resource URLs (WebFetch, 2026-10-15)

| URL | result |
|---|---|
| phet.colorado.edu/en/simulations/{ohms-law, balloons-and-static-electricity, resistance-in-a-wire, circuit-construction-kit-dc} | OK, matching titles |
| allaboutcircuits.com, /textbook/, /textbook/direct-current/ | OK |
| learn.sparkfun.com/tutorials/{how-to-use-a-multimeter, series-and-parallel-circuits} | OK |
| falstad.com/circuit/ | OK ("Circuit Simulator Applet") |
| cpr.heart.org/en/cpr-courses-and-kits/hands-only-cpr | OK |
| ilcor.org, eit.or.th, pea.co.th, egat.co.th, tisi.go.th | OK (home pages) |
| labour.go.th | OK (Department of Labour Protection and Welfare, matches the resource title) |
| mea.or.th, niems.go.th | robots.txt blocks automated fetching, so the page content couldn't be checked. The server answered, and the domain is confirmed as the official one (NIEM: geospatialworld listing; MEA: well-known official domain). Kept |

No dead links were found, and no URL was invented or changed.

## Unresolved / notes for the lead

- Quiz-bank items didn't change except as listed above; the W02 lab IDs are new (L01–L08), so a re-seed is needed.
- Teachers should check the 2.5 mm² minimum and the RCD placement against the latest วสท. edition. The resource text already says this.
