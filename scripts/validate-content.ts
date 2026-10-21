/**
 * Validate week content files.
 *
 *   npm run content:check -- --week 4
 *   npm run content:check -- --all
 *
 * Checks structure, id uniqueness, cross references, figure keys, lab preset
 * and check keys (from docs/authoring/LAB_SPEC.md), KaTeX syntax, minimum
 * counts required by the course standard, and forbidden placeholder text.
 * Exit code 1 on any error. Warnings do not fail.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import katex from "katex";
import type { Block, Interaction, Week, FigureMap, LabId, FigureRef } from "../src/content/types";
import { defaultValues, evaluate, substitute, variablesOf } from "../src/components/learn/lib/formula";
import { isTrackId, TRACK_IDS } from "../src/content/course";
import { existsSync } from "node:fs";
import { photos, LICENSE_URL } from "../src/content/photos";

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const all = args.includes("--all");
const wi = args.indexOf("--week");
const weeks = all ? Array.from({ length: 18 }, (_, i) => i + 1) : wi >= 0 ? [Number(args[wi + 1])] : [];

// ---- LAB_SPEC parsing -------------------------------------------------------
const spec = readFileSync(path.join(root, "docs/authoring/LAB_SPEC.md"), "utf8");
const labSections = spec.split(/\n## \d+\. /).slice(1);
const labKeys: Record<string, { checks: Set<string>; presets: Set<string> }> = {};
for (const sec of labSections) {
  const id = sec.match(/^`([a-z-]+)`/)?.[1];
  if (!id) continue;
  const checks = new Set<string>();
  for (const m of sec.matchAll(/^\| `([a-zA-Z]+)` \|/gm)) checks.add(m[1]);
  const presets = new Set<string>();
  const pl = sec.match(/\*\*Presets:\*\*([^\n]+)/)?.[1] ?? "";
  for (const m of pl.matchAll(/`([a-z0-9-]+)`/g)) presets.add(m[1]);
  labKeys[id] = { checks, presets };
}

// ---- helpers ------------------------------------------------------------------
let errors = 0;
let warnings = 0;
function err(w: number, msg: string) {
  errors++;
  console.error(`  ✗ W${String(w).padStart(2, "0")}: ${msg}`);
}
function warn(w: number, msg: string) {
  warnings++;
  console.warn(`  ! W${String(w).padStart(2, "0")}: ${msg}`);
}

const PLACEHOLDER = /\b(TODO|TBD|FIXME|lorem|ipsum|placeholder)\b|example\.com|xxx+/i;

function checkMd(w: number, where: string, md: string | undefined) {
  if (md === undefined || md === null) return;
  if (typeof md !== "string") return err(w, `${where}: expected string`);
  if (!md.trim()) err(w, `${where}: empty text`);
  if (PLACEHOLDER.test(md)) err(w, `${where}: placeholder text "${md.match(PLACEHOLDER)?.[0]}"`);
  // KaTeX: $$…$$ then $…$
  const display = [...md.matchAll(/\$\$([\s\S]+?)\$\$/g)].map((m) => m[1]);
  const rest = md.replace(/\$\$[\s\S]+?\$\$/g, "");
  const inline = [...rest.matchAll(/(?<![\\$])\$(?!\s)([^$\n]+?)(?<!\s)\$(?!\d)/g)].map((m) => m[1]);
  for (const tex of [...display, ...inline]) {
    try {
      katex.renderToString(tex, { throwOnError: true, strict: "ignore" });
    } catch (e) {
      err(w, `${where}: KaTeX error in "${tex.slice(0, 60)}": ${(e as Error).message.split("\n")[0]}`);
    }
  }
  const dollars = (rest.replace(/\\\$/g, "").match(/\$/g) ?? []).length;
  if (dollars % 2 === 1) err(w, `${where}: unbalanced $ in "${md.slice(0, 60)}…" (escape currency as \\$)`);
}

function checkTex(w: number, where: string, tex: string) {
  try {
    katex.renderToString(tex, { throwOnError: true, strict: "ignore" });
  } catch (e) {
    err(w, `${where}: KaTeX error: ${(e as Error).message.split("\n")[0]}`);
  }
}

function walkStrings(w: number, where: string, v: unknown) {
  if (typeof v === "string") return checkMd(w, where, v);
  if (Array.isArray(v)) return v.forEach((x, i) => walkStrings(w, `${where}[${i}]`, x));
  if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v)) {
      if (k === "tex" || k === "figure" || k === "id" || k === "ref" || k === "url" || k === "sym") continue;
      walkStrings(w, `${where}.${k}`, x);
    }
  }
}

// ---- main ---------------------------------------------------------------------
async function validate(n: number) {
  const nn = String(n).padStart(2, "0");
  const P = `W${nn}-`;
  console.log(`W${nn}`);
  let week: Week;
  let figs: FigureMap = {};
  try {
    const mod = await import(path.join(root, `src/content/weeks/w${nn}.ts`));
    week = mod.week ?? mod.default;
  } catch (e) {
    return err(n, `cannot import week file: ${(e as Error).message}`);
  }
  try {
    const fm = await import(path.join(root, `src/content/figures/w${nn}.tsx`));
    figs = fm.figures ?? fm.default ?? {};
  } catch (e) {
    err(n, `cannot import figure file: ${(e as Error).message}`);
  }
  if (!week) return err(n, "no `week` export");
  if (week.week !== n) err(n, `week.week = ${week.week}`);

  const ids = new Set<string>();
  const addId = (id: string, kind: string) => {
    if (!id?.startsWith(P)) err(n, `${kind} id "${id}" must start with ${P}`);
    if (ids.has(id)) err(n, `duplicate id ${id}`);
    ids.add(id);
  };

  const figUsed = new Set<string>();
  /** Figures used anywhere other than lesson blocks / intro (answers may depend on the drawing). */
  const figStrict = new Set<string>();
  const figRef = (where: string, f?: FigureRef | string) => {
    if (f && !(where === "intro" || /^W\d\d-S\d\d$/.test(where))) figStrict.add(typeof f === "string" ? f : f.figure);
    if (!f) return;
    const key = typeof f === "string" ? f : f.figure;
    if (typeof f !== "string") {
      if (!f.caption?.trim()) err(n, `${where}: figure ${key} missing caption`);
      if (!f.alt || f.alt.length < 40) err(n, `${where}: figure ${key} alt text too short (≥ 40 chars, describe content)`);
    }
    if (!figs[key]) err(n, `${where}: figure "${key}" not found in figures/w${nn}.tsx`);
    figUsed.add(key);
  };

  // objectives
  const objIds = new Set<string>();
  for (const [k, list] of Object.entries(week.objectives ?? {})) {
    if (!list?.length) err(n, `objectives.${k} empty`);
    for (const o of list ?? []) {
      addId(o.id, "objective");
      objIds.add(o.id);
    }
  }

  // interactions
  const inter = new Map<string, Interaction>();
  for (const it of week.interactions ?? []) {
    addId(it.id, "interaction");
    inter.set(it.id, it);
    figRef(it.id, it.figure);
    if (!it.explanation?.trim()) err(n, `${it.id}: explanation required`);
    switch (it.kind) {
      case "mcq":
      case "predict": {
        const c = it.options.filter((o) => o.correct).length;
        if (c < 1) err(n, `${it.id}: no correct option`);
        if (it.kind === "mcq" && !it.multiple && c > 1) err(n, `${it.id}: multiple correct but multiple not set`);
        if (it.options.length < 2) err(n, `${it.id}: needs ≥ 2 options`);
        for (const o of it.options) if (!o.feedback?.trim()) err(n, `${it.id}: option ${o.id} needs feedback`);
        if (it.kind === "predict") figRef(it.id, it.revealFigure);
        break;
      }
      case "fill": {
        if (!it.fields.length) err(n, `${it.id}: no fields`);
        for (const f of it.fields) if (!Number.isFinite(f.answer)) err(n, `${it.id}.${f.id}: answer not finite`);
        // Randomised exercises: formulas must reproduce the fixed answers at the default values,
        // every variable must be drawable, and every placeholder must name a variable.
        const vars = it.vars;
        if (vars) {
          const names = Object.keys(vars);
          if (!names.length) err(n, `${it.id}: vars is empty`);
          for (const [k, v] of Object.entries(vars)) {
            if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) err(n, `${it.id}: bad var name "${k}"`);
            if (!(v.step > 0) || v.max < v.min || v.default < v.min || v.default > v.max) err(n, `${it.id}: var ${k} range/step/default invalid`);
            else if (Math.abs(((v.default - v.min) / v.step) - Math.round((v.default - v.min) / v.step)) > 1e-6) err(n, `${it.id}: var ${k} default ${v.default} not on the min+step grid`);
            if ((v.max - v.min) / v.step < 3) warn(n, `${it.id}: var ${k} has < 4 possible values`);
          }
          const defaults = defaultValues(vars);
          const texts = [it.prompt, it.explanation, ...it.fields.flatMap((f) => [f.label, f.hint ?? ""])];
          for (const t of texts) for (const m of t.matchAll(/\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g)) if (!vars[m[1]]) err(n, `${it.id}: placeholder {{${m[1]}}} is not a var`);
          if (!/\{\{/.test(it.prompt) && !it.fields.some((f) => /\{\{/.test(f.label))) warn(n, `${it.id}: vars set but no {{placeholder}} in prompt/labels`);
          for (const f of it.fields) {
            if (!f.formula) {
              err(n, `${it.id}.${f.id}: formula required when vars is set`);
              continue;
            }
            try {
              for (const v of variablesOf(f.formula)) if (!vars[v]) err(n, `${it.id}.${f.id}: formula uses unknown var ${v}`);
              const got = evaluate(f.formula, defaults);
              const rel = f.tolerance ?? 0.02;
              const abs = f.absTolerance ?? 0;
              if (Math.abs(got - f.answer) > Math.max(abs, Math.abs(f.answer) * rel)) err(n, `${it.id}.${f.id}: formula(defaults) = ${got} ≠ answer ${f.answer}`);
              for (const e of f.commonErrors ?? []) {
                if (!e.formula) continue;
                const ge = evaluate(e.formula, defaults);
                if (Math.abs(ge - e.value) > Math.max(abs, Math.abs(e.value) * rel)) err(n, `${it.id}.${f.id}: commonError formula(defaults) = ${ge} ≠ ${e.value}`);
              }
              // a few random draws must evaluate (no division by zero etc.)
              for (let i = 0; i < 50; i++) {
                const draw: Record<string, number> = {};
                for (const [k, v] of Object.entries(vars)) draw[k] = v.min + Math.round(Math.random() * Math.floor((v.max - v.min) / v.step)) * v.step;
                evaluate(f.formula, draw);
              }
            } catch (e) {
              err(n, `${it.id}.${f.id}: formula error: ${e instanceof Error ? e.message : e}`);
            }
          }
          void substitute;
        }
        break;
      }
      case "match":
        if (it.pairs.length < 3) err(n, `${it.id}: match needs ≥ 3 pairs`);
        for (const p of it.pairs) if (p.leftFigure) figRef(it.id, p.leftFigure);
        break;
      case "order":
        if (it.items.length < 3) err(n, `${it.id}: order needs ≥ 3 items`);
        break;
      case "hotspot":
      case "findFault": {
        figRef(it.id, it.figure);
        const [vw, vh] = it.viewBox;
        for (const s of it.spots) {
          if (s.x < 0 || s.y < 0 || s.x > vw || s.y > vh) err(n, `${it.id}: spot ${s.id} outside viewBox`);
        }
        if (it.kind === "findFault" && !it.spots.some((s) => s.fault)) err(n, `${it.id}: no fault spot`);
        if (it.kind === "hotspot" && it.mode === "find" && !it.spots.some((s) => s.target)) err(n, `${it.id}: no target spot`);
        // viewBox must match the SVG
        const Comp = figs[it.figure.figure];
        if (Comp) {
          try {
            const { renderToStaticMarkup } = await import("react-dom/server");
            const { createElement } = await import("react");
            const svg = renderToStaticMarkup(createElement(Comp));
            const vb = svg.match(/viewBox="([\d.\s-]+)"/)?.[1]?.trim().split(/\s+/).map(Number);
            if (vb && (vb[2] !== vw || vb[3] !== vh)) err(n, `${it.id}: viewBox [${vw},${vh}] ≠ SVG viewBox ${vb.join(" ")}`);
          } catch {
            /* reported elsewhere */
          }
        }
        break;
      }
      case "classify":
        if (it.categories.length < 2) err(n, `${it.id}: classify needs ≥ 2 categories`);
        for (const x of it.items) if (x.category < 0 || x.category >= it.categories.length) err(n, `${it.id}: bad category index`);
        break;
      case "scenario": {
        if (!it.nodes[it.start]) err(n, `${it.id}: start node missing`);
        for (const [k, node] of Object.entries(it.nodes)) {
          figRef(`${it.id}.${k}`, node.figure);
          for (const c of node.choices ?? []) if (!it.nodes[c.next]) err(n, `${it.id}: node ${k} → missing ${c.next}`);
          if (!node.choices?.length && !node.end) err(n, `${it.id}: node ${k} has no choices and no end`);
        }
        break;
      }
    }
    if (it.objective && !objIds.has(it.objective)) warn(n, `${it.id}: unknown objective ${it.objective}`);
  }

  // examples
  const ex = new Set<string>();
  for (const e of week.examples ?? []) {
    addId(e.id, "example");
    ex.add(e.id);
    figRef(e.id, e.figure);
    if (e.steps.length < 2) err(n, `${e.id}: needs ≥ 2 solution steps`);
    if (e.tryIt && !inter.has(e.tryIt)) err(n, `${e.id}: tryIt ${e.tryIt} not found`);
  }
  if ((week.examples?.length ?? 0) < 3) err(n, `examples: ${week.examples?.length ?? 0} < 3`);

  // steps
  const usedInter = new Set<string>();
  const usedEx = new Set<string>();
  if ((week.steps?.length ?? 0) < 6) err(n, `steps: ${week.steps?.length ?? 0} < 6`);
  if ((week.steps?.length ?? 0) > 12) warn(n, `steps: ${week.steps.length} > 12 (consider splitting)`);
  let trackBlocks = 0;
  let plainCount = 0;
  for (const s of week.steps ?? []) {
    addId(s.id, "step");
    if (s.blocks.length < 2) err(n, `${s.id}: needs ≥ 2 blocks`);
    let visual = false;
    let words = 0;
    const visitBlock = (b: Block) => {
      switch (b.type) {
        case "figure":
          figRef(s.id, b);
          visual = true;
          break;
        case "interaction":
          if (!inter.has(b.ref)) err(n, `${s.id}: interaction ${b.ref} not found`);
          usedInter.add(b.ref);
          visual = true;
          break;
        case "example":
          if (!ex.has(b.ref)) err(n, `${s.id}: example ${b.ref} not found`);
          usedEx.add(b.ref);
          break;
        case "lab":
          if (!labKeys[b.lab]) err(n, `${s.id}: unknown lab ${b.lab}`);
          else if (b.preset && !labKeys[b.lab].presets.has(b.preset)) err(n, `${s.id}: unknown preset ${b.preset} for ${b.lab}`);
          visual = true;
          break;
        case "formula":
          checkTex(n, `${s.id} formula`, b.tex);
          for (const v of b.vars ?? []) checkTex(n, `${s.id} formula var`, v.sym);
          break;
        case "table":
          for (const r of b.rows) if (r.length !== b.headers.length) err(n, `${s.id}: table row has ${r.length} cells, headers ${b.headers.length}`);
          break;
        case "md":
          words += b.md.split(/\s+/).length;
          break;
        case "plain":
          if (!b.md?.trim()) err(n, `${s.id}: plain block is empty`);
          if (/\$/.test(b.md)) warn(n, `${s.id}: plain block contains math ($) — keep it formula-free, everyday words`);
          plainCount++;
          break;
        case "deeper":
          if (!b.title?.trim()) err(n, `${s.id}: deeper block needs a title`);
          if (!b.blocks?.length) err(n, `${s.id}: deeper block is empty`);
          for (const x of b.blocks ?? []) {
            if (x.type === "interaction" || x.type === "example" || x.type === "lab" || x.type === "deeper" || x.type === "track")
              err(n, `${s.id}: deeper block must not contain ${x.type} (assessed or interactive material must stay visible)`);
            else visitBlock(x);
          }
          break;
        case "track": {
          trackBlocks++;
          const keys = Object.keys(b.notes ?? {});
          for (const k of keys) if (!isTrackId(k)) err(n, `${s.id}: unknown track "${k}"`);
          for (const [k, v] of Object.entries(b.notes ?? {})) if (!String(v ?? "").trim()) err(n, `${s.id}: track note "${k}" is empty`);
          const missing = TRACK_IDS.filter((t) => !keys.includes(t));
          if (missing.length) warn(n, `${s.id}: track block without notes for ${missing.join(", ")}`);
          break;
        }
      }
    };
    s.blocks.forEach(visitBlock);
    if (!visual) warn(n, `${s.id}: no figure/interaction/lab in this step`);
    if (words > 900) warn(n, `${s.id}: long text (${words} tokens) — split the step`);
  }

  // trades (non-electronics learners)
  {
    const hooks = week.intro?.trackHooks;
    if (!hooks) warn(n, "intro.trackHooks missing (why this week matters in each trade)");
    else {
      for (const k of Object.keys(hooks)) if (!isTrackId(k)) err(n, `intro.trackHooks: unknown track "${k}"`);
      const missing = TRACK_IDS.filter((t) => !hooks[t]?.trim());
      if (missing.length) warn(n, `intro.trackHooks missing for ${missing.join(", ")}`);
    }
    if (trackBlocks < 2) warn(n, `only ${trackBlocks} track block(s) in the steps — aim for ≥ 2 ("ในงานแผนกของคุณ")`);
    if (plainCount < Math.ceil((week.steps?.length ?? 0) / 2)) warn(n, `only ${plainCount} plain block(s) for ${week.steps?.length ?? 0} steps — beginners need "เข้าใจแบบง่าย ๆ ก่อน" in most technical steps`);
  }

  // practice / warmup / challenge
  if ((week.practice?.length ?? 0) < 6) err(n, `practice: ${week.practice?.length ?? 0} < 6 interactions`);
  for (const id of week.practice ?? []) if (!inter.has(id)) err(n, `practice: ${id} not found`);
  {
    const noLevel = (week.practice ?? []).filter((id) => inter.get(id) && !inter.get(id)!.level);
    if (noLevel.length) warn(n, `practice: ${noLevel.length} interaction(s) without level (basic/apply/analyze): ${noLevel.slice(0, 5).join(", ")}${noLevel.length > 5 ? "…" : ""}`);
    const levels = new Set((week.practice ?? []).map((id) => inter.get(id)?.level).filter(Boolean));
    if (levels.size && levels.size < 3) warn(n, `practice: only ${[...levels].join("/")} levels — aim for basic + apply + analyze`);
  }
  for (const id of week.intro?.warmup ?? []) if (!inter.has(id)) err(n, `warmup: ${id} not found`);
  if (!inter.has(week.challenge?.interaction)) err(n, `challenge interaction ${week.challenge?.interaction} not found`);
  const kinds = new Set((week.practice ?? []).map((id) => inter.get(id)?.kind));
  if (kinds.size < 3) err(n, `practice uses only ${kinds.size} interaction kinds (need ≥ 3)`);
  for (const id of inter.keys()) {
    if (!usedInter.has(id) && !week.practice.includes(id) && !(week.intro?.warmup ?? []).includes(id) && week.challenge.interaction !== id && !week.examples.some((e) => e.tryIt === id))
      warn(n, `interaction ${id} is never used`);
  }
  for (const id of ex) if (!usedEx.has(id)) warn(n, `example ${id} not placed in any step (shown in examples list only)`);
  figRef("intro", week.intro?.figure);

  // lab
  const lab = week.lab;
  if (!lab) err(n, "lab missing");
  else {
    const lk = labKeys[lab.lab as LabId];
    if (!lk) err(n, `lab: unknown lab id ${lab.lab}`);
    else if (lab.preset && !lk.presets.has(lab.preset)) err(n, `lab: unknown preset ${lab.preset}`);
    if (lab.tasks.length < 3) err(n, `lab: ${lab.tasks.length} tasks < 3`);
    if (!lab.assumptions.length) err(n, "lab: assumptions required");
    const noLevel = lab.tasks.filter((t) => !t.level);
    if (noLevel.length) warn(n, `lab: ${noLevel.length} task(s) without level 1–4: ${noLevel.slice(0, 5).map((t) => t.id).join(", ")}`);
    for (const t of lab.tasks) {
      addId(t.id, "lab task");
      if (t.kind === "state" && lk && !lk.checks.has(t.check)) err(n, `${t.id}: check "${t.check}" not in LAB_SPEC for ${lab.lab}`);
      if (t.kind === "mcq" && !t.options.some((o) => o.correct)) err(n, `${t.id}: no correct option`);
      if (t.kind === "numeric" && !Number.isFinite(t.answer)) err(n, `${t.id}: answer not finite`);
    }
  }

  // activities
  if ((week.activities?.length ?? 0) < 2) err(n, `activities: ${week.activities?.length ?? 0} < 2`);
  for (const a of week.activities ?? []) {
    addId(a.id, "activity");
    if (!a.rubric.length) err(n, `${a.id}: rubric required`);
    for (const r of a.rubric) if (r.levels.length !== 4) err(n, `${a.id}: rubric levels must be 4`);
    if (!a.procedure.length) err(n, `${a.id}: procedure required`);
    if (!a.safetyNotes.length) err(n, `${a.id}: safety notes required`);
  }

  // quiz
  const q = week.quiz;
  if (!q) err(n, "quiz missing");
  else {
    if (q.questions.length < 25) err(n, `quiz bank ${q.questions.length} < 25`);
    if (q.drawCount < 10 || q.drawCount > 15) err(n, `quiz drawCount ${q.drawCount} not in 10–15`);
    const byBloom: Record<string, number> = {};
    for (const x of q.questions) {
      addId(x.id, "question");
      figRef(x.id, x.figure);
      byBloom[x.bloom] = (byBloom[x.bloom] ?? 0) + 1;
      if (!objIds.has(x.objective)) warn(n, `${x.id}: unknown objective ${x.objective}`);
      if (x.type === "mcq") {
        if (x.choices?.length !== 4) err(n, `${x.id}: mcq needs exactly 4 choices`);
        if (!x.choices?.some((c) => c.id === x.answer)) err(n, `${x.id}: answer "${x.answer}" not a choice id`);
        const texts = (x.choices ?? []).map((c) => c.text.trim());
        if (new Set(texts).size !== texts.length) err(n, `${x.id}: duplicate choice texts`);
      } else if (x.type === "tf") {
        if (x.answer !== "true" && x.answer !== "false") err(n, `${x.id}: tf answer must be "true"/"false"`);
      } else if (x.type === "numeric") {
        if (typeof x.answer !== "number" || !Number.isFinite(x.answer)) err(n, `${x.id}: numeric answer must be a number`);
      }
    }
    if (Object.keys(byBloom).length < 4) err(n, `quiz uses ${Object.keys(byBloom).length} Bloom levels (need ≥ 4)`);
    if (q.mix) {
      const sum = Object.values(q.mix).reduce((a, b) => a + (b ?? 0), 0);
      if (sum !== q.drawCount) err(n, `quiz mix sums to ${sum}, drawCount ${q.drawCount}`);
      for (const [b, c] of Object.entries(q.mix)) if ((byBloom[b] ?? 0) < (c ?? 0) * 2) warn(n, `quiz: bank has ${byBloom[b] ?? 0} "${b}" for mix ${c} (want ≥ 2× for variety)`);
    }
  }

  // summary/resources
  if ((week.summary?.keyPoints?.length ?? 0) < 4) err(n, "summary.keyPoints < 4");
  if ((week.summary?.vocab?.length ?? 0) < 8) err(n, "summary.vocab < 8");
  if ((week.summary?.mindmap?.branches?.length ?? 0) < 3) err(n, "summary.mindmap needs ≥ 3 branches");
  for (const f of week.summary?.formulas ?? []) checkTex(n, "summary formula", f.tex);
  if ((week.resources?.length ?? 0) < 3) err(n, "resources < 3");
  for (const r of week.resources ?? []) {
    if (r.url && !/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(r.url)) err(n, `resource url invalid: ${r.url}`);
  }
  if (!week.safety?.length) err(n, "safety review box required");
  if (!week.intro?.whyItMatters?.length) err(n, "intro.whyItMatters required");

  // all text: placeholders + KaTeX
  walkStrings(n, "week", week);

  // real photos
  for (const [k, p] of Object.entries(photos)) {
    if (!k.startsWith(P) || !p) continue;
    const w = `photo ${k}`;
    if (!figs[k]) err(n, `${w}: no figure with this key`);
    if (p.mode === "replace" && figStrict.has(k)) err(n, `${w}: mode "replace" not allowed — figure is used by an interaction/example/quiz; use "with"`);
    if (!/^\/photos\/[A-Za-z0-9._-]+\.(jpe?g|png|webp)$/.test(p.src)) err(n, `${w}: src must be /photos/<file>.jpg|png|webp`);
    else if (!existsSync(path.join(root, "public", p.src))) err(n, `${w}: file public${p.src} missing`);
    if (!(p.license in LICENSE_URL)) err(n, `${w}: licence "${p.license}" not allowed`);
    if (!p.author?.trim()) err(n, `${w}: author required (attribution)`);
    if (p.license !== "School owned" && !/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(p.sourceUrl)) err(n, `${w}: sourceUrl must be a Commons file page`);
    if (!p.alt || p.alt.length < 30) err(n, `${w}: alt must describe the photo (≥ 30 chars)`);
    if (!(p.width > 0 && p.height > 0)) err(n, `${w}: width/height required`);
  }

  // unused figures
  for (const k of Object.keys(figs)) {
    if (!k.startsWith(P)) err(n, `figure key ${k} must start with ${P}`);
    if (!figUsed.has(k)) warn(n, `figure ${k} defined but never used`);
  }
  console.log(
    `  steps ${week.steps?.length} · interactions ${week.interactions?.length} · practice ${week.practice?.length} · examples ${week.examples?.length} · quiz ${week.quiz?.questions.length} · figures ${Object.keys(figs).length} · activities ${week.activities?.length} · lab tasks ${week.lab?.tasks.length}`,
  );
}

(async () => {
  if (!weeks.length) {
    console.error("usage: npm run content:check -- --week N | --all");
    process.exit(2);
  }
  for (const n of weeks) await validate(n);
  console.log(`\n${errors} error(s), ${warnings} warning(s)`);
  process.exit(errors ? 1 : 0);
})();
