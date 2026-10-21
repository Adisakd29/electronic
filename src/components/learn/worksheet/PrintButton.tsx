"use client";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui";

export function PrintButton({ label = "พิมพ์ใบงาน" }: { label?: string }) {
  return (
    <Button variant="secondary" onClick={() => window.print()} className="print:hidden">
      <Printer className="size-5" aria-hidden />
      {label}
    </Button>
  );
}
