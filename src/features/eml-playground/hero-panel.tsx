import {
  Card,
  CardContent,
} from "@/components/ui/card";

function Pill({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-[color:var(--line)] bg-white/72 px-3 py-1 text-[10px] font-semibold tracking-[0.16em] text-[color:var(--ink-soft)] uppercase sm:text-[11px]">
      {children}
    </span>
  );
}

export default function HeroPanel() {
  return (
    <Card className="hero-panel overflow-hidden border-[color:var(--line-strong)]">
      <CardContent className="grid items-start gap-5 px-5 py-6 sm:px-6 sm:py-7 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] xl:px-8 xl:py-8">
        <div className="min-w-0 space-y-4 sm:space-y-5">
          <div className="flex flex-wrap gap-2">
            <Pill>All elementary functions from a single operator</Pill>
            <Pill>Pure Frontend Playground</Pill>
          </div>
          <div className="space-y-4">
            <h1 className="font-display text-[2.7rem] leading-[0.94] text-[color:var(--ink)] sm:text-5xl xl:text-[4.35rem]">
              EML as a
              <span className="block text-[color:var(--accent-strong)]">
                Visual Computing Primitive
              </span>
            </h1>
            <p className="max-w-2xl text-[15px] leading-7 text-[color:var(--ink-soft)] sm:text-lg">
              这个页面把论文最核心的理论和 <code>emlib</code> 的能力压缩到同一个前端界面里:
              先解释为什么 <code>eml(x, y) = exp(x) - ln(y)</code>{" "}
              值得被看成连续数学里的单一原语，再让你直接把表达式 lowering
              成纯 EML，并渲染为 SVG 结构图。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="stat-block min-w-0">
              <div className="stat-label">Core Operator</div>
              <div className="font-display text-2xl text-[color:var(--ink)]">
                eml(x, y)
              </div>
              <div className="text-sm leading-6 text-[color:var(--ink-soft)]">
                exp(x) - ln(y)
              </div>
            </div>
            <div className="stat-block min-w-0">
              <div className="stat-label">Unified Grammar</div>
              <div className="font-mono text-lg text-[color:var(--ink)]">
                S -&gt; 1 | eml(S,S)
              </div>
              <div className="text-sm leading-6 text-[color:var(--ink-soft)]">
                异构运算族被规整成同构树。
              </div>
            </div>
            <div className="stat-block min-w-0">
              <div className="stat-label">Why It Matters</div>
              <div className="font-display text-2xl text-[color:var(--ink)]">
                Search Space
              </div>
              <div className="text-sm leading-6 text-[color:var(--ink-soft)]">
                更适合符号回归、编译和可视化。
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-4 rounded-[1.2rem] border border-[color:var(--line)] bg-[color:var(--paper-strong)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold tracking-[0.2em] text-[color:var(--ink-soft)] uppercase">
                Lowering Pipeline
              </div>
              <div className="mt-1 font-display text-2xl text-[color:var(--ink)]">
                Theory to Interface
              </div>
            </div>
            <div className="rounded-full border border-[color:var(--line)] bg-white/80 px-3 py-1 text-xs font-semibold text-[color:var(--accent-strong)]">
              docs + emlib
            </div>
          </div>
          <div className="space-y-3">
            {[
              [
                "Standard Expression",
                "用户输入初等表达式，如 ln(x)、sin(x)+cos(y) 或 exp(x)-ln(y)",
              ],
              [
                "Pure EML Tree",
                "通过 emlib 的 reduceTypes / toPureEml，把表达式压到统一核心语法",
              ],
              [
                "D2 SVG Preview",
                "把 AST 导出为 D2，再在浏览器里直接渲染成 SVG 结构图",
              ],
            ].map(([title, text], index) => (
              <div
                key={title}
                className="min-w-0 rounded-[0.95rem] border border-[color:var(--line)] bg-white/80 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-[color:var(--accent-soft)] font-semibold text-[color:var(--accent-strong)]">
                    {index + 1}
                  </div>
                  <div className="font-semibold text-[color:var(--ink)]">
                    {title}
                  </div>
                </div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
