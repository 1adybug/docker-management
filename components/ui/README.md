# Shadcn 组件适配规约

本目录以 shadcn CLI 生成的 `Tailwind CSS 3 + new-york + Radix` 组件为技术基线，同时承载本项目的设计系统预设。CLI 输出不是不可修改的第三方源码；新增组件后，应按本规约判断哪些改动属于项目级组件契约，哪些只属于具体调用位置。

## 一、基本边界

| 需求性质 | 实现位置 |
| :--- | :--- |
| 所有调用都应保持一致的尺寸、圆角、颜色、状态或交互 | `components/ui` 对应组件源码 |
| 多处会复用且名称具有稳定语义的差异 | 组件 `variant`、`size` 或明确的 props |
| 组件内部固定元素需要稳定标识 | 对应 DOM 的 `data-slot` |
| 仅一个页面或一个调用位置需要的宽度、对齐、裁切、布局 | 调用方的 props 或 `className` |
| 全项目共享的颜色、字体和圆角 Token | `app/globals.css` 与 `tailwind.config.ts` |
| 业务状态、数据请求和页面行为 | 业务组件，不得下沉到 `components/ui` |

判断时不要只看当前调用数量，还要判断它是否描述了组件本身。例如“Dialog 默认关闭按钮为 28px”属于组件契约；“日志详情 Dialog 使用更大最大宽度”只属于该调用位置。

## 二、新增或更新流程

### 新增组件

1. 确认工作区中已有改动，避免 CLI 覆盖用户工作。
2. 确认当前基线：

    ```powershell
    pnpm exec shadcn info --json
    ```

    结果必须保持 `tailwindVersion: v3`、`style: new-york`、`base: radix`。

3. 使用 CLI 添加，不凭空编写 shadcn 组件：

    ```powershell
    pnpm exec shadcn add <component-name>
    ```

4. 阅读生成源码和实际调用 API，再按下文清单适配项目预设。
5. 只把项目级契约写进组件源码；页面特有差异留在调用处。

### 更新已有组件

已有组件包含项目级定制，不能直接执行覆盖并接受全部结果。需要更新时：

1. 先让工作区处于可明确对比的状态，记录当前组件契约。
2. 通过 CLI 覆盖后立即检查该组件及调用方的完整差异。
3. 保留 Radix API、安全性、可访问性和上游缺陷修复，同时恢复本文件列出的项目级契约。
4. 如果上游新增能力与现有项目 props 冲突，优先设计清晰的新 API，不要用全局 CSS 补偿。
5. 更新了项目级契约时，同步维护本文件的“当前预设”表。

## 三、每个新增组件必须检查的内容

### 组件语义与 API

- 根元素和固定内部区域是否需要稳定的 `data-slot`。
- 是否存在值得复用的 `variant`、`size`、`show*` 等语义 props。
- 调用方传入的 `className` 是否位于 `cn` 的最后，使局部覆盖仍然有效。
- Radix 的 `asChild`、Portal、受控状态、焦点管理和键盘交互是否保持正确。
- 禁用、加载、危险操作和 `aria-*` 状态是否表达真实语义。

### 项目视觉预设

- 默认高度、内边距、图标尺寸和间距是否与现有控件密度一致。
- 圆角是否优先复用 `tailwind.config.ts` 中的项目 Token。
- Popover、Select、DropdownMenu 等浮层是否符合半透明背景、轻边框和模糊效果。
- 亮色、暗色、Hover、Focus、Disabled 和 Invalid 状态是否完整。
- 单个页面的宽度、最大高度、对齐和裁切是否错误地下沉成全局默认值。

### 兼容性

- Tailwind 类名必须能被 Tailwind CSS 3.4 编译，不能直接保留 T4 专属语法。
- 依赖 `:has()` 时，确认 PostCSS 转换及 `CssHasPolyfill` 的 `observedAttributes` 覆盖新增状态属性。
- Chrome 102 不支持的动态视口、颜色、容器查询或运行时 API 必须提供独立回退。
- 生产构建后检查最终 CSS，不能把“构建成功”当成浏览器兼容已经完成。

## 四、当前项目级预设

| 组件 | 当前契约 |
| :--- | :--- |
| Button | `xs=24px`、`sm=28px`、`default=32px`、`lg=36px`；图标尺寸提供 `icon-xs`、`icon-sm`、`icon`、`icon-lg` |
| Badge | 高 20px、水平内边距 8px、间距 4px、直属图标 12px |
| Input | 默认高 32px、水平内边距 10px |
| Textarea | 最小高度 64px、水平内边距 10px |
| SelectTrigger | `default=32px`、`sm=28px` |
| Switch | `default=32×20px`、`sm=24×16px`，Thumb 尺寸与位移同步 |
| PaginationEllipsis | 默认 32×32px |
| DialogContent | 默认使用项目 `rounded-4xl`；通过 `showCloseButton` 控制关闭按钮；关闭按钮点击区域 28×28px |
| AlertDialogContent | 默认使用项目 `rounded-4xl` |
| SheetContent | 通过 `showCloseButton` 控制关闭按钮；关闭按钮点击区域 28×28px |
| SelectContent、DropdownMenuContent、PopoverContent | 默认使用轻边框、`bg-popover/95` 和 `backdrop-blur-md` |

这些默认值都应由组件源码直接表达。调用方需要不同尺寸时传入已有 `size`，确有一次性差异时再传 `className`。

## 五、禁止的补偿方式

- 不使用 `.inline-flex.h-10` 或完整工具类串来识别某个组件。
- 不在 Tailwind 主题中全局重定义 `h-8`、`h-9`、`w-8`、`w-9` 等通用尺度。
- 不依赖基础类“永远存在”；`cn` 中的 `tailwind-merge` 会删除与调用方冲突的类。
- 不通过父级 `[&>button]` 猜测固定内部元素；需要控制时给组件增加明确 props。
- 不在多个调用处重复用 `h-*`、`px-*` 模拟一个本应存在的尺寸变体。
- 不把日期弹层宽度、某个表格按钮对齐等单点布局写成所有组件的默认行为。

## 六、验证清单

至少执行：

```powershell
pnpm exec shadcn info --json
pnpm exec prettier --check .
pnpm exec tsc --noEmit
pnpm lint
pnpm build
git diff --check
git status --short
```

生产构建需要环境变量时，只在当前 PowerShell 进程设置非敏感占位值。完成后还要检查：

- 新增组件及其调用方的差异是否只包含预期适配。
- 生产 CSS 是否包含新预设使用的工具规则。
- 是否重新出现基于工具类组合识别组件的全局选择器。
- 调用方传入冲突 `className` 时，组件是否按调用方意图覆盖，而不是导致另一条 CSS 规则失配。
