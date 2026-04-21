export type Locale = "zh-CN" | "en-US";

export const LOCALES = ["zh-CN", "en-US"] as const satisfies readonly Locale[];

type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends (...args: infer Args) => infer Result
        ? (...args: Args) => Widen<Result>
        : T extends readonly [unknown, ...unknown[]]
          ? { [K in keyof T]: Widen<T[K]> }
          : T extends readonly (infer Item)[]
            ? readonly Widen<Item>[]
            : T extends object
              ? { [K in keyof T]: Widen<T[K]> }
              : T;

export const baseMessages = {
  app: {
    title: "EML Playground",
    metaDescription:
      "A frontend EML playground for the paper, emlib lowering, and D2 SVG rendering.",
    languageLabel: "Language",
    nav: {
      overview: "Overview",
      highlights: "Highlights",
      summary: "Summary",
      playground: "Playground",
      github: "GitHub",
    },
    localeNames: {
      "zh-CN": "Chinese",
      "en-US": "English",
    },
    localeShortLabels: {
      "zh-CN": "中",
      "en-US": "EN",
    },
  },
  hero: {
    pills: ["All elementary functions from a single operator", "Playground"],
    titleLead: "EML as a",
    titleAccent: "Generative Primitive",
    description:
      "This page does three things: summarize the paper's core construction, lower standard expressions into pure EML with emlib, and render the result as an SVG tree.",
    paperNote: {
      label: "Original paper",
      title: "All elementary functions from a single binary operator",
      href: "https://arxiv.org/abs/2603.21852",
      linkLabel: "Read on arXiv",
    },
    stats: [
      {
        label: "Core Operator",
        value: "eml(x, y)",
        description: "exp(x) - ln(y)",
      },
      {
        label: "Unified Grammar",
        value: "S -> 1 | eml(S, S)",
        description: "A heterogeneous operator family collapses into a homogeneous tree.",
      },
      {
        label: "Why It Matters",
        value: "Search Space",
        description: "Useful for symbolic regression, compilation, and symbolic AI.",
      },
    ],
    pipeline: {
      eyebrow: "Lowering Pipeline",
      title: "Paper to Playground",
      badge: "docs + emlib",
      steps: [
        {
          title: "Standard Expression",
          text: "Start from an elementary expression such as ln(x), sin(x) + cos(y), or exp(x) - ln(y).",
        },
        {
          title: "Pure EML Tree",
          text: "Use emlib's reduceTypes / toPureEml to collapse the expression into a unified core grammar.",
        },
        {
          title: "D2 SVG Preview",
          text: "Export the AST into D2 and render it directly in the browser as an SVG structure diagram.",
        },
      ],
    },
  },
  highlights: [
    {
      title: "One Operator, Many Functions",
      text: "The paper shows how eml(x, y) = exp(x) - ln(y) can serve as a single binary basis for a broad class of elementary functions.",
    },
    {
      title: "One Grammar, One Tree Shape",
      text: "Every expression can be lowered into S -> 1 | eml(S, S), so the language collapses into one recursive tree form.",
    },
    {
      title: "Complex Semantics Matter",
      text: "Trigonometric functions, pi, i, and branch behavior depend on the principal branch over complex numbers, so the evaluator has to model that directly.",
    },
  ],
  summary: {
    paper: {
      title: "Paper Highlights",
      description:
        "This page keeps the parts that matter in practice: the operator, the grammar, and the complex-valued semantics needed to make the construction work.",
      formulaLabel: "Core Formula",
      formulaDescription:
        "The key claim is structural: exp and ln can be packaged into one repeatable node and reused across the whole expression tree.",
      points: [
        {
          title: "1. One binary basis",
          text: "The target is a Sheffer-style primitive for elementary functions. The test is simple: can one binary node be copied until the usual basis comes back.",
        },
        {
          title: "2. Structure beats notation",
          text: "Pure EML expressions are often longer, but they replace a mixed grammar with one tree form. That helps compilation, search, symbolic regression, and hardware mapping.",
        },
        {
          title: "3. Complex branches are part of the model",
          text: "Recovering trigonometric functions, pi, and i depends on complex logarithms and branch choices, so verification has to run with complex-valued semantics.",
        },
      ],
    },
    emlib: {
      title: "What emlib does",
      description: "These cards map to the main APIs in packages/emlib.",
      capabilities: [
        {
          title: "Parse / Analyze",
          text: "Build and inspect the expression tree.",
          detail: "parse, analyzeExpr",
          useCase: "Good for structure checks, complexity stats, and front-end analysis.",
        },
        {
          title: "Lower / Rewrite",
          text: "Lower to pure EML or search for shorter forms.",
          detail: "reduceTypes, toPureEml, reduceTokens, simplifyToElementary, compressPureEml",
          useCase: "Good for canonical forms, search compression, and token reduction.",
        },
        {
          title: "Evaluate / Export",
          text: "Check values and export the tree for SVG.",
          detail: "evaluateLossless, evaluate, exprToD2",
          useCase: "Good for equivalence checks, debugging, and visualization.",
        },
      ],
    },
  },
  playground: {
    eyebrow: "Expression Playground",
    badge: "parse · lower · verify · render",
    title: "Interactive Playground",
    description:
      "Enter an expression and the page will parse it, lower it into pure EML, compare the two forms numerically, and render the structure as D2 SVG.",
    samples: [
      { label: "Core operator", expr: "exp(x) - ln(y)" },
      { label: "Log expansion", expr: "ln(x)" },
      { label: "Powers", expr: "x^(1/2) + y^2" },
      { label: "Trig", expr: "sin(x) + cos(y)" },
      { label: "Fraction", expr: "(x + 1) / (y - 1)" },
    ],
    expression: {
      label: "Expression",
      placeholder: "e.g. exp(x) - ln(y)",
      hint: "Supports + - * / ^, exp, ln, sqrt, trigonometric / hyperbolic functions, and e / pi / i.",
    },
    controls: {
      diagramModeLabel: "Diagram mode",
      diagramModeOptions: {
        standard: "Standard Tree",
        pure: "Pure EML Tree",
      },
      layoutLabel: "D2 layout",
    },
    variables: {
      title: "Variable values",
      description: "Used only for numeric verification and does not affect the structure diagram.",
      empty: "The current expression has no free variables.",
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
      title: "Numeric Consistency Check",
      standardValueLabel: "Standard Value",
      pureValueLabel: "Pure EML Value",
      deltaLabel: "|delta|",
      evaluationError: ({ detail }: { detail: string }) =>
        `Numeric verification could not be completed: ${detail}`,
    },
    parseError: ({ detail }: { detail: string }) => `The expression could not be parsed: ${detail}`,
    diagram: {
      eyebrow: "SVG Preview",
      titles: {
        standard: "Standard Expression Tree",
        pure: "Pure EML Tree",
      },
      deferredHint:
        "The D2 runtime loads only when this area gets close to the viewport, keeping the initial JS bundle smaller.",
      loading: "Loading the D2 runtime and generating the SVG...",
      empty: "The SVG structure diagram will appear here after you enter an expression.",
      renderError: ({ detail }: { detail: string }) =>
        `The diagram could not be rendered: ${detail}`,
      layoutBadge: ({ layout }: { layout: string }) => `D2 / ${layout}`,
      pureRenderLimitReason: ({ nodeCount, limit }: { nodeCount: string; limit: string }) =>
        `The current pure EML tree has ${nodeCount} nodes, which exceeds the frontend preview threshold of ${limit}. Switch back to Standard Tree to inspect the structure.`,
      invalidExpressionReason: "Fix the expression to restore the diagram preview.",
      previewAriaLabel: ({ mode }: { mode: string }) => `${mode} diagram preview`,
    },
    d2Source: {
      title: "D2 Source",
      copyIdle: "Copy",
      copySuccess: "Copied",
      copyFailed: "Copy failed",
      description:
        "This D2 text is generated by exprToD2. Nodes are visualized as function / variable / constant.",
    },
  },
} as const;

export type MessageDictionary = Widen<typeof baseMessages>;
