"use client";
/**
 * Learning shell: 18-week sidebar on wide screens (≥ 1025 px), drawer below
 * that (native modal <dialog>: focus trap + Escape). The same `nav` element
 * renders in both places; links inside call `useDrawer().close()`.
 */
import { createContext, use, useState, type ReactNode } from "react";
import { PanelLeftOpen } from "lucide-react";
import { Dialog } from "@/components/ui/client";

const DrawerCtx = createContext<{ close: () => void; inDrawer: boolean }>({ close: () => {}, inDrawer: false });
export const useDrawer = () => use(DrawerCtx);

export function AppShell({ nav, children }: { nav: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mx-auto w-full max-w-[1480px] desk:grid desk:grid-cols-[19rem_minmax(0,1fr)]">
      <aside className="ee-sidebar sticky top-[60px] hidden h-[calc(100dvh-60px)] overflow-y-auto border-r border-line bg-panel/70 desk:block print:hidden" aria-label="สัปดาห์ทั้งหมด">
        <DrawerCtx value={{ close: () => {}, inDrawer: false }}>{nav}</DrawerCtx>
      </aside>
      <div className="min-w-0">
        <div className="sticky top-[60px] z-30 flex h-12 items-center gap-2 border-b border-line bg-paper/95 px-4 backdrop-blur desk:hidden print:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-sm px-2 font-semibold text-ink hover:bg-panel-2"
            aria-haspopup="dialog"
          >
            <PanelLeftOpen className="size-5" aria-hidden />
            สัปดาห์ทั้งหมด
          </button>
        </div>
        <main id="main" tabIndex={-1} className="min-w-0 px-4 pb-16 pt-5 outline-none sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
      <Dialog open={open} onClose={() => setOpen(false)} title="สัปดาห์ทั้งหมด" side="left">
        <DrawerCtx value={{ close: () => setOpen(false), inDrawer: true }}>
          <div className="-mx-5 -my-4">{nav}</div>
        </DrawerCtx>
      </Dialog>
    </div>
  );
}
