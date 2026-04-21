# EML

[English](./README.md)

EML 是一个以研究和工程验证为导向的 TypeScript monorepo，围绕如下算子展开：

$$
\mathrm{eml}(x, y) = \exp(x) - \ln(y)
$$

项目灵感来自论文
[_All elementary functions from a single binary operator_](https://arxiv.org/abs/2603.21852)。

这个仓库主要包含两部分：

- `packages/emlib`：一个用于解析、lowering、重写、求值和可视化初等表达式的库。
- `src/`：一个基于 Bun + React 19 的 playground，把论文思想、lowering 过程和 D2 表达式树可视化放到同一个前端里。

这个项目并不只是“把论文抄成代码”。它更像一个可运行的实验场：既能以库的形式调用，也能在浏览器里观察表达式如何被规约成纯 EML，以及这个过程在表达式规模和数值行为上的代价。

## 这个仓库解决什么问题

论文的核心主张是：一个单一二元算子加上一个特殊常量，可以生成一大类初等函数。这个仓库的目标，是把这个主张变成可检查、可运行、可协作的工程对象：

- 可以从 TypeScript 里直接调用的库
- 可以本地运行和静态部署的可视化 playground
- 对数学背景和工程权衡都有解释的文档

## 当前已经实现的内容

### `emlib`

`emlib` 目前支持：

- 解析和打印一个紧凑的初等表达式 AST
- 通过 `reduceTypes()` / `toPureEml()` 把表达式精确 lower 到纯 EML 树
- 通过 `reduceTokens()` / `simplifyToElementary()` 做以 token 数量为导向的重写
- 用 `analyzeExpr()` 统计表达式 token 数和操作类型数
- 用 `evaluateLossless()` 在可能时对整数、有理数和复有理数做精确求值
- 用 `evaluate()` 做近似复数求值
- 用 `exprToD2()` 导出表达式树对应的 D2 文本
- 用 `synthesizePureEml()` 做一个小规模的纯 EML 候选搜索

当前支持的表达式族包括：

- 算术：`+`、`-`、`*`、`/`、`^`
- 常量：数字字面量、`e`、`pi`、`i`
- 核心超越形式：`exp`、`ln`、`sqrt`、`eml` / `E`
- 三角函数：`sin`、`cos`、`tan`、`cot`、`sec`、`csc`
- 双曲函数：`sinh`、`cosh`、`tanh`、`coth`、`sech`、`csch`
- 反函数族：`asin`、`acos`、`atan`、`asec`、`acsc`、`acot`、`asinh`、`acosh`、`atanh`

### Playground

当前前端提供：

- 原始表达式与纯 EML 形式的对照查看
- 两种形式的 token 数和操作类型数统计
- 在同一组变量赋值下对两种形式进行近似求值
- 标准表达式树与纯 EML 树的 D2 可视化
- 对 D2 运行时的懒加载，避免首屏 bundle 过大
- 应用内的简单双语支持

## 项目状态

这是一个仍在演进中的探索型代码库，但已经适合做本地实验和协作迭代。

目前可以明确说明的是：

- 仓库以本地 Bun 工作流为主
- `emlib` 作为 workspace 包被 playground 直接消费
- 目前还没有配置 npm 发布流程
- README 只承诺当前代码和测试已经覆盖的能力，不会把论文里的更大结论直接当成“都已工程化完成”

## 快速开始

### 前置条件

- [Bun](https://bun.sh/)

### 安装并启动

```bash
bun install
bun run dev
```

这会启动 `src/index.ts` 中定义的 Bun 开发服务器。

### 构建静态站点

```bash
bun run build
```

产物会输出到 `dist/`。

## 常用命令

```bash
bun run dev        # 本地开发服务器，带 HMR
bun run build      # 生产构建到 dist/
bun run test       # Bun 测试（根项目 + workspace 测试）
bun run lint       # 对应用和库源码运行 oxlint
bun run typecheck  # tsgo 类型检查 + emlib 构建
bun run check      # lint + typecheck + test + build
```

## 仓库结构

```text
.
├── docs/
│   ├── 2603.21852v2.pdf
│   └── eml_deep_dive.md
├── packages/
│   └── emlib/
│       ├── src/
│       ├── test/
│       └── README.md
├── src/
│   ├── components/
│   ├── features/eml-playground/
│   ├── i18n/
│   ├── styles/
│   ├── App.tsx
│   ├── frontend.tsx
│   ├── index.html
│   └── index.ts
├── build.ts
├── package.json
└── tsconfig.json
```

## 如何使用 `emlib`

```ts
import {
  analyzeExpr,
  evaluate,
  evaluateLossless,
  exprToD2,
  parse,
  reduceTokens,
  reduceTypes,
  toString,
} from "emlib";

const expr = parse("exp(x) - ln(y)");

console.log(analyzeExpr(expr));
console.log(toString(reduceTypes(expr)));
console.log(toString(reduceTokens(expr)));
console.log(evaluate(expr, { x: 0.5, y: 2 }));
console.log(evaluateLossless(parse("(1 + 2*i) / (3 - 4*i)")));
console.log(exprToD2(expr));
```

### 语义与求值说明

- 精确 lowering 的实现方式是：先把扩展初等函数降解到较小核心，再把这个核心 lower 成纯 EML 形式。
- `evaluateLossless()` 会在可能时保持有理数和复有理数精确；对于超越项则保留符号结果，而不是静默近似。
- `evaluate()` 使用近似复数算术，并遵循当前实现中的主支 `ln`、反函数和派生恒等式行为。

## 文档

- [docs/eml_deep_dive.md](./docs/eml_deep_dive.md)：一份更完整的中文论文解读和工程视角说明
- [docs/2603.21852v2.pdf](./docs/2603.21852v2.pdf)：仓库中保存的论文参考 PDF
- [packages/emlib/README.md](./packages/emlib/README.md)：更偏向库本身的包级说明

## 开发说明

### 工具链

- Bun 负责本地 dev server、构建和测试
- playground UI 基于 React 19
- `oxlint` 是默认 lint 工具
- 类型检查和包构建使用 `@typescript/native-preview` 提供的 `tsgo`

### 前端构建策略

项目特意把 D2 运行时放在动态导入边界之后，并在 `build.ts` 里开启 bundle splitting，避免图渲染运行时进入首屏主包。

### 部署

仓库包含一个 GitHub Actions 工作流：在 push 到 `main` 时构建 `dist/` 并部署到 GitHub Pages。当前工作流里配置的自定义域名是 `eml.tokenflow.chat`。

## 参与协作

欢迎提 issue 和 PR。

如果你想参与，推荐的工作流是：

1. 先执行 `bun install` 安装依赖。
2. 提交前运行 `bun run check`。
3. 保持 README 和 docs 与真实代码、测试行为一致。
4. 明确说明你的改动影响的是数学语义、UI 行为，还是两者都有。

当前比较适合贡献的方向包括：

- 新的精确 lowering 规则和配套测试
- 更好的 rewrite 启发式与简化流程
- 关于 branch cut 和求值语义的更清晰文档
- 大型纯 EML 树的可视化和交互体验优化
- `emlib` 的打包、发布和版本化流程

## 许可证

本仓库使用 [Apache License 2.0](./LICENSE)。
