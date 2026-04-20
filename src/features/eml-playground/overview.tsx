import { type LucideIcon } from "lucide-react";

import {
  emlibCapabilities,
  paperHighlights,
} from "@/features/eml-playground/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function Pill({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-[color:var(--line)] bg-white/72 px-3 py-1 text-[10px] font-semibold tracking-[0.16em] text-[color:var(--ink-soft)] uppercase sm:text-[11px]">
      {children}
    </span>
  );
}

function SectionCard({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <Card className="paper-card border-[color:var(--line)]">
      <CardHeader className="gap-4">
        <div className="flex size-11 items-center justify-center rounded-2xl border border-[color:var(--line)] bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]">
          <Icon className="size-5" />
        </div>
        <div className="space-y-2">
          <CardTitle className="font-display text-2xl text-[color:var(--ink)]">
            {title}
          </CardTitle>
          <CardDescription className="leading-6 text-[color:var(--ink-soft)]">
            {text}
          </CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}

export function HeroPanel() {
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

export function HighlightsGrid() {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {paperHighlights.map((item) => (
        <SectionCard
          key={item.title}
          icon={item.icon}
          title={item.title}
          text={item.text}
        />
      ))}
    </section>
  );
}

export function SummaryPanels() {
  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,0.5fr)_minmax(0,0.5fr)]">
      <Card className="paper-card border-[color:var(--line)]">
        <CardHeader className="gap-3">
          <CardTitle className="font-display text-3xl text-[color:var(--ink)]">
            论文核心内容
          </CardTitle>
          <CardDescription className="max-w-xl leading-7 text-[color:var(--ink-soft)]">
            页面只保留最关键的三层叙事:
            单一算子的存在性、统一语法的表示论价值，以及复数中间过程在完备性中的必要性。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-[1rem] border border-[color:var(--line)] bg-[color:var(--paper-strong)] p-5">
            <div className="text-xs font-semibold tracking-[0.18em] text-[color:var(--ink-soft)] uppercase">
              核心公式
            </div>
            <div className="mt-3 font-display text-3xl text-[color:var(--ink)]">
              eml(x, y) = exp(x) - ln(y)
            </div>
            <p className="mt-3 text-sm leading-6 text-[color:var(--ink-soft)]">
              论文不是把 <code>exp</code> 和 <code>ln</code>{" "}
              生硬拼接，而是主张它们可以被内嵌进一个可重复复制的统一节点里。
            </p>
          </div>
          <div className="space-y-3">
            <div className="rounded-[0.95rem] border border-[color:var(--line)] bg-white/72 p-4">
              <div className="font-semibold text-[color:var(--ink)]">
                1. 连续世界里的 “NAND”
              </div>
              <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
                论文要找的是数学里的 Sheffer primitive。重点不在于某条公式漂亮，而在于“一个二元节点反复复制”是否足以恢复常见初等函数基底。
              </p>
            </div>
            <div className="rounded-[0.95rem] border border-[color:var(--line)] bg-white/72 p-4">
              <div className="font-semibold text-[color:var(--ink)]">
                2. 统一结构比表达更短更重要
              </div>
              <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
                纯 EML 表达式通常并不短，但它把复杂 grammar
                压成单一树形，因此更适合编译、搜索、符号回归和硬件映射。
              </p>
            </div>
            <div className="rounded-[0.95rem] border border-[color:var(--line)] bg-white/72 p-4">
              <div className="font-semibold text-[color:var(--ink)]">
                3. 复数与主支不是实现细节
              </div>
              <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
                三角函数、<code>pi</code>、<code>i</code>{" "}
                的恢复依赖复数对数和 branch choice，所以前端 playground
                也把数值校验放在复数近似语义之上。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="paper-card border-[color:var(--line)]">
        <CardHeader className="gap-3">
          <CardTitle className="font-display text-3xl text-[color:var(--ink)]">
            emlib 可视化能力
          </CardTitle>
          <CardDescription className="leading-7 text-[color:var(--ink-soft)]">
            这里展示的不是静态宣传，而是页面真正调用到的库能力:
            解析、lowering、数值验证与 D2 结构图导出。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {emlibCapabilities.map((item) => (
            <div
              key={item.title}
              className="min-w-0 rounded-[0.95rem] border border-[color:var(--line)] bg-white/78 p-5"
            >
              <div className="flex size-10 items-center justify-center rounded-[0.8rem] bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]">
                <item.icon className="size-5" />
              </div>
              <div className="mt-4 font-semibold text-[color:var(--ink)]">
                {item.title}
              </div>
              <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
                {item.text}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
