import { emlibCapabilities } from "@/features/eml-playground/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SummaryPanels() {
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
