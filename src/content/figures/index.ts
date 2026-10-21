import type { FigureMap } from "@/content/types";

/** Lazy figure modules per week (client side). */
export const figureLoaders: Record<number, () => Promise<{ figures: FigureMap }>> = {
  1: () => import("./w01"),
  2: () => import("./w02"),
  3: () => import("./w03"),
  4: () => import("./w04"),
  5: () => import("./w05"),
  6: () => import("./w06"),
  7: () => import("./w07"),
  8: () => import("./w08"),
  9: () => import("./w09"),
  10: () => import("./w10"),
  11: () => import("./w11"),
  12: () => import("./w12"),
  13: () => import("./w13"),
  14: () => import("./w14"),
  15: () => import("./w15"),
  16: () => import("./w16"),
  17: () => import("./w17"),
  18: () => import("./w18"),
};
