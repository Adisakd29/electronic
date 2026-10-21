import type { Week } from "./types";
import w01 from "./weeks/w01";
import w02 from "./weeks/w02";
import w03 from "./weeks/w03";
import w04 from "./weeks/w04";
import w05 from "./weeks/w05";
import w06 from "./weeks/w06";
import w07 from "./weeks/w07";
import w08 from "./weeks/w08";
import w09 from "./weeks/w09";
import w10 from "./weeks/w10";
import w11 from "./weeks/w11";
import w12 from "./weeks/w12";
import w13 from "./weeks/w13";
import w14 from "./weeks/w14";
import w15 from "./weeks/w15";
import w16 from "./weeks/w16";
import w17 from "./weeks/w17";
import w18 from "./weeks/w18";

export const weeks: Week[] = [w01, w02, w03, w04, w05, w06, w07, w08, w09, w10, w11, w12, w13, w14, w15, w16, w17, w18, ];

export function getWeek(n: number): Week | undefined {
  return weeks[n - 1];
}
