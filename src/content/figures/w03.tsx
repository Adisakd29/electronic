// src/content/figures/w03.tsx — Week 3: ความรู้เบื้องต้นเกี่ยวกับไฟฟ้าและวงจรไฟฟ้า
import type { FigureMap } from "@/content/types";
import { Arrow, Battery, Label, Lamp, Meter, Node, Resistor, SwitchSym, Terminal, Wire, Ground, DCSource, ACSource, Callout } from "./kit";

const INK = "var(--fig-ink)";
const MUTED = "var(--fig-muted)";
const BG = "var(--fig-bg)";

type Pt = [number, number];

/** Small filled arrow head at (x, y) pointing in direction `deg` (0 = right, 90 = down). */
function Head({ x, y, deg, color = INK, size = 11 }: { x: number; y: number; deg: number; color?: string; size?: number }) {
  return (
    <path
      d={`M ${size / 2} 0 L ${-size / 2} ${-size / 2.2} L ${-size / 2} ${size / 2.2} Z`}
      fill={color}
      transform={`translate(${x} ${y}) rotate(${deg})`}
    />
  );
}

/** IEC 60617 fuse: rectangle with a line through it along its length. L = 80. */
function Fuse({ x, y, angle, blown = false }: { x: number; y: number; angle?: number; blown?: boolean }) {
  return (
    <g transform={angle ? `rotate(${angle} ${x} ${y})` : undefined}>
      <line x1={x - 40} y1={y} x2={x - 26} y2={y} stroke={INK} strokeWidth={3} />
      <line x1={x + 26} y1={y} x2={x + 40} y2={y} stroke={INK} strokeWidth={3} />
      <rect x={x - 26} y={y - 10} width={52} height={20} fill={BG} stroke={INK} strokeWidth={3} rx={2} />
      {blown ? (
        <g>
          <line x1={x - 26} y1={y} x2={x - 8} y2={y} stroke={INK} strokeWidth={2.5} />
          <line x1={x + 8} y1={y} x2={x + 26} y2={y} stroke={INK} strokeWidth={2.5} />
          <line x1={x - 6} y1={y - 8} x2={x + 6} y2={y + 8} stroke="var(--fig-danger)" strokeWidth={3} />
          <line x1={x - 6} y1={y + 8} x2={x + 6} y2={y - 8} stroke="var(--fig-danger)" strokeWidth={3} />
        </g>
      ) : (
        <line x1={x - 26} y1={y} x2={x + 26} y2={y} stroke={INK} strokeWidth={2.5} />
      )}
    </g>
  );
}

// ---------------------------------------------------------------------------
// F01 Bohr models: copper (conductor, 1 valence e⁻) and silicon (4 valence e⁻)
// ---------------------------------------------------------------------------
function ring(cx: number, cy: number, r: number, n: number, start = -90): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = ((start + (360 / n) * i) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as Pt;
  });
}

function Atom({
  cx,
  cy,
  shells,
  radii,
  protons,
  neutrons,
  valenceStart,
}: {
  cx: number;
  cy: number;
  shells: number[];
  radii: number[];
  protons: number;
  neutrons: number;
  valenceStart: number;
}) {
  const last = shells.length - 1;
  return (
    <g>
      {radii.map((r, i) => (
        <circle
          key={r}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={i === last ? "var(--fig-accent)" : MUTED}
          strokeWidth={i === last ? 3 : 1.5}
          strokeDasharray={i === last ? "8 6" : undefined}
        />
      ))}
      <circle cx={cx} cy={cy} r={34} fill="var(--fig-danger-soft)" stroke="var(--fig-danger)" strokeWidth={2.5} />
      <Label x={cx} y={cy - 11} size={20} weight={700}>{`${protons}p⁺`}</Label>
      <Label x={cx} y={cy + 13} size={20} muted>{`${neutrons}n`}</Label>
      {shells.map((n, i) =>
        ring(cx, cy, radii[i], n, i === last ? valenceStart : -90).map(([x, y], k) =>
          i === last ? (
            <g key={`${i}-${k}`}>
              <circle cx={x} cy={y} r={11} fill="var(--fig-electron)" stroke={INK} strokeWidth={2} />
              <text x={x} y={y + 1} fontSize={20} textAnchor="middle" dominantBaseline="middle" fontWeight={700} fill={BG}>
                −
              </text>
            </g>
          ) : (
            <circle key={`${i}-${k}`} cx={x} cy={y} r={4.5} fill="var(--fig-electron)" />
          ),
        ),
      )}
    </g>
  );
}

function AtomModels() {
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      <Label x={150} y={26} weight={700}>ทองแดง (Cu) 2-8-18-1</Label>
      <Label x={450} y={26} weight={700}>ซิลิคอน (Si) 2-8-4</Label>
      <Atom cx={150} cy={190} shells={[2, 8, 18, 1]} radii={[52, 74, 100, 128]} protons={29} neutrons={34} valenceStart={0} />
      <Atom cx={450} cy={190} shells={[2, 8, 4]} radii={[52, 74, 100]} protons={14} neutrons={14} valenceStart={-45} />
      <Label x={150} y={346}>วาเลนซ์ e⁻ 1 ตัว</Label>
      <Label x={150} y={376} weight={700} color="var(--fig-ok)">→ ตัวนำ</Label>
      <Label x={150} y={404} size={20} muted>(conductor)</Label>
      <Label x={450} y={346}>วาเลนซ์ e⁻ 4 ตัว</Label>
      <Label x={450} y={376} weight={700} color="var(--fig-accent)">→ สารกึ่งตัวนำ</Label>
      <Label x={450} y={404} size={20} muted>(semiconductor)</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F02 Attraction / repulsion with electric field lines
// ---------------------------------------------------------------------------
function Charge({ x, y, sign }: { x: number; y: number; sign: "+" | "−" }) {
  const plus = sign === "+";
  return (
    <g>
      <circle cx={x} cy={y} r={26} fill={plus ? "var(--fig-danger-soft)" : "var(--fig-accent-soft)"} stroke={plus ? "var(--fig-plus)" : "var(--fig-accent)"} strokeWidth={3} />
      <Label x={x} y={y + 1} size={32} weight={700} color={plus ? "var(--fig-plus)" : "var(--fig-accent)"}>
        {sign}
      </Label>
    </g>
  );
}

function ChargeForces() {
  const F = "var(--fig-accent-2)";
  const line = (d: string) => <path d={d} fill="none" stroke={F} strokeWidth={2} />;
  return (
    <svg viewBox="0 0 600 350" aria-hidden="true">
      {/* left panel: unlike charges attract */}
      {line("M 106 140 L 194 140")}
      {line("M 100 124 Q 150 84 200 124")}
      {line("M 100 156 Q 150 196 200 156")}
      {line("M 90 117 Q 150 30 210 117")}
      {line("M 90 163 Q 150 250 210 163")}
      {line("M 54 140 L 20 140")}
      <Head x={150} y={140} deg={0} color={F} />
      <Head x={150} y={104} deg={0} color={F} />
      <Head x={150} y={176} deg={0} color={F} />
      <Head x={150} y={73} deg={0} color={F} />
      <Head x={150} y={207} deg={0} color={F} />
      <Head x={30} y={140} deg={180} color={F} />
      <Charge x={80} y={140} sign="+" />
      <Charge x={220} y={140} sign="−" />
      <Arrow from={[70, 262]} to={[118, 262]} color="var(--fig-accent)" />
      <Arrow from={[230, 262]} to={[182, 262]} color="var(--fig-accent)" />
      <Label x={150} y={296} weight={700}>ต่างชนิด → ดูดกัน</Label>

      <line x1={300} y1={20} x2={300} y2={320} stroke="var(--fig-grid)" strokeWidth={2} />

      {/* right panel: like charges repel */}
      {line("M 354 140 L 318 140")}
      {line("M 362 122 L 338 92")}
      {line("M 362 158 L 338 188")}
      {line("M 404 128 Q 440 112 440 44")}
      {line("M 404 152 Q 440 168 440 236")}
      {line("M 546 140 L 582 140")}
      {line("M 538 122 L 562 92")}
      {line("M 538 158 L 562 188")}
      {line("M 496 128 Q 460 112 460 44")}
      {line("M 496 152 Q 460 168 460 236")}
      <Head x={326} y={140} deg={180} color={F} />
      <Head x={344} y={100} deg={231} color={F} />
      <Head x={344} y={180} deg={129} color={F} />
      <Head x={440} y={66} deg={-90} color={F} />
      <Head x={440} y={214} deg={90} color={F} />
      <Head x={574} y={140} deg={0} color={F} />
      <Head x={556} y={100} deg={-51} color={F} />
      <Head x={556} y={180} deg={51} color={F} />
      <Head x={460} y={66} deg={-90} color={F} />
      <Head x={460} y={214} deg={90} color={F} />
      <Charge x={380} y={140} sign="+" />
      <Charge x={520} y={140} sign="+" />
      <Arrow from={[396, 262]} to={[348, 262]} color="var(--fig-accent)" />
      <Arrow from={[504, 262]} to={[552, 262]} color="var(--fig-accent)" />
      <Label x={450} y={296} weight={700}>ชนิดเดียวกัน → ผลักกัน</Label>
      <Label x={300} y={336} size={20} muted>เส้นสนามไฟฟ้า: ออกจาก + เข้าหา − · ลูกศรหนา = แรง F</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F03 Six ways to produce electricity
// ---------------------------------------------------------------------------
function Cell6({ x, y, n, label, children }: { x: number; y: number; n: number; label: string; children: React.ReactNode }) {
  return (
    <g>
      <rect x={x + 6} y={y + 6} width={188} height={198} rx={12} fill="var(--fig-panel)" stroke="var(--fig-grid)" strokeWidth={2} />
      {children}
      <Label x={x + 100} y={y + 180} weight={700}>{`${n} ${label}`}</Label>
    </g>
  );
}

function SixSources() {
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      {/* 1 friction: balloon rubbed with cloth */}
      <Cell6 x={0} y={0} n={1} label="การเสียดสี">
        <ellipse cx={80} cy={80} rx={42} ry={52} fill="var(--fig-accent-soft)" stroke={INK} strokeWidth={2.5} />
        <path d="M 80 132 l -6 10 l 12 0 z" fill={INK} />
        {[[62, 62], [92, 56], [70, 96], [100, 90]].map(([a, b], i) => (
          <Label key={i} x={a} y={b} size={22} weight={700} color="var(--fig-accent)">−</Label>
        ))}
        <rect x={130} y={50} width={46} height={90} rx={6} fill="var(--fig-copper-soft)" stroke={INK} strokeWidth={2} />
        <Label x={153} y={76} size={22} weight={700} color="var(--fig-plus)">+</Label>
        <Label x={153} y={112} size={22} weight={700} color="var(--fig-plus)">+</Label>
      </Cell6>

      {/* 2 heat: thermocouple */}
      <Cell6 x={200} y={0} n={2} label="ความร้อน">
        <Wire points={[[240, 110], [300, 60], [340, 60]]} color="var(--fig-copper)" width={4} />
        <Wire points={[[240, 110], [300, 100], [340, 100]]} color={INK} width={4} />
        <Node x={240} y={110} r={6} />
        <path d="M 240 150 C 226 136 232 126 240 118 C 248 126 254 136 240 150 Z" fill="var(--fig-danger)" />
        <circle cx={360} cy={80} r={24} fill={BG} stroke={INK} strokeWidth={3} />
        <Label x={360} y={81} size={20} weight={700}>mV</Label>
      </Cell6>

      {/* 3 pressure: piezo crystal */}
      <Cell6 x={400} y={0} n={3} label="แรงกด">
        <Arrow from={[470, 22]} to={[470, 56]} color={INK} width={4} />
        <rect x={440} y={62} width={60} height={70} rx={4} fill="var(--fig-accent-soft)" stroke={INK} strokeWidth={2.5} />
        <Label x={470} y={78} size={20} weight={700} color="var(--fig-plus)">+ + +</Label>
        <Label x={470} y={118} size={20} weight={700} color="var(--fig-accent)">− − −</Label>
        <Wire points={[[500, 74], [540, 74], [540, 82]]} />
        <Wire points={[[500, 120], [540, 120], [540, 112]]} />
        <circle cx={540} cy={97} r={16} fill={BG} stroke={INK} strokeWidth={2.5} />
        <Label x={540} y={98} size={20} weight={700}>V</Label>
      </Cell6>

      {/* 4 light: PN junction */}
      <Cell6 x={0} y={210} n={4} label="แสงสว่าง">
        <circle cx={46} cy={242} r={16} fill="var(--fig-glow)" stroke="var(--fig-warn)" strokeWidth={2} />
        <Arrow from={[62, 254]} to={[82, 284]} color="var(--fig-warn)" />
        <Arrow from={[44, 262]} to={[54, 286]} color="var(--fig-warn)" />
        <rect x={30} y={290} width={100} height={22} fill="var(--fig-accent-soft)" stroke={INK} strokeWidth={2} />
        <rect x={30} y={312} width={100} height={22} fill="var(--fig-copper-soft)" stroke={INK} strokeWidth={2} />
        <Label x={80} y={302} size={20} weight={700}>N</Label>
        <Label x={80} y={324} size={20} weight={700}>P</Label>
        <Wire points={[[130, 301], [150, 301], [150, 236], [172, 236], [172, 250]]} />
        <Wire points={[[130, 323], [140, 323], [140, 350], [172, 350], [172, 330]]} />
        <Resistor x={172} y={290} angle={90} />
      </Cell6>

      {/* 5 magnetism: magnet into coil */}
      <Cell6 x={200} y={210} n={5} label="แม่เหล็ก">
        <rect x={214} y={286} width={30} height={26} fill="var(--fig-danger-soft)" stroke={INK} strokeWidth={2} />
        <rect x={244} y={286} width={30} height={26} fill="var(--fig-accent-soft)" stroke={INK} strokeWidth={2} />
        <Label x={229} y={300} size={20} weight={700}>N</Label>
        <Label x={259} y={300} size={20} weight={700}>S</Label>
        <Arrow from={[226, 336]} to={[272, 336]} color={INK} />
        {[290, 304, 318, 332].map((cx) => (
          <ellipse key={cx} cx={cx} cy={299} rx={7} ry={22} fill="none" stroke="var(--fig-copper)" strokeWidth={3} />
        ))}
        <Wire points={[[290, 277], [290, 246], [346, 246]]} color="var(--fig-copper)" />
        <Wire points={[[332, 277], [332, 262], [346, 262]]} color="var(--fig-copper)" />
        <circle cx={366} cy={256} r={20} fill={BG} stroke={INK} strokeWidth={2.5} />
        <Label x={366} y={257} size={20} weight={700}>G</Label>
      </Cell6>

      {/* 6 chemical: Zn / Cu cell */}
      <Cell6 x={400} y={210} n={6} label="เคมี">
        <path d="M 440 262 L 440 340 Q 440 350 450 350 L 510 350 Q 520 350 520 340 L 520 262" fill="none" stroke={INK} strokeWidth={2.5} />
        <rect x={442} y={292} width={76} height={56} fill="var(--fig-accent-soft)" />
        <rect x={452} y={252} width={12} height={86} fill="var(--fig-muted)" stroke={INK} strokeWidth={1.5} />
        <rect x={496} y={252} width={12} height={86} fill="var(--fig-copper)" stroke={INK} strokeWidth={1.5} />
        <Label x={422} y={310} size={20} weight={700}>Zn</Label>
        <Label x={545} y={310} size={20} weight={700}>Cu</Label>
        <Wire points={[[458, 252], [458, 232], [463, 232]]} />
        <Wire points={[[502, 252], [502, 232], [497, 232]]} />
        <circle cx={480} cy={232} r={17} fill={BG} stroke={INK} strokeWidth={2.5} />
        <Label x={480} y={233} size={20} weight={700}>V</Label>
      </Cell6>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F04 DC vs AC waveforms
// ---------------------------------------------------------------------------
function sinePath(x0: number, y0: number, amp: number, pxPerMs: number, ms: number, periodMs: number) {
  const pts: string[] = [];
  for (let i = 0; i <= 200; i++) {
    const t = (ms * i) / 200;
    const x = x0 + t * pxPerMs;
    const y = y0 - amp * Math.sin((2 * Math.PI * t) / periodMs);
    pts.push(`${i ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

function DcAcWaves() {
  const x0 = 90;
  const pxPerMs = 11.5; // 40 ms → 460 px
  const ac0 = 350;
  const amp = 84; // 325 V
  const rms = amp / Math.SQRT2;
  return (
    <svg viewBox="0 0 600 500" aria-hidden="true">
      {/* DC panel */}
      <Label x={20} y={24} anchor="start" weight={700}>DC — แบตเตอรี่ 12 V</Label>
      <line x1={x0} y1={50} x2={x0} y2={170} stroke={INK} strokeWidth={2} />
      <line x1={x0} y1={160} x2={570} y2={160} stroke={INK} strokeWidth={2} />
      <Label x={x0 - 12} y={160} anchor="end" size={20}>0</Label>
      <Label x={x0 - 12} y={90} anchor="end" size={20}>12 V</Label>
      <line x1={x0} y1={90} x2={560} y2={90} stroke="var(--fig-plus)" strokeWidth={4} />
      <Label x={330} y={122} size={20} muted>ขั้วและทิศไม่เปลี่ยนตามเวลา</Label>
      <Label x={580} y={160} anchor="end" size={20} muted>t</Label>

      <line x1={10} y1={200} x2={590} y2={200} stroke="var(--fig-grid)" strokeWidth={2} />

      {/* AC panel */}
      <Label x={20} y={230} anchor="start" weight={700}>AC — ไฟบ้าน 230 V 50 Hz</Label>
      <line x1={x0} y1={ac0 - amp - 14} x2={x0} y2={ac0 + amp + 14} stroke={INK} strokeWidth={2} />
      <line x1={x0} y1={ac0} x2={570} y2={ac0} stroke={INK} strokeWidth={2} />
      <line x1={x0} y1={ac0 - rms} x2={560} y2={ac0 - rms} stroke={MUTED} strokeWidth={2} strokeDasharray="8 6" />
      <path d={sinePath(x0, ac0, amp, pxPerMs, 40, 20)} fill="none" stroke="var(--fig-wire-l)" strokeWidth={4} />
      <Label x={x0 - 10} y={ac0 - amp} anchor="end" size={20}>+325 V</Label>
      <Label x={x0 - 10} y={ac0 + amp} anchor="end" size={20}>−325 V</Label>
      <Label x={x0 - 10} y={ac0} anchor="end" size={20}>0</Label>
      <Label x={560} y={ac0 - rms - 16} anchor="end" size={20} muted>230 V (rms)</Label>
      {/* period bracket: one full cycle = 20 ms */}
      <line x1={x0} y1={ac0 + amp + 22} x2={x0 + 20 * pxPerMs} y2={ac0 + amp + 22} stroke="var(--fig-accent)" strokeWidth={2.5} />
      <line x1={x0} y1={ac0 + amp + 14} x2={x0} y2={ac0 + amp + 30} stroke="var(--fig-accent)" strokeWidth={2.5} />
      <line x1={x0 + 20 * pxPerMs} y1={ac0 + amp + 14} x2={x0 + 20 * pxPerMs} y2={ac0 + amp + 30} stroke="var(--fig-accent)" strokeWidth={2.5} />
      <Label x={x0 + 10 * pxPerMs} y={ac0 + amp + 44} size={20} color="var(--fig-accent)" weight={700}>T = 20 ms</Label>
      <Label x={580} y={ac0 + 18} anchor="end" size={20} muted>t</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F05 Basic IEC 60617 symbols
// ---------------------------------------------------------------------------
function SymbolTable() {
  const rows = 6;
  const rowH = 84;
  const items: { name: string; draw: (x: number, y: number) => React.ReactNode }[] = [
    { name: "เซลล์ไฟฟ้า (cell)", draw: (x, y) => <Battery x={x} y={y} /> },
    { name: "แบตเตอรี่ (battery)", draw: (x, y) => <Battery x={x} y={y} cells={2} /> },
    { name: "แหล่งจ่าย DC", draw: (x, y) => <DCSource x={x} y={y} /> },
    { name: "แหล่งจ่าย AC", draw: (x, y) => <ACSource x={x} y={y} /> },
    { name: "ตัวต้านทาน (R)", draw: (x, y) => <Resistor x={x} y={y} /> },
    { name: "หลอดไฟ (lamp)", draw: (x, y) => <Lamp x={x} y={y} /> },
    { name: "สวิตช์ (switch)", draw: (x, y) => <SwitchSym x={x} y={y} /> },
    { name: "ฟิวส์ (fuse)", draw: (x, y) => <Fuse x={x} y={y} /> },
    { name: "โวลต์มิเตอร์", draw: (x, y) => <Meter x={x} y={y} kind="V" /> },
    { name: "แอมมิเตอร์", draw: (x, y) => <Meter x={x} y={y} kind="A" /> },
    { name: "กราวด์ (earth)", draw: (x, y) => <Ground x={x} y={y - 18} /> },
    {
      name: "จุดต่อสาย",
      draw: (x, y) => (
        <g>
          <Wire points={[[x - 40, y], [x + 40, y]]} />
          <Wire points={[[x, y], [x, y + 28]]} />
          <Node x={x} y={y} r={6} />
        </g>
      ),
    },
  ];
  return (
    <svg viewBox="0 0 600 520" aria-hidden="true">
      <line x1={300} y1={8} x2={300} y2={512} stroke="var(--fig-grid)" strokeWidth={2} />
      {items.map((it, i) => {
        const col = i < rows ? 0 : 1;
        const row = i % rows;
        const cy = 50 + row * rowH;
        const sx = col * 300 + 70;
        return (
          <g key={it.name}>
            {row > 0 ? <line x1={col * 300 + 10} y1={cy - rowH / 2} x2={col * 300 + 290} y2={cy - rowH / 2} stroke="var(--fig-grid)" strokeWidth={1.5} /> : null}
            {it.draw(sx, cy)}
            <Label x={col * 300 + 128} y={cy} anchor="start" size={20}>
              {it.name}
            </Label>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F06 Closed / open / short circuit
// ---------------------------------------------------------------------------
function LoopPanel({ y0, state }: { y0: number; state: "closed" | "open" | "short" }) {
  const top = y0 + 32;
  const bot = y0 + 152;
  const mid = y0 + 92;
  const flowing = state === "closed";
  const C = "var(--fig-current)";
  const titles = {
    closed: ["① วงจรปิด (closed)", "กระแสไหลครบวง", "หลอดสว่าง"],
    open: ["② วงจรเปิด (open)", "วงจรขาดที่สวิตช์", "I = 0 หลอดดับ"],
    short: ["③ ลัดวงจร (short)", "กระแสพุ่งสูงมาก", "ฟิวส์ขาด ตัดวงจร"],
  }[state];
  return (
    <g>
      <Wire points={[[60, mid - 30], [60, top], [110, top]]} />
      <Fuse x={150} y={top} blown={state === "short"} />
      <Wire points={[[190, top], [210, top]]} />
      <SwitchSym x={250} y={top} closed={state !== "open"} />
      <Wire points={[[290, top], [320, top], [320, mid - 30]]} />
      <Lamp x={320} y={mid} angle={90} on={flowing} />
      <Wire points={[[320, mid + 30], [320, bot], [60, bot], [60, mid + 30]]} />
      <Battery x={60} y={mid} angle={90} />
      {state === "short" ? (
        <g>
          <Node x={320} y={top + 12} />
          <Node x={320} y={bot - 12} />
          <Wire points={[[320, top + 12], [350, top + 12], [350, bot - 12], [320, bot - 12]]} color="var(--fig-danger)" dash="8 6" width={4} />
          <Arrow from={[80, top - 16]} to={[120, top - 16]} color="var(--fig-danger)" width={5} />
        </g>
      ) : null}
      {flowing ? (
        <g>
          <Arrow from={[80, top - 16]} to={[120, top - 16]} color={C} />
          <Arrow from={[340, top + 6]} to={[340, top + 30]} color={C} />
          <Arrow from={[220, bot + 16]} to={[160, bot + 16]} color={C} />
        </g>
      ) : null}
      <Label x={378} y={y0 + 52} anchor="start" weight={700}>{titles[0]}</Label>
      <Label x={378} y={y0 + 90} anchor="start" size={20}>{titles[1]}</Label>
      <Label x={378} y={y0 + 122} anchor="start" size={20} color={state === "closed" ? INK : state === "open" ? MUTED : "var(--fig-danger)"}>
        {titles[2]}
      </Label>
    </g>
  );
}

function CircuitStates() {
  return (
    <svg viewBox="0 0 600 570" aria-hidden="true">
      <LoopPanel y0={0} state="closed" />
      <line x1={10} y1={188} x2={590} y2={188} stroke="var(--fig-grid)" strokeWidth={2} />
      <LoopPanel y0={190} state="open" />
      <line x1={10} y1={378} x2={590} y2={378} stroke="var(--fig-grid)" strokeWidth={2} />
      <LoopPanel y0={380} state="short" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F07 Conventional current vs electron flow
// ---------------------------------------------------------------------------
function CurrentDirection() {
  const C = "var(--fig-current)";
  const E = "var(--fig-electron)";
  return (
    <svg viewBox="0 0 600 380" aria-hidden="true">
      <Label x={300} y={24} weight={700} color={C}>กระแสสมมติ (conventional): + → โหลด → −</Label>
      <Wire points={[[110, 160], [110, 80], [490, 80], [490, 160]]} />
      <Wire points={[[490, 240], [490, 300], [110, 300], [110, 220]]} />
      <Battery x={110} y={190} angle={90} />
      <Resistor x={490} y={200} angle={90} label="โหลด R" labelSide="b" />
      {/* conventional (outside the loop) */}
      <Arrow from={[220, 56]} to={[380, 56]} color={C} width={4} />
      <Arrow from={[520, 120]} to={[520, 280]} color={C} width={4} />
      <Arrow from={[380, 324]} to={[220, 324]} color={C} width={4} />
      {/* electron flow (inside the loop, dashed) */}
      <Wire points={[[380, 104], [232, 104]]} color={E} width={3} dash="10 7" />
      <Head x={226} y={104} deg={180} color={E} size={14} />
      <Wire points={[[232, 276], [380, 276]]} color={E} width={3} dash="10 7" />
      <Head x={386} y={276} deg={0} color={E} size={14} />
      <Label x={168} y={140} anchor="start" size={20}>E = 12 V</Label>
      <Label x={300} y={190} size={20} color={E} weight={700}>อิเล็กตรอน (e⁻)</Label>
      <Label x={300} y={222} size={20} color={E}>ไหลทิศตรงข้าม</Label>
      <Label x={300} y={360} weight={700} color={E}>การไหลของอิเล็กตรอน: − → โหลด → +</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F08 Batteries in series and parallel (12 V 100 Ah × 2)
// ---------------------------------------------------------------------------
function Batt({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x + 13} y={y - 9} width={14} height={9} fill={INK} />
      <rect x={x + 83} y={y - 9} width={14} height={9} fill={INK} />
      <rect x={x} y={y} width={110} height={88} rx={8} fill="var(--fig-panel)" stroke={INK} strokeWidth={3} />
      <Label x={x + 20} y={y + 17} size={24} weight={700} color="var(--fig-wire-n)">−</Label>
      <Label x={x + 90} y={y + 17} size={24} weight={700} color="var(--fig-wire-l)">+</Label>
      <Label x={x + 55} y={y + 46} size={20} weight={700}>12 V</Label>
      <Label x={x + 55} y={y + 70} size={20}>100 Ah</Label>
    </g>
  );
}

function BatteryConnections() {
  const P = "var(--fig-wire-l)";
  const N = "var(--fig-wire-n)";
  return (
    <svg viewBox="0 0 600 520" aria-hidden="true">
      {/* series */}
      <Wire points={[[60, 92], [60, 46]]} color={N} width={4} />
      <Wire points={[[300, 92], [300, 46]]} color={P} width={4} />
      <Wire points={[[130, 92], [130, 70], [230, 70], [230, 92]]} width={4} />
      <Terminal x={60} y={40} label="−" />
      <Terminal x={300} y={40} label="+" />
      <Batt x={40} y={100} />
      <Batt x={210} y={100} />
      <Label x={360} y={70} anchor="start" size={24} weight={700}>อนุกรม (series)</Label>
      <Label x={360} y={110} anchor="start">รวม 24 V</Label>
      <Label x={360} y={146} anchor="start">ความจุ 100 Ah</Label>

      <line x1={10} y1={226} x2={590} y2={226} stroke="var(--fig-grid)" strokeWidth={2} />

      {/* parallel */}
      <Wire points={[[130, 322], [130, 288], [340, 288]]} color={P} width={4} />
      <Wire points={[[300, 322], [300, 288]]} color={P} width={4} />
      <Node x={300} y={288} r={6} />
      <Wire points={[[60, 322], [60, 304], [25, 304], [25, 444], [340, 444]]} color={N} width={4} />
      <Wire points={[[180, 444], [180, 304], [230, 304], [230, 322]]} color={N} width={4} />
      <Node x={180} y={444} r={6} />
      <Terminal x={346} y={288} label="+" />
      <Terminal x={346} y={444} label="−" />
      <Batt x={40} y={330} />
      <Batt x={210} y={330} />
      <Label x={380} y={300} anchor="start" size={24} weight={700}>ขนาน (parallel)</Label>
      <Label x={380} y={340} anchor="start">รวม 12 V</Label>
      <Label x={380} y={376} anchor="start">ความจุ 200 Ah</Label>

      <Callout x={14} y={466} w={572} h={46} tone="warn">
        <Label x={300} y={490} size={20}>⚠ ขนานเฉพาะแบตเตอรี่รุ่น แรงดัน และระดับประจุเดียวกัน</Label>
      </Callout>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F09 Ohm's law triangle
// ---------------------------------------------------------------------------
function OhmTriangle() {
  return (
    <svg viewBox="0 0 600 400" aria-hidden="true">
      <path d="M 300 24 L 490 300 L 110 300 Z" fill="var(--fig-panel)" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
      <line x1={175} y1={205} x2={425} y2={205} stroke={INK} strokeWidth={3} />
      <line x1={300} y1={205} x2={300} y2={300} stroke={INK} strokeWidth={3} />
      <Label x={300} y={140} size={56} weight={700} color="var(--fig-wire-l)">V</Label>
      <Label x={232} y={256} size={52} weight={700} color="var(--fig-current)">I</Label>
      <Label x={368} y={256} size={52} weight={700} color="var(--fig-accent)">R</Label>
      <Label x={300} y={256} size={28} muted>×</Label>
      <Label x={110} y={350} size={24} weight={700}>V = I × R</Label>
      <Label x={300} y={350} size={24} weight={700}>I = V / R</Label>
      <Label x={490} y={350} size={24} weight={700}>R = V / I</Label>
      <Label x={300} y={388} size={20} muted>ปิดตัวที่ต้องการหา: อยู่บน-ล่าง = หาร, อยู่ข้างกัน = คูณ</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F10 Power wheel (12 formulas, corrected)
// ---------------------------------------------------------------------------
function PowerWheel() {
  const cx = 300;
  const cy = 300;
  const r0 = 84;
  const r1 = 286;
  const rt = 196;
  const quads: { q: string; unit: string; fill: string; start: number; f: string[] }[] = [
    { q: "P", unit: "W", fill: "var(--fig-accent-soft)", start: 180, f: ["V × I", "I² × R", "V² / R"] },
    { q: "I", unit: "A", fill: "var(--fig-copper-soft)", start: 270, f: ["P / V", "V / R", "√(P / R)"] },
    { q: "R", unit: "Ω", fill: "var(--fig-panel)", start: 0, f: ["V / I", "V² / P", "P / I²"] },
    { q: "V", unit: "V", fill: "var(--fig-danger-soft)", start: 90, f: ["I × R", "P / I", "√(P × R)"] },
  ];
  const pt = (r: number, deg: number): Pt => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
  const sector = (a0: number, a1: number, ra: number, rb: number) => {
    const [x0, y0] = pt(rb, a0);
    const [x1, y1] = pt(rb, a1);
    const [x2, y2] = pt(ra, a1);
    const [x3, y3] = pt(ra, a0);
    return `M ${x0} ${y0} A ${rb} ${rb} 0 0 1 ${x1} ${y1} L ${x2} ${y2} A ${ra} ${ra} 0 0 0 ${x3} ${y3} Z`;
  };
  return (
    <svg viewBox="0 0 600 600" aria-hidden="true">
      {quads.map((q) => (
        <g key={q.q}>
          <path d={sector(q.start, q.start + 90, r0, r1)} fill={q.fill} stroke={INK} strokeWidth={3} />
          {[1, 2].map((k) => {
            const [xa, ya] = pt(r0, q.start + 30 * k);
            const [xb, yb] = pt(r1, q.start + 30 * k);
            return <line key={k} x1={xa} y1={ya} x2={xb} y2={yb} stroke={INK} strokeWidth={1.5} />;
          })}
          {q.f.map((f, k) => {
            const [x, y] = pt(rt, q.start + 15 + 30 * k);
            return (
              <Label key={f} x={x} y={y} size={24} weight={600}>
                {f}
              </Label>
            );
          })}
          <path d={sector(q.start, q.start + 90, 0.01, r0)} fill={BG} stroke={INK} strokeWidth={3} />
          {(() => {
            const [x, y] = pt(r0 * 0.55, q.start + 45);
            return (
              <g>
                <Label x={x} y={y - 8} size={34} weight={700}>
                  {q.q}
                </Label>
                <Label x={x} y={y + 22} size={20} muted>
                  {q.unit}
                </Label>
              </g>
            );
          })()}
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F11 I–V lines for 100 Ω, 470 Ω, 1 kΩ
// ---------------------------------------------------------------------------
function IVGraph() {
  const X0 = 90;
  const Y0 = 350;
  const pxV = 41; // 0–10 V → 410 px
  const pxmA = 3.1; // 0–100 mA → 310 px
  const xs = (v: number) => X0 + v * pxV;
  const ys = (mA: number) => Y0 - mA * pxmA;
  const lines = [
    { R: 100, label: "100 Ω", color: "var(--fig-danger)", dash: undefined },
    { R: 470, label: "470 Ω", color: "var(--fig-accent)", dash: "10 6" },
    { R: 1000, label: "1 kΩ", color: "var(--fig-ok)", dash: "3 5" },
  ];
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true">
      {[0, 2, 4, 6, 8, 10].map((v) => (
        <g key={v}>
          <line x1={xs(v)} y1={ys(0)} x2={xs(v)} y2={ys(100)} stroke="var(--fig-grid)" strokeWidth={1.5} />
          <Label x={xs(v)} y={Y0 + 22} size={20}>{String(v)}</Label>
        </g>
      ))}
      {[0, 20, 40, 60, 80, 100].map((m) => (
        <g key={m}>
          <line x1={xs(0)} y1={ys(m)} x2={xs(10)} y2={ys(m)} stroke="var(--fig-grid)" strokeWidth={1.5} />
          <Label x={X0 - 10} y={ys(m)} size={20} anchor="end">{String(m)}</Label>
        </g>
      ))}
      <line x1={X0} y1={Y0} x2={xs(10.4)} y2={Y0} stroke={INK} strokeWidth={2.5} />
      <line x1={X0} y1={Y0} x2={X0} y2={ys(104)} stroke={INK} strokeWidth={2.5} />
      {lines.map((l) => {
        const iEnd = (10 / l.R) * 1000;
        return (
          <g key={l.R}>
            <line x1={xs(0)} y1={ys(0)} x2={xs(10)} y2={ys(iEnd)} stroke={l.color} strokeWidth={4} strokeDasharray={l.dash} strokeLinecap="round" />
            <Label x={xs(10) + 10} y={ys(iEnd)} anchor="start" size={20} weight={700} color={l.color}>
              {l.label}
            </Label>
          </g>
        );
      })}
      <Label x={295} y={404} size={20}>แรงดัน V (โวลต์)</Label>
      <Label x={20} y={18} size={20} anchor="start">กระแส I (mA)</Label>
      <Label x={200} y={100} size={20} muted>R น้อย → เส้นชัน</Label>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F12 Appliance rating label + kWh meter (generic, no brand)
// ---------------------------------------------------------------------------
function LabelAndMeter() {
  const digits = ["0", "1", "2", "3", "4", "5"];
  return (
    <svg viewBox="0 0 600 380" aria-hidden="true">
      <rect x={14} y={30} width={276} height={300} rx={12} fill="var(--fig-panel)" stroke={INK} strokeWidth={3} />
      <Label x={152} y={70} weight={700}>หม้อหุงข้าวไฟฟ้า</Label>
      <Label x={152} y={112} size={20}>ความจุ 1.8 L</Label>
      <Label x={152} y={152} size={22}>230 V ~ 50 Hz</Label>
      <rect x={52} y={180} width={200} height={50} rx={8} fill={BG} stroke="var(--fig-accent)" strokeWidth={3} />
      <Label x={152} y={206} size={26} weight={700}>700 W</Label>
      <Label x={152} y={270} size={20} muted>ฉลากบอกกำลังไฟฟ้า</Label>
      <Label x={152} y={300} size={20} muted>ไม่ใช่พลังงานต่อเดือน</Label>

      <rect x={316} y={14} width={270} height={340} rx={14} fill="var(--fig-panel)" stroke={INK} strokeWidth={3} />
      <Label x={451} y={50} size={26} weight={700}>kWh</Label>
      <rect x={334} y={76} width={234} height={62} rx={6} fill={BG} stroke={INK} strokeWidth={2.5} />
      {digits.map((d, i) => (
        <g key={i}>
          <rect
            x={340 + i * 37}
            y={82}
            width={33}
            height={50}
            rx={3}
            fill={i === 5 ? "var(--fig-danger-soft)" : "var(--fig-accent-soft)"}
            stroke={INK}
            strokeWidth={1.5}
          />
          <Label x={356.5 + i * 37} y={108} size={28} weight={700}>
            {d}
          </Label>
        </g>
      ))}
      <Label x={451} y={160} size={20} muted>อ่านได้ 01234.5 หน่วย</Label>
      <Label x={451} y={210} size={22}>1 เฟส 2 สาย</Label>
      <Label x={451} y={248} size={22}>230 V 50 Hz</Label>
      <Label x={451} y={286} size={22}>15(45) A</Label>
      <circle cx={451} cy={324} r={8} fill="var(--fig-danger)" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F13 IEC vs ANSI symbol comparison
// ---------------------------------------------------------------------------
function ZigZag({ x, y }: { x: number; y: number }) {
  const pts: Pt[] = [[x - 40, y], [x - 30, y]];
  for (let i = 0; i < 6; i++) pts.push([x - 25 + i * 10, i % 2 ? y + 12 : y - 12]);
  pts.push([x + 30, y], [x + 40, y]);
  return <Wire points={pts} />;
}

function IecVsAnsi() {
  return (
    <svg viewBox="0 0 600 280" aria-hidden="true">
      <Label x={290} y={28} weight={700} color="var(--fig-ok)">IEC 60617 ✓</Label>
      <Label x={480} y={28} weight={700} muted>ANSI/IEEE</Label>
      <Label x={290} y={58} size={20} muted>ใช้ในคอร์สนี้</Label>
      <Label x={480} y={58} size={20} muted>พบในเอกสารอเมริกา</Label>
      <line x1={10} y1={80} x2={590} y2={80} stroke="var(--fig-grid)" strokeWidth={2} />
      <Label x={20} y={130} anchor="start">ตัวต้านทาน</Label>
      <Resistor x={290} y={130} />
      <ZigZag x={480} y={130} />
      <line x1={10} y1={180} x2={590} y2={180} stroke="var(--fig-grid)" strokeWidth={1.5} />
      <Label x={20} y={230} anchor="start">หลอดไฟ</Label>
      <Lamp x={290} y={230} />
      <g>
        <line x1={450} y1={230} x2={462} y2={230} stroke={INK} strokeWidth={3} />
        <line x1={498} y1={230} x2={510} y2={230} stroke={INK} strokeWidth={3} />
        <circle cx={480} cy={230} r={18} fill={BG} stroke={INK} strokeWidth={3} />
        <path d="M 466 236 L 472 236 C 472 216 488 216 488 236 L 494 236" fill="none" stroke={INK} strokeWidth={2.5} />
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F14 Continuity / resistance check: normal, short, open (supply removed)
// ---------------------------------------------------------------------------
function ContRow({ y0, kind }: { y0: number; kind: "ok" | "short" | "open" }) {
  const y = y0 + 64;
  const reading = { ok: "1.00 kΩ", short: "0.2 Ω", open: "OL" }[kind];
  const verdict = {
    ok: ["✓ ปกติ", "ใกล้ค่าที่ระบุ 1 kΩ"],
    short: ["✗ ลัดวงจร", "≈ 0 Ω (มีเสียงบี๊บ)"],
    open: ["✗ วงจรขาด", "OL = เกินย่าน"],
  }[kind];
  return (
    <g>
      <rect x={20} y={y0 + 22} width={150} height={84} rx={10} fill="var(--fig-panel)" stroke={INK} strokeWidth={3} />
      <rect x={32} y={y0 + 34} width={126} height={44} rx={4} fill={BG} stroke={INK} strokeWidth={2} />
      <Label x={95} y={y0 + 57} size={26} weight={700}>
        {reading}
      </Label>
      <Label x={95} y={y0 + 93} size={20} muted>
        Ω / ●))
      </Label>
      {/* probes */}
      <Wire points={[[170, y0 + 44], [205, y0 + 44], [205, y]]} color="var(--fig-plus)" width={3} />
      <Wire points={[[170, y0 + 92], [190, y0 + 116], [375, y0 + 116], [375, y]]} color={INK} width={3} />
      <Terminal x={215} y={y} />
      <Terminal x={365} y={y} />
      {kind === "open" ? (
        <g>
          <Wire points={[[221, y], [240, y]]} />
          <Wire points={[[240, y], [252, y - 14]]} />
          <Resistor x={300} y={y} />
          <Wire points={[[340, y], [359, y]]} />
          <Label x={252} y={y + 28} size={20} color="var(--fig-danger)" weight={700}>
            ขาด
          </Label>
        </g>
      ) : (
        <g>
          <Wire points={[[221, y], [260, y]]} />
          <Resistor x={300} y={y} />
          <Wire points={[[340, y], [359, y]]} />
        </g>
      )}
      {kind === "short" ? (
        <Wire points={[[240, y], [240, y - 34], [340, y - 34], [340, y]]} color="var(--fig-danger)" width={4} dash="8 6" />
      ) : null}
      <Label x={404} y={y0 + 48} anchor="start" weight={700} color={kind === "ok" ? "var(--fig-ok)" : "var(--fig-danger)"}>
        {verdict[0]}
      </Label>
      <Label x={404} y={y0 + 84} anchor="start" size={20}>
        {verdict[1]}
      </Label>
    </g>
  );
}

function ContinuityCheck() {
  return (
    <svg viewBox="0 0 600 470" aria-hidden="true">
      <Label x={300} y={22} size={22} weight={700} color="var(--fig-danger)">
        ⚠ ถอดแหล่งจ่ายออกจากวงจรก่อนวัดทุกครั้ง
      </Label>
      <ContRow y0={36} kind="ok" />
      <line x1={10} y1={180} x2={590} y2={180} stroke="var(--fig-grid)" strokeWidth={2} />
      <ContRow y0={182} kind="short" />
      <line x1={10} y1={326} x2={590} y2={326} stroke="var(--fig-grid)" strokeWidth={2} />
      <ContRow y0={328} kind="open" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// F15 Find-the-fault circuit (a stray wire bridges the lamp)
// ---------------------------------------------------------------------------
function FaultyCircuit() {
  return (
    <svg viewBox="0 0 600 380" aria-hidden="true">
      <Wire points={[[80, 160], [80, 70], [160, 70]]} />
      <Fuse x={200} y={70} />
      <Wire points={[[240, 70], [290, 70]]} />
      <SwitchSym x={330} y={70} closed />
      <Wire points={[[370, 70], [500, 70], [500, 160]]} />
      <Lamp x={500} y={190} angle={90} />
      <Wire points={[[500, 220], [500, 310], [80, 310], [80, 220]]} />
      <Battery x={80} y={190} angle={90} />
      <Node x={500} y={110} />
      <Node x={500} y={270} />
      <Wire points={[[500, 110], [560, 110], [560, 270], [500, 270]]} />
      <Label x={124} y={190} anchor="start">G1 12 V</Label>
      <Label x={200} y={36} size={20}>F1</Label>
      <Label x={330} y={36} size={20}>S1</Label>
      <Label x={456} y={190} anchor="end">E1</Label>
    </svg>
  );
}

export const figures: FigureMap = {
  "W03-F01": AtomModels,
  "W03-F02": ChargeForces,
  "W03-F03": SixSources,
  "W03-F04": DcAcWaves,
  "W03-F05": SymbolTable,
  "W03-F06": CircuitStates,
  "W03-F07": CurrentDirection,
  "W03-F08": BatteryConnections,
  "W03-F09": OhmTriangle,
  "W03-F10": PowerWheel,
  "W03-F11": IVGraph,
  "W03-F12": LabelAndMeter,
  "W03-F13": IecVsAnsi,
  "W03-F14": ContinuityCheck,
  "W03-F15": FaultyCircuit,
};
export default figures;
