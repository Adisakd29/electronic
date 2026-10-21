/**
 * Static SVG schematic for the Ohm's law lab (no hooks → usable by
 * `previewStage` and server rendering). DC source, ammeter in SERIES on the
 * top wire, resistor R, voltmeter in PARALLEL across R. Conventional current
 * leaves the + terminal, flows clockwise through A and R and returns to −.
 */
import { formatSI } from "../shared/format";
import { BODY_BANDS, BODY_THRESHOLDS, bodyBand, dotSpeed, solve, type PresetConfig } from "./model";

const W = 540;
const TOP = 56;
const BOT = 256;
const XB = 70; // battery
const XA = 200; // ammeter
const XR = 320; // resistor
const XV = 440; // voltmeter
const RT = 106; // resistor top
const RB = 206; // resistor bottom
const JT = 78; // voltmeter junctions
const JB = 234;

const ink = "var(--fig-ink)";
const muted = "var(--fig-muted)";

function MeterCircle({ x, y, letter, plusSide }: { x: number; y: number; letter: string; plusSide: "left" | "top" }) {
  const r = 20;
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="var(--fig-panel)" stroke={ink} strokeWidth={2.5} />
      <text x={x} y={y + 1} fontSize={20} fontWeight={700} textAnchor="middle" dominantBaseline="middle" fill={ink}>
        {letter}
      </text>
      {plusSide === "left" ? (
        <>
          <text x={x - r - 6} y={y - 12} fontSize={15} fontWeight={700} textAnchor="end" fill="var(--fig-plus)">+</text>
          <text x={x + r + 6} y={y - 12} fontSize={15} fontWeight={700} fill={ink}>−</text>
        </>
      ) : (
        <>
          <text x={x + r + 4} y={y - r + 2} fontSize={15} fontWeight={700} fill="var(--fig-plus)">+</text>
          <text x={x + r + 4} y={y + r + 6} fontSize={15} fontWeight={700} fill={ink}>−</text>
        </>
      )}
    </g>
  );
}

function Person({ x, y }: { x: number; y: number }) {
  // simple pictogram, 70 px tall, head at (x, y)
  const s = { stroke: ink, strokeWidth: 3, strokeLinecap: "round" as const, fill: "none" };
  return (
    <g aria-hidden>
      <circle cx={x} cy={y} r={8} fill="var(--fig-skin)" stroke={ink} strokeWidth={2} />
      <path d={`M${x} ${y + 9} V${y + 42}`} {...s} />
      <path d={`M${x - 16} ${y + 16} L${x} ${y + 22} L${x + 16} ${y + 16}`} {...s} />
      <path d={`M${x - 12} ${y + 68} L${x} ${y + 42} L${x + 12} ${y + 68}`} {...s} />
    </g>
  );
}

function BodyBandBar({ I, y0 }: { I: number; y0: number }) {
  const x0 = 30;
  const x1 = W - 30;
  const lo = -4; // 0.1 mA
  const hi = 0; // 1 A
  const sx = (a: number) => x0 + ((Math.log10(Math.max(a, 10 ** lo)) - lo) / (hi - lo)) * (x1 - x0);
  const colors = ["var(--fig-ok)", "var(--fig-warn)", "var(--fig-current)", "var(--fig-danger)", "var(--fig-danger)"];
  const short = ["ไม่รู้สึก", "รู้สึก ยังปล่อยมือได้", "เกร็ง", "RCD", "เสี่ยง VF"];
  const band = bodyBand(I);
  const mx = Math.min(x1, Math.max(x0, sx(I)));
  const by = y0 + 46;
  const bh = 30;
  const ticks: [number, string][] = [
    [0.0001, "0.1"],
    [BODY_THRESHOLDS.perception, "0.5"],
    [BODY_THRESHOLDS.letGo, "10"],
    [BODY_THRESHOLDS.rcd, "30"],
    [BODY_THRESHOLDS.vf, "50"],
    [1, "1000"],
  ];
  return (
    <g>
      <text x={x0} y={y0 + 4} fontSize={14} fontWeight={700} fill={ink}>
        ผลของกระแสต่อร่างกาย · ค่าประมาณจาก IEC 60479-1
      </text>
      <text x={x0} y={y0 + 21} fontSize={12} fill={muted}>
        AC 50 Hz มือ–เท้า ขึ้นกับเวลาและบุคคล ไม่ใช่เส้นแบ่งความปลอดภัย
      </text>
      {BODY_BANDS.map((b, i) => {
        const a = sx(Math.max(b.from, 10 ** lo));
        const e = i + 1 < BODY_BANDS.length ? sx(BODY_BANDS[i + 1].from) : x1;
        const active = b.id === band.id;
        return (
          <g key={b.id}>
            <rect x={a} y={by} width={e - a} height={bh} fill={colors[i]} fillOpacity={active ? 0.55 : 0.22} stroke={colors[i]} strokeWidth={active ? 2.5 : 1} />
            <text x={(a + e) / 2} y={by + bh / 2 + 1} fontSize={e - a < 40 ? 11 : 13} fontWeight={active ? 700 : 400} textAnchor="middle" dominantBaseline="middle" fill={ink}>
              {short[i]}
            </text>
          </g>
        );
      })}
      {ticks.map(([a, t]) => (
        <g key={t}>
          <line x1={sx(a)} x2={sx(a)} y1={by + bh} y2={by + bh + 6} stroke={muted} />
          <text x={sx(a)} y={by + bh + 19} fontSize={12} textAnchor="middle" fill={muted}>
            {t}
          </text>
        </g>
      ))}
      <text x={x1} y={by + bh + 34} fontSize={12} textAnchor="end" fill={muted}>
        กระแส (mA, สเกลลอการิทึม)
      </text>
      {/* marker */}
      <path d={`M${mx - 8} ${by - 12} L${mx + 8} ${by - 12} L${mx} ${by - 1} Z`} fill={ink} />
      <line x1={mx} x2={mx} y1={by} y2={by + bh} stroke={ink} strokeWidth={2.5} />
      <text x={x0} y={by + bh + 34} fontSize={14} fontWeight={700} fill={ink}>
        {`โซน: ${band.label}`}
      </text>
      <text x={x0} y={by + bh + 56} fontSize={13} fontWeight={700} fill="var(--fig-danger)">
        แบบจำลองเพื่อการศึกษา — ไม่ใช่พิกัดความปลอดภัย และไม่ใช่การทำนายผลต่อบุคคลจริง
      </text>
      <text x={x0} y={by + bh + 74} fontSize={13} fontWeight={700} fill="var(--fig-danger)">
        ห้ามทดลองกับไฟบ้านจริงหรือกับร่างกายคน (งานครูสาธิต S3)
      </text>
    </g>
  );
}

export function OhmsStage({ V, R, cfg, animate = false }: { V: number; R: number; cfg: PresetConfig; animate?: boolean }) {
  const { I } = solve(V, R);
  const H = cfg.body ? 470 : 290;
  const flowing = I > 1e-9;
  const speed = dotSpeed(I);
  const loop = `M${XB} 140 V${TOP} H${XR} V${BOT} H${XB} V158`;
  const iText = cfg.led ? `${(I * 1000).toFixed(1)} mA` : formatSI(I, "A");
  const rLabel = cfg.body ? "R ร่างกาย" : cfg.led ? "R จำกัดกระแส" : "ตัวต้านทาน R";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" aria-hidden>
      <style>{`@keyframes ohms-flow{to{stroke-dashoffset:-24}}@media (prefers-reduced-motion: reduce){.ohms-dots{animation:none!important}}`}</style>
      {/* wires */}
      <path d={loop} fill="none" stroke={ink} strokeWidth={2.5} strokeLinejoin="round" />
      <path d={`M${XR} ${JT} H${XV} V${150 - 20} M${XV} ${150 + 20} V${JB} H${XR}`} fill="none" stroke={ink} strokeWidth={2.5} strokeLinejoin="round" />
      {/* current-flow dots (conventional current, + → −) */}
      {flowing ? (
        <path
          className="ohms-dots"
          d={loop}
          fill="none"
          stroke="var(--fig-current)"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray="0 24"
          style={animate && speed > 0 ? { animation: `ohms-flow ${(1 / speed).toFixed(2)}s linear infinite` } : undefined}
        />
      ) : null}
      {/* junction dots for voltmeter */}
      <circle cx={XR} cy={JT} r={4.5} fill={ink} />
      <circle cx={XR} cy={JB} r={4.5} fill={ink} />

      {/* DC source */}
      <rect x={XB - 24} y={141} width={48} height={16} fill="var(--fig-bg)" />
      <line x1={XB - 24} x2={XB + 24} y1={140} y2={140} stroke={ink} strokeWidth={3} />
      <line x1={XB - 12} x2={XB + 12} y1={158} y2={158} stroke={ink} strokeWidth={6} />
      <path d={`M${XB - 30} 176 L${XB + 26} 122`} stroke={ink} strokeWidth={1.8} />
      <path d={`M${XB + 26} 122 l-10 2 l6 6 Z`} fill={ink} stroke={ink} strokeWidth={1.5} />
      <text x={XB - 30} y={134} fontSize={18} fontWeight={700} textAnchor="end" fill="var(--fig-plus)">+</text>
      <text x={XB - 30} y={170} fontSize={18} fontWeight={700} textAnchor="end" fill={ink}>−</text>
      <text x={XB + 34} y={146} fontSize={14} fill={muted}>แหล่งจ่าย DC</text>
      <text x={XB + 34} y={168} fontSize={17} fontWeight={700} fill={ink}>{formatSI(V, "V")}</text>

      {/* current direction arrow */}
      {flowing ? (
        <g>
          <path d={`M${XB + 40} ${TOP} l-11 -7 v14 Z`} transform={`translate(22 0)`} fill="var(--fig-current)" />
          <text x={XB + 50} y={TOP - 12} fontSize={15} fontWeight={700} fill="var(--fig-current)" textAnchor="middle">I</text>
        </g>
      ) : null}

      {/* ammeter in series */}
      <rect x={XA - 22} y={TOP - 4} width={44} height={8} fill="var(--fig-bg)" />
      <MeterCircle x={XA} y={TOP} letter="A" plusSide="left" />
      <text x={XA} y={22} fontSize={14} textAnchor="middle" fill={muted}>แอมมิเตอร์ (ต่ออนุกรม)</text>
      <text x={XA} y={TOP + 44} fontSize={17} fontWeight={700} textAnchor="middle" fill={ink}>{iText}</text>

      {/* resistor (IEC rectangle) */}
      <rect x={XR - 13} y={RT} width={26} height={RB - RT} fill="var(--fig-bg)" stroke={ink} strokeWidth={2.5} />
      <text x={XR - 24} y={148} fontSize={14} textAnchor="end" fill={muted}>{rLabel}</text>
      <text x={XR - 24} y={170} fontSize={17} fontWeight={700} textAnchor="end" fill={ink}>{formatSI(R, "Ω")}</text>
      {cfg.body ? (
        <g>
          <Person x={380} y={110} />
          <text x={380} y={204} fontSize={12} textAnchor="middle" fill={muted}>มือ–เท้า</text>
        </g>
      ) : null}

      {/* voltmeter in parallel */}
      <MeterCircle x={XV} y={150} letter="V" plusSide="top" />
      <text x={XV} y={22} fontSize={14} textAnchor="middle" fill={muted}>โวลต์มิเตอร์ (ต่อขนาน)</text>
      <text x={XV + 30} y={156} fontSize={17} fontWeight={700} fill={ink}>{formatSI(V, "V", 3)}</text>

      <text x={W / 2} y={BOT + 26} fontSize={14} textAnchor="middle" fill={muted}>
        {`I = V / R = ${formatSI(V, "V")} / ${formatSI(R, "Ω")} = ${formatSI(I, "A")}` +
          (cfg.power ? ` · P = V·I = ${formatSI(V * I, "W")}` : "")}
      </text>

      {cfg.body ? (
        <>
          <BodyBandBar I={I} y0={306} />
        </>
      ) : null}
    </svg>
  );
}
