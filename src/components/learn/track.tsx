"use client";
/**
 * Learner trade (แผนก) for lesson examples.
 * Signed-in: stored on the account (setMyTrack); guests: this browser only.
 * Outside a provider (staff previews, dev harness) the context is "no trade"
 * with a local-only setter, so every renderer works anywhere.
 */
import { createContext, use, useCallback, useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { Briefcase } from "lucide-react";
import { isTrackId, tracks } from "@/content/course";
import type { TrackId } from "@/content/types";
import type { TrackInfo } from "@/server/core/track";
import { setMyTrack } from "@/server/actions/learning";
import { cn } from "@/lib/cn";
import { Markdown } from "./Markdown";

const GUEST_KEY = "eelearn.track.v1";

interface TrackCtx extends TrackInfo {
  setTrack: (t: TrackId | null) => void;
  saving: boolean;
  error: string | null;
}

const LocalOnly = createContext<TrackCtx | null>(null);

export function TrackProvider({ initial, guest = false, children }: { initial: TrackInfo | null; guest?: boolean; children: ReactNode }) {
  const [info, setInfo] = useState<TrackInfo>(initial ?? { track: null, own: null, classTrack: null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guests: read the choice kept in this browser after mount.
  useEffect(() => {
    if (!guest) return;
    const t = setTimeout(() => {
      try {
        const v = window.localStorage.getItem(GUEST_KEY);
        if (isTrackId(v)) setInfo({ track: v, own: v, classTrack: null });
      } catch {
        /* storage blocked: stay general */
      }
    }, 0);
    return () => clearTimeout(t);
  }, [guest]);

  const setTrack = useCallback(
    (t: TrackId | null) => {
      setError(null);
      setInfo((p) => ({ ...p, own: t, track: t ?? p.classTrack }));
      if (guest) {
        try {
          if (t) window.localStorage.setItem(GUEST_KEY, t);
          else window.localStorage.removeItem(GUEST_KEY);
        } catch {
          /* ignore */
        }
        return;
      }
      setSaving(true);
      setMyTrack(t)
        .then((r) => {
          if (r.ok) setInfo(r.data);
          else setError(r.error);
        })
        .catch(() => setError("บันทึกแผนกไม่สำเร็จ ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง"))
        .finally(() => setSaving(false));
    },
    [guest],
  );

  const value = useMemo(() => ({ ...info, setTrack, saving, error }), [info, setTrack, saving, error]);
  return <LocalOnly value={value}>{children}</LocalOnly>;
}

/** Without a provider: no trade, choices kept for this view only. */
function useStandalone(): TrackCtx {
  const [t, setT] = useState<TrackId | null>(null);
  return { track: t, own: t, classTrack: null, setTrack: setT, saving: false, error: null };
}

export function useTrack(): TrackCtx {
  const ctx = use(LocalOnly);
  const local = useStandalone();
  return ctx ?? local;
}

export const trackLabel = (t: TrackId | null) => (t ? (tracks.find((x) => x.id === t)?.short ?? t) : "ทั่วไป");

/** Select box for the learner's trade. */
export function TrackPicker({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { own, classTrack, setTrack, saving, error } = useTrack();
  const id = useId();
  const classLabel = classTrack ? tracks.find((x) => x.id === classTrack)?.short : null;
  return (
    <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1", className)}>
      <label htmlFor={id} className={cn("inline-flex items-center gap-1.5 font-medium text-ink", compact && "text-[0.92rem]")}>
        <Briefcase className="size-4 text-copper" aria-hidden />
        ตัวอย่างจากงานแผนก
      </label>
      <select
        id={id}
        value={own ?? ""}
        disabled={saving}
        onChange={(e) => setTrack(isTrackId(e.target.value) ? e.target.value : null)}
        className="h-9 max-w-full rounded-sm border border-line-strong bg-panel px-2 text-[0.95rem] text-ink"
      >
        <option value="">{classLabel ? `ตามห้องเรียน (${classLabel})` : "ทั่วไป (ไม่ระบุแผนก)"}</option>
        {tracks.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
      {error ? (
        <span role="alert" className="text-[0.88rem] text-danger">
          {error}
        </span>
      ) : null}
    </div>
  );
}

/** "ในงานแผนกของคุณ" — shows the note of the learner's trade; others can be opened. */
export function TrackNotes({ notes, title, intro = false }: { notes: Partial<Record<TrackId, string>>; title?: string; intro?: boolean }) {
  const { track } = useTrack();
  const available = tracks.filter((t) => notes[t.id]);
  const [peek, setPeek] = useState<TrackId | null>(null);
  if (!available.length) return null;
  const mine = track && notes[track] ? track : null;
  const shown = peek ?? mine;
  const heading = title ?? (intro ? "เรื่องนี้ใช้ในงานแผนกไหนบ้าง" : "ในงานแผนกของคุณ");
  return (
    <aside aria-label={heading} className="ee-track my-5 max-w-[72ch] rounded-md border border-copper/40 bg-copper-soft/40 px-4 py-3 break-inside-avoid">
      <p className="mb-1 flex flex-wrap items-center gap-2 font-semibold text-ink">
        <Briefcase className="size-5 shrink-0 text-copper" aria-hidden />
        <span className="min-w-0 flex-1">
          {heading}
          {shown ? <span className="font-normal text-ink-2"> · {tracks.find((t) => t.id === shown)?.short}</span> : null}
        </span>
      </p>
      {shown ? (
        <Markdown className="text-ink-2 [&_p:last-child]:mb-0">{notes[shown]!}</Markdown>
      ) : (
        <p className="text-ink-2">เลือกแผนกของคุณ (ด้านบนของบทเรียน) เพื่อดูตัวอย่างจากงานของคุณ หรือแตะชื่อแผนกด้านล่าง</p>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5 print:hidden" role="group" aria-label="ดูตัวอย่างของแผนกอื่น">
        {available.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={shown === t.id}
            onClick={() => setPeek(shown === t.id && peek ? null : t.id)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[0.85rem]",
              shown === t.id ? "border-copper bg-copper text-white dark:text-paper" : "border-line-strong bg-panel text-ink-2 hover:text-ink",
            )}
          >
            {t.short}
          </button>
        ))}
      </div>
    </aside>
  );
}
