"use client";
import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

const subscribe = () => () => {};
const useMounted = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

/** Light/dark switch. Icons swap with CSS so the server HTML never mismatches. */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const dark = mounted && resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label="โหมดมืด"
      aria-pressed={mounted ? dark : undefined}
      title={dark ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
      className="grid size-10 place-items-center rounded-sm text-ink-2 hover:bg-panel-2 hover:text-ink"
    >
      <Sun className="hidden size-5 dark:block" aria-hidden />
      <Moon className="size-5 dark:hidden" aria-hidden />
    </button>
  );
}
