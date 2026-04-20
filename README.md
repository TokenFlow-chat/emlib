# EML Playground

一个基于 Bun + React 19 的 EML 可视化 playground，用来把论文里的核心理论、`emlib` 的 lowering 能力，以及 D2 结构图渲染放到同一个前端界面里。

## 现在这版做了什么

- 重构了 `src` 目录，把大体量的页面逻辑拆成 `overview`、表达式分析 hook、D2 预览 hook 和交互式 playground 模块
- 删除了未接入页面的模板代码与残留资源，复制 D2 文本改成原生 Clipboard API，减少前端依赖
- `build.ts` 开启了 Bun bundler 的 `splitting`，并把 D2 保持为异步 `import()`，避免把渲染运行时塞进首屏主包
- 增加 `lint`、`typecheck`、`check`、`test` 脚本，方便本地和 CI 做统一校验
- 引入 `oxlint` 作为默认 lint 工具，尽量用 OXC 生态做更轻量、更快的静态检查

## 项目结构

```text
.
├── src/
│   ├── App.tsx
│   ├── frontend.tsx
│   ├── index.ts
│   ├── index.css
│   ├── components/ui/
│   ├── features/eml-playground/
│   │   ├── constants.ts
│   │   ├── overview.tsx
│   │   ├── playground-studio.tsx
│   │   ├── use-d2-preview.ts
│   │   ├── use-expression-analysis.ts
│   │   └── utils.ts
│   └── lib/utils.ts
├── packages/
│   └── emlib/
└── docs/
```

## 开发命令

```bash
bun install
bun run dev
```

常用脚本：

```bash
bun run build       # 产出 dist
bun run test        # 运行 emlib 测试
bun run lint        # 用 oxlint 做静态检查
bun run typecheck   # 前端类型检查 + emlib build
bun run check       # lint + typecheck + test + build
```

## D2 加载策略

当前前端对 D2 做了三层控制：

1. 代码仍然使用 `import("@terrastruct/d2")` 异步加载
2. 只有预览区接近视口时才真正触发运行时加载
3. Bun 构建显式开启 `splitting`，让异步模块具备真实分包条件

如果你看到主包重新变大，优先检查两件事：

- `build.ts` 里的 `splitting: true` 有没有被改掉
- D2 是否被改回了顶层静态 `import`

## 依赖策略

这个仓库尽量保持轻量：

- 保留 Bun 原生能力来承担 dev server、build 和 test
- UI 只保留页面实际在用到的 Radix/Tailwind 相关依赖
- 用 `oxlint` 替代更重的 ESLint 组合，贴近 OXC 的高性能工具链思路

如果后续继续瘦身，建议优先检查：

- 是否还需要额外的图标/组件库
- 是否有可以下沉到 `packages/emlib` 的前端计算逻辑
- 是否可以继续减少通用 UI 模板代码
