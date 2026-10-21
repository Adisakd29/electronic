// Drives the 10 virtual labs through their on-screen controls so every `state` lab task
// of weeks 1–18 is satisfied the way a learner would do it. Each recipe sets the controls
// described in the week content (instructions + task prompt/hint) and the lab module.
import { COLOURS, decodeBands, toleranceColour, valueBands } from "../../src/labs/color-code/model.ts";
import { TIME_DIV_STEPS, VOLTS_DIV_STEPS } from "../../src/labs/oscilloscope/model.ts";

const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const cssEsc = (s) => s.replace(/["\\]/g, "\\$&");
const nearestStep = (steps, v) => steps.reduce((a, b) => (Math.abs(Math.log(b / v)) < Math.abs(Math.log(a / v)) ? b : a));

/** Control helpers scoped to the lab (LabShell) — not the task list. */
export function labApi(page) {
  // the lab component = the child of the LabRunner column that holds the lab stage (role=img),
  // i.e. the LabShell grid, or a lab's own wrapper when it puts controls above it (semiconductor tabs)
  const root = page
    .locator('section[aria-labelledby="tasks-h"]')
    .locator("xpath=..")
    .locator(":scope > *")
    .filter({ has: page.locator('[role="img"][aria-label]') })
    .first();
  const settle = () => page.waitForTimeout(120);
  const api = {
    root,
    /** Type a value into a Slider's text box (label = the Slider label). */
    async slider(label, v) {
      const loc = root.locator(`input[aria-label="${cssEsc(label)} (พิมพ์ค่า)"]`);
      await loc.click();
      await loc.fill(String(v));
      await loc.press("Enter");
      await settle();
    },
    /** Pick an option of a lab Segmented (radiogroup) by its value. */
    async seg(group, value) {
      const input = root.locator(`[role=radiogroup][aria-label="${cssEsc(group)}"] input[value="${cssEsc(String(value))}"]`);
      if (!(await input.isChecked())) await input.locator("xpath=..").click();
      await settle();
    },
    async select(label, value) {
      await root.getByLabel(label, { exact: true }).selectOption(String(value));
      await settle();
    },
    async toggle(label, on) {
      const sw = root.getByRole("switch", { name: new RegExp(`^${reEsc(label)}`) });
      if ((await sw.getAttribute("aria-checked")) !== String(on)) await sw.click();
      await settle();
    },
    async click(name) {
      await root.getByRole("button", { name, exact: true }).click();
      await settle();
    },
    /** Momentary push button: hold with the keyboard (Space) like a learner holding it down. */
    async hold(name, ms = 400) {
      const b = root.getByRole("button", { name: new RegExp(`^${reEsc(name)}`) });
      await b.focus();
      await page.keyboard.down(" ");
      await page.waitForTimeout(ms);
      await page.keyboard.up(" ");
      await settle();
    },
    text: () => root.innerText(),
  };
  return api;
}

// ---------------------------------------------------------------------------------------------
// Recipes per task id. `L` = labApi(page). Values come from the week's instructions / prompts.
// ---------------------------------------------------------------------------------------------
const ohm = {
  V: "แรงดัน V (Voltage)",
  Rbody: "ความต้านทานร่างกาย R (body resistance)",
  R: "ความต้านทาน R (Resistance)",
  lock: "ค่าที่ต้องการคงไว้",
};
const recordAtR = async (L, Rlabel, list) => {
  for (const r of list) {
    await L.slider(Rlabel, r);
    await L.click("บันทึกจุด");
  }
};
const circ = { V: "แรงดันแหล่งจ่าย V", S: "สวิตช์ S (ON = ปิดวงจร)", topo: "การต่อ", R: (i) => `R${i} (พิมพ์ค่า เช่น 4.7k)` };
const setRs = async (L, rs) => {
  for (let i = 0; i < rs.length; i++) if (rs[i] != null) await L.slider(circ.R(i + 1), rs[i]);
};
const scope = {
  wave: "รูปคลื่น (WAVEFORM)",
  freq: "ความถี่ (FREQ)",
  vpp: "ขนาด (AMPL) ยอดถึงยอด",
  td: async (L, s) => L.select("TIME/DIV", nearestStep(TIME_DIV_STEPS, s)),
  vd: async (L, v) => L.select("VOLTS/DIV CH1", nearestStep(VOLTS_DIV_STEPS, v)),
};
const mm = {
  item: (L, v) => L.select("ชิ้นงานบนโต๊ะ (bench item)", v),
  dial: (L, v) => L.seg("สวิตช์หมุนเลือกฟังก์ชัน (rotary dial)", v),
  jack: (L, v) => L.seg("ช่องเสียบสายแดง (สายดำอยู่ COM เสมอ)", v),
  probe: (L, v) => L.seg("ตำแหน่งโพรบ", v),
  measure: async (L, item, dial, jack = "VΩ") => {
    await mm.probe(L, "off").catch(() => {});
    await mm.item(L, item);
    await mm.jack(L, jack);
    await mm.dial(L, dial);
    await mm.probe(L, "fwd");
  },
};
const motorSw = ["S1 (บนซ้าย)", "S2 (ล่างซ้าย)", "S3 (บนขวา)", "S4 (ล่างขวา)"];
const hbridge = async (L, on) => {
  await L.click("ปิดสวิตช์ทั้งหมด");
  for (const i of on) await L.toggle(motorSw[i - 1], true);
};
const colourBands = async (L, bands) => {
  for (let i = 0; i < bands.length; i++) await L.root.getByLabel(new RegExp(`^แถบที่ ${i + 1} ·`)).selectOption(bands[i]);
  await L.root.page().waitForTimeout(150);
};
const thToColour = Object.fromEntries(Object.entries(COLOURS).map(([k, v]) => [v.th, k]));
/** Circuit troubleshooting: the measurement log rows "V(A–B) = 12.00 V" of the hidden-fault mission. */
const circuitLog = async (L) => {
  const rows = await L.root.locator("ol.readout li").allInnerTexts();
  return rows.map((t) => t.match(/^V\((\w)–(\w)\) = ([\d.]+) V/)).filter(Boolean).map((m) => ({ pair: `${m[1]}–${m[2]}`, v: Number(m[3]) }));
};
const SERIES_PAIR_R = { "A–B": "1", "B–C": "2", "C–G": "3" };
/** Multimeter resistor board (W17): probes on the two points, red lead in VΩ, dial Ω. */
const board = async (L, red, black) => {
  await L.select("โพรบแดงที่จุด", red);
  await L.select("โพรบดำที่จุด", black);
  await L.seg("สถานะโพรบ", "on");
};

export const recipes = {
  // W01 ohms/body
  "W01-L01": async (L) => { await L.slider(ohm.V, 230); await L.slider(ohm.Rbody, 1000); },
  "W01-L03": async (L) => { await L.slider(ohm.V, 230); await recordAtR(L, ohm.Rbody, [1000, 4000, 100000, 1000000]); },
  "W01-L07": async (L) => { await L.slider(ohm.Rbody, 1000); await L.seg(ohm.lock, "R"); await L.root.getByLabel("กระแสที่ต้องการ I (mA)").fill("30"); await L.click("หา V"); await L.seg(ohm.lock, "none"); },
  "W01-L09": async (L) => { await L.slider(ohm.V, 230); await L.slider(ohm.Rbody, 1000000); },
  // W02 ohms/body
  "W02-L01": async (L) => { await L.slider(ohm.V, 230); await L.slider(ohm.Rbody, 1500); },
  "W02-L03": async (L) => { await L.slider(ohm.V, 230); await L.slider(ohm.Rbody, 6000); },
  "W02-L05": async (L) => { await L.slider(ohm.V, 230); await L.slider(ohm.Rbody, 100000); },
  "W02-L07": async (L) => { await L.slider(ohm.V, 230); await recordAtR(L, ohm.Rbody, [1500, 6000, 23000, 1000000]); },
  // W03 ohms/default
  "W03-L01": async (L) => { await L.slider(ohm.R, 1000); for (const v of [0, 2, 4, 6, 8, 10]) { await L.slider(ohm.V, v); await L.click("บันทึกจุด"); } },
  "W03-L04": async (L) => { await L.slider(ohm.V, 12); await L.slider(ohm.R, 1200); },
  "W03-L05": async (L) => { await L.slider(ohm.V, 10); await recordAtR(L, ohm.R, [470, 1000, 2200]); },
  "W03-L07": async (L) => { await L.slider(ohm.R, 470); await L.slider(ohm.V, 10.84); },
  "W03-L09": async (L) => { await L.slider(ohm.V, 12); await L.slider(ohm.R, 680); },
  // W04 circuit/default
  "W04-L01": async (L) => { await L.seg(circ.topo, "series"); },
  "W04-L02": async (L) => { await L.seg(circ.topo, "series"); await setRs(L, [1000, 1000, 510]); },
  "W04-L03": async (L) => { await L.slider(circ.V, 10); await L.toggle(circ.S, true); },
  "W04-L04": async () => {},
  "W04-L06": async (L) => { await L.seg(circ.topo, "parallel"); },
  "W04-L07": async (L) => { await setRs(L, [1000, 2000, 2000]); await L.slider(circ.V, 10); await L.toggle(circ.S, true); },
  "W04-L08": async () => {},
  "W04-L09": async () => {},
  "W04-L10": async (L) => { await L.seg(circ.topo, "mixed"); },
  "W04-L11": async (L) => { await setRs(L, [1020, 2020, 2000]); },
  "W04-L14": async (L) => { await L.seg(circ.topo, "mixed"); await L.slider(circ.V, 12); await setRs(L, [1000, 1000, 1000]); await L.toggle(circ.S, true); },
  "W04-L15": async (L) => {
    // the lesson lab is fixed on the week preset, so rebuild the "fault-open" bench (series 12 V, 100/220/330 Ω)
    // and let the lab hide a fault with the learner button "สุ่มจุดเสียใหม่", then measure across R1–R3 + the ammeter
    await L.seg(circ.topo, "series");
    await L.slider(circ.V, 12);
    await setRs(L, [100, 220, 330]);
    await L.toggle(circ.S, true);
    await L.click("สุ่มจุดเสียใหม่");
    await L.root.getByText("บันทึกการวัด (0 จุด)").waitFor();
    for (const i of [1, 2, 3]) await L.click(`คร่อม R${i}`);
    await L.root.getByRole("button", { name: /^อ่านแอมมิเตอร์/ }).click();
    await L.root.getByText("บันทึกการวัด (4 จุด)").waitFor();
  },
  "W04-L16": async (L) => {
    // read the log like a technician: an open resistor takes the whole supply, a shorted one reads ≈ 0 V
    const log = await circuitLog(L);
    const open = log.find((m) => m.v > 11.5);
    const short = log.find((m) => m.v < 0.05);
    const hit = open ?? short;
    if (!hit) throw new Error(`no fault visible in log ${JSON.stringify(log)}`);
    await L.select("ตัวที่บกพร่อง", SERIES_PAIR_R[hit.pair]);
    await L.select("ลักษณะ", open ? "open" : "short");
    await L.click("วินิจฉัย");
    await L.root.getByText(/วินิจฉัยถูกต้อง/).waitFor();
    await L.click("ซ่อม");
  },
  // W05 circuit/lamp
  "W05-L01": async (L) => { await L.toggle(circ.S, false); },
  "W05-L02": async (L) => { await L.slider(circ.V, 12); await L.toggle(circ.S, true); },
  "W05-L05": async (L) => { await L.seg(circ.topo, "parallel"); await setRs(L, [null, 24, 100000]); },
  "W05-L06": async (L) => { await L.slider(circ.V, 12); await L.toggle(circ.S, true); },
  // W06 circuit/parallel-basic
  "W06-L01": async (L) => { await L.seg(circ.topo, "parallel"); },
  "W06-L02": async (L) => { await L.slider(circ.V, 12); await setRs(L, [47, 33, 22]); await L.toggle(circ.S, true); },
  "W06-L04": async () => {},
  "W06-L07": async (L) => { await L.toggle(circ.S, false); },
  "W06-L08": async (L) => { await setRs(L, [null, null, 47]); await L.toggle(circ.S, true); },
  "W06-L09": async (L) => { await L.slider(circ.V, 12); await setRs(L, [47, 33, 68]); await L.toggle(circ.S, true); },
  // W07 colour code
  "W07-L01": async (L) => { await L.seg("โหมด", "read"); await L.seg("จำนวนแถบ", "4"); await colourBands(L, [...valueBands(330, 4), toleranceColour(5, 4)]); },
  "W07-L02": async (L) => { await L.seg("โหมด", "read"); await L.seg("จำนวนแถบ", "5"); await colourBands(L, [...valueBands(487000, 5), toleranceColour(1, 5)]); },
  "W07-L03": async () => {},
  "W07-L04": async (L) => {
    await L.seg("โหมด", "quiz");
    for (let k = 0; k < 6; k++) {
      const p = await L.root.locator("p", { hasText: /^สีแถบ \(\d แถบ\):/ }).innerText();
      const [, n, list] = p.match(/^สีแถบ \((\d) แถบ\):\s*(.+)$/);
      const bands = list.split("–").map((s) => thToColour[s.trim()]);
      const d = decodeBands(bands, Number(n));
      await L.root.getByLabel("ค่าความต้านทาน (Ω)").fill(String(d.value));
      await L.select("ค่าผิดพลาด", String(d.tolerance));
      await L.click("ตรวจคำตอบ");
      await L.root.getByText("✓ ถูกต้อง").waitFor({ timeout: 3000 });
      await L.click("ข้อต่อไป →");
    }
  },
  "W07-L05": async (L) => { await L.seg("โหมด", "smd"); await L.root.getByLabel("รหัสบนชิป").fill("68X"); await L.root.page().waitForTimeout(150); },
  "W07-L09": async (L) => { await L.seg("โหมด", "read"); await L.seg("จำนวนแถบ", "5"); await colourBands(L, [...valueBands(10000, 5), toleranceColour(2, 5)]); },
  // W08 capacitor
  "W08-L01": async (L) => { await L.seg("ส่วนของห้องทดลอง", "rc"); await L.slider("ความต้านทาน R", 100000); await L.slider("ความจุ C", 0.0001); },
  "W08-L02": async () => {},
  "W08-L04": async (L) => { await L.seg("ตำแหน่งสวิตช์ S", "charge"); await L.root.getByRole("group", { name: "ข้ามไปที่เวลา" }).getByRole("button", { name: "5τ" }).click(); },
  "W08-L06": async (L) => { await L.slider("ความจุ C", 0.000047); },
  "W08-L10": async (L) => { await L.seg("ส่วนของห้องทดลอง", "combo"); await L.seg("วิธีต่อ", "series"); await L.slider("C1", 0.00001); await L.slider("C2", 0.000047); await L.toggle("ใช้ตัวที่ 3 (C3)", true); await L.slider("C3", 0.0001); },
  "W08-L11": async (L) => { await L.seg("วิธีต่อ", "parallel"); },
  // W09 inductor
  "W09-L02": async (L) => { await L.seg("ส่วนการทดลอง", "inductor"); await L.slider("จำนวนรอบ N", 400); await L.select("วัสดุแกน", "ferrite"); },
  "W09-L03": async (L) => { await L.select("วัสดุแกน", "iron"); await L.slider("จำนวนรอบ N", 225); await L.slider("ความยาวขดลวด l", 5); await L.slider("เส้นผ่านศูนย์กลางขด d", 1); await L.slider("ความถี่ f", 1000); },
  "W09-L04": async (L) => { await L.slider("ความต้านทานอนุกรม R", 100); },
  "W09-L08": async (L) => { await L.seg("ส่วนการทดลอง", "inductor"); await L.select("วัสดุแกน", "air"); await L.slider("ความยาวขดลวด l", 5); await L.slider("เส้นผ่านศูนย์กลางขด d", 1); await L.slider("จำนวนรอบ N", 400); },
  // τ = L/R = 2 ms with R = 25 Ω → L = 50 mH; ferrite (μr 200), l = 5 cm, d = 1 cm → N = √(L·l/(μ0·μr·A)) ≈ 356
  "W09-L09": async (L) => { await L.select("วัสดุแกน", "ferrite"); await L.slider("ความยาวขดลวด l", 5); await L.slider("เส้นผ่านศูนย์กลางขด d", 1); await L.slider("จำนวนรอบ N", 356); await L.slider("ความต้านทานอนุกรม R", 25); },
  // W10 transformer
  "W10-L01": async (L) => { await L.seg("ส่วนการทดลอง", "transformer"); await L.slider("จำนวนรอบขดปฐมภูมิ Np", 1150); await L.slider("จำนวนรอบขดทุติยภูมิ Ns", 60); },
  "W10-L02": async (L) => { await L.slider("แรงดันปฐมภูมิ Vp (rms)", 230); },
  "W10-L03": async (L) => { await L.toggle("เปิดวงจรด้านทุติยภูมิ (ไม่มีโหลด)", false); await L.slider("ความต้านทานโหลด R", 6); },
  "W10-L06": async (L) => { await L.slider("จำนวนรอบขดปฐมภูมิ Np", 200); await L.slider("จำนวนรอบขดทุติยภูมิ Ns", 1000); },
  "W10-L07": async (L) => { await L.slider("แรงดันปฐมภูมิ Vp (rms)", 24); },
  // W11 relay
  "W11-L01": async (L) => { await L.slider("แรงดันแหล่งจ่าย V_S", 12); await L.seg("ชนิดสวิตช์ S1", "toggle"); await L.toggle("สวิตช์ S1", true); },
  "W11-L02": async () => {},
  "W11-L03": async (L) => { await L.slider("แรงดันแหล่งจ่าย V_S", 12); await L.slider("ความต้านทานคอยล์ R_coil", 400); },
  "W11-L04": async (L) => { await L.toggle("สวิตช์ S1", false); },
  "W11-L07": async (L) => { await L.toggle("ไดโอดป้องกัน (flyback) D1", true); },
  "W11-L09": async (L) => { await L.select("โหมดการทดลอง", "latch"); await L.slider("แรงดันแหล่งจ่าย V_S", 12); await L.hold("START (NO)"); },
  // W12 oscilloscope/default
  "W12-L01": async (L) => { await L.seg(scope.wave, "sine"); await L.slider(scope.freq, 100); },
  "W12-L02": async (L) => { await scope.td(L, 2e-3); },
  "W12-L04": async (L) => { await L.seg(scope.wave, "sine"); await L.slider(scope.freq, 10000); },
  "W12-L05": async (L) => { await scope.td(L, 20e-6); },
  "W12-L06": async () => {},
  // +4 dBu = 1.23 V rms → Vpp = 2√2 × 1.23 ≈ 3.48 V (generator step 0.1 V → 3.5 Vpp); 0.5 V/div → 7 div
  "W12-L11": async (L) => { await L.seg(scope.wave, "sine"); await L.slider(scope.freq, 1000); await L.slider(scope.vpp, 3.5); await scope.vd(L, 0.5); await scope.td(L, 2e-4); },
  // W13 semiconductor/default
  "W13-L01": async (L) => { await L.seg("เลือกการทดลอง", "diode"); await L.select("ชนิดไดโอด", "si"); await L.slider("ตัวต้านทาน R", 1000); await L.slider("แรงดันแหล่งจ่าย Vs", 5); },
  "W13-L03": async (L) => { await L.slider("แรงดันแหล่งจ่าย Vs", -5); },
  "W13-L04": async (L) => { await L.seg("เลือกการทดลอง", "led"); await L.select("สีของ LED (VF ทั่วไป)", "red"); await L.slider("แรงดันแหล่งจ่าย Vs", 9); await L.slider("ตัวต้านทานจำกัดกระแส R", 390); },
  "W13-L06": async (L) => { await L.slider("แรงดันแหล่งจ่าย Vs", 5); await L.slider("ตัวต้านทานจำกัดกระแส R", 47); },
  "W13-L07": async (L) => { await L.seg("เลือกการทดลอง", "rect"); await L.seg("ชนิดวงจร", "half"); await L.slider("แรงดันทุติยภูมิ rms", 12); await L.slider("ตัวต้านทานโหลด RL", 1000); await L.select("ตัวเก็บประจุกรอง C", "0"); },
  "W13-L10": async (L) => { await L.seg("ชนิดวงจร", "bridge"); await L.select("ตัวเก็บประจุกรอง C", String(470e-6)); },
  "W13-L11": async (L) => { await L.seg("เลือกการทดลอง", "bjt"); await L.slider("แรงดันแหล่งจ่าย Vcc", 12); await L.slider("ตัวต้านทานคอลเลกเตอร์ RC", 1000); await L.slider("อัตราขยายกระแส β (hFE)", 100); await L.slider("แรงดันอินพุต Vin", 5); await L.slider("ตัวต้านทานเบส RB", 10000); },
  "W13-L13": async (L) => { await L.slider("ตัวต้านทานเบส RB", 100000); },
  "W13-L15": async (L) => { await L.slider("แรงดันอินพุต Vin", 0.5); },
  // W14 multimeter/continuity
  "W14-L01": async (L) => { await mm.measure(L, "wire-good", "continuity"); },
  "W14-L02": async (L) => { await mm.measure(L, "wire-broken", "continuity"); },
  "W14-L04": async (L) => { await mm.measure(L, "resistor-unknown", "ohm"); },
  "W14-L05": async () => {},
  "W14-L07": async () => {},
  // W15 semiconductor/bjt
  "W15-L01": async (L) => { await L.seg("เลือกการทดลอง", "bjt"); await L.slider("แรงดันแหล่งจ่าย Vcc", 9); await L.slider("ตัวต้านทานคอลเลกเตอร์ RC", 470); await L.slider("อัตราขยายกระแส β (hFE)", 100); await L.slider("แรงดันอินพุต Vin", 0); },
  "W15-L04": async (L) => { await L.slider("แรงดันอินพุต Vin", 5); await L.slider("ตัวต้านทานเบส RB", 47000); },
  "W15-L05": async (L) => { await L.slider("ตัวต้านทานเบส RB", 22000); },
  "W15-L06": async (L) => { await L.seg("เลือกการทดลอง", "led"); await L.select("สีของ LED (VF ทั่วไป)", "red"); await L.slider("แรงดันแหล่งจ่าย Vs", 9); await L.slider("ตัวต้านทานจำกัดกระแส R", 470); },
  // W16 motor
  "W16-L01": async (L) => { await L.seg("แท็บการทดลอง", "pwm"); await L.slider("แรงดันแหล่งจ่าย V", 12); await L.slider("duty cycle D", 0.5); await L.slider("แรงบิดภาระ T_L", 0); },
  "W16-L06": async (L) => { await L.seg("แท็บการทดลอง", "hbridge"); await hbridge(L, [3, 2]); },
  "W16-L07": async (L) => { await hbridge(L, [2, 4]); },
  "W16-L08": async (L) => { await hbridge(L, [1, 2]); await L.root.getByRole("button", { name: "รีเซ็ต (เปลี่ยนฟิวส์)" }).waitFor(); await L.click("รีเซ็ต (เปลี่ยนฟิวส์)"); await hbridge(L, [1, 4]); },
  "W16-L09": async (L) => { await L.seg("แท็บการทดลอง", "contactor"); await L.hold("START (NO)"); },
  "W16-L10": async (L) => { await L.click("จำลองโหลดเกิน"); },
  // W17 multimeter/default
  "W17-L01": async (L) => { await mm.measure(L, "battery-9v", "VDC"); },
  "W17-L03": async (L) => { await mm.measure(L, "aa-flat", "VDC"); },
  "W17-L05": async (L) => { await mm.measure(L, "resistor-unknown", "ohm"); },
  "W17-L06": async (L) => {
    await mm.probe(L, "off").catch(() => {});
    await mm.item(L, "series-circuit-current");
    await mm.jack(L, "mA");
    await mm.dial(L, "mA");
    await L.select("ต่อมิเตอร์ที่ใดในวงจร", "series");
    await mm.probe(L, "fwd");
  },
  "W17-L08": async (L) => {
    // the mistake from instruction 5: red lead left in mA, then measuring a battery on V⎓ → fuse blows
    await mm.probe(L, "off");
    await mm.item(L, "battery-9v");
    await mm.jack(L, "mA");
    await mm.dial(L, "VDC");
    await mm.probe(L, "fwd");
    await L.root.getByText("ขาด", { exact: false }).first().waitFor();
    await mm.probe(L, "off");
    await L.click("เปลี่ยนฟิวส์");
    await mm.jack(L, "VΩ");
  },
  "W17-L10": async (L) => { await mm.measure(L, "diode-1n4007", "diode"); },
  "W17-L13": async (L) => {
    // the "troubleshoot" bench (3-resistor board, R2 open) rebuilt inside the week's lab: pick the board and inject the open R2
    await mm.probe(L, "off").catch(() => {});
    await mm.item(L, "resistor-board");
    await L.root.getByText("ตั้งโจทย์: ตัวต้านทานที่ขาด (สำหรับครู)").click();
    await L.select("จำลองตัวต้านทานขาด", "1");
    await mm.jack(L, "VΩ");
    await mm.dial(L, "ohm");
    await board(L, "A", "B");
  },
  "W17-L14": async (L) => { await board(L, "B", "C"); await board(L, "A", "D"); await board(L, "C", "D"); },
  // W18 oscilloscope/setup
  "W18-L01": async (L) => { await L.seg(scope.wave, "sine"); await L.slider(scope.freq, 1000); await L.slider(scope.vpp, 4); },
  "W18-L02": async (L) => { await L.seg("ตัวคูณโพรบ (เมนูสโคป)", "10"); },
  "W18-L03": async (L) => { await scope.vd(L, 1); },
  "W18-L04": async (L) => { await scope.td(L, 2e-4); },
  "W18-L05": async (L) => { await L.seg("SOURCE", "1"); await L.slider("LEVEL (ระดับทริกเกอร์)", 0); },
  "W18-L08": async (L) => { await L.seg(scope.wave, "square"); await L.slider(scope.vpp, 4); },
  "W18-L10": async (L) => { await L.slider("OFFSET (ระดับ DC)", 2); },
  "W18-L13": async (L) => { await L.seg("COUPLING CH1", "AC"); },
  // ripple stand-in: sine 100 Hz 0.3 Vpp, 50 mV/div → 6 div, 2 ms/div → 2 cycles
  "W18-L15": async (L) => { await L.seg(scope.wave, "sine"); await L.slider(scope.freq, 100); await L.slider(scope.vpp, 0.3); await L.slider("OFFSET (ระดับ DC)", 0); await scope.vd(L, 0.05); await scope.td(L, 2e-3); },
};
