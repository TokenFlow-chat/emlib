import { useEffect, useRef } from "react";

import {
  DEFAULT_COMPRESSION_MODE,
  DEFAULT_DEDUP_MODE,
  DEFAULT_EXPRESSION,
  DEFAULT_LAYOUT_MODE,
  DEFAULT_MASTER_PRESET,
  DEFAULT_SYNTH_BEAM_WIDTH,
  DEFAULT_SYNTH_MAX_LEAVES,
  DEFAULT_SYNTH_TARGET,
  type CompressionMode,
  type DedupMode,
  type DiagramSource,
  type LayoutMode,
  type MasterPresetId,
} from "@/features/eml-playground/constants";
import type { ExperimentTab, WorkspaceTab } from "@/features/eml-playground/use-playground-studio";

export type PlaygroundUrlState = {
  workspaceTab: WorkspaceTab;
  experimentTab: ExperimentTab;
  expression: string;
  diagramSource: DiagramSource;
  layoutMode: LayoutMode;
  dedupMode: DedupMode;
  envValues: Record<string, string>;
  compressionMode: CompressionMode;
  synthTarget: string;
  synthMaxLeaves: number;
  synthBeamWidth: number;
  masterPresetId: MasterPresetId;
};

const queryKeys = {
  workspaceTab: "tab",
  experimentTab: "experiment",
  expression: "expr",
  diagramSource: "view",
  layoutMode: "layout",
  dedupMode: "dedup",
  envValues: "vars",
  compressionMode: "compression",
  synthTarget: "target",
  synthMaxLeaves: "leaves",
  synthBeamWidth: "beam",
  masterPresetId: "preset",
} as const;

const workspaceTabs = [
  "analyze",
  "compare",
  "experiments",
] as const satisfies readonly WorkspaceTab[];
const experimentTabs = [
  "compression",
  "synthesis",
  "master",
] as const satisfies readonly ExperimentTab[];
const diagramSources = [
  "standard",
  "pure",
  "shortest",
  "lifted",
] as const satisfies readonly DiagramSource[];
const layoutModes = ["td", "lr", "radial", "free"] as const satisfies readonly LayoutMode[];
const dedupModes = ["all", "compound", "none"] as const satisfies readonly DedupMode[];
const compressionModes = [
  "light",
  "medium",
  "aggressive",
] as const satisfies readonly CompressionMode[];
const masterPresetIds = ["exp", "eMinusX", "ln"] as const satisfies readonly MasterPresetId[];

const defaultPlaygroundUrlState: PlaygroundUrlState = {
  workspaceTab: "analyze",
  experimentTab: "compression",
  expression: DEFAULT_EXPRESSION,
  diagramSource: "pure",
  layoutMode: DEFAULT_LAYOUT_MODE,
  dedupMode: DEFAULT_DEDUP_MODE,
  envValues: {
    x: "0.5",
    y: "2",
  },
  compressionMode: DEFAULT_COMPRESSION_MODE,
  synthTarget: DEFAULT_SYNTH_TARGET,
  synthMaxLeaves: DEFAULT_SYNTH_MAX_LEAVES,
  synthBeamWidth: DEFAULT_SYNTH_BEAM_WIDTH,
  masterPresetId: DEFAULT_MASTER_PRESET,
};

function isOneOf<T extends readonly string[]>(
  value: string | null,
  allowed: T,
): value is T[number] {
  return value !== null && allowed.includes(value);
}

function sortStringRecord(value: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key.trim() !== "")
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function parseStringRecord(raw: string | null): Record<string, string> | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

    const entries = Object.entries(parsed as Record<string, unknown>).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value] as const] : [],
    );

    return sortStringRecord(Object.fromEntries(entries));
  } catch {
    return null;
  }
}

function parseNumber(raw: string | null, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function setQueryParam(
  params: URLSearchParams,
  key: string,
  value: string | number | Record<string, string>,
  defaultValue: string | number | Record<string, string>,
) {
  const normalizedValue =
    typeof value === "object" ? JSON.stringify(sortStringRecord(value)) : String(value);
  const normalizedDefault =
    typeof defaultValue === "object"
      ? JSON.stringify(sortStringRecord(defaultValue))
      : String(defaultValue);

  if (normalizedValue === normalizedDefault || normalizedValue === "{}") {
    params.delete(key);
    return;
  }

  params.set(key, normalizedValue);
}

function getLocationSearch(): string {
  if (typeof window === "undefined") return "";
  return window.location.search;
}

export function readPlaygroundUrlState(search = getLocationSearch()): PlaygroundUrlState {
  const params = new URLSearchParams(search);
  const workspaceTab = params.get(queryKeys.workspaceTab);
  const experimentTab = params.get(queryKeys.experimentTab);
  const diagramSource = params.get(queryKeys.diagramSource);
  const layoutMode = params.get(queryKeys.layoutMode);
  const dedupMode = params.get(queryKeys.dedupMode);
  const compressionMode = params.get(queryKeys.compressionMode);
  const masterPresetId = params.get(queryKeys.masterPresetId);

  return {
    workspaceTab: isOneOf(workspaceTab, workspaceTabs)
      ? workspaceTab
      : defaultPlaygroundUrlState.workspaceTab,
    experimentTab: isOneOf(experimentTab, experimentTabs)
      ? experimentTab
      : defaultPlaygroundUrlState.experimentTab,
    expression: params.get(queryKeys.expression) ?? defaultPlaygroundUrlState.expression,
    diagramSource: isOneOf(diagramSource, diagramSources)
      ? diagramSource
      : defaultPlaygroundUrlState.diagramSource,
    layoutMode: isOneOf(layoutMode, layoutModes)
      ? layoutMode
      : defaultPlaygroundUrlState.layoutMode,
    dedupMode: isOneOf(dedupMode, dedupModes) ? dedupMode : defaultPlaygroundUrlState.dedupMode,
    envValues:
      parseStringRecord(params.get(queryKeys.envValues)) ?? defaultPlaygroundUrlState.envValues,
    compressionMode: isOneOf(compressionMode, compressionModes)
      ? compressionMode
      : defaultPlaygroundUrlState.compressionMode,
    synthTarget: params.get(queryKeys.synthTarget) ?? defaultPlaygroundUrlState.synthTarget,
    synthMaxLeaves: parseNumber(
      params.get(queryKeys.synthMaxLeaves),
      defaultPlaygroundUrlState.synthMaxLeaves,
    ),
    synthBeamWidth: parseNumber(
      params.get(queryKeys.synthBeamWidth),
      defaultPlaygroundUrlState.synthBeamWidth,
    ),
    masterPresetId: isOneOf(masterPresetId, masterPresetIds)
      ? masterPresetId
      : defaultPlaygroundUrlState.masterPresetId,
  };
}

function buildPlaygroundUrl(state: PlaygroundUrlState): string {
  if (typeof window === "undefined") return "";

  const params = new URLSearchParams(window.location.search);

  setQueryParam(
    params,
    queryKeys.workspaceTab,
    state.workspaceTab,
    defaultPlaygroundUrlState.workspaceTab,
  );
  setQueryParam(
    params,
    queryKeys.experimentTab,
    state.experimentTab,
    defaultPlaygroundUrlState.experimentTab,
  );
  setQueryParam(
    params,
    queryKeys.expression,
    state.expression,
    defaultPlaygroundUrlState.expression,
  );
  setQueryParam(
    params,
    queryKeys.diagramSource,
    state.diagramSource,
    defaultPlaygroundUrlState.diagramSource,
  );
  setQueryParam(
    params,
    queryKeys.layoutMode,
    state.layoutMode,
    defaultPlaygroundUrlState.layoutMode,
  );
  setQueryParam(params, queryKeys.dedupMode, state.dedupMode, defaultPlaygroundUrlState.dedupMode);
  setQueryParam(params, queryKeys.envValues, state.envValues, defaultPlaygroundUrlState.envValues);
  setQueryParam(
    params,
    queryKeys.compressionMode,
    state.compressionMode,
    defaultPlaygroundUrlState.compressionMode,
  );
  setQueryParam(
    params,
    queryKeys.synthTarget,
    state.synthTarget,
    defaultPlaygroundUrlState.synthTarget,
  );
  setQueryParam(
    params,
    queryKeys.synthMaxLeaves,
    state.synthMaxLeaves,
    defaultPlaygroundUrlState.synthMaxLeaves,
  );
  setQueryParam(
    params,
    queryKeys.synthBeamWidth,
    state.synthBeamWidth,
    defaultPlaygroundUrlState.synthBeamWidth,
  );
  setQueryParam(
    params,
    queryKeys.masterPresetId,
    state.masterPresetId,
    defaultPlaygroundUrlState.masterPresetId,
  );

  const nextSearch = params.toString();
  return `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
}

export function usePlaygroundUrlSync({
  state,
  applyState,
}: {
  state: PlaygroundUrlState;
  applyState: (state: PlaygroundUrlState) => void;
}) {
  const applyStateRef = useRef(applyState);

  useEffect(() => {
    applyStateRef.current = applyState;
  }, [applyState]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = () => {
      applyStateRef.current(readPlaygroundUrlState(window.location.search));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const nextUrl = buildPlaygroundUrl(state);
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (nextUrl === currentUrl) return;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [state]);
}
