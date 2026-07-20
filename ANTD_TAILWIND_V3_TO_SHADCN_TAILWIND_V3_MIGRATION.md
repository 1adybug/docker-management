# Codex 执行规约：从 Ant Design + Tailwind CSS 3 迁移到当前 Shadcn + Tailwind CSS 3

## 任务定位

你是负责在目标仓库中实际完成迁移的 Codex。本文件不是让用户手动复制配置的教程。收到迁移任务后，应先检查目标项目的真实状态，再实施修改、验证结果并汇报。

本次目标是直接从 Ant Design + Tailwind CSS 3 迁移到本模板当前采用的 Shadcn + Tailwind CSS 3，不再经过 Shadcn + Tailwind CSS 4。

固定目标如下：

- Tailwind CSS 使用 `3.4.19`。
- 浏览器要求统一使用当前模板与 `geshu-next-template` 的真实 `.browserslistrc`；当前基线为单行 `chrome >= 102`。
- shadcn CLI 使用执行时最新版，并通过项目开发依赖中的 `pnpm exec shadcn` 执行。
- shadcn 使用 `new-york` 风格和 Radix 底层组件。
- `components.json` 必须让 `tailwind.config` 指向真实的 `tailwind.config.ts`。
- 使用 neutral 表面、violet 主色、yellow 图表色、Lucide、Inter、小圆角、subtle 和半透明菜单，延续原 `b6HGg41FS` 的设计意图。
- 最终 `pnpm exec shadcn info --json` 应识别为 `tailwindVersion: v3`、`style: new-york`、`base: radix`。
- 当前预设系统不能把 `new-york` 重新编码为 `b6HGg41FS`，因此 `preset.code` 为 `null` 是正常结果，不得为了恢复预设码改回 Base UI 或 Tailwind CSS 4。
- CLI 生成的 `components/ui/**/*.tsx` 只能通过 CLI 添加，不得手写或修改。
- 使用 `css-has-pseudo` 为最新版 shadcn 可能生成的 `:has()` 提供 PostCSS 转换和客户端 Polyfill，同时保留原生规则供现代浏览器使用。
- 保留目标项目的 API、认证、Prisma、Schema、Server Action、业务数据和权限语义。

## 一、迁移边界

开始修改前必须完成以下工作：

1. 完整读取作用于目标文件的所有 `AGENTS.md`。
2. 执行 `git status --short`、`git branch --show-current` 和 `git remote -v`。
3. 记录用户在迁移前已有的未提交改动，禁止覆盖或混入无关格式化。
4. 读取 `package.json`、锁文件、`.browserslistrc`、`postcss.config.*`、`tailwind.config.*`、`app/globals.css`、根布局和 Provider。
5. 执行迁移前的 Prettier、TypeScript、ESLint 和生产构建，保存已有错误。
6. 未经用户允许，不启动开发服务。

UI 技术栈迁移不授权修改以下内容：

- Prisma Schema 和数据库迁移。
- Shared Function、Server Action 和 API Route 的输入输出。
- Better Auth 或目标项目实际鉴权方案的行为。
- Zod Schema、Parser 和业务校验规则。
- 查询缓存、权限判断、导入导出和文件响应语义。

## 二、先建立旧组件清单

不能只根据 `package.json` 判断 Ant Design 是否已清理。至少搜索：

```powershell
rg -n "antd|@ant-design|soda-antd|soda-tailwind|@tabler/icons-react|ConfigProvider|StyleProvider|\.ant-" app components hooks presets utils package.json
```

按页面和公共组件记录实际使用的能力，并建立迁移映射：

| 旧实现                       | 当前目标                                                      |
| :--------------------------- | :------------------------------------------------------------ |
| Ant Design Button            | Shadcn Button                                                 |
| Input、InputNumber、TextArea | Shadcn Input、Textarea，并在业务层完成数字转换                |
| Form、Form.Item              | TanStack Form、Shadcn Field、现有 Zod Parser                  |
| Select                       | Shadcn Radix Select，业务枚举负责值与显示名映射               |
| Switch                       | Shadcn Switch                                                 |
| Modal                        | Shadcn Dialog                                                 |
| Popconfirm                   | Shadcn AlertDialog 或业务层 ConfirmButton                     |
| Drawer、Layout、Menu         | Shadcn Sidebar、Sheet 和业务层 DashboardSidebar               |
| Table、Pagination            | TanStack Table、Shadcn Table 和业务层 DataTable               |
| DatePicker、RangePicker      | `date-fns`、`react-day-picker` 和业务层 DateRangePicker       |
| message、notification        | 项目统一的 `react-hot-toast` 封装                             |
| Ant Design 主题与 Registry   | `next-themes`、ThemeProvider、TooltipProvider 和项目 Registry |
| `@tabler/icons-react`        | Lucide                                                        |
| Typography                   | 语义化 HTML 和 Tailwind 工具类                                |

日期库、Query、JSON 查看器、文件处理库等依赖如果仍有独立业务用途，必须保留。不能因为它们曾与 Ant Design 一起使用就一并删除。

## 三、调整 Tailwind CSS 3 与 shadcn 基础设施

### 1. 依赖策略

迁移期间可以暂时保留 Ant Design，等业务引用归零后再删除。最终应按实际引用清理：

```powershell
pnpm remove antd @ant-design/cssinjs @ant-design/nextjs-registry soda-antd soda-tailwind @tabler/icons-react source-han-sans-sc-vf
```

目标依赖至少应覆盖：

- `tailwindcss@3.4.19`。
- `tailwind-merge@2.6.0`。
- `tailwindcss-animate`、`autoprefixer` 和 `postcss-load-config`。
- `css-has-pseudo`，同时用于 PostCSS 转换和客户端运行时，按普通依赖安装。
- `shadcn@latest`，放在开发依赖。
- `class-variance-authority`、`clsx`、`lucide-react` 和 `@fontsource-variable/inter`。
- `next-themes`、`react-hot-toast`。
- `@tanstack/react-form`、`@tanstack/react-table`。
- `date-fns`、`react-day-picker`。
- CLI 生成组件实际要求的 Radix 包。

Radix 包应以 CLI 生成组件的真实导入为准，不要从其他项目机械复制版本清单。

### 2. PostCSS

Tailwind CSS 3 使用 `tailwindcss + autoprefixer + css-has-pseudo`。`:has()` 转换必须放在 Tailwind 和其他选择器转换之后：

```js
// @ts-check

/** @type {import("postcss-load-config").Config} */
const config = {
    plugins: {
        tailwindcss: {},
        autoprefixer: {},
        "css-has-pseudo": {
            preserve: true,
        },
    },
}

export default config
```

不得引入 `@tailwindcss/postcss` 或 `tw-animate-css`。`preserve: true` 不能删除，否则现代浏览器会失去原生 `:has()` 路径，并迫使所有浏览器运行 Polyfill。

### 3. Tailwind 配置

创建真实的 `tailwind.config.ts`，至少包含：

- `darkMode: ["class"]`。
- `app`、`components`、`hooks`、`pages`、`presets` 和 `utils` 的完整内容扫描路径。
- `background`、`foreground`、`card`、`popover`、`primary`、`secondary`、`muted`、`accent`、`destructive`、`border`、`input`、`ring`、`chart` 和 `sidebar` 语义色。
- Inter 对应的 `fontFamily.heading` 与 `fontFamily.sans`。
- `tailwindcss-animate` 插件和 Radix Accordion 动画。
- 当前模板用于恢复旧预设圆角和控件密度的兼容映射。

不要照搬目标项目原来的空 `theme.extend`。也不要通过全局修改常用的 `h-8`、`w-8` 等尺度解决组件差异，否则会连带破坏 Sidebar 和业务布局。

### 4. 全局 CSS

入口必须使用 Tailwind CSS 3 指令：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

全局样式需要完成：

- 使用 Tailwind CSS 3 可消费的 HSL 语义变量。
- 提供亮色和 `.dark` 两套 Token。
- 使用 `--radius: 0.45rem`，并提供派生圆角变量。
- 保留根节点高度、滚动条、打印样式等仍有业务用途的规则。
- 保留可点击按钮的 pointer 行为和禁用态光标。
- 将空表格单元格占位从 `.ant-table-cell` 改到当前 Shadcn Table 的真实 DOM。
- 删除 `@layer tailwind-base, antd`、`.ant-*` 和仅用于 Ant Design 层级兼容的规则。

主题 Token 应以执行时的当前模板为准。不要从旧 Tailwind CSS 4 文档或旧预设服务复制生成快照。

### 5. 统一 Chrome 102 兼容基线

迁移时必须统一使用执行时当前模板的真实 `.browserslistrc`，并保持与 `geshu-next-template` 一致；不能盲目保留源项目旧范围，也不能因为 shadcn 文档面向现代浏览器就改成 `last 2 versions`。当前基线为单行 `chrome >= 102`。

Browserslist 和 Autoprefixer 只能决定可静态转换的声明与前缀，不能完整转换依赖 DOM 关系的 `:has()`，也不能让 Chrome 102 原生理解动态视口单位。迁移时必须同时落实：

- 保留 `scripts/generatePolyfills.mjs` 和 `generated/polyfills.ts`，在开发与构建前根据当前 Browserslist 重新生成所需的 `core-js` 模块。
- 在 `instrumentation-client.ts` 中只引入一次生成的 JS Polyfill，不手工维护模块清单。
- 在根客户端 Provider 的最高层初始化 `css-has-pseudo/browser`，并在浏览器原生支持 `:has()` 时跳过下载和初始化。
- 使用模块级 Promise 防止 React 严格模式重复初始化。
- 将生成 CSS 中 `:has()` 条件涉及的自定义属性加入 `observedAttributes`。当前模板至少观察 `data-state`、`data-orientation`、`data-slot`、`data-variant`、`data-sidebar`、常见 `aria-*` 状态和 `role`；新增 shadcn 组件后必须重新审计，不能把现有列表当作永久完整清单。
- `dvh`、`svh` 和 `lvh` 必须提供 `vh` 基线，再通过 `@supports` 渐进增强。
- 固定值 OKLCH 和 `color-mix()` 可以由 CSS 构建工具转换，但 JSX 内联样式和包含运行时变量、无法预计算的颜色必须改为兼容表达式。
- Container Queries、`text-wrap: balance` 等不能由 `:has()` Polyfill 处理；当前业务若依赖这些特性，必须逐项提供可接受的回退。

客户端初始化应优先复用执行时当前模板的 `CssHasPolyfill` 和 Registry 接入方式。`css-has-pseudo/browser` 如果仍未发布类型声明，应在项目内为实际使用的函数和选项补最小模块声明，不得用全局 `any` 或 `@ts-ignore` 绕过。

## 四、初始化 shadcn

### 1. 配置约定

使用执行时最新版 CLI 初始化，并确保 `components.json` 最终满足：

- `style` 为 `new-york`。
- `rsc` 和 `tsx` 为 `true`。
- `tailwind.config` 为 `tailwind.config.ts`。
- 全局 CSS 为目标项目真实的 `app/globals.css` 或 `src/app/globals.css`。
- `baseColor` 为 `neutral`。
- 图标库为 `lucide`。
- 工具别名指向项目约定的 `@/utils/shadcn`。
- UI 目录指向 `@/components/ui`。
- 菜单保持 `default-translucent + subtle`。

初始化后立即执行：

```powershell
pnpm exec shadcn info --json
```

如果 CLI 没有识别出 Tailwind CSS 3，先修正真实 Tailwind 配置路径、PostCSS 和依赖，不要继续添加组件。

### 2. 通过 CLI 添加组件

本模板当前基线包含以下组件：

```powershell
pnpm exec shadcn add alert-dialog alert avatar badge button calendar card dialog dropdown-menu field input label pagination popover select separator sheet sidebar skeleton switch table textarea tooltip
```

应根据目标项目实际功能裁剪组件集，但不能手写缺失组件，也不能修改生成后的 `components/ui`。

生成完成后检查别名、依赖和 `hooks/use-mobile.*` 的实际文件名。不要把临时参考项目的 `src` 结构带入目标项目。

## 五、迁移 Provider、主题和通知

移除 Ant Design 的 `AntdRegistry`、`ConfigProvider`、locale 和全局 `message` 注入。Registry 应只承担当前仍需要的全局 Provider，例如：

- `ThemeProvider`，使用 class 暗色模式并默认跟随系统。
- `QueryClientProvider`。
- Shadcn `TooltipProvider`。
- `CssHasPolyfill`，放在尽可能靠近根节点的位置。
- 项目自定义 `Toaster`。

通知调用统一通过项目工具函数，不要在 Preset 或业务组件中直接依赖 Ant Design `message`。自定义 Toaster 的内联颜色必须使用 Tailwind CSS 3 的 HSL 变量形式，例如 `hsl(var(--popover))`，不能直接使用 Tailwind CSS 4 的 OKLCH Token 表达。

## 六、迁移表单和业务组件

### 1. 表单

登录、初始化用户、用户编辑、手机号验证、个人资料和系统设置统一迁移到 TanStack Form。必须保持：

- 继续复用现有 Zod Schema 和 Parser。
- 提交给 mutation 的是 Parser 转换后的值。
- 空的必填字段在首次提交前，不因一次普通 blur 立即显示错误。
- 首次提交后，错误字段可以在 blur 和 change 时继续校验。
- 异步详情加载完成后正确 reset，不能覆盖用户已经开始输入的内容。
- 提交期间禁用重复提交并保持 Dialog 关闭行为。
- 数字输入由业务层显式转换，不能依赖 Ant Design InputNumber 的隐式行为。

### 2. Select

Radix Select 的值使用非空字符串：

- 不使用 `null`、空字符串作为有效选项。
- 业务枚举值与中文显示名分离。
- `onValueChange` 按 Radix 的非空字符串语义处理。
- 不再传递 Base UI 或 Ant Design 风格的 `items`、`options` 等属性。

### 3. Dialog 和确认框

- 编辑器使用 Dialog。
- 删除、封禁、解封等危险操作使用 AlertDialog 或业务层 ConfirmButton。
- Trigger 使用 Radix `asChild` 包裹真实 Button 或 Link。
- 保留异步期间的禁用、加载和关闭保护。

### 4. Button 和 Link

- 普通操作使用真实 `button`。
- Link 样式按钮使用 `asChild`，不要嵌套交互元素。
- 显式设置表单内非提交按钮的 `type="button"`。
- 不添加兼容 Base UI `render` 或 `nativeButton` 的包装层。

## 七、迁移布局、表格和日期

### 1. 后台布局

使用 Shadcn Sidebar 构建桌面侧栏和移动 Sheet。必须回归：

- 桌面展开与收起。
- 移动端触发器和关闭行为。
- 当前路由高亮。
- 管理员菜单权限。
- 底部公开首页、主题切换和注销。
- 固定尺寸子元素使用 `flex-none`，可收缩文本使用 `min-w-0` 和 `truncate`。

### 2. DataTable

业务层 DataTable 使用 TanStack Table 管理排序和分页，Shadcn Table 只负责渲染。保留：

- 服务端分页和排序参数。
- 加载 Skeleton、空状态和空单元格占位。
- 横向滚动。
- 每页条数选择。
- 分页按钮禁用状态。
- URL 查询参数与筛选表单同步。

### 3. 日期范围

使用 `react-day-picker` 和 `date-fns`，并显式设置中文 locale 与周一为一周起始日。检查：

- 空值、单边日期和完整范围。
- 清除按钮不会提交外层表单。
- Calendar 背景透明并继承 Popover 背景。
- Popover 使用正确圆角并裁切内部背景，不能出现白色直角溢出。

## 八、视觉兼容必须作为共享问题处理

当前 `new-york + Radix + Tailwind CSS 3` 与旧 Rhea 视觉尺度不同。不能在每个页面零散调整。

迁移时必须统一检查：

- 默认 Button、Input 和 Select 的高度是否保持 32px。
- 小号 Button 是否保持 28px，原 `xs` 操作是否保持 24px。
- 图标按钮、分页项和 Switch 是否与旧密度一致。
- Badge 是否保持 20px 高，直属 Lucide 图标是否为 12px。
- Textarea 最小高度是否保持 64px。
- Button 的横向内边距、图标间距和文字字号是否一致。
- Dialog 右上角关闭按钮是否具有 28px 的点击区域。
- 圆角是否由主题层统一映射，而不是逐个组件硬编码。

本模板在 `tailwind.config.ts` 和 `app/globals.css` 中维护这层兼容规则。迁移目标若要求与本模板一致，应以当前文件为准合并，不得修改 CLI 生成组件。

还必须检查以下 New York 结构差异：

- 没有 Header 的 CardContent 需要显式顶部内边距，否则内容会贴上边框。
- 带边框的 CardFooter 需要显式顶部内边距。
- Card 内绝对定位渐变或背景需要 Card 自身 `overflow-hidden` 才能按圆角裁切。
- New York 没有 `CardAction`，标题与操作区应在业务层使用横向布局。
- Select、DropdownMenu 和 Popover 的半透明背景、轻边框与模糊效果放在业务调用处，不修改生成组件。

## 九、清理旧技术栈

只有业务引用全部迁移后才能删除 Ant Design 依赖。最终搜索不得再出现运行时旧引用：

```powershell
rg -n "antd|@ant-design|soda-antd|soda-tailwind|@tabler/icons-react|ConfigProvider|StyleProvider|\.ant-" app components hooks presets utils package.json
```

同时检查：

- Ant Design 的 Registry、locale、全局 message 和 CSS Layer。
- 旧字体入口。
- 旧图标导入。
- 无用的 Tailwind 插件和扫描路径。
- 被迁移遗漏的 Modal、Table、Form、Select、DatePicker 和 Drawer。

文档、Git 历史或注释中的说明性文本可以保留，但必须确认不会进入运行时代码。

## 十、验证与完成标准

按顺序执行：

```powershell
pnpm exec shadcn info --json
pnpm exec prettier --check .
pnpm exec tsc --noEmit
pnpm lint
pnpm build
git diff --check
git status --short
```

生产构建后还必须检查 `.next/static/**/*.css`：

- 原生 `:has()` 规则仍然存在。
- 同一规则存在 `csstools-has-*` 属性选择器回退。
- 关键全屏布局同时存在 `100vh` 基线和受 `@supports` 保护的动态视口规则。
- 不存在 Chrome 102 无法解析且没有前置回退的 OKLCH、`color-mix()` 或其他新颜色语法。

不能只检查源码，因为 Tailwind、PostCSS 和 Next.js 的最终组合结果才是浏览器实际收到的 CSS。

如果项目使用 Prisma，再执行项目要求的 Prisma generate。构建需要鉴权密钥时，只在当前 PowerShell 进程设置非敏感占位值，不写入 `.env`。

行为回归至少覆盖：

- 登录、初始化、退出和鉴权跳转。
- 用户编辑、角色选择、手机号验证和确认框。
- 用户筛选、排序、分页、导入、导出和模板下载。
- 操作日志、错误日志和 JSON 详情。
- 日期范围、系统设置和主题切换。
- 桌面侧栏、移动 Sheet 和响应式布局。
- 通知、暗色模式、圆角、控件密度和所有弹层裁切。
- 在 Chrome 102 或等价自动化环境中检查登录、后台全高布局、Radix 状态切换和所有依赖 `:has()` 的当前用法。

只有 shadcn CLI 正确识别 T3、旧 UI 引用清零、业务行为保持、生成组件未被手改、Chrome 102 兼容层与产物回退存在且所有静态检查通过，才能报告迁移完成。除非用户明确要求，不创建 Git 提交或推送。
