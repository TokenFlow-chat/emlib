export const NODE_COLORS = {
  operator: "#2f7d8c",
  variable: "#b9783b",
  constant: "#a84f6a",
  other: "#52616b",
} as const;

export const LINK_COLORS = {
  left: "#2d63c8",
  right: "#c44f82",
  value: "#3f8f76",
  other: "#7f9492",
} as const;

export type NodeRole = keyof typeof NODE_COLORS;
export type LinkArgument = keyof typeof LINK_COLORS;

export function cssCustomProperties(): Record<string, string> {
  return {
    "--fg-node-operator": NODE_COLORS.operator,
    "--fg-node-variable": NODE_COLORS.variable,
    "--fg-node-constant": NODE_COLORS.constant,
    "--fg-node-other": NODE_COLORS.other,
    "--fg-link-left": LINK_COLORS.left,
    "--fg-link-right": LINK_COLORS.right,
    "--fg-link-value": LINK_COLORS.value,
    "--fg-link-other": LINK_COLORS.other,
  };
}
