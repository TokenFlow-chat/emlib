export const enUS = {
  app: {
    title: "EML Playground",
    metaDescription:
      "A frontend EML playground for the paper, emlib lowering, JSON graph export, and 3D force-directed rendering.",
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
    emptyStates: {
      tabs: "No options available.",
    },
    lazyLoadError: {
      title: "Component failed to load.",
      description: "Check your connection and retry this section.",
      retry: "Reload",
    },
  },
  hero: {
    pills: ["All elementary functions from a single operator", "Playground"],
    titleLead: "One operator for all",
    titleAccent: "Elementary Functions",
    description:
      "EML reduces elementary functions to one operator. emlib implements expression parsing, lowering, rewriting, evaluation, graph serialization, synthesis, and training.",
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
          title: "3D Graph Preview",
          text: "Serialize the AST into the emlib graph JSON protocol and inspect it as an interactive 3D force-directed graph.",
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
      description: "These cards map the latest packages/emlib capabilities to the demos below.",
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
          text: "Check values and serialize the tree as protocol JSON.",
          detail: "evaluateLossless, evaluate, serializeExpr",
          useCase: "Good for equivalence checks, debugging, and graph integrations.",
        },
        {
          title: "Synthesize / Train",
          text: "Search for EML witnesses or fit the master formula with gradients.",
          detail: "synthesizePureEml, createMasterTree, trainMasterFormula",
          useCase:
            "Good for constructive search demos, symbolic regression experiments, and recovery tests.",
        },
      ],
    },
  },
  playground: {
    badge: "parse · lower · shorten · exact · synth · train",
    title: "Interactive Playground",
    description:
      "Use one expression to exercise the main emlib APIs: parse and analyze it, lower it into pure EML, search for a shorter readable form, inspect lossless evaluation, and run synthesis or master-formula demos in the browser.",
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
      diagramSourceLabel: "Graph source",
      diagramSourceOptions: {
        standard: "Standard AST",
        pure: "Pure EML",
        shortest: "Shortest form",
        lifted: "Lifted form",
      },
      dedupLabel: "Deduplication",
      dedupOptions: {
        all: "All nodes",
        compound: "Compound only",
        none: "None (full tree)",
      },
      layoutLabel: "3D layout",
      layoutOptions: {
        radial: "Radial depth",
        layered: "Layered depth",
        free: "Free force",
      },
      previewHintLabel: "Preview",
      previewHint:
        "Each result card can be sent to the 3D graph, so you can compare the standard tree, the pure EML witness, the shortened form, and the lifted readable form side by side.",
    },
    variables: {
      title: "Variable values",
      description: "Used only for numeric verification and does not affect the structure graph.",
      empty: "The current expression has no free variables.",
    },
    metrics: {
      standardTitle: "Standard",
      pureTitle: "Pure EML",
      tokenNodeLabel: "nodes",
      operatorTypeLabel: "operator(s)",
    },
    tabs: {
      analyze: "Analyze And Validate",
      analyzeShort: "Analyze",
      compare: "Transforms",
      compareShort: "Compare",
      experiments: "Experiments",
      experimentsShort: "Labs",
    },
    transforms: {
      title: "API Compare",
      previewButton: "Preview",
      deltaLabel: "vs Standard",
      typesLabel: "Operators",
      standard: {
        title: "Standard AST",
        shortLabel: "Standard",
        summary: "The parsed input tree.",
        description: "The parsed input expression before any reduction.",
        api: "parse + analyzeExpr",
      },
      pure: {
        title: "Pure EML",
        shortLabel: "Pure",
        summary: "The exact EML lowering.",
        description: "The exact lowering into the EML core grammar.",
        api: "toPureEml / reduceTypes",
      },
      shortest: {
        title: "Shortest Form",
        shortLabel: "Shortest",
        summary: "A shorter readable candidate.",
        description: "A readability-first search that may mix standard operators and EML.",
        api: "reduceTokens",
      },
      lifted: {
        title: "Lifted Form",
        shortLabel: "Lifted",
        summary: "A human-readable recovered form.",
        description: "A readable expression reconstructed from the pure EML witness.",
        api: "simplifyToElementary",
      },
    },
    numericCheck: {
      title: "Numeric And Exact Evaluation",
      standardValueLabel: "Standard Value",
      pureValueLabel: "Pure EML Value",
      deltaLabel: "|delta|",
      exactValueLabel: "Lossless / symbolic value",
      exactModes: {
        exact: "Exact",
        symbolic: "Symbolic",
      },
      exactHint:
        "evaluateLossless keeps rationals exact and preserves branch-sensitive transcendentals symbolically.",
      evaluationError: ({ detail }: { detail: string }) =>
        `Numeric verification could not be completed: ${detail}`,
      exactError: ({ detail }: { detail: string }) =>
        `Lossless evaluation could not be completed: ${detail}`,
    },
    parseError: ({ detail }: { detail: string }) => `The expression could not be parsed: ${detail}`,
    diagram: {
      eyebrow: "3D Graph",
      titles: {
        standard: "Expression Tree",
        pure: "Pure EML Tree",
      },
      deferredHint:
        "The 3D graph runtime loads only when this area gets close to the viewport, keeping the initial JS bundle smaller.",
      loading: "Loading the 3D graph runtime...",
      empty: "The 3D expression graph will appear here after you enter an expression.",
      expandedHint: "The graph is open in the expanded preview.",
      renderError: ({ detail }: { detail: string }) => `The graph could not be rendered: ${detail}`,
      layoutBadge: ({ layout }: { layout: string }) => `3D / ${layout}`,
      fitButton: "Fit",
      expandButton: "Expand",
      collapseButton: "Exit",
      labelsOn: "Labels",
      labelsOff: "Labels",
      selectedNodeTitle: "Selected node",
      noSelectedNode: "No node selected.",
      nodeFields: {
        kind: "Kind",
        depth: "Depth",
        occurrences: "Occurrences",
      },
      stats: {
        nodes: ({ value }: { value: number }) => `${value} nodes`,
        links: ({ value }: { value: number }) => `${value} links`,
        depth: ({ value }: { value: number }) => `depth ${value}`,
      },
      nodeLegend: [
        { label: "operator", tone: "operator" },
        { label: "variable", tone: "variable" },
        { label: "constant", tone: "constant" },
      ],
      edgeLegend: [
        { label: "value", tone: "value" },
        { label: "left / x", tone: "left" },
        { label: "right / y", tone: "right" },
      ],
      renderLimitReason: ({
        label,
        nodeCount,
        limit,
      }: {
        label: string;
        nodeCount: string;
        limit: string;
      }) =>
        `${label} currently serializes to ${nodeCount} graph nodes, which exceeds the frontend 3D preview threshold of ${limit}. Choose a smaller representation or a stronger deduplication mode to inspect the structure.`,
      invalidExpressionReason: "Fix the expression to restore the graph preview.",
      previewAriaLabel: ({ mode }: { mode: string }) => `${mode} graph preview`,
    },
    graphJson: {
      title: "Graph JSON",
      copyIdle: "Copy",
      copySuccess: "Copied",
      copyFailed: "Copy failed",
      description:
        "This JSON is generated by serializeExpr using the emlib.expr.graph v1 protocol.",
    },
    experiments: {
      eyebrow: "Advanced Experiments",
      badge: "search-heavy demos",
      title: "Synthesis, Compression, And Training",
      description:
        "These demos exercise the newer search-oriented interfaces from packages/emlib. They run only when requested so the main playground stays responsive.",
      previewTitle: "3D Result Preview",
      shared: {
        running: "Running...",
      },
      compression: {
        eyebrow: "Compression",
        title: "Pure EML Compression",
        shortLabel: "Compress",
        description:
          "Run a bounded search for a shorter pure EML witness while validating that the numeric delta stays small.",
        levelLabel: "Compression level",
        levels: {
          light: "Light",
          medium: "Medium",
          aggressive: "Aggressive",
        },
        baselineLabel: "Pure tokens",
        typesLabel: "Type set",
        afterLabel: "Compressed",
        gainLabel: "Token delta",
        deltaLabel: "Validation delta",
        runButton: "Run compression search",
        idleHint:
          "Use the current pure EML witness as the search target and see whether a shorter exact candidate exists under the selected budget.",
        requiresValidExpression: "Enter a valid expression before running compression.",
        noImprovement:
          "No shorter exact candidate was found under the current search budget. That still tells you the current witness is already competitive.",
        success: "A shorter validated pure EML candidate was found.",
      },
      synthesis: {
        eyebrow: "Synthesis",
        title: "Pure EML Synthesizer",
        shortLabel: "Synthesize",
        description:
          "Search the pure EML tree space directly from numeric samples, mirroring the paper's constructive search workflow.",
        samples: [
          { label: "ln(x)", expr: "ln(x)" },
          { label: "exp(x)", expr: "exp(x)" },
          { label: "e - x", expr: "e-x" },
        ],
        useCurrent: "Use current",
        targetLabel: "Synthesis target",
        maxLeavesLabel: "Max leaves",
        beamWidthLabel: "Beam width",
        targetTokensLabel: "Target tokens",
        variablesLabel: "Variables",
        resultTokensLabel: "Result tokens",
        leavesLabel: "Leaves",
        distanceLabel: "Distance",
        deltaLabel: "Delta",
        runButton: "Run synthesis",
        idleHint:
          "This search starts from leaves {1, variables} and builds EML trees bottom-up, deduplicating candidates by numeric fingerprints.",
        noResult: "No synthesis candidate was produced under the current limits.",
        invalidTarget: ({ detail }: { detail: string }) =>
          `The synthesis target could not be parsed: ${detail}`,
        success: "A candidate pure EML witness was found for the target expression.",
      },
      master: {
        eyebrow: "Master Formula",
        title: "Gradient Trainer",
        shortLabel: "Train",
        description:
          "Fit the paper's parameterized master tree with Adam, then clamp it back into a discrete EML expression when training converges.",
        presetLabel: "Demo target",
        presets: {
          exp: "exp(x) / depth 1",
          eMinusX: "e - x / depth 2",
          ln: "ln(x) / depth 3",
        },
        presetDescriptions: {
          exp: "A stable depth-1 case that should snap cleanly to E(x,1).",
          eMinusX:
            "A depth-2 recovery demo that shows the trainer can recover a nontrivial witness.",
          ln: "A harder depth-3 case. Expect progress in loss even when the exact witness is not recovered.",
        },
        depthLabel: "Depth",
        nodesLabel: "Nodes",
        paramsLabel: "Params",
        lossLabel: "Loss",
        restartsLabel: "Restarts",
        epochsLabel: "Epochs",
        statusLabel: "Status",
        statuses: {
          success: "Recovered",
          partial: "Best fit",
        },
        runButton: "Train master formula",
        idleHint:
          "Training is intentionally on-demand. It runs a lighter browser-safe configuration of the Adam + hardening + clamping pipeline.",
        success: "Training recovered a discrete expression within the requested tolerance.",
        partial:
          "Training improved the fit but did not recover an exact discrete witness under the current budget.",
      },
    },
  },
} as const;
