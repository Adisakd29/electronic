"use client";
/** Lazy lab module loading (one chunk per lab) with a module-level cache. */
import { Component, useEffect, useState, type ReactNode } from "react";
import { FlaskConical, RotateCcw } from "lucide-react";
import type { LabId } from "@/content/types";
import type { LabModule, LabProps } from "@/labs/types";
import { labLoaders } from "@/labs";
import { Button } from "@/components/ui";

type Entry = { status: "pending"; promise: Promise<void> } | { status: "ok"; lab: LabModule } | { status: "error" };
const cache = new Map<LabId, Entry>();

function load(id: LabId): Entry {
  const hit = cache.get(id);
  if (hit && hit.status !== "error") return hit;
  const loader = labLoaders[id];
  if (!loader) {
    const e: Entry = { status: "error" };
    cache.set(id, e);
    return e;
  }
  const promise = loader().then(
    (m) => void cache.set(id, m?.lab ? { status: "ok", lab: m.lab } : { status: "error" }),
    (err) => {
      console.error(err);
      cache.set(id, { status: "error" });
    },
  );
  const e: Entry = { status: "pending", promise };
  cache.set(id, e);
  return e;
}

/** `undefined` while loading, `null` on failure. */
export function useLabModule(id: LabId): { lab: LabModule | null | undefined; retry: () => void } {
  const [, force] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const cur = cache.get(id);
  useEffect(() => {
    const e = load(id);
    if (e.status === "pending") {
      let alive = true;
      e.promise.then(() => alive && force((n) => n + 1));
      return () => {
        alive = false;
      };
    }
  }, [id, attempt]);
  const lab = !cur || cur.status === "pending" ? undefined : cur.status === "ok" ? cur.lab : null;
  return {
    lab,
    retry: () => {
      cache.delete(id);
      setAttempt((a) => a + 1);
    },
  };
}

class LabBoundary extends Component<{ children: ReactNode; onReset: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(e: unknown) {
    console.error(e);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="rounded-md border border-danger/40 bg-danger-soft px-4 py-4">
        <p className="font-semibold text-danger">ห้องทดลองหยุดทำงานกะทันหัน</p>
        <p className="mt-1 text-ink-2">กด “เริ่มห้องทดลองใหม่” เพื่อโหลดอีกครั้ง ค่าที่ตั้งไว้จะกลับเป็นค่าเริ่มต้น</p>
        <Button
          className="mt-3"
          variant="secondary"
          onClick={() => {
            this.setState({ failed: false });
            this.props.onReset();
          }}
        >
          <RotateCcw className="size-4" aria-hidden />
          เริ่มห้องทดลองใหม่
        </Button>
      </div>
    );
  }
}

export function LabSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]" aria-busy="true" aria-label="กำลังโหลดห้องทดลอง">
      <div className="ee-skeleton rounded-md" style={{ aspectRatio: compact ? "16 / 9" : "4 / 3" }} />
      <div className="ee-skeleton hidden min-h-64 rounded-md lg:block" />
    </div>
  );
}

/** Loads and renders a lab component with error/loading states. */
export function LabFrame({
  id,
  preset,
  onState,
  compact,
  onModule,
  resetToken = 0,
}: {
  id: LabId;
  preset?: string;
  onState?: LabProps["onState"];
  compact?: boolean;
  onModule?: (lab: LabModule) => void;
  /** Change this value to remount the lab at its preset ("เริ่มต้นใหม่"). */
  resetToken?: number;
}) {
  const { lab, retry } = useLabModule(id);
  const [resetKey, setResetKey] = useState(0);
  useEffect(() => {
    if (lab) onModule?.(lab);
  }, [lab, onModule]);
  if (lab === undefined) return <LabSkeleton compact={compact} />;
  if (lab === null)
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-danger/40 bg-danger-soft px-4 py-4">
        <FlaskConical className="size-5 text-danger" aria-hidden />
        <p className="min-w-0 flex-1 text-ink-2">โหลดห้องทดลองไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วกดลองอีกครั้ง</p>
        <Button variant="secondary" onClick={retry}>
          ลองอีกครั้ง
        </Button>
      </div>
    );
  const L = lab.Component;
  return (
    <LabBoundary onReset={() => setResetKey((k) => k + 1)}>
      <L key={`${preset ?? "default"}-${resetKey}-${resetToken}`} preset={preset} onState={onState} compact={compact} />
    </LabBoundary>
  );
}
