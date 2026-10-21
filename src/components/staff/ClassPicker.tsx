"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui";

export function ClassPicker({ classes, current }: { classes: { id: string; name: string; term: string; archived: boolean }[]; current: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  return (
    <form method="get" action={pathname} className="flex flex-wrap items-center gap-2">
      <label htmlFor="class-picker" className="font-medium text-ink-2">
        ห้องเรียน
      </label>
      <Select
        id="class-picker"
        name="class"
        defaultValue={current ?? ""}
        className="w-auto min-w-56"
        onChange={(e) => {
          const p = new URLSearchParams(sp.toString());
          p.set("class", e.target.value);
          router.push(`${pathname}?${p.toString()}`);
        }}
      >
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} · ภาคเรียน {c.term}
            {c.archived ? " (เก็บเข้าคลัง)" : ""}
          </option>
        ))}
      </Select>
      <noscript>
        <button type="submit">เลือก</button>
      </noscript>
    </form>
  );
}
