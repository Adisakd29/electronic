/**
 * Render a lab's SVG stage (LabModule.previewStage) for each preset to PNG.
 *   npm run lab:render -- --lab circuit [--dark]
 * Output: .figcheck/lab-<id>/<preset>.png
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { Resvg } from "@resvg/resvg-js";

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const id = args[args.indexOf("--lab") + 1];
const dark = args.includes("--dark");

function tokens(): Record<string, string> {
  const css = readFileSync(path.join(root, "src/app/globals.css"), "utf8");
  const pick = (re: RegExp) => {
    const out: Record<string, string> = {};
    const m = css.match(re);
    if (m) for (const line of m[1].split("\n")) {
      const mm = line.match(/(--[a-z0-9-]+)\s*:\s*([^;]+);/i);
      if (mm) out[mm[1]] = mm[2].trim();
    }
    return out;
  };
  const light = pick(/:root\s*\{([\s\S]*?)\n\}/);
  return dark ? { ...light, ...pick(/:root\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/) } : light;
}

(async () => {
  const mod = await import(path.join(root, "src/labs", id, "index.ts"));
  const lab = mod.lab ?? mod.default;
  if (!lab?.previewStage) {
    console.error(`${id}: LabModule.previewStage not defined`);
    process.exit(1);
  }
  const t = tokens();
  const out = path.join(root, ".figcheck", `lab-${id}${dark ? "-dark" : ""}`);
  mkdirSync(out, { recursive: true });
  for (const preset of Object.keys(lab.presets)) {
    try {
      let svg = renderToStaticMarkup(lab.previewStage(preset));
      const start = svg.indexOf("<svg");
      if (start < 0) throw new Error("previewStage must return an <svg> element");
      svg = svg.slice(start);
      svg = svg.replace(/var\((--[a-z0-9-]+)(?:\s*,\s*([^)]+))?\)/gi, (_, n: string, fb?: string) => t[n] ?? fb ?? "#ff00ff");
      svg = svg.replace(/^<svg/, `<svg xmlns="http://www.w3.org/2000/svg" font-family="Loma, DejaVu Sans"`);
      svg = svg.replace(/<text(?![^>]*fill=)/g, `<text fill="${t["--fig-ink"]}"`);
      const png = new Resvg(svg, {
        fitTo: { mode: "width", value: 720 },
        background: t["--fig-bg"],
        font: { loadSystemFonts: true, defaultFontFamily: "Loma", fontFiles: ["/usr/share/fonts/opentype/tlwg/Loma.otf", "/usr/share/fonts/opentype/tlwg/Loma-Bold.otf"] },
      }).render().asPng();
      writeFileSync(path.join(out, `${preset}.png`), png);
      console.log(`ok  ${preset}`);
    } catch (e) {
      console.error(`${preset}: ${(e as Error).message}`);
      process.exitCode = 1;
    }
  }
})();
