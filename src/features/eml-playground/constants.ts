import type { LucideIcon } from "lucide-react";
import {
  Binary,
  Braces,
  Calculator,
  Orbit,
  Waypoints,
  Workflow,
} from "lucide-react";

export type DiagramMode = "standard" | "pure";
export type LayoutMode = "dagre" | "elk";

export const DEFAULT_EXPRESSION = "exp(x) - ln(y)";
export const PURE_RENDER_LIMIT = 10000;

export const sampleExpressions = [
  { label: "核心算子", expr: "exp(x) - ln(y)" },
  { label: "对数展开", expr: "ln(x)" },
  { label: "乘幂", expr: "x^(1/2) + y^2" },
  { label: "三角函数", expr: "sin(x) + cos(y)" },
  { label: "分式结构", expr: "(x + 1) / (y - 1)" },
] as const;

export type SectionHighlight = {
  icon: LucideIcon;
  title: string;
  text: string;
};

export const paperHighlights: SectionHighlight[] = [
  {
    icon: Binary,
    title: "连续数学里的单一原语",
    text: "论文把 eml(x, y) = exp(x) - ln(y) 类比成连续世界的 NAND，用一个二元算子覆盖大量初等函数。",
  },
  {
    icon: Waypoints,
    title: "统一语法 = 统一搜索空间",
    text: "所有表达式都可以压成 S -> 1 | eml(S, S)，于是复杂函数族被规整成同构的满二叉树。",
  },
  {
    icon: Orbit,
    title: "复数中间过程是能力来源",
    text: "三角函数、pi、i 与分支行为都依赖复数主支；这不是副作用，而是表达完备性的代价。",
  },
];

export const emlibCapabilities: SectionHighlight[] = [
  {
    icon: Braces,
    title: "Parse / AST",
    text: "把标准初等表达式解析成结构化 AST，作为 lowering、分析和渲染的统一入口。",
  },
  {
    icon: Workflow,
    title: "Reduce To Pure EML",
    text: "把表达式收敛到只包含 1 和 eml(...) 的核心表示，直接对应论文最关键的统一语法。",
  },
  {
    icon: Calculator,
    title: "Evaluate & Verify",
    text: "对标准表达式和纯 EML 表达式分别求值，在线检查 lowering 前后的数值一致性。",
  },
];
