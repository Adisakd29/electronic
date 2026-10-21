"use client";
/**
 * Renders a FigureRef: lazy-loaded SVG component, auto number "รูปที่ w.n",
 * caption, full alt text for screen readers, expand-to-full-screen dialog,
 * horizontal scroll for `wide` figures and an optional overlay (hotspots).
 */
import { Component, useId, useState, type ReactNode } from "react";
import { Maximize2 } from "lucide-react";
import type { FigureRef } from "@/content/types";
import { cn } from "@/lib/cn";
import { Dialog } from "@/components/ui/client";
import { useFigureMap } from "./figure-source";
import { useFigureNumber, useLessonEnv } from "./lesson-context";
import { figureLabel } from "./lib/figures";
import { photoFor, LICENSE_URL, type Photo } from "@/content/photos";

/** Credit line required by the photo's licence. */
export function PhotoCredit({ p, className }: { p: Photo; className?: string }) {
  const lic = LICENSE_URL[p.license];
  return (
    <p className={cn("text-[0.8rem] leading-snug text-ink-3", className)}>
      ภาพ: {p.author} ·{" "}
      {lic ? (
        <a href={lic} target="_blank" rel="noopener noreferrer license" className="underline">
          {p.license}
        </a>
      ) : (
        p.license
      )}{" "}
      ·{" "}
      <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
        ต้นฉบับ
      </a>
      {p.modified ? ` · ${p.modified}` : ""}
    </p>
  );
}

function PhotoImg({ p, big = false }: { p: Photo; big?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static self-hosted file, exact size known
    <img
      src={p.src}
      width={p.width}
      height={p.height}
      alt={p.alt}
      loading="lazy"
      decoding="async"
      className={cn("mx-auto h-auto w-full rounded-sm object-contain", big ? "max-h-[80vh]" : "max-h-[420px]")}
    />
  );
}

class FigureBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(e: unknown) {
    console.error(e);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function FigureBody({ figKey, week, aspect, alt }: { figKey: string; week: number; aspect: string; alt: string }) {
  const map = useFigureMap(week);
  if (map === undefined) {
    return <div className="ee-skeleton w-full rounded-sm" style={{ aspectRatio: aspect }} aria-hidden />;
  }
  const Fig = map?.[figKey];
  if (!Fig) {
    return (
      <div className="grid w-full place-items-center rounded-sm border border-dashed border-line-strong p-6 text-center text-ink-3" style={{ aspectRatio: aspect }}>
        <p className="max-w-[48ch] text-[0.95rem]">
          ภาพนี้ยังแสดงไม่ได้ อ่านคำบรรยายภาพแทน: {alt}
        </p>
      </div>
    );
  }
  return (
    <FigureBoundary
      fallback={<p className="p-6 text-center text-[0.95rem] text-ink-3">แสดงภาพไม่สำเร็จ คำบรรยายภาพ: {alt}</p>}
    >
      <Fig />
    </FigureBoundary>
  );
}

export function FigureView({
  fig,
  week: weekProp,
  overlay,
  viewBox,
  numbered = true,
  expandable = true,
  className,
  compact = false,
}: {
  fig: FigureRef;
  week?: number;
  /** Absolutely positioned layer over the drawing (same box as the SVG). */
  overlay?: ReactNode;
  /** Known viewBox [w, h]: reserves the exact aspect ratio while loading. */
  viewBox?: [number, number];
  numbered?: boolean;
  expandable?: boolean;
  className?: string;
  compact?: boolean;
}) {
  const env = useLessonEnv();
  const week = weekProp ?? env.week;
  const n = useFigureNumber(fig.figure);
  const label = numbered ? figureLabel(week, n) : null;
  const [open, setOpen] = useState(false);
  const descId = useId();
  const aspect = viewBox ? `${viewBox[0]} / ${viewBox[1]}` : "5 / 3";
  const photo = photoFor(fig.figure);
  // A drawing with an overlay (hotspots) is always kept; the photo goes alongside.
  const replace = photo?.mode === "replace" && !overlay;

  return (
    <figure className={cn(compact ? "my-3" : "my-6", "break-inside-avoid", className)}>
      {photo && !replace ? (
        <div className="mb-2 rounded-md border border-line bg-panel p-2 sm:p-3" data-photo={fig.figure}>
          <PhotoImg p={photo} />
          <p className="mt-1.5 text-[0.9rem] text-ink-2">
            <span className="font-semibold text-ink">ภาพถ่ายของจริง</span>
            {photo.caption ? ` · ${photo.caption}` : ""}
          </p>
          <PhotoCredit p={photo} />
        </div>
      ) : null}
      {replace && photo ? (
        <div className="relative rounded-md border border-line bg-panel p-2 sm:p-3" data-photo={fig.figure}>
          <PhotoImg p={photo} />
          {expandable ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="absolute right-1.5 top-1.5 grid size-9 place-items-center rounded-sm border border-line bg-panel/90 text-ink-2 shadow-1 hover:text-ink print:hidden"
              aria-label={`ขยายภาพ${label ? ` ${label}` : ""} เต็มจอ`}
            >
              <Maximize2 className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
      ) : (
      <div className={cn("rounded-md border border-line bg-[var(--fig-bg)]", fig.wide && "overflow-x-auto")}>
        <div className={cn("relative p-2 sm:p-3", fig.wide && "min-w-[560px]")}>
          <div className="relative">
            <div className="fig" role="img" aria-label={label ? `${label} ${fig.caption}` : fig.caption} aria-describedby={descId}>
              <FigureBody figKey={fig.figure} week={week} aspect={aspect} alt={fig.alt} />
            </div>
            {overlay ? <div className="absolute inset-0">{overlay}</div> : null}
          </div>
          {expandable ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="absolute right-1.5 top-1.5 grid size-9 place-items-center rounded-sm border border-line bg-panel/90 text-ink-2 shadow-1 hover:text-ink print:hidden"
              aria-label={`ขยายภาพ${label ? ` ${label}` : ""} เต็มจอ`}
            >
              <Maximize2 className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
      )}
      <figcaption className="mt-2 max-w-[72ch] text-[0.95rem] leading-relaxed text-ink-2">
        {label ? <span className="mr-2 font-semibold text-ink">{label}</span> : null}
        {replace && photo ? (photo.caption ?? fig.caption) : fig.caption}
        {replace && photo ? <PhotoCredit p={photo} className="mt-0.5" /> : null}
      </figcaption>
      <p id={descId} className="sr-only">
        {replace && photo ? photo.alt : fig.alt}
      </p>
      {expandable ? (
        <Dialog open={open} onClose={() => setOpen(false)} title={label ? `${label} ${fig.caption}` : fig.caption} size="full">
          {replace && photo ? (
            <div className="mx-auto max-w-[1200px]">
              <PhotoImg p={photo} big />
              <PhotoCredit p={photo} className="mt-2" />
            </div>
          ) : (
            <div className="fig mx-auto max-w-[1200px] rounded-md bg-[var(--fig-bg)] p-2" role="img" aria-label={fig.alt}>
              <div className={cn(fig.wide && "overflow-x-auto")}>
                <div className={cn(fig.wide && "min-w-[720px]")}>
                  <FigureBody figKey={fig.figure} week={week} aspect={aspect} alt={fig.alt} />
                </div>
              </div>
            </div>
          )}
          <p className="mt-3 max-w-[72ch] text-[0.95rem] text-ink-2">{replace && photo ? photo.alt : fig.alt}</p>
        </Dialog>
      ) : null}
    </figure>
  );
}
