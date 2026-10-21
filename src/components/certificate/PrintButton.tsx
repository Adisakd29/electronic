"use client";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui";

export function PrintButton({ label = "พิมพ์ใบประกาศนียบัตร" }: { label?: string }) {
  return (
    <Button onClick={() => window.print()}>
      <Printer className="size-5" aria-hidden />
      {label}
    </Button>
  );
}
