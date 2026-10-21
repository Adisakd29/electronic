# Final QA review — randomised exercises, formulas/standards, safety-model wording

Reviewer: independent EE instructor (final targeted pass). Date: 2026-10-17.
Scope: `src/content/weeks/w01–w18.ts`, `src/labs/ohms/{assumptions.ts,Lab.tsx,Stage.tsx}`.
Earlier reviews (`REVIEW_W01-06.md`, `REVIEW_W07-12.md`, `REVIEW_W13-18.md`) were read first; nothing they already checked was repeated except where the new randomisation changed it.

Post-fix status: `validate-content.ts --all` → 0 errors, 0 warnings · `tsc --noEmit` clean · `vitest run` 431/431 passed. No lab model was edited. Nothing committed.

## 1. Randomised exercises (`vars` + `formula`)

Method: script (`npx tsx`, kept in the session scratchpad) that loads every week, and for every fill interaction with `vars` evaluates each field `formula` and every `commonErrors[].formula` at the defaults, at all 2ⁿ min/max corners, and over the full step grid (capped at 20 000 deterministic samples). Checks: (a) formula(defaults) vs fixed `answer` within the field tolerance; (b) finiteness, sign, physical range per unit; (c) commonError formulas evaluate everywhere and whether they coincide with the correct answer; (d) rounding — whether a student who rounds to the decimals the prompt asks for (or 1/2/3 decimals when the prompt is silent) still lands inside `tolerance`/`absTolerance`; also `default`/`max` on the step grid and `decimals` ≥ step decimals.

| | count |
|---|---|
| exercises with `vars` | 83 |
| fields with `formula` | 185 |
| commonError formulas | 242 |
| (a) default mismatches | 0 (largest deviation 0.26 % on W03-I19.a / W03-I27.i, inside the 1 % tolerance) |
| (b) non-finite / negative / out-of-range results | 0 non-finite, 0 impossible negatives; 3 ranges judged physically unreasonable and narrowed (LED > 40 mA, MCU base current 12 mA, tiny ripple) |
| (c) commonError evaluation failures | 0; 38 formulas coincide with the correct answer on some draws (e.g. R₁ = R₂ in a divider, I_p = 1 A so I_s = n). Harmless because the grader tests "correct" first; listed as an open item |
| (d) rounding breaks tolerance | 26 fields; 22 fixed by `absTolerance` = ½ of the requested decimal place and/or range narrowing; 4 left (exact 0.xx5 cases or 3-decimal/mJ/mN answers, see open items) |
| exercises edited | 21 (24 field/var edits) |

Grid/`decimals` sanity: every `default` and `max` sits on the step grid; no `decimals` is smaller than the step needs, so the shown value always equals the drawn value.

## 2. Formulas and standards

Grepped and read every occurrence; all statements below were found correct unless listed in the fix table.

- Ohm's law, prefixes (W03), power P = VI = I²R = V²/R, energy kWh and cost (W03, W05) — correct.
- KVL/KCL: W04 uses "sum of drops = EMF" around the loop with + on the current-entry side (F12: 3.98 + 3.98 + 2.03 ≈ 10 V); I22 uses V₃ = E − V₁ − V₂ and I₃ = I_T − I₁ − I₂ — consistent.
- Series/parallel: product-over-sum is explicitly limited to two resistors in W04 (S-text, Q feedback, misconception list) and W09 (inductors) — correct.
- RC: τ = RC, 63.2/86.5/95.0/98.2/99.3 % and 36.8 % discharge, 5τ (W08); RL τ = L/R (W09) — correct. W08-Q30 (25 V → 9.2 V after 1τ, 0.17 V at 5τ) checks.
- Transformer: V_p/V_s = N_p/N_s = I_s/I_p (ideal), VA, efficiency, "no DC" callout, DC-pulse dot test only (W10) — correct.
- Diode/rectifier: Si 0.7 V, Ge noted; V_dc = 0.318 V_p (half) / 0.636 V_p (full/bridge); ripple f = 50 Hz half-wave, 100 Hz full-wave/bridge; V_r ≈ I/(f_r C) with the right f_r in W13-I14 and the lab challenge L17 — correct.
- Transistor: I_E = I_B + I_C, β = I_C/I_B, α; saturation/cut-off; NPN/PNP (W13, W15) — correct. (W13-I19 tolerance tightened so that forgetting "+ I_B" is no longer accepted at high β.)
- Multimeter: series for A, parallel for V, Ω only unpowered (W04/W07/W17), IEC 61010 CAT table (CAT III 600 V ≡ CAT IV 300 V impulse 6 kV — checked against the 61010 table), 2000/4000 counts and ±(% + counts) (W17) — correct.
- Oscilloscope: V/div, time/div, V_pp/V_p, V_rms = V_p/√2 **sine only**, square = V_p, triangle = V_p/√3, misconception callout (W18) — correct.
- Thai wire colours: brown L1, black L2, grey L3, blue N, green-yellow PE (มอก. 11-2553 / IEC) in W01 table+figure, W05 — correct. Added the old-standard note (มอก. 11-2531: black L, white/grey N; grey is now L3) to W01 and W05 — verified with Schneider Electric TH FAQ FA283236 (se.com/th/en/faqs/FA283236). No reference to a "วสท. 2564" edition was added because I could not verify the exact edition text online.
- 230/400 V 50 Hz: the only "220 V" left is a deliberate common-error feedback in W01-I17.
- Safety: IEC 60479-1 table in W01 (0.5 mA perception, ≈10 mA let-go, VF risk from several tens of mA, all labelled approximate), RCD 30 mA (≤300 ms, 5×IΔn ≤40 ms in W06), lockout, 1669, C-A-B CPR 100–120/min, 5–6 cm, 30:2, AED (W02) — consistent with the earlier reviews and with the RCD rationale (ipd.com.au/why-30ma-and-300ms).

## 3. Safety-lab disclaimer (ohms `body` preset, W01/W02)

All places already said "แบบจำลองเพื่อการศึกษา ไม่ใช่การรับประกันความปลอดภัย". None said that it is **not a prediction of the effect on a real person**. Added "ไม่ใช่พิกัดความปลอดภัย และไม่ใช่การทำนายผลที่จะเกิดกับบุคคลจริงอย่างแม่นยำ" (plus "ห้ามทดลองกับร่างกายตนเองหรือผู้อื่น" in the lab assumptions) to: `src/labs/ohms/assumptions.ts`, `Lab.tsx` (danger notice), `Stage.tsx` (SVG caption, now two lines; stage height 452→470, re-rendered and checked), W01 lab assumptions, W01 embedded lab text, W01-I05 and W01-I22 explanations, W02 lab assumptions, W02-I18 explanation.

## 4. Live-mains / self-testing instructions

Scanned every non-S3 activity (procedure + equipment) and every step procedure for 230 V / เต้ารับ / ไฟบ้าน with วัด/แตะ/เสียบ, and all content for ตัวเอง/ตนเอง/ลิ้น. Hits were all unpowered inspections (W01-A02/A04), de-energised winding checks (W10-A01), teacher-shown or enclosed-equipment steps (W10-A02, W12-A03, W18-S03 plugging in an earthed instrument). W05-A04 (tester proving) was already fixed in the first review. The W12-I24 speaker-polarity "9 V" case is a calculation showing why only a 1.5 V cell is used. **No change needed.**

## Fix table

| file | id | what | why |
|---|---|---|---|
| w01.ts | W01-I05.f4 | `absTolerance: 0.005` | prompt asks 2 decimals; 0.115 mA → "0.12" failed the 2 % tolerance |
| w03.ts | W03-I19.a | `absTolerance: 0.005` | 2-decimal rounding of 0.3–0.5 mA results exceeded 1 % |
| w03.ts | W03-I27.i | `absTolerance: 0.005` | same |
| w04.ts | W04-I05.i | `absTolerance: 0.005` | same (0.39 mA cases) |
| w04.ts | W04-I07.i3, it | `absTolerance: 0.05` | prompt asks 1 decimal; 0.6 mA … rounding exceeded 1 % |
| w05.ts | W05-I09.I | `absTolerance: 0.005` | 2 decimals requested; 0.43 A case |
| w07.ts | W07-I10.P | `absTolerance: 0.0005` | prompt asks 3 decimals; 0.0095 W → "0.010" failed |
| w07.ts | W07-I18.dR | `absTolerance: 0.005` | 0.025–0.1 Ω results vs 1 % |
| w08.ts | W08-I06 | `C.min` 10 → 100 µF | Q as small as 0.03 mC could not be rounded sensibly |
| w08.ts | W08-I15.v2 | `absTolerance: 0.005` | 2 decimals requested; 0.19 V cases |
| w09.ts | W09-I03.w | `absTolerance: 0.0005` (J) | energies down to 0.6 mJ |
| w09.ts | W09-I12.f1 | `absTolerance: 0.005` | 2 decimals requested; L = 1 mH → 0.314 Ω |
| w09.ts | W09-I23.tau | `absTolerance: 0.005` | τ as low as 0.1 ms |
| w11.ts | W11-I14.p | `absTolerance: 0.005` | coil power down to 0.018 W |
| w12.ts | W12-I15.l | `absTolerance: 0.005` | 2 decimals requested; 0.08–0.13 mH results |
| w13.ts | W13-I14 | `I.min` 10→20 mA, `C.max` 4700→3300 µF | ripple 0.02 V not expressible to 2 decimals within 3 % |
| w13.ts | W13-I19.ie | `tolerance` 0.004 → 0.002 | at β ≥ 250 the "forgot + I_B" error fell inside 0.4 %; answers are exact to 2 decimals so 0.2 % is safe |
| w13.ts | W13-I24 | `Rc.min` 100 → 200 Ω | I_C up to 238 mA and I_B 11.9 mA from a 3.3 V MCU pin were unrealistic |
| w15.ts | W15-I05 | `Vcc.max` 12→9 V, `Rc.min` 220→330 Ω | LED current reached 44.6 mA (> 20–30 mA rating) in a non-overload question |
| w15.ts | W15-I11 | `C.min` 1→10 µF; `f.absTolerance: 0.005` | T = 14 ms / f with 4 sig. figs not reproducible to 2 decimals within 3 % |
| w15.ts | W15-I16.ib | `absTolerance: 0.0005` (mA) | I_B down to 0.043 mA |
| w16.ts | W16-I06 | `B.min` 0.1→0.2 T, `L.min` 1→5 cm; `f1,f2.absTolerance: 0.0005` N | forces down to 0.5 mN |
| w17.ts | W17-I26.ib | `absTolerance: 0.005` | 0.185 A → "0.19" failed 2 % |
| w01.ts | W01 S-table (wire colours) | added `note` on มอก. 11-2531 colours | grey was N under the old standard and is L3 now (safety) |
| w05.ts | W05 S02 md | old-standard note expanded (black L, white/grey N) | same |
| labs/ohms/assumptions.ts | body preset | "ไม่ใช่พิกัดความปลอดภัย และไม่ใช่การทำนายผล…บุคคลจริง" | §3 |
| labs/ohms/Lab.tsx | SimNotice | same wording | §3 |
| labs/ohms/Stage.tsx | body caption | two-line caption, H 452→470 | §3 (rendered: `.figcheck/lab-ohms/body.png`) |
| w01.ts | lab.assumptions, lab md, I05, I22 | same wording (+ no self-testing) | §3 |
| w02.ts | lab.assumptions, I18 | same wording (+ no self-testing) | §3 |

## Open items (not changed)

1. 38 commonError formulas coincide with the right answer on specific draws (R₁ = R₂, D = 50 %, I_p = 1 A, CV/CC boundary in W17-I26). The student is marked correct, so no harm; a future improvement would draw dependent variables so that distractors never equal the key.
2. Four fields still fail a strict "round to 2 decimals" test only at exact x.xx5 values (W12-I04 λ = 0.245 m, W13-I14 V_r = 0.125 V) or because the natural answer has 3 decimals/sub-units (W09-I03 J→mJ, W16-I06 N→mN, W15-I16 mA→µA); altUnits exist, so left as is.
3. Randomised prompts substitute values, but the worked numbers inside `explanation` texts are the default-case numbers (every one checked says "ค่าเริ่มต้น"/"โจทย์ตั้งต้น"). Acceptable; a per-draw explanation would need formula support in the schema.
4. IEC 60479-1 zone boundaries in W01-T01 are given as approximate ranges (0.5 mA, ≈10 mA, tens of mA for VF); the exact curve values are not reproduced because the standard text could not be fetched. Consistent with the 30 mA RCD rationale.
5. The wire-colour text cites มอก. 11-2553; it does not cite the วสท. installation standard edition (2564) because I could not verify the edition online.
6. From the first review: the W18 lab default preset still satisfies L01–L05 without action (lab-side).

Sources consulted: se.com/th/en/faqs/FA283236 (TIS 11-2553 vs 11-2531 colours), electrical-installation.org/enwiki/Electric_shock and ipd.com.au/why-30ma-and-300ms (IEC 60479-1 zones, 30 mA/300 ms).
