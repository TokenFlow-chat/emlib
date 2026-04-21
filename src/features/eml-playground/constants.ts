import type { IconType } from "react-icons";
import { LuBinary, LuBraces, LuCalculator, LuOrbit, LuWaypoints, LuWorkflow } from "react-icons/lu";

export type DiagramMode = "standard" | "pure";
export type LayoutMode = "dagre" | "elk";

export const DEFAULT_EXPRESSION = "exp(x^2) - ln(x*y)";
export const PURE_RENDER_LIMIT = 10000;

export type SectionHighlight = {
  icon: IconType;
};

export const paperHighlights: SectionHighlight[] = [
  { icon: LuBinary },
  { icon: LuWaypoints },
  { icon: LuOrbit },
];

export const emlibCapabilities: SectionHighlight[] = [
  { icon: LuBraces },
  { icon: LuWorkflow },
  { icon: LuCalculator },
];
