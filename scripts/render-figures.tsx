/**
 * Render every figure of one or more weeks to PNG for visual QA.
 *
 *   npm run fig:render -- --week 4          (one week)
 *   npm run fig:render -- --week 4 --dark   (dark theme)
 *   npm run fig:render -- --all
 *   npm run fig:render -- --week 4 --only W04-F03
 *
 * Output: .figcheck/wNN/<KEY>.png (rendered at 720 px and a 340 px "phone" copy).
 * CSS variables are substituted with the token values from globals.css because
 * resvg does not support custom properties.
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Resvg } from "@resvg/resvg-js";
import type { FigureMap } from "../src/content/types";

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const dark = args.includes("--dark");
const all = args.includes("--all");
const weekArg = args.indexOf("--week");
const onlyArg = args.indexOf("--only");
const only = onlyArg >= 0 ? args[onlyArg + 1] : undefined;

function tokens(): Record<string, string> {
  const css = readFileSync(path.join(root, "src/app/globals.css"), "utf8");
  const pick = (selector: RegExp) => {
    const m = css.match(selector);
    const out: Record<string, string> = {};
    if (!m) return out;
    for (const line of m[1].split("\n")) {
      const mm = line.match(/(--[a-z0-9-]+)\s*:\s*([^;]+);/i);
      if (mm) out[mm[1]] = mm[2].trim();
    }
    return out;
  };
  const light = pick(/:root\s*\{([\s\S]*?)\n\}/);
  const darkT = pick(/:root\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/);
  return dark ? { ...light, ...darkT } : light;
}

function substitute(svg: string, t: Record<string, string>): string {
  // var(--x) or var(--x, fallback)
  return svg.replace(/var\((--[a-z0-9-]+)(?:\s*,\s*([^)]+))?\)/gi, (_, name: string, fb?: string) => {
    return t[name] ?? fb ?? "#ff00ff";
  });
}

async function renderWeek(n: number, t: Record<string, string>) {
  const nn = String(n).padStart(2, "0");
  let mod: { figures?: FigureMap; default?: FigureMap };
  try {
    mod = await import(path.join(root, `src/content/figures/w${nn}.tsx`));
  } catch (e) {
    console.error(`w${nn}: cannot import figures —`, (e as Error).message);
    process.exitCode = 1;
    return;
  }
  const figs = mod.figures ?? mod.default ?? {};
  const outDir = path.join(root, ".figcheck", `w${nn}${dark ? "-dark" : ""}`);
  mkdirSync(outDir, { recursive: true });
  const keys = Object.keys(figs).filter((k) => !only || k === only);
  for (const key of keys) {
    try {
      let svg = renderToStaticMarkup(createElement(figs[key]));
      if (!svg.startsWith("<svg")) {
        console.error(`${key}: component must return a root <svg>`);
        process.exitCode = 1;
        continue;
      }
      if (!/viewBox=/.test(svg)) {
        console.error(`${key}: missing viewBox`);
        process.exitCode = 1;
      }
      const hard = svg.match(/(?:fill|stroke)="#[0-9a-f]{3,8}"/gi);
      if (hard) console.warn(`${key}: hard-coded colours ${[...new Set(hard)].slice(0, 4).join(", ")} — use var(--fig-*)`);
      svg = substitute(svg, t);
      // default text styling (globals.css .fig svg text) — resvg needs it inline
      svg = svg.replace(
        /^<svg/,
        `<svg xmlns="http://www.w3.org/2000/svg" font-family="Loma, DejaVu Sans" style="background:${t["--fig-bg"] ?? "#fff"}"`,
      );
      svg = svg.replace(/<text(?![^>]*fill=)/g, `<text fill="${t["--fig-ink"]}"`);
      for (const [w, suffix] of [
        [720, ""],
        [340, "@phone"],
      ] as const) {
        const r = new Resvg(svg, {
          fitTo: { mode: "width", value: w },
          background: t["--fig-bg"] ?? "#ffffff",
          font: {
            loadSystemFonts: true,
            defaultFontFamily: "Loma",
            fontFiles: ["/usr/share/fonts/opentype/tlwg/Loma.otf", "/usr/share/fonts/opentype/tlwg/Loma-Bold.otf"],
          },
        });
        writeFileSync(path.join(outDir, `${key}${suffix}.png`), r.render().asPng());
      }
      console.log(`ok  ${key}`);
    } catch (e) {
      console.error(`${key}: render failed —`, (e as Error).message);
      process.exitCode = 1;
    }
  }
  console.log(`w${nn}: ${keys.length} figure(s) → ${path.relative(root, outDir)}`);
}

async function main() {
  const t = tokens();
  const weeks = all ? Array.from({ length: 18 }, (_, i) => i + 1) : weekArg >= 0 ? [Number(args[weekArg + 1])] : [];
  if (!weeks.length) {
    console.error("usage: npm run fig:render -- --week N [--dark] [--only KEY] | --all");
    process.exit(2);
  }
  for (const n of weeks) await renderWeek(n, t);
}

main();
