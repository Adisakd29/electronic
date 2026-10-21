# EEE/QA Independent Review — Weeks 7–12 (20100-1005)

Scope: `src/content/weeks/w07–w12.ts`, `src/content/figures/w07–w12.tsx`.
Method: every numeric claim recomputed by script (74 checks, 0 failures); quiz keys/distractors/feedback read item-by-item; lab targets cross-checked against `src/labs/*/model.ts`; figures rendered via `scripts/render-figures.tsx` and inspected (incl. hotspot coordinates); resources fetched with WebFetch.
Post-fix: `validate-content --week 7..12` → 0 errors / 0 warnings; `scripts/tc.sh` clean for all six pairs.

## Week 7 — Resistors
| issue | severity | location | fix applied |
|---|---|---|---|
| Grey band ±0.05% presented without noting IEC 60062:2016 reassigned orange ±0.05% (W), yellow ±0.02% (P), grey ±0.01% (L) | minor | w07.ts S05 | Added "standard" callout explaining legacy EIA vs IEC 2016 |
| Lab assumption on TCR worded inaccurately | minor | w07.ts lab assumptions | Reworded to accurate statement |
| Typo "miskonception" + teacher note on grey band | minor | w07.ts teacherNotes | Fixed typo, rewrote note |

## Week 8 — Capacitors
| issue | severity | location | fix applied |
|---|---|---|---|
| "100 µF"/"25 V" labels clipped on can body | minor | figures/w08.tsx ElectrolyticCutaway (W08-F02) | Moved labels x 88→108 |
| "ขายาว = +" label cut at left edge | minor | figures/w08.tsx W08-F02 | Re-anchored centred at (100,410) |

## Week 9 — Inductors
| issue | severity | location | fix applied |
|---|---|---|---|
| Q25 option d feedback mis-described failure mode | minor | w09.ts Q25 | Corrected: diode C→ground conducts >~0.7 V, latches relay ON, no freewheel path |
| SparkFun "Inductors" resource dead (fetch error) | major | w09.ts resources | Replaced with OpenStax UP2 §14.4 RL Circuits (verified) |

## Week 10 — Transformers
| issue | severity | location | fix applied |
|---|---|---|---|
| L09 dot-test prompt did not match lab model (Vtest = Vp ± Vs) | minor | w10.ts lab task L09 | Prompt now sets Vp = 12 V, Np = Ns (1:1) before toggling additive/subtractive |
| I15 explanation omitted that capacitor-input rectifiers raise winding RMS current above Idc | minor | w10.ts I15 | Added note + link to W13 |
| I₁ arrow label overlapped wire | minor | figures/w10.tsx W10-F13 | labelOffset [0,-20]→[0,-38] |
| SparkFun "Transformers" resource dead (fetch error) | major | w10.ts resources | Replaced with OpenStax College Physics 2e §23.7 Transformers (verified) |

## Week 11 — Switches & Relays
| issue | severity | location | fix applied |
|---|---|---|---|
| No errors found (numbers, quiz keys, relay pull-in/drop-out, COM/NO/NC, SSR, figures, hotspots verified) | — | — | none |

## Week 12 — Microphones & Speakers
| issue | severity | location | fix applied |
|---|---|---|---|
| Resource linked to PhET homepage (non-specific) | minor | w12.ts resources | Replaced with PhET "Waves Intro" (Sound screen) (verified) |
| Activity W12-A03 typed "demo" though students perform it (S2) | minor | w12.ts W12-A03 | type → "bench" |

## Unresolved
- AllAboutCircuits URLs in W07–W12 could not be verified (WebFetch blocked: PROVENANCE_REQUIRED). Left in place; verify manually.
- Course + resistor lab model + W07-F04 still use legacy EIA grey = ±0.05%; documented via callout, lab model outside edit scope.
- WEEK_SPECS (docs) still lists the dead SparkFun inductor/transformer links — outside edit scope.
- Cosmetic: Thai sara-am glyph rendering in resvg PNGs (renderer issue, not content).
