# Virtual Lab Specification

This file is the contract between **lab developers** (who implement `src/labs/<id>/`) and **content authors** (who reference labs in `Week.lab` and `{type:"lab"}` blocks).

* All state values use **SI base units** (V, A, Ω, F, H, s, Hz, W, rad/s) unless the field name says otherwise (e.g. `rpm`, `percent`).
* Every check takes `params` exactly as listed. `tol` is **relative** (0.05 = 5 %) unless named `absTol`. Defaults in brackets.
* Every lab must offer the preset `default`. Unknown preset → `default`.
* Every lab must show an **"ข้อสมมติและขอบเขตความแม่นยำ"** (assumptions) panel and never show results that contradict engineering principles (e.g. no current with an open switch; LED does not light reverse-biased).
* Labs are **simulations only**. Where a lab shows mains (230 V) quantities it carries a visible note that real mains work is teacher-demonstration only (S3).
* Accessibility: every control is a native input (range/number/select/button/radio) with a Thai label; readouts are text (not only graphics); colour is never the only signal; works at 360 px width; keyboard operable.
* Numbers are formatted with engineering prefixes (`formatSI(0.0123,"A") → "12.3 mA"`) using `src/labs/shared/format.ts`.

Shared UI kit (`src/labs/shared/`): `LabShell` (title + controls column + stage + readouts), `Slider` (with numeric input, unit, log option), `Select`, `Toggle`, `Readout` (big mono value + label), `Meter` (analog/digital look), `Plot` (SVG line plot with axes, ticks, multiple series, cursor), `Wire`/`Battery`/`Resistor` SVG primitives, `formatSI`, `parseSI`. Labs must use the kit for visual consistency.

---

## 1. `circuit` — DC Circuit Simulator (ห้องทดลองวงจรไฟฟ้ากระแสตรง)

Battery (0–24 V, step 0.5) feeding up to three resistors (1 Ω – 100 kΩ each, E12 picker + free entry) in a chosen topology, a switch, live ammeter/voltmeter readouts at marked points, animated conventional-current dots (speed ∝ current, direction + → −). Optional fault injection for troubleshooting.

**Topologies:** `single` (R1) · `series` (R1–R2–R3) · `parallel` (R1‖R2‖R3) · `mixed` (R1 in series with R2‖R3). An optional **lamp load** mode replaces R1 with a 12 V lamp (fixed hot resistance 24 Ω, rated 6 W; glow brightness ∝ P/6 W, overload warning > 1.2× rating).

**Faults** (preset or teacher toggle): `none`, `open1|open2|open3` (R removed, infinite R), `short1|short2|short3` (R ≈ 0.01 Ω). With a short that leaves the battery shorted the sim shows "ลัดวงจร – แหล่งจ่ายจำกัดกระแส" and clamps the supply to a 3 A current limit (models a bench supply with current limit); internal resistance otherwise 0.

**Troubleshooting mission ("ห้องทดลองวงจรขัดข้อง")** — when a fault is *hidden* (`fault-open`, `fault-short`, "สุ่มจุดเสียใหม่" or the teacher toggle) the per-resistor table is hidden and the learner works like a technician:
1. **Symptom** (`symptom`, shown on the stage and as a notice): derived by comparing the faulty circuit with the healthy one — "กระแสรวมเป็นศูนย์ ทั้งที่สวิตช์ ON" / "หลอดไม่ติด" / "กระแสรวมสูงกว่าที่คำนวณ…" / "หลอดสว่างผิดปกติ" / "กระแสรวมต่ำกว่า…" / "แหล่งจ่ายเข้าโหมดจำกัดกระแส 3 A". Never names the component or the kind of fault. `null` when no active fault is hidden; with the switch OFF it asks to close the switch.
2. **Measurement log** (`measurements`): every time the learner places the probes on a *new* node pair (voltmeter selects or the "คร่อม R…" buttons) or presses "อ่านแอมมิเตอร์" an entry `{ kind: "V"|"I", where: "A–B" | "ammeter", value }` is appended. De-duplicated: the same pair either way round, or a second ammeter reading, is not counted again. Cleared when the fault changes.
3. **Diagnosis** ("วินิจฉัย"): the learner picks component (R1–R3 / หลอด) + kind (ขาด/ลัด). The model records `diagnosis = { guess: "open2", correct, measurementsBefore }` where `measurementsBefore` is the number of distinct measurements at that moment. A wrong guess gives a hint; "ซ่อม" is enabled only after a correct diagnosis and then sets `fault = "none"`.
4. **"สุ่มจุดเสียใหม่"**: draws a new hidden fault for the current topology from a seeded PRNG (mulberry32; the seed advances per click, so the sequence is deterministic in tests), never `none` and never the same fault twice in a row, closes the switch and clears the log/diagnosis.

**State**
```ts
{ topology: "single"|"series"|"parallel"|"mixed"; V: number; R: [number,number,number];
  lamp: boolean; switchClosed: boolean; fault: string;
  Req: number;            // Ω (Infinity when open)
  I: number;              // total current, A
  VR: [number,number,number]; IR: [number,number,number]; PR: [number,number,number];
  P: number;              // total power, W
  currentLimited: boolean;
  // troubleshooting mission
  faultHidden: boolean;   // a fault is present and not revealed
  symptom: string | null; // see above
  measurements: { kind: "V"|"I"; where: string; value: number }[];
  diagnosis: { guess: string; correct: boolean; measurementsBefore: number } | null }
```
**Presets:** `default` (series 12 V, 100/220/330 Ω) · `series-basic` · `parallel-basic` · `mixed-basic` (12 V, R1 100 Ω, R2 = R3 = 200 Ω) · `lamp` (12 V, lamp) · `fault-open` (series, open2 hidden — learner must locate) · `fault-short` (series, short3 hidden) · `kvl` (series 9 V, 1k/2.2k/3.3k) · `kcl` (parallel 12 V, 1k/2k/4k).

**Checks**
| key | params | true when |
|---|---|---|
| `topology` | `{ is }` | topology === is |
| `totalCurrent` | `{ target, tol? [0.03] }` (A) | switch closed and I ≈ target |
| `req` | `{ target, tol? [0.03] }` (Ω) | Req ≈ target |
| `voltageAcross` | `{ index (1–3), target, tol? }` | VR[index-1] ≈ target |
| `branchCurrent` | `{ index, target, tol? }` | IR[index-1] ≈ target |
| `powerBelow` | `{ index, max }` (W) | PR[index-1] ≤ max |
| `switchOpenNoCurrent` | `{}` | switchClosed === false and I === 0 |
| `faultCleared` | `{}` | fault === "none" (learner repaired it via the "ซ่อม" button after a correct diagnosis) |
| `faultDiagnosed` | `{ minMeasurements? [2] }` | diagnosis.correct and diagnosis.measurementsBefore ≥ minMeasurements |
| `measured` | `{ min }` | ≥ min distinct measurements logged (node pairs + ammeter) |

## 2. `ohms` — Ohm's Law Laboratory (ห้องทดลองกฎของโอห์ม)

Two sliders V and R (R log scale), computed I and P, virtual ammeter (in series) and voltmeter (in parallel) drawn on a schematic, live V–I plot. "บันทึกจุด" records (V, I) points; the plot shows recorded points and the line I = V/R for the current R (slope 1/R). A "ล็อกตัวแปร" selector lets the learner hold one quantity and solve for another (fill in a value, sim shows result).

**Ranges:** default V 0–30 V, R 10 Ω–10 kΩ. Preset `body`: V 0–400 V, R 500 Ω–1 MΩ, plus an IEC-effects band under the current readout (0.5 mA perception, 10 mA let-go, 30 mA RCD, ~50–80 mA VF risk) clearly labelled "ค่าประมาณจาก IEC 60479-1".

**State** `{ V, R, I, P, points: {V:number; I:number; R:number}[], preset: string }`

**Presets:** `default` (12 V, 1 kΩ) · `body` · `power` (adds P–V plot, V 0–24, R 10–1000 Ω) · `led-resistor` (V 5 V, R 100–1000 Ω; shows I in mA for LED sizing).

**Checks**
| key | params | true when |
|---|---|---|
| `currentEquals` | `{ target, tol? }` (A) | I ≈ target |
| `setVR` | `{ V, R, tol? [0.02] }` | V≈ and R≈ |
| `pointsRecorded` | `{ min, sameR? (bool) }` | ≥ min points (optionally all with the same R) |
| `distinctR` | `{ min }` | recorded points cover ≥ min distinct R values |
| `bodyCurrentBelow` | `{ max }` (A) | I ≤ max |
| `powerEquals` | `{ target, tol? }` (W) | P ≈ target |

## 3. `color-code` — Resistor Colour Code (ฝึกอ่านแถบสีตัวต้านทาน)

Large drawn resistor with 4, 5 or 6 bands (IEC 60062). Each band selectable from valid colours for its position (digit / multiplier incl. gold ×0.1 & silver ×0.01 / tolerance incl. none=±20 % for 3-band reading / tempco ppm/K for band 6). Shows nominal value with SI prefix, tolerance, min–max range and whether it is an E12/E24/E96 standard value. Modes: `read` (bands → value), `make` (target value → learner sets bands), `quiz` (random resistor, learner types value + tolerance; tracks streak), `smd` (3-digit, 4-digit, R-notation e.g. 4R7, and EIA-96 code decoder).

**State** `{ mode, bandCount: 4|5|6, bands: string[] /* colour names en: "black"… */, value: number /* Ω */, tolerance: number /* percent */, tempco?: number, isStandard: boolean, series?: "E12"|"E24"|"E96", quiz: { correct: number; attempts: number; streak: number }, smd?: { code: string; value: number } }`

**Presets:** `default` (read, 4-band, yellow-violet-red-gold = 4.7 kΩ ±5 %) · `make` · `quiz` · `five-band` · `smd`.

**Checks**
| key | params | true when |
|---|---|---|
| `valueEquals` | `{ target, tol? [0.001] , bandCount? }` | value ≈ target (and bandCount matches if given) |
| `toleranceEquals` | `{ percent }` | tolerance === percent |
| `quizStreak` | `{ min }` | quiz.streak ≥ min |
| `quizCorrect` | `{ min }` | quiz.correct ≥ min |
| `smdValue` | `{ target, tol? }` | smd.value ≈ target |

## 4. `capacitor` — RC Charge/Discharge (ห้องทดลองการประจุ–คายประจุตัวเก็บประจุ)

Source V (1–24 V), R (100 Ω–1 MΩ), C (1 µF–4700 µF). Switch positions: `charge` (via R to source), `discharge` (via R to 0 V). Animated time with play/pause/reset and speed (×1, ×0.1, ×10); Plot of v_C(t) and i(t) with τ markers (1τ…5τ) and a draggable cursor showing t, v_C, % of V. Exact exponential model. Second tab **"ต่อหลายตัว"**: C1, C2, (C3) in series/parallel → C_eq, and charge/voltage share in series.

**State** `{ V, R, C, tau, mode: "charge"|"discharge", t /* s since switch */, vc, ic, percent /* vc/V*100 for charge, remaining % for discharge */, combo: { type: "series"|"parallel", C: number[], Ceq: number } }`

**Presets:** `default` (9 V, 10 kΩ, 100 µF → τ = 1 s) · `slow` (1 MΩ, 10 µF → τ = 10 s) · `combo-series` · `combo-parallel`.

**Checks**
| key | params | true when |
|---|---|---|
| `tauEquals` | `{ target, tol? }` (s) | tau ≈ target |
| `reachedPercent` | `{ percent, mode? }` | in given mode, percent ≥ given (charge) — e.g. 63 at 1τ |
| `setRC` | `{ R, C, tol? [0.02] }` | R≈ and C≈ |
| `comboEquals` | `{ target, tol?, type? }` (F) | combo.Ceq ≈ target |

## 5. `inductor-transformer` — Inductor & Transformer (ตัวเหนี่ยวนำและหม้อแปลง)

**Tab inductor:** solenoid with turns N (10–1000), length l (1–20 cm), coil diameter (0.5–5 cm), core (air μr=1, ferrite μr≈200 (simplified), iron μr≈1000 (simplified, ignores saturation)). Field-line drawing density ∝ B. L = μ0 μr N² A / l. Current I slider (0–2 A) shows B = μ0 μr N I / l (long-solenoid approximation, flagged as approximation for short coils). Frequency f (50 Hz–100 kHz) → X_L = 2πfL. RL switch-on: series R (1–1000 Ω), V → i(t) = V/R (1 − e^(−t/τ)), τ = L/R, plot. Shows back-EMF note.

**Tab transformer:** Np, Ns (10–2000), Vp (AC rms, 6–240 V, default 230 V labelled "แบบจำลองเท่านั้น"), load R (1 Ω–10 kΩ or open), efficiency η (ideal 100 % or 80–99 %). Vs = Vp·Ns/Np, Is = Vs/R, Ip = (Vs·Is)/(η·Vp). Shows step-up/step-down/isolation (1:1) label, animated flux in laminated core, primary/secondary power. Dot-convention/polarity mini-diagram with additive/subtractive toggle.

**State**
```ts
{ tab: "inductor"|"transformer";
  inductor: { N, l, d, A, mur, core, L, I, B, f, XL, R, V, tau, t, i };
  transformer: { Np, Ns, Vp, Rload /* Infinity for open */, eta, Vs, Is, Ip, Ps, Pp, ratio /* Np/Ns */, type: "step-up"|"step-down"|"isolation" } }
```
**Presets:** `default` (inductor: 200 turns, 5 cm, 1 cm dia, air) · `iron-core` · `rl-time` · `transformer` (230 V, 1000:52 ≈ 12 V, 12 Ω load) · `step-up`.

**Checks**
| key | params | true when |
|---|---|---|
| `inductanceEquals` | `{ target, tol? [0.05] }` (H) | inductor.L ≈ target |
| `xlEquals` | `{ target, tol? }` (Ω) | inductor.XL ≈ target |
| `tauEquals` | `{ target, tol? }` (s) | inductor.tau ≈ target |
| `turnsRatio` | `{ ratio, tol? [0.02] }` | transformer.ratio ≈ ratio |
| `secondaryVoltage` | `{ target, tol? }` (V) | transformer.Vs ≈ target |
| `secondaryCurrent` | `{ target, tol? }` (A) | transformer.Is ≈ target |
| `stepType` | `{ type }` | transformer.type === type |

## 6. `relay` — Relay Simulator (ห้องทดลองรีเลย์)

Low-voltage training board drawn as a schematic. Coil side: 12 V supply, input switch or push button, relay coil (default 400 Ω → 30 mA), optional **NPN driver** (Vin 0/5 V, R_B, β=100, V_BE 0.7 V, V_CE(sat) 0.2 V) and **flyback diode** toggle. Contact side: SPDT COM/NO/NC with two 12 V lamps (NO lamp green, NC lamp red, also text "ติด/ดับ"). Pull-in voltage 75 % of rated, drop-out 10 % (adjustable supply 0–15 V demonstrates). **Mode latch:** START (NO push button) + STOP (NC push button) + relay holding contact in parallel with START → self-holding; overload contact (NC) optional. With flyback diode OFF, releasing the coil shows a transient spike readout (illustrative value, e.g. "> 100 V spike") with warning; with diode ON spike clamps to ≈ 0.7 V above supply.

**State** `{ mode: "basic"|"driver"|"latch"; supplyV; coilR; coilI; energized: boolean; inputOn: boolean; lampNO: boolean; lampNC: boolean; flyback: boolean; lastSpikeV: number; latched: boolean; driver?: { Vin, Rb, beta, Ib, IcNeeded, IcMax, saturated: boolean } }`

**Presets:** `default` (basic, 12 V, 400 Ω) · `driver` (Vin 5 V, R_B 1 kΩ) · `latch` · `undervoltage` (supply slider exposed from 0 V).

**Checks**
| key | params | true when |
|---|---|---|
| `lampOn` | `{ which: "NO"|"NC" }` | that lamp is lit |
| `energized` | `{ value: bool }` | energized === value |
| `latched` | `{}` | mode latch and latched (relay holding after START released) |
| `flybackEnabled` | `{}` | flyback === true |
| `transistorSaturated` | `{}` | driver.saturated |
| `coilCurrentEquals` | `{ target, tol? }` (A) | coilI ≈ target |

## 7. `semiconductor` — Semiconductor Laboratory (ห้องทดลองอุปกรณ์สารกึ่งตัวนำ)

**Tab diode:** series circuit Vs (−10…+10 V), R (100 Ω–10 kΩ), diode material Si/Ge/Schottky; solves operating point with Shockley equation (Is, n per material; solved numerically) and shows the I–V curve with load line and Q-point; forward vs reverse bias indicator. **Tab LED:** colour (IR 1.3 V, red 1.9–2.0, yellow 2.0–2.1, green 2.1–3.0 (choose "standard green 2.1" and "true green 3.0"), blue 3.0, white 3.1 V typical at 20 mA), Vs, R → I_F = (Vs − V_F)/R (piecewise model, 0 if Vs < V_F), brightness ∝ I_F up to 20 mA rated; > 30 mA shows "เกินพิกัด – LED เสีย" and LED becomes dark (burnt) until reset; reverse = off. **Tab rectifier:** half-wave / full-wave centre-tap / bridge, Vsec rms (6–24 V), Si drops (0.7 V per conducting diode), load R, filter C (0 = none). Shows waveform plot (input, output) over 2 cycles at 50 Hz, V_DC (no filter: 0.318·Vp(out) half, 0.636·Vp(out) full), ripple ≈ I/(f_r·C) with f_r = 50/100 Hz. **Tab BJT switch:** NPN, Vcc 5–12 V, Vin 0–5 V, R_B, R_C (or LED/relay load), β 50–300 → I_B = (Vin−0.7)/R_B (0 if Vin<0.7), I_C = min(β I_B, (Vcc−0.2)/R_C), V_CE, region `cutoff|active|saturation`.

**State** `{ tab; diode: { material, Vs, R, Id, Vd, bias: "forward"|"reverse" }; led: { color, Vf, Vs, R, If, status: "off"|"ok"|"dim"|"burnt" }; rect: { type: "half"|"center-tap"|"bridge", Vrms, Rl, C, Vp, Vdc, ripple }; bjt: { Vcc, Vin, Rb, Rc, beta, Ib, Ic, Vce, region } }`

**Presets:** `default` (diode Si 5 V 1 kΩ) · `led` (red, 5 V, 150 Ω) · `rectifier` (bridge, 12 V, 1 kΩ, no C) · `filter` (bridge, 1000 µF) · `bjt` (5 V Vin, 10 kΩ RB, 1 kΩ RC, Vcc 12 V, β 100).

**Checks**
| key | params | true when |
|---|---|---|
| `diodeForward` | `{}` | diode.bias forward and Id > 0.1 mA |
| `diodeReverse` | `{}` | diode.bias reverse |
| `ledCurrentInRange` | `{ min, max }` (A) | led.If in [min,max] and status ok |
| `ledBurnt` | `{}` | status burnt (for "what happens if" tasks) |
| `rectifierType` | `{ type }` | rect.type === type |
| `rippleBelow` | `{ max }` (V) | rect.C > 0 and ripple ≤ max |
| `bjtRegion` | `{ region }` | bjt.region === region |

## 8. `motor` — DC Motor Control (ห้องทดลองการควบคุมมอเตอร์กระแสตรง)

Permanent-magnet DC motor (12 V rated, Ra = 2 Ω, k = 0.02 V·s/rad (=N·m/A), no-load friction torque 0.005 N·m, rotor inertia small; steady-state solved, plus a short first-order spin-up animation). ω = (V_eff − I·Ra)/k, I = (T_load + T_f)/k, V_eff = duty × V. Shows rpm, current, back-EMF E = kω, input/output power, efficiency, rotor animation with direction arrow. Stall when V_eff too low → current V_eff/Ra, warns if > 3 A (overheating).
**Tab pwm:** supply 0–12 V, duty 0–100 %, PWM frequency (display only), load torque 0–0.05 N·m, PWM waveform plot.
**Tab hbridge:** four switches S1 (high-left), S2 (low-left), S3 (high-right), S4 (low-right). S1+S4 → forward (cw), S3+S2 → reverse (ccw); S1+S2 or S3+S4 → **shoot-through** short-circuit warning (motor stops, fuse icon blows until reset); all off → coast; S2+S4 → brake.
**Tab contactor:** low-voltage (24 V) control circuit diagram for start–stop with a magnetic contactor K1: STOP (NC) → START (NO) ‖ K1 holding contact (NO) → coil K1 → overload relay contact OL (95-96, NC). Main circuit drawn for a motor with OL heater. Buttons: START, STOP, "จำลองโหลดเกิน" (trips OL). Shows coil/contacts state, holding, OL reset.

**State** `{ tab; V; duty; load; rpm; omega; current; backEmf; direction: "cw"|"ccw"|"stop"; stalled: boolean; switches: [boolean,boolean,boolean,boolean]; shortCircuit: boolean; braking: boolean; contactor: { coil: boolean; holding: boolean; running: boolean; overloadTripped: boolean } }`

**Presets:** `default` (pwm, 12 V, 100 %) · `pwm` (50 %) · `hbridge` · `contactor`.

**Checks**
| key | params | true when |
|---|---|---|
| `speedAbove` | `{ rpm }` | rpm ≥ rpm and not stalled |
| `speedBetween` | `{ min, max }` | rpm within |
| `dutyEquals` | `{ percent, absTol? [1] }` | |duty·100 − percent| ≤ absTol |
| `direction` | `{ dir }` | direction === dir |
| `noShortCircuit` | `{}` | shortCircuit false |
| `braking` | `{}` | braking true |
| `motorRunningLatched` | `{}` | tab contactor, running, START not held |
| `overloadTripped` | `{}` | contactor.overloadTripped |

## 9. `multimeter` — Virtual Multimeter (มัลติมิเตอร์เสมือน)

Realistic digital multimeter face (4000-count, autorange with manual RANGE button), rotary dial positions `off | VDC | VAC | mV | ohm | continuity | diode | mA | A`, three jacks `COM`, `VΩmA`... use **`COM`, `VΩ`, `mA`, `10A`**. Learner places red/black probes on test points of a selected bench item:
`battery-9v` (9.37 V), `aa` (1.52 V), `aa-flat` (1.12 V), `resistor-unknown` (random E12, 4.7 kΩ in default), `resistor-board` (3-resistor series board with test points A–D), `diode-1n4007` (forward 0.55–0.6 V, reverse OL), `led-red` (diode test ~1.8 V, may glow dimly), `wire-good` (continuity beep), `wire-broken` (OL), `fuse-good`, `fuse-blown`, `outlet-230` (AC 229.6 V; shows CAT II/CAT III reminder and "ครูสาธิตเท่านั้น" badge), `series-circuit-current` (12 V, 1 kΩ: meter must be inserted in series → 12.0 mA), `capacitor-charged` (shows warning to discharge before Ω).
Errors simulated: voltage measured with probe in `mA`/`10A` jack → **fuse blown** (meter reads 0 for current ranges until "เปลี่ยนฟิวส์"); Ω/continuity on a live circuit → warning, no reading; wrong polarity on DC → negative sign; AC range on DC source → reads ~0; over-range → "OL"; dial `off` → blank.

**State** `{ dial; jack: "VΩ"|"mA"|"10A"; item: string; probesOn: boolean; display: string /* exactly as shown */; value: number | null /* in base unit */; unit: string; fuseBlown: boolean; polarityReversed: boolean; warnings: string[] }`

**Presets:** `default` (battery-9v, dial off) · `resistance` · `diode` · `continuity` · `current` · `mains-demo` · `troubleshoot` (resistor-board with one open resistor).

**Checks**
| key | params | true when |
|---|---|---|
| `measured` | `{ item, dial }` | probesOn on item with correct dial, correct jack, a valid reading displayed |
| `readingNear` | `{ target, tol? }` (base unit) | value ≈ target |
| `fuseIntact` | `{}` | fuseBlown false |
| `currentInSeries` | `{}` | item series-circuit-current measured on mA with correct insertion |

## 10. `oscilloscope` — Virtual Oscilloscope + Function Generator (ออสซิลโลสโคปเสมือน)

Two-channel scope screen (10 × 8 divisions, 5 minor ticks per div) driven by a built-in function generator: waveform `sine|square|triangle|dc`, frequency 1 Hz–100 kHz (1-2-5 steps + fine), amplitude 0.1–20 Vpp, DC offset −5…+5 V. Scope controls per channel: VOLTS/DIV (1-2-5 from 5 mV to 10 V), position, coupling AC/DC/GND, probe setting ×1/×10 (scope menu) and physical probe switch ×1/×10 (mismatch shows trace 10× too large/small — teaches the trap). TIME/DIV 1-2-5 from 1 µs to 500 ms, horizontal position, trigger source/edge/level (level outside signal range → untriggered rolling trace with "Trig?" indicator). Cursors (ΔV, Δt, 1/Δt) and an optional automatic MEASURE panel (Vpp, Vrms, freq) that can be **hidden** in practice mode. `mystery` mode hides generator settings and draws random ones so learners must read Vpp/T/f from the screen.
Ch2 optional: 12 V rms 50 Hz transformer secondary or rectifier output (links to weeks 10/13).

**State** `{ gen: { wave, freq, vpp, offset }; ch1: { voltsDiv, pos, coupling, probeMenu: 1|10, probeSwitch: 1|10 }; ch2?: {...; source}; timeDiv; trigger: { level, edge, source }; triggered: boolean; divsVertical: number /* Vpp in divisions shown */; cyclesOnScreen: number; measureVisible: boolean; mystery: boolean }`

**Presets:** `default` (sine 1 kHz 4 Vpp; 1 V/div; 0.2 ms/div) · `mystery` · `probe-trap` (probe switch ×10, menu ×1) · `square` · `rectifier` (ch2 rectifier output) · `setup` (bench left mis-set: square 200 Hz 1 Vpp, 5 V/div, 50 ms/div, probe mismatch, trigger +3 V — every setup check starts unmet).

**Checks**
| key | params | true when |
|---|---|---|
| `triggered` | `{}` | triggered true |
| `cyclesOnScreen` | `{ min [1], max [5] }` | cycles in range |
| `fitsVertically` | `{ minDiv [3], maxDiv [8] }` | divsVertical within (whole waveform on screen) |
| `probeMatched` | `{}` | probeMenu === probeSwitch |
| `genSet` | `{ wave?, freq?, vpp?, tol? [0.02] }` | generator matches given fields |
| `couplingIs` | `{ ch, coupling }` | channel coupling equals |
