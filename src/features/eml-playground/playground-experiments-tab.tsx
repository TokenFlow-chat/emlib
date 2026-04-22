import { LuBrain, LuFlaskConical, LuScanSearch, LuSparkles } from "react-icons/lu";

import { InfoTip } from "@/components/ui/info-tip";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AsyncMessage,
  ExperimentShell,
  SegmentedTabs,
  StatPill,
} from "@/features/eml-playground/playground-shared";
import {
  SYNTH_BEAM_WIDTH_OPTIONS,
  SYNTH_MAX_LEAF_OPTIONS,
  type CompressionMode,
  type MasterPresetId,
} from "@/features/eml-playground/constants";
import type { PlaygroundStudioState } from "@/features/eml-playground/use-playground-studio";
import {
  formatScientific,
  formatSignedDelta,
  formatTypeSet,
} from "@/features/eml-playground/utils";
import { useI18n, useMessages } from "@/i18n";

export default function PlaygroundExperimentsTab({ studio }: { studio: PlaygroundStudioState }) {
  const { formatNumber } = useI18n();
  const playground = useMessages((messages) => messages.playground);
  const {
    experimentTab,
    setExperimentTab,
    compressionMode,
    setCompressionMode,
    compressionState,
    analysisState,
    runCompressionDemo,
    synthTarget,
    setSynthTarget,
    synthTargetState,
    synthMaxLeaves,
    setSynthMaxLeaves,
    synthBeamWidth,
    setSynthBeamWidth,
    synthesisState,
    runSynthesisDemo,
    applySynthTarget,
    expression,
    masterPresetId,
    setMasterPresetId,
    masterPreset,
    masterTree,
    masterState,
    runMasterDemo,
  } = studio;

  return (
    <div className="space-y-3.5">
      <SegmentedTabs
        value={experimentTab}
        onChange={setExperimentTab}
        items={[
          {
            value: "compression",
            label: playground.experiments.compression.title,
            shortLabel: playground.experiments.compression.shortLabel,
          },
          {
            value: "synthesis",
            label: playground.experiments.synthesis.title,
            shortLabel: playground.experiments.synthesis.shortLabel,
          },
          {
            value: "master",
            label: playground.experiments.master.title,
            shortLabel: playground.experiments.master.shortLabel,
          },
        ]}
      />

      {experimentTab === "compression" ? (
        <ExperimentShell
          eyebrow={playground.experiments.compression.eyebrow}
          title={playground.experiments.compression.title}
          icon={<LuSparkles className="size-5" />}
          tools={<InfoTip label={playground.experiments.compression.description} />}
        >
          <div className="grid gap-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[color:var(--ink)]">
                  {playground.experiments.compression.levelLabel}
                </Label>
                <Select
                  value={compressionMode}
                  onValueChange={(value) => setCompressionMode(value as CompressionMode)}
                >
                  <SelectTrigger
                    size="sm"
                    className="w-full rounded-[0.75rem] border-[color:var(--line)] bg-[color:var(--paper-strong)]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      {playground.experiments.compression.levels.light}
                    </SelectItem>
                    <SelectItem value="medium">
                      {playground.experiments.compression.levels.medium}
                    </SelectItem>
                    <SelectItem value="aggressive">
                      {playground.experiments.compression.levels.aggressive}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {analysisState.ok ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <StatPill
                    label={playground.experiments.compression.baselineLabel}
                    value={formatNumber(analysisState.pure.metrics.tokenCount)}
                  />
                  <StatPill
                    label={playground.experiments.compression.typesLabel}
                    value={formatTypeSet(analysisState.pure.metrics.types)}
                  />
                </div>
              ) : (
                <AsyncMessage>
                  {playground.experiments.compression.requiresValidExpression}
                </AsyncMessage>
              )}

              <Button
                type="button"
                variant="outline"
                className="h-8 w-full rounded-[0.8rem] border-[color:var(--line)] bg-[color:var(--paper-strong)]"
                disabled={!analysisState.ok || compressionState.status === "running"}
                onClick={() => {
                  void runCompressionDemo();
                }}
              >
                <LuScanSearch className="size-4" />
                {compressionState.status === "running"
                  ? playground.experiments.shared.running
                  : playground.experiments.compression.runButton}
              </Button>
            </div>

            <div className="space-y-3">
              {compressionState.status === "idle" ? (
                <AsyncMessage>{playground.experiments.compression.idleHint}</AsyncMessage>
              ) : compressionState.status === "error" ? (
                <AsyncMessage tone="warning">{compressionState.error}</AsyncMessage>
              ) : compressionState.status === "success" && compressionState.data.exprText ? (
                <>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <StatPill
                      label={playground.experiments.compression.afterLabel}
                      value={formatNumber(compressionState.data.candidateTokens ?? 0)}
                    />
                    <StatPill
                      label={playground.experiments.compression.gainLabel}
                      value={formatSignedDelta(
                        (compressionState.data.candidateTokens ?? 0) -
                          compressionState.data.baselineTokens,
                      )}
                    />
                    <StatPill
                      label={playground.experiments.compression.deltaLabel}
                      value={formatScientific(compressionState.data.delta ?? Number.NaN)}
                    />
                  </div>
                  <pre className="max-h-32 max-w-full overflow-auto rounded-[0.85rem] border border-[color:var(--line)] bg-[color:var(--paper-strong)] p-2.5 font-mono text-xs leading-5 text-[color:var(--ink)]">
                    {compressionState.data.exprText}
                  </pre>
                </>
              ) : compressionState.status === "success" ? (
                <AsyncMessage>{playground.experiments.compression.noImprovement}</AsyncMessage>
              ) : null}
            </div>
          </div>
        </ExperimentShell>
      ) : null}

      {experimentTab === "synthesis" ? (
        <ExperimentShell
          eyebrow={playground.experiments.synthesis.eyebrow}
          title={playground.experiments.synthesis.title}
          icon={<LuFlaskConical className="size-5" />}
          tools={<InfoTip label={playground.experiments.synthesis.description} />}
        >
          <div className="flex flex-wrap gap-2">
            {playground.experiments.synthesis.samples.map((sample) => (
              <Button
                key={sample.expr}
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full border-[color:var(--line)] bg-[color:var(--paper-strong)] px-2.5 text-[12px]"
                onClick={() => applySynthTarget(sample.expr)}
              >
                {sample.label}
              </Button>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full border-[color:var(--line)] bg-[color:var(--paper-strong)] px-2.5 text-[12px]"
              onClick={() => applySynthTarget(expression)}
            >
              {playground.experiments.synthesis.useCurrent}
            </Button>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="synth-target" className="text-[color:var(--ink)]">
                  {playground.experiments.synthesis.targetLabel}
                </Label>
                <Textarea
                  id="synth-target"
                  value={synthTarget}
                  onChange={(event) => setSynthTarget(event.target.value)}
                  className="min-h-22 resize-y rounded-[0.85rem] border-[color:var(--line)] bg-[color:var(--paper-strong)] font-mono text-sm leading-5"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[color:var(--ink)]">
                    {playground.experiments.synthesis.maxLeavesLabel}
                  </Label>
                  <Select
                    value={String(synthMaxLeaves)}
                    onValueChange={(value) => setSynthMaxLeaves(Number(value))}
                  >
                    <SelectTrigger
                      size="sm"
                      className="w-full rounded-[0.75rem] border-[color:var(--line)] bg-[color:var(--paper-strong)]"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SYNTH_MAX_LEAF_OPTIONS.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {String(option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[color:var(--ink)]">
                    {playground.experiments.synthesis.beamWidthLabel}
                  </Label>
                  <Select
                    value={String(synthBeamWidth)}
                    onValueChange={(value) => setSynthBeamWidth(Number(value))}
                  >
                    <SelectTrigger
                      size="sm"
                      className="w-full rounded-[0.75rem] border-[color:var(--line)] bg-[color:var(--paper-strong)]"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SYNTH_BEAM_WIDTH_OPTIONS.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {String(option)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {synthTargetState.ok ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <StatPill
                    label={playground.experiments.synthesis.targetTokensLabel}
                    value={formatNumber(synthTargetState.metrics.tokenCount)}
                  />
                  <StatPill
                    label={playground.experiments.synthesis.variablesLabel}
                    value={synthTargetState.variables.join(", ") || "none"}
                  />
                </div>
              ) : (
                <AsyncMessage tone="warning">
                  {playground.experiments.synthesis.invalidTarget({
                    detail: synthTargetState.error,
                  })}
                </AsyncMessage>
              )}

              <Button
                type="button"
                variant="outline"
                className="h-8 w-full rounded-[0.8rem] border-[color:var(--line)] bg-[color:var(--paper-strong)]"
                disabled={!synthTargetState.ok || synthesisState.status === "running"}
                onClick={() => {
                  void runSynthesisDemo();
                }}
              >
                <LuFlaskConical className="size-4" />
                {synthesisState.status === "running"
                  ? playground.experiments.shared.running
                  : playground.experiments.synthesis.runButton}
              </Button>
            </div>

            <div className="space-y-3">
              {synthesisState.status === "idle" ? (
                <AsyncMessage>{playground.experiments.synthesis.idleHint}</AsyncMessage>
              ) : synthesisState.status === "error" ? (
                <AsyncMessage tone="warning">{synthesisState.error}</AsyncMessage>
              ) : synthesisState.status === "success" ? (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <StatPill
                      label={playground.experiments.synthesis.resultTokensLabel}
                      value={formatNumber(synthesisState.data.resultTokens)}
                    />
                    <StatPill
                      label={playground.experiments.synthesis.leavesLabel}
                      value={formatNumber(synthesisState.data.leaves)}
                    />
                    <StatPill
                      label={playground.experiments.synthesis.distanceLabel}
                      value={formatScientific(synthesisState.data.distance)}
                    />
                    <StatPill
                      label={playground.experiments.synthesis.deltaLabel}
                      value={formatScientific(synthesisState.data.delta)}
                    />
                  </div>
                  <pre className="max-h-32 max-w-full overflow-auto rounded-[0.85rem] border border-[color:var(--line)] bg-[color:var(--paper-strong)] p-2.5 font-mono text-xs leading-5 text-[color:var(--ink)]">
                    {synthesisState.data.exprText}
                  </pre>
                </>
              ) : null}
            </div>
          </div>
        </ExperimentShell>
      ) : null}

      {experimentTab === "master" ? (
        <ExperimentShell
          eyebrow={playground.experiments.master.eyebrow}
          title={playground.experiments.master.title}
          icon={<LuBrain className="size-5" />}
          tools={<InfoTip label={playground.experiments.master.description} />}
        >
          <div className="grid gap-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[color:var(--ink)]">
                  {playground.experiments.master.presetLabel}
                </Label>
                <Select
                  value={masterPresetId}
                  onValueChange={(value) => setMasterPresetId(value as MasterPresetId)}
                >
                  <SelectTrigger
                    size="sm"
                    className="w-full rounded-[0.75rem] border-[color:var(--line)] bg-[color:var(--paper-strong)]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exp">{playground.experiments.master.presets.exp}</SelectItem>
                    <SelectItem value="eMinusX">
                      {playground.experiments.master.presets.eMinusX}
                    </SelectItem>
                    <SelectItem value="ln">{playground.experiments.master.presets.ln}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-[0.85rem] border border-[color:var(--line)] bg-[color:var(--paper-strong)] p-3">
                <div className="text-sm font-semibold text-[color:var(--ink)]">
                  {masterPreset.expr}
                </div>
                <p className="mt-1.5 text-sm leading-5 text-[color:var(--ink-soft)]">
                  {playground.experiments.master.presetDescriptions[masterPresetId]}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <StatPill
                  label={playground.experiments.master.depthLabel}
                  value={formatNumber(masterTree.depth)}
                />
                <StatPill
                  label={playground.experiments.master.nodesLabel}
                  value={formatNumber(masterTree.nodeCount)}
                />
                <StatPill
                  label={playground.experiments.master.paramsLabel}
                  value={formatNumber(masterTree.paramCount)}
                />
              </div>

              <Button
                type="button"
                variant="outline"
                className="h-8 w-full rounded-[0.8rem] border-[color:var(--line)] bg-[color:var(--paper-strong)]"
                disabled={masterState.status === "running"}
                onClick={() => {
                  void runMasterDemo();
                }}
              >
                <LuBrain className="size-4" />
                {masterState.status === "running"
                  ? playground.experiments.shared.running
                  : playground.experiments.master.runButton}
              </Button>
            </div>

            <div className="space-y-3">
              {masterState.status === "idle" ? (
                <AsyncMessage>{playground.experiments.master.idleHint}</AsyncMessage>
              ) : masterState.status === "error" ? (
                <AsyncMessage tone="warning">{masterState.error}</AsyncMessage>
              ) : masterState.status === "success" ? (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <StatPill
                      label={playground.experiments.master.lossLabel}
                      value={formatScientific(masterState.data.loss)}
                    />
                    <StatPill
                      label={playground.experiments.master.restartsLabel}
                      value={formatNumber(masterState.data.restarts)}
                    />
                    <StatPill
                      label={playground.experiments.master.epochsLabel}
                      value={formatNumber(masterState.data.totalEpochs)}
                    />
                    <StatPill
                      label={playground.experiments.master.statusLabel}
                      value={
                        masterState.data.success
                          ? playground.experiments.master.statuses.success
                          : playground.experiments.master.statuses.partial
                      }
                    />
                  </div>
                  {masterState.data.exprText ? (
                    <pre className="max-h-32 max-w-full overflow-auto rounded-[0.85rem] border border-[color:var(--line)] bg-[color:var(--paper-strong)] p-2.5 font-mono text-xs leading-5 text-[color:var(--ink)]">
                      {masterState.data.exprText}
                    </pre>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </ExperimentShell>
      ) : null}
    </div>
  );
}
