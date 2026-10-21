# QA review: weeks 13–18 (20100-1005)

Reviewer: independent EEE instructor / QA pass. Scope: `src/content/weeks/w13–w18.ts` and `src/content/figures/w13–w18.tsx`. Checked against CURRICULUM_REPORT.md, WEEK_SPECS.md and source-audit/lesson12–15.md.

## Method

- **Worked examples and answers:** recomputed every worked example and every numeric fill/quiz answer by hand or with `npx tsx`. Checked quiz keys, distractors and feedback.
- **Lab tasks:** checked targets against `src/labs/<id>/model.ts` and the `checks` in each lab's `index.ts`:
  - semiconductor
  - motor
  - multimeter
  - oscilloscope
- **Figures:** rendered every figure with `scripts/render-figures.tsx` and inspected it, including waveform div counts and phase. Checked hotspot coordinates against viewBox scale.
- **Resource URLs:** opened all 28 URLs with WebFetch; all load and match their titles.
- **Bloom mix per quiz pool (R/U/Ap/An/E):**
  - W13: 5/7/10/6/2
  - W14: 6/7/8/6/3
  - W15: 6/7/8/6/3
  - W16: 5/8/10/7/2
  - W17: 5/7/10/6/2
  - W18: 5/7/10/6/2
- **Validation after edits:** `validate-content --week N` gives 0 errors and 0 warnings for W13–W18, and `tc.sh` exits 0 for every edited week.

## Summary

| Severity | Found | Fixed | Unresolved |
|---|---|---|---|
| critical | 0 | 0 | 0 |
| major | 5 | 5 | 0 |
| minor | 13 | 11 | 2 |

## W13 — Semiconductors (diode, LED, Zener, rectifiers, BJT, SCR)

I re-derived every number in W13 and found them correct:
- E01–E10
- I12, I14–I16, I19, I24, I30, I35
- Q13–Q30
- lab L02/L08/L09/L10/L12/L14 against the semiconductor model

The figures and hotspots are OK.

| Issue | Severity | Location | Fix applied |
|---|---|---|---|
| The `diode_1.html` resource was titled "Diode Tutorial / Transistor Tutorial". The page is actually "Semiconductor Basics", the first page of the diode series. | minor | `resources` (w13.ts ~L2483) | Retitled it and rewrote the description to match the page. |

## W14 — Soldering, flux, ESD, PCB types

The temperatures, fluxes, ESD wrist strap (1 MΩ) and FeCl₃-as-acid wording are correct, and all numbers check out.

| Issue | Severity | Location | Fix applied |
|---|---|---|---|
| Three places say "ทบทวนจากสัปดาห์ที่ 13" for MOSFET/CMOS ESD, but W13 never covers MOSFET/CMOS or ESD. ESD is taught in W01 (W01-K5). | minor | `intro.prior`, S02 md, W14-I01 prompt | Changed all three to week 1. |
| The flux table caption calls R/RMA/RA "the J-STD-004 classification". R/RMA/RA is the legacy MIL-F-14256 scheme; J-STD-004 uses codes such as ROL0. | minor | S03 flux table caption | Rewrote the caption to name both schemes correctly. |
| The Q18 explanation gives a 130–160 °C margin, while the rest of the week says 110–170 °C. | minor | W14 quiz (SAC305 question) | Linked the two ranges explicitly. |

## W15 — PCB making, kit assembly, troubleshooting

| Issue | Severity | Location | Fix applied |
|---|---|---|---|
| **KiCad/EasyEDA is never taught.** W14 says PCB design (KiCad/EasyEDA), mirroring and etching are "taught in full in W15", but W15 has no design workflow. | major | W15-S03 | Added a KiCad/EasyEDA workflow block to S03: schematic → footprint → layout (trace ≥ 0.8–1.0 mm, pad ≥ 2 mm, gap ≥ 0.5 mm, DRC, jumpers) → B.Cu artwork. It includes correct mirror guidance: no mirror for toner transfer of the bottom layer; the copper-side (mirrored) view when drawing on copper by hand. Added the verified KiCad Documentation resource (docs.kicad.org). |
| **W15 contradicts W14 and itself.** Four places say PCB making was taught in W14: `prior`, teacherNotes ("กัดจากงาน W14", "สอนเต็มในสัปดาห์ที่ 14") and sourceNotes ("สอนในสัปดาห์ที่ 14"). | major (same root cause as above) | `intro.prior`, teacherNotes ×2, sourceNotes | Rewrote all four so that W14 covers PCB types plus the FeCl₃ warning, and W15-S03 covers design and etching. |
| The W15-L07 answer was 15.0 mA with the text "(9−1.9)/470 = 15.1". The lab red LED Vf = 2.0 V gives 14.9 mA, which is also consistent with the 14.5 mA kit value. | minor | lab tasks W15-L07 | Set the answer to 14.9 mA and explained it with Vf = 2.0 V. |

Structural note: CURRICULUM_REPORT §3.2 puts PCB making in W14. The content deliberately keeps W14 on soldering and moves PCB making to W15. After these fixes the split is consistent and the two weeks do not duplicate each other.

## W16 — DC motor (back-EMF, PWM, H-bridge), contactor start–stop

The following are correct and all numbers verify:
- contact numbering 13–14, 95–96, A1–A2
- IEC symbols
- 3-phase work as teacher demonstration only
- PWM V_eff
- the L02 (2626 rpm), L03 and L04 targets

| Issue | Severity | Location | Fix applied |
|---|---|---|---|
| The W16-L08 `noShortCircuit` check passed even when the motor was not running. | major | lab tasks W16-L08 | Changed the check to `direction {dir:"cw"}` with a hint (press "รีเซ็ต (เปลี่ยนฟิวส์)", then S1 + S4). Verified with tsx: S1+S2 gives short/stop; after reset, S1+S4 gives cw at 5491 rpm; fuse blown gives stop. |
| E01's check said "แรงบิดหลักร้อยของ N·m" for a result of 0.08 N·m. | minor | W16-E01 `check` | Reworded to "≈ 0.08 N·m (80 mN·m)". |
| W16-F07 (shunt motor, armature swap) had a hollow circle where the crossed wires meet, which reads as a junction. A junction there would short the armature. | minor | figures/w16.tsx `MiniShunt` | Removed the circle and re-rendered the figure. |
| The quiz pool is 32 questions with a 5/8/10/7/2 mix against the target 5/7/10/6/2. Every level is represented. | minor | quiz | Not changed: it is within reason, and `mix` controls the draw. |

## W17 — Multimeters, CAT ratings, accuracy, fuses, DC supply

The following are correct:
- the IEC 61010 CAT definitions and the "lower of meter/leads" rule
- live–dead–live
- mains measurement as a teacher demonstration behind a barrier
- accuracy examples: 3.300 V on the 4 V range ±0.0185 V; on the 40 V range ±0.0365 V
- loading: 4.00 V / 4.98 V and 4.76 V
- CV/CC: Rc = V/Ilim
- the readings at needle positions A/B/C and the AC10V non-linear scale
- hotspots for I06, I07, I23 and I25

| Issue | Severity | Location | Fix applied |
|---|---|---|---|
| W17-L10 asks for a forward-bias diode test, but its `measured` check also passed on a reverse (OL) reading. | major | lab tasks W17-L10 | Changed the check to `readingNear {target: 0.572, tol: 0.05}` and reworded the prompt (red lead on the anode) with an OL hint. Verified: forward reads 0.572 V and passes; reverse OL fails; LED 1.812 V fails. |
| In W17-F10 the R₁/R₂ labels overlapped the left battery wire. | minor | figures/w17.tsx `Loading` | Moved and shrank the labels and re-rendered. |

## W18 — Function generator, oscilloscope, final assessment

The following are correct:
- V/div, time/div, Vrms (sine, square, triangle)
- probe ×1/×10 and compensation
- trigger and coupling
- 50 Ω vs High-Z doubling
- average-responding errors (+11% / −4%)
- shunt on the ground side
- the mains prohibition (650 Vpp, earthed ground clip, differential probe as a teacher S3 task)
- every waveform figure's div count and phase (E08 Δt 1.6 div, V_R 2.13 Vpp)
- the F03, F04 and F19 hotspots

The final assessment matches report §7.3:
- A = C1, 25%
- B = C2, 20%
- C = C3, 20%
- D = C4, 35%
- pass mark ≥ 70% with no critical fail
- rubric weights sum to 100

W18 does not duplicate W17.

| Issue | Severity | Location | Fix applied |
|---|---|---|---|
| W18-L10 (OFFSET +2 V with DC coupling) showed "Trig?" with no explanation, and its `couplingIs` check never verified that the offset was set. In the model, DC coupling with +2 V offset gives a 0…4 V wave, so trigger level 0 V sits exactly on the bottom peak and the scope cannot trigger. | major | lab tasks W18-L10 | Split into two tasks. L10 is `genSet {square, 4 Vpp, offset 2}` with a hint explaining "Trig?" and the remedy (LEVEL ≈ +2 V, or AC coupling). New W18-L13 is `couplingIs AC` with a hint. Verified with tsx: DC at 0 V does not trigger; DC at 2 V triggers; AC at 0 V triggers. Updated the lab instructions to match. |
| Safety list allowed "แหล่งจ่าย ≤ 30 V DC ในใบงาน", above the 24 V ceiling for student hands-on work. | major | `safety[4]` | Changed to ≤ 12 V DC in worksheets, noting the 24 V student ceiling even though the supply can reach 30 V. |
| E08's check said V_R is "เล็กกว่าครึ่งของขาเข้า", but 2.13 Vpp is more than half of 4 Vpp. | minor | W18-E08 `check` | Reworded: V_R/V_in = 0.53, which is below 0.707, with a phase above 45°. |
| W18-F14's critical-fail list omitted "ต่อสโคปกับไฟบ้าน", which the table and procedure both include. | minor | figures/w18.tsx F14 and its alt text | Added the item and re-rendered. |
| The lab `default` preset is already sine 1 kHz 4 Vpp, 1 V/div, 0.2 ms/div with trigger at 0 V, so L01–L05 pass without any student action. | minor | lab preset / tasks L01–L05 | **Unresolved.** It needs a lab-side preset change (for example, a deliberately mis-set preset), which is outside the W13–W18 file scope. |

## Resource URL verification (WebFetch, all live)

- **allaboutcircuits.com textbook:** semiconductors, experiments, digital (includes Ladder Logic and Relays), direct-current (includes ch. 8 DC Metering Circuits), alternating-current (includes ch. 1 Basic AC Theory).
- **SparkFun Learn:** diodes, LEDs, transistors, through-hole soldering, working-with-wire, breadboard, schematic, polarity, PWM, motors, multimeter, power-a-project, oscilloscope, AC vs DC.
- **electronics-tutorials.ws:** diode_1 ("Semiconductor Basics"), PWM motor control.
- **PhET:** Faraday's lab, CCK DC, CCK AC.
- **Other:** falstad.com/circuit, kicad.org, docs.kicad.org (new), iec.ch.

No URLs were invented.

## Unresolved

1. The W18 lab default preset makes L01–L05 trivially satisfied. This is a lab-side change.
2. Optional: rebalance the W16 quiz pool toward 5/7/10/6/2.
