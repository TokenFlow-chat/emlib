import type { MessageDictionary } from "@/i18n/schema";

export const zhCN = {
  app: {
    title: "EML Playground",
    metaDescription: "一个前端 EML playground，用来查看论文、emlib lowering 和 D2 SVG 渲染。",
    languageLabel: "语言",
    nav: {
      overview: "概览",
      highlights: "要点",
      summary: "详解",
      playground: "Playground",
      github: "GitHub",
    },
    localeNames: {
      "zh-CN": "中文",
      "en-US": "English",
    },
    localeShortLabels: {
      "zh-CN": "中",
      "en-US": "EN",
    },
  },
  hero: {
    pills: ["所有初等函数的原子", "Playground"],
    titleLead: "EML as a",
    titleAccent: "Generative Primitive",
    description:
      "这个页面做三件事：给出论文里的核心构造，用 emlib 把标准表达式 lowering 成纯 EML，再把结果画成 SVG 结构图。",
    paperNote: {
      label: "原论文",
      title: "All elementary functions from a single binary operator",
      href: "https://arxiv.org/abs/2603.21852",
      linkLabel: "在 arXiv 阅读",
    },
    stats: [
      {
        label: "核心算子",
        value: "eml(x, y)",
        description: "exp(x) - ln(y)",
      },
      {
        label: "统一语法",
        value: "S -> 1 | eml(S, S)",
        description: "异构运算族被规整成同构树。",
      },
      {
        label: "意义所在",
        value: "Search Space",
        description: "方便做符号回归、编译和 AI。",
      },
    ],
    pipeline: {
      eyebrow: "Lowering Pipeline",
      title: "Paper to Playground",
      badge: "docs + emlib",
      steps: [
        {
          title: "标准表达式",
          text: "从 ln(x)、sin(x) + cos(y) 或 exp(x) - ln(y) 这类初等表达式开始。",
        },
        {
          title: "纯 EML 树",
          text: "通过 emlib 的 reduceTypes / toPureEml，把表达式压到统一核心语法上。",
        },
        {
          title: "D2 SVG 预览",
          text: "把 AST 导出成 D2，再直接在浏览器里渲染为 SVG 结构图。",
        },
      ],
    },
  },
  highlights: [
    {
      title: "一个算子，覆盖多类函数",
      text: "论文讨论的是：是否能只靠 eml(x, y) = exp(x) - ln(y) 这个二元节点，恢复一大类初等函数。",
    },
    {
      title: "统一语法，统一树形",
      text: "所有表达式都可以压成 S -> 1 | eml(S, S)，原本混杂的语法会收敛到同一种递归树结构。",
    },
    {
      title: "复数语义必须算清楚",
      text: "三角函数、pi、i 和分支行为都依赖复数主支，所以 evaluator 必须把这部分语义直接算进去。",
    },
  ],
  summary: {
    paper: {
      title: "论文核心内容",
      description: "页面只保留和实现直接相关的部分：算子本身、统一语法，以及让构造成立的复数语义。",
      formulaLabel: "核心公式",
      formulaDescription:
        "关键点在结构上：exp 和 ln 可以被包进同一个可重复节点，然后在整棵表达式树里反复使用。",
      points: [
        {
          title: "1. 一个二元基底",
          text: "论文要找的是初等函数上的 Sheffer-style primitive。判断标准很直接：一个二元节点反复复制后，能不能把常见函数基底重新长出来。",
        },
        {
          title: "2. 结构比记号更重要",
          text: "纯 EML 表达式通常不会更短，但它把混合 grammar 收成一种树形，这对编译、搜索、符号回归和硬件映射更有价值。",
        },
        {
          title: "3. 复数主支是模型的一部分",
          text: "三角函数、pi 和 i 的恢复依赖复数对数和 branch choice，所以 playground 的数值校验也建立在复数语义上。",
        },
      ],
    },
    emlib: {
      title: "emlib 的功能",
      description: "下面这些卡片，对应 packages/emlib 的主要 API。",
      capabilities: [
        {
          title: "Parse / Analyze",
          text: "构建并检查表达式树。",
          detail: "parse, analyzeExpr",
          useCase: "适合做结构检查、复杂度统计和前置分析。",
        },
        {
          title: "Lower / Rewrite",
          text: "压到纯 EML，或继续找更短写法。",
          detail: "reduceTypes, toPureEml, reduceTokens, simplifyToElementary, compressPureEml",
          useCase: "适合做统一表示、搜索压缩和 token 优化。",
        },
        {
          title: "Evaluate / Export",
          text: "做数值校验，并导出 SVG 用的树。",
          detail: "evaluateLossless, evaluate, exprToD2",
          useCase: "适合做等价验证、调试和可视化展示。",
        },
      ],
    },
  },
  playground: {
    eyebrow: "Expression Playground",
    badge: "解析 · lowering · 校验 · 渲染",
    title: "在线 Playground",
    description:
      "输入表达式后，页面会解析它、把它 lowering 成纯 EML、做数值比对，并导出 D2 SVG 结构图。",
    samples: [
      { label: "核心算子", expr: "exp(x) - ln(y)" },
      { label: "对数展开", expr: "ln(x)" },
      { label: "乘幂", expr: "x^(1/2) + y^2" },
      { label: "三角函数", expr: "sin(x) + cos(y)" },
      { label: "分式结构", expr: "(x + 1) / (y - 1)" },
    ],
    expression: {
      label: "输入表达式",
      placeholder: "例如: exp(x) - ln(y)",
      hint: "支持 + - * / ^、exp、ln、sqrt、三角 / 双曲函数以及 e / pi / i。",
    },
    controls: {
      diagramModeLabel: "图模式",
      diagramModeOptions: {
        standard: "Standard Tree",
        pure: "Pure EML Tree",
      },
      layoutLabel: "D2 Layout",
    },
    variables: {
      title: "变量取值",
      description: "只用于数值校验，不影响结构图。",
      empty: "当前表达式没有自由变量。",
    },
    metrics: {
      standardTitle: "Standard",
      pureTitle: "Pure EML",
      tokenNodeLabel: "nodes",
      operatorTypeLabel: "operator(s)",
    },
    lowering: {
      title: "Lowering Result",
      standardExpressionLabel: "Standard Expression",
      pureExpressionLabel: "Pure EML Expression",
    },
    numericCheck: {
      title: "数值一致性校验",
      standardValueLabel: "Standard Value",
      pureValueLabel: "Pure EML Value",
      deltaLabel: "|delta|",
      evaluationError: ({ detail }: { detail: string }) => `数值校验未能完成：${detail}`,
    },
    parseError: ({ detail }: { detail: string }) => `表达式暂时无法解析：${detail}`,
    diagram: {
      eyebrow: "SVG Preview",
      titles: {
        standard: "Standard Expression Tree",
        pure: "Pure EML Tree",
      },
      deferredHint: "预览区接近视口后才会异步加载 D2 运行时，避免把首屏 JS 包得过大。",
      loading: "正在异步加载 D2 并生成 SVG...",
      empty: "输入表达式后会在这里显示 SVG 结构图。",
      renderError: ({ detail }: { detail: string }) => `结构图渲染失败：${detail}`,
      layoutBadge: ({ layout }: { layout: string }) => `D2 / ${layout}`,
      pureRenderLimitReason: ({ nodeCount, limit }: { nodeCount: string; limit: string }) =>
        `当前纯 EML 树有 ${nodeCount} 个节点，超过前端预览阈值 ${limit}。可切回 Standard Tree 查看结构。`,
      invalidExpressionReason: "修正表达式后即可恢复图渲染。",
      previewAriaLabel: ({ mode }: { mode: string }) => `${mode} 图预览`,
    },
    d2Source: {
      title: "D2 Source",
      copyIdle: "复制",
      copySuccess: "已复制",
      copyFailed: "复制失败",
      description:
        "这段 D2 文本由 exprToD2 生成，节点按 function / variable / constant 三类可视化。",
    },
  },
} satisfies MessageDictionary;
