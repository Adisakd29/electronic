"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenText, FlaskConical, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/cn";

const links = [
  { href: "/learn", match: "/learn", label: "บทเรียน", icon: BookOpenText },
  { href: "/labs", match: "/labs", label: "ห้องทดลอง", icon: FlaskConical },
  { href: "/dashboard", match: "/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
];

/** Reads the URL, so it renders inside <Suspense> (TopBar) with NavLinksStatic as fallback. */
export function NavLinks() {
  return <NavLinksView path={usePathname() ?? ""} />;
}

/** Prerender-safe fallback: same links, no active marker. */
export function NavLinksStatic() {
  return <NavLinksView path="" />;
}

function NavLinksView({ path }: { path: string }) {
  return (
    <nav aria-label="เมนูหลัก" className="flex items-center gap-0.5">
      {links.map((l) => {
        const active = path === l.match || path.startsWith(`${l.match}/`);
        const Icon = l.icon;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative inline-flex h-10 items-center gap-1.5 rounded-sm px-2.5 font-medium",
              active ? "text-ink after:absolute after:inset-x-2 after:-bottom-[10px] after:h-[3px] after:rounded-full after:bg-copper" : "text-ink-2 hover:bg-panel-2 hover:text-ink",
            )}
          >
            <Icon className="size-[1.1rem]" aria-hidden />
            <span className="max-sm:sr-only">{l.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
