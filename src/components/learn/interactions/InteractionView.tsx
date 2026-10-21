"use client";
import type { Interaction } from "@/content/types";
import { Mcq, Predict } from "./Mcq";
import { Fill } from "./Fill";
import { Match } from "./Match";
import { Order } from "./Order";
import { Classify } from "./Classify";
import { FindFault, Hotspot } from "./Hotspot";
import { Scenario } from "./Scenario";
import type { InteractionProps } from "./shell";

/** Renders any interaction kind. Keyed by id so switching resets state. */
export function InteractionView(props: InteractionProps) {
  const { it } = props;
  switch (it.kind) {
    case "mcq":
      return <Mcq key={it.id} {...props} it={it} />;
    case "fill":
      return <Fill key={it.id} {...props} it={it} />;
    case "match":
      return <Match key={it.id} {...props} it={it} />;
    case "order":
      return <Order key={it.id} {...props} it={it} />;
    case "predict":
      return <Predict key={it.id} {...props} it={it} />;
    case "hotspot":
      return <Hotspot key={it.id} {...props} it={it} />;
    case "findFault":
      return <FindFault key={it.id} {...props} it={it} />;
    case "classify":
      return <Classify key={it.id} {...props} it={it} />;
    case "scenario":
      return <Scenario key={it.id} {...props} it={it} />;
    default:
      return <MissingInteraction id={(it as Interaction).id} />;
  }
}

export function MissingInteraction({ id }: { id: string }) {
  return (
    <p className="my-4 rounded-sm border border-dashed border-line-strong px-4 py-3 text-ink-3">
      กิจกรรม {id} ยังไม่พร้อมใช้งาน ข้ามไปส่วนถัดไปได้
    </p>
  );
}
