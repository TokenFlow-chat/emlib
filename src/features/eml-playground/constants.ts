import type { IconType } from "react-icons";
import {
  LuBinary,
  LuBrain,
  LuBraces,
  LuCalculator,
  LuOrbit,
  LuWaypoints,
  LuWorkflow,
} from "react-icons/lu";

export type DiagramMode = "standard" | "pure";
export type DiagramSource = "standard" | "pure" | "shortest" | "lifted";
export type LayoutMode = "radial" | "layered" | "free";
export type CompressionMode = "light" | "medium" | "aggressive";
export type MasterPresetId = "exp" | "eMinusX" | "ln";
export type DedupMode = "all" | "compound" | "none";

export const DEFAULT_EXPRESSION = "exp(-x) - ln(x*y)";
export const GRAPH_RENDER_NODE_LIMIT = 3_000;
export const DEFAULT_SYNTH_TARGET = "ln(x)";
export const DEFAULT_SYNTH_MAX_LEAVES = 7;
export const DEFAULT_SYNTH_BEAM_WIDTH = 128;
export const DEFAULT_COMPRESSION_MODE: CompressionMode = "medium";
export const DEFAULT_MASTER_PRESET: MasterPresetId = "exp";
export const DEFAULT_DEDUP_MODE: DedupMode = "all";
export const DEFAULT_LAYOUT_MODE: LayoutMode = "free";
export const SYNTH_MAX_LEAF_OPTIONS = [5, 7, 9, 11] as const;
export const SYNTH_BEAM_WIDTH_OPTIONS = [64, 128, 256, 384] as const;

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
  { icon: LuBrain },
];
