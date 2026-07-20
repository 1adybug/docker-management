# Codex 执行规约：从 Shadcn + Tailwind CSS 4 迁移到当前 Shadcn + Tailwind CSS 3

## 任务定位

你是负责在目标仓库中实际完成降级迁移的 Codex。本文件用于把已经采用 Shadcn + Tailwind CSS 4 的项目迁移到本模板当前的 Shadcn + Tailwind CSS 3 基线。

这不是单纯替换 `tailwindcss` 版本。原模板的 Tailwind CSS 4 方案使用 `base-rhea + Base UI`，当前 Tailwind CSS 3 方案使用 `new-york + Radix`，因此需要同时处理：

- Tailwind 和 PostCSS 工具链。
- CSS Token 与 Tailwind 指令。
- shadcn 配置和 CLI 组件重建。
- Base UI 与 Radix 的组合 API。
- Rhea 与 New York 的结构、圆角、间距和控件密度差异。

固定目标如下：

- Tailwind CSS 使用 `3.4.19`。
- `tailwind-merge` 使用 `2.6.0`。
- 浏览器目标从 Shadcn + Tailwind CSS 4 项目的现代浏览器基线切换到当前 Tailwind CSS 3 模板的既有要求：Chrome 87、Edge 88、Firefox 78 和 Safari 14，因此必须兼容 Chrome 102。
- shadcn CLI 使用执行时最新版，并作为项目开发依赖通过 `pnpm exec shadcn` 执行。
- `components.json` 使用 `style: new-york`，并让 `tailwind.config` 指向真实的 `tailwind.config.ts`。
- 底层组件使用 Radix，不保留 Base UI 兼容封装。
- 最终 CLI 识别为 `tailwindVersion: v3`、`style: new-york`、`base: radix`。
- `preset.code` 为 `null` 是预期结果，不要求重新解析出 `b6HGg41FS`。
- 通过 T3 主题继续表达 neutral、violet、yellow chart、Lucide、Inter、small radius、subtle、半透明菜单和 pointer 意图。
- 使用 `css-has-pseudo` 为当前和未来 shadcn 生成的 `:has()` 提供 PostCSS 转换与客户端运行时 Polyfill，同时为动态视口、颜色和其他新 CSS 特性提供各自的兼容回退。
- 不修改 CLI 生成的 `components/ui/**/*.tsx`。
- 不修改业务数据、API、认证、Prisma 和服务端行为。

## 一、迁移前审计

开始修改前必须：

1. 完整读取目标仓库的 `AGENTS.md`。
2. 执行 `git status --short`，记录用户已有改动。
3. 读取 `package.json`、锁文件、`.browserslistrc`、`components.json`、PostCSS、Tailwind 配置和全局 CSS。
4. 记录 `components/ui` 中现有组件名和业务层的所有导入。
5. 搜索 Base UI API、Tailwind CSS 4 指令、仅限 T4 的类名语法，以及 `:has()`、Container Queries、动态视口单位、OKLCH 和 `color-mix()` 等现代 CSS 用法。
6. 运行迁移前的类型检查、Lint、格式检查和构建，保存基线错误。
7. 未经用户允许，不启动开发服务。

建议搜索：

```powershell
rg -n "@base-ui/react|render=|nativeButton|items=|@theme|@custom-variant|@plugin|@import \"tailwindcss\"|shadcn/tailwind.css|tw-animate-css|@tailwindcss/postcss" app components hooks utils package.json components.json postcss.config.*
```

还应搜索 T4 任意值和 Important 语法，例如：

- `size-(--variable)`、`w-(--variable)`、`rounded-(--variable)`。
- `not-dark:*`。
- `class!` 形式的 Important 工具类。
- 依赖 `data-slot`、`data-icon` 或 Base UI 状态属性的业务选择器。

不能因为源码可以被 Prettier 格式化就认为它能被 Tailwind CSS 3 编译。

## 二、调整依赖和构建工具

### 1. 删除 T4 与 Base UI 依赖

按实际依赖清理：

- `@tailwindcss/postcss`。
- `tw-animate-css`。
- `@base-ui/react`。
- Tailwind CSS 4。

如果这些依赖仍有非 Shadcn 业务引用，先迁移引用，再删除依赖。

### 2. 安装 T3 基线

目标工具链包括：

- `tailwindcss@3.4.19`。
- `tailwind-merge@2.6.0`。
- `tailwindcss-animate`。
- `autoprefixer`。
- `postcss-load-config`。
- `css-has-pseudo`，作为普通依赖供 PostCSS 和客户端运行时共同使用。
- 开发依赖 `shadcn@latest`。

Radix 依赖由 CLI 添加的组件决定。不要继续保留没有引用的 Base UI，也不要从历史锁文件复制 Radix 版本。

### 3. PostCSS

将 PostCSS 恢复为 Tailwind CSS 3 构建链，并在所有选择器生成和转换之后添加 `css-has-pseudo`：

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

完成后确认配置中不再出现 `@tailwindcss/postcss`。必须保留 `preserve: true`，让支持 `:has()` 的现代浏览器继续使用原生选择器，只有旧浏览器进入 Polyfill 路径。

### 4. 重新建立浏览器兼容基线

Shadcn + Tailwind CSS 4 源项目按最新浏览器设计，其 `.browserslistrc` 不能直接作为降级后的目标。迁移时应恢复执行时当前 T3 模板的真实 Browserslist；当前基线为：

```text
chrome >= 87
edge >= 88
firefox >= 78
safari >= 14
```

Browserslist 只控制构建工具已知的静态转换，不能保证所有最新版 shadcn 输出自动兼容 Chrome 102。必须在迁移结果中建立以下兼容层：

- 在根客户端 Provider 的最高层动态导入 `css-has-pseudo/browser`，原生支持 `:has()` 时跳过初始化。
- 使用模块级 Promise 防止 React 严格模式重复初始化。
- 根据生产 CSS 中每个 `:has()` 条件配置 `observedAttributes`。当前模板至少覆盖 `data-state`、`data-orientation`、`data-slot`、`data-variant`、`data-sidebar`、常见 `aria-*` 状态和 `role`；每次添加新 shadcn 组件后重新审计。
- 如果 `css-has-pseudo/browser` 缺少类型声明，只补与实际调用一致的最小模块声明，不使用 `any`、`@ts-ignore` 或服务端静态导入。
- `dvh`、`svh` 和 `lvh` 使用 `vh` 基线与 `@supports` 渐进增强，不能把它们交给 `:has()` Polyfill。
- CSS 文件中的固定值现代颜色可以由构建工具转换；JSX 内联样式、运行时生成值和包含无法预计算变量的 `color-mix()` 必须人工改为兼容表达式。
- Container Queries、`text-wrap: balance` 等独立特性不属于 `:has()` Polyfill 的能力范围，业务依赖时必须提供明确回退。

## 三、建立 Tailwind CSS 3 主题

### 1. 新增真实配置文件

Tailwind CSS 3 必须有实际的 `tailwind.config.ts`。至少配置：

- class 暗色模式。
- `app`、`components`、`hooks`、`pages`、`presets` 和 `utils` 的内容扫描。
- 全部 Shadcn 语义色和 Sidebar 色。
- Inter 字体。
- 圆角变量与兼容映射。
- `tailwindcss-animate`。
- Radix Accordion 动画。

如果目标项目有额外目录、Safelist、插件或第三方源码扫描，必须合并，不能用模板配置直接覆盖。

### 2. 重写全局 CSS 入口

删除 Tailwind CSS 4 内容：

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@custom-variant dark (&:is(.dark *));
@theme inline {
    /* ... */
}
```

改为：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

主题变量从 Tailwind CSS 4 的 OKLCH 直接 Token 改为 Tailwind CSS 3 配置可以消费的 HSL 分量。内联样式读取变量时使用：

```css
color: hsl(var(--popover-foreground));
background: hsl(var(--popover) / 0.95);
```

不要直接把 `var(--popover)` 当成完整颜色，也不要保留依赖 T4 `@theme` 的 `--color-*` 映射。

全屏和最小全屏布局不能只保留 `h-dvh` 或 `min-h-svh`。先使用 `h-screen` 或 `min-h-screen`，再通过 Tailwind CSS 3 的 `supports-[...]` 变体启用动态视口单位。固定 OKLCH 字面量即使生产编译目前能生成回退，也应优先改为 HSL、RGB 或语义变量，避免不同 CSS 管线输出不一致。

### 3. 保留非 T4 的全局行为

迁移时保留仍有业务价值的：

- `html`、`body` 高度。
- Inter 字体。
- 自定义滚动条。
- Button pointer 和禁用态光标。
- 空表格单元格占位。
- 打印和页面级基础样式。

生产构建后应直接检查生成 CSS，确认自定义兼容规则未被 Tailwind CSS 3 裁剪。

## 四、重建 Shadcn Radix 组件

### 1. 更新 `components.json`

最终配置必须满足：

- `style` 从 `base-rhea` 改为 `new-york`。
- `tailwind.config` 从空字符串改为 `tailwind.config.ts`。
- 保留项目真实的 CSS 路径和别名。
- `baseColor` 为 `neutral`。
- `iconLibrary` 为 `lucide`。
- `menuColor` 为 `default-translucent`。
- `menuAccent` 为 `subtle`。

先执行：

```powershell
pnpm exec shadcn info --json
```

如果仍识别为 T4 或 Base UI，先修复配置和依赖，不要继续生成组件。

### 2. 记录并重建组件

迁移任务明确授权替换技术栈后，记录现有 `components/ui` 清单，删除旧 CLI 生成的 Base UI 组件、旧移动端 Hook 和 shadcn 工具文件，再通过当前 CLI 重建。不能一边保留旧 Base UI 文件一边覆盖部分组件。

本模板当前组件集为：

```powershell
pnpm exec shadcn add alert-dialog alert avatar badge button calendar card dialog dropdown-menu field input label pagination popover select separator sheet sidebar skeleton switch table textarea tooltip
```

CLI 生成完成后：

- 不手工格式化、重写或修补 `components/ui`。
- 根据生成组件的真实导入安装直接依赖。
- 确认 `utils/shadcn.ts` 与别名一致。
- 确认移动端 Hook 的真实扩展名，并更新业务导入。
- 再次执行 `pnpm exec shadcn info --json`。

预期结果是 `v3 + new-york + radix`，不是恢复旧预设码。

## 五、将 Base UI 业务调用迁移为 Radix

这一步不能通过 TypeScript 类型断言绕过。按生成组件的真实 API 修改业务调用。

### 1. 组合 API

| Base UI / Rhea                         | Radix / New York                                  |
| :------------------------------------- | :------------------------------------------------ |
| `render={<Button />}`                  | `asChild`，并把 Button 或 Link 作为真实子节点     |
| `nativeButton={false}`                 | 删除；Link 使用 `asChild`                         |
| Trigger 的 `render`                    | Trigger 的 `asChild`                              |
| Select `items`                         | 删除，在 `SelectItem` 中显式提供 value 与显示文本 |
| `onValueChange(value: string \| null)` | 按非空 `string` 处理                              |
| Base UI 状态属性                       | 改为 Radix 的 `data-state` 等真实属性             |

必须检查 Sidebar、Popover、DropdownMenu、Dialog、AlertDialog、Tooltip、Select 和所有 Link Button。

### 2. Button 尺寸

New York 没有 Rhea 的全部尺寸名，不要修改生成 Button 添加兼容分支：

- 原 `xs` 攑为 `sm`，并在需要保持 24px 的业务位置补 `h-6 px-2.5`。
- 原 `icon-sm` 攑为 `icon`，并补 `h-7 w-7`。
- 其他默认、小号和大号控件通过项目主题兼容层统一恢复旧密度。

不要只修左下角、某个表单或某个 Dialog。默认 Button、Input、Select、分页和 Switch 使用同一套尺寸契约，必须整体处理。

### 3. Card

New York 没有 `CardAction`。在业务层使用 `CardHeader` 内的横向标题和操作布局。

同时检查：

- 单独存在且没有 CardHeader 的 CardContent 需要 `pt-6`。
- 带顶部分隔线的 CardFooter 需要 `pt-6`。
- Card 内有绝对定位渐变或背景时，Card 需要 `overflow-hidden`。

这些问题来自组件结构差异，不能通过全局给所有 CardContent 或 CardFooter 加内边距解决。

## 六、恢复旧预设的视觉意图

`base-rhea + Tailwind CSS 4` 与 `new-york + Tailwind CSS 3` 的默认视觉不等价。只设置 `--radius: 0.45rem` 仍会产生明显差异。

### 1. 圆角

当前模板使用派生的 `--radius-sm` 到 `--radius-4xl`，并在 Tailwind 配置中把 New York 使用的较小 class 等级映射到旧 Rhea 的有效圆角。

必须回归：

- Button、Input、Textarea 和 Select。
- Card、Dialog 和 AlertDialog。
- DropdownMenu、Popover、SelectContent 和日期范围弹层。
- SidebarInset、SidebarMenu 和分组标签。

弹层内容如果有独立背景，还要配合 `overflow-hidden`，不能把白色直角溢出误判为圆角 Token 错误。

### 2. 控件密度

当前模板通过 Tailwind 主题和共享兼容规则恢复：

- 默认 Button、Input、Select 和图标按钮为 32px。
- 小号 Button 为 28px。
- 旧 `xs` Button 为 24px。
- Switch 宽度为 32px，并同步修正选中态滑块位移。
- Badge 高度为 20px，直属 SVG 为 12px。
- Textarea 最小高度为 64px。
- Dialog 关闭按钮点击区域为 28px。

这层规则放在 `tailwind.config.ts` 和 `app/globals.css`，不能修改 CLI 生成组件，也不能全局重定义会影响业务布局的 `h-8`、`w-8`。

### 3. 半透明菜单和弹层

在业务调用处给 DropdownMenuContent、SelectContent 和 PopoverContent 添加轻边框、半透明 Popover 背景与 backdrop blur，近似原预设的 `default-translucent + subtle`。

不要修改生成组件。日期范围 Popover 还必须：

- 外层使用正确圆角和 `overflow-hidden`。
- Calendar 使用透明背景。
- 保持中文 locale、周一开头和原日期范围行为。

## 七、迁移 T4 类名和主题读取

CLI 重建只能处理 `components/ui`，业务文件中的 Tailwind CSS 4 语法仍需逐个迁移。

重点检查：

- CSS 变量工具类改为 T3 支持的方括号形式。
- T4 后缀 Important 改为 T3 可识别形式，或移除不必要的 Important。
- `not-dark:*` 改为亮暗主题均能表达的稳定类名。
- `color-mix`、OKLCH 和完整颜色变量在内联 style 中的读取。
- T4 自动扫描依赖的目录是否已加入 T3 `content`。
- 动态拼接类名是否改为静态枚举。
- `h-dvh`、`min-h-svh` 等是否具有 `vh` 基线和 `@supports` 增强规则。
- 业务层 `:has()` 是否能由统一 Polyfill 处理，新增的自定义状态属性是否加入观察列表。
- Container Queries、`text-wrap` 等 Chrome 102 不支持的增强样式是否有不依赖新语法的默认布局。

类名顺序变化不等于语义变化。不要为满足格式化而误改业务布局。

## 八、通知、主题和 Provider

保留现有 `next-themes`、ThemeProvider、TooltipProvider 和 QueryClientProvider，并在最靠近根节点的客户端 Provider 中挂载 `CssHasPolyfill`。项目当前使用 `react-hot-toast`，不要因为重建 Shadcn 组件重新引入 Sonner。

自定义 Toaster 应：

- 使用 T3 HSL 变量读取颜色。
- 保持成功、错误、加载图标和关闭行为。
- 保持亮暗主题、紧凑尺寸和响应式宽度。
- 不导入已经删除的 `components/ui/sonner`。

## 九、静态残留检查

完成业务迁移后搜索：

```powershell
rg -n "@base-ui/react|nativeButton|render=|items=|base-rhea|@tailwindcss/postcss|tw-animate-css|@theme|@custom-variant|shadcn/tailwind.css" app components hooks utils package.json components.json postcss.config.*
rg -n "oklch\(|oklab\(|color-mix\(|\b(h|min-h)-(dvh|svh|lvh)\b|:has\(|@container|text-wrap" app components hooks utils
```

还要检查：

- `components/ui` 是否全部来自同一次当前 CLI 的 Radix T3 输出。
- 是否仍有 Base UI 状态属性。
- 是否仍引用已删除的 Button 尺寸。
- 是否存在 T4 专属任意值语法。
- 是否有业务组件错误导入 `@/lib/utils` 或临时参考项目路径。
- 发现 `:has()` 时，是否同时存在 PostCSS 转换、客户端初始化和覆盖条件属性的 `observedAttributes`。
- 发现其他新 CSS 时，是否具有 Chrome 102 可以解析的前置回退；不能把所有现代语法都误归类为 `:has()` Polyfill 的职责。

说明性迁移文档中的关键词不算运行时残留，搜索时应单独分类。

## 十、验证顺序

依次执行：

```powershell
pnpm exec shadcn info --json
pnpm exec prettier --check .
pnpm exec tsc --noEmit
pnpm lint
pnpm build
git diff --check
git status --short
```

生产构建后必须直接检查 `.next/static/**/*.css`，确认：

- 每条保留的原生 `:has()` 都生成了对应的 `csstools-has-*` 属性选择器规则。
- 关键全高页面同时包含 `100vh` 基线和受 `@supports` 保护的 `dvh/svh`。
- 没有无回退的 OKLCH、`color-mix()` 或其他 Chrome 102 无法解析的颜色值。
- Autoprefixer 需要处理的属性已生成目标浏览器所需前缀。

不能只依赖 `pnpm build` 的成功状态；构建成功不代表旧浏览器能够解释最终 CSS。

生产构建需要 `BETTER_AUTH_SECRET` 等环境变量时，只在当前 PowerShell 进程设置非敏感占位值，不写入仓库。构建警告与失败必须区分，不得把页面数据收集阶段的环境门禁误判为 Tailwind 编译失败。

回归至少覆盖：

- 登录、初始化、个人资料和手机号编辑。
- 用户编辑、角色 Select、危险操作确认框。
- 日志筛选、表格排序和分页。
- 日期范围弹层、清除行为和圆角裁切。
- 主题切换、Toast 和暗色模式。
- 桌面侧栏、移动 Sheet、公开首页和注销按钮尺寸。
- CardContent、CardFooter、渐变卡片和 Dialog 的间距与裁切。
- Button、Input、Select、Switch、Badge 和 Textarea 的统一密度。
- Chrome 102 下的登录页、后台全高布局、Radix `data-state` 切换，以及当前所有依赖 `:has()` 的结构样式。

## 十一、完成标准

只有同时满足以下条件才能报告完成：

- Tailwind CSS 3、PostCSS 和内容扫描配置正确。
- shadcn CLI 识别为 `v3 + new-york + radix`。
- Base UI、T4 PostCSS 插件和旧动画包已清理。
- 所有生成组件均由 CLI 重建且没有手改。
- Base UI 组合 API 已全部改为 Radix API。
- 主题、圆角、控件密度、菜单和弹层接近原预设意图。
- Card 间距、渐变裁切、Badge 图标和日期弹层没有回归。
- API、认证、Prisma、Schema 和业务行为没有变化。
- `.browserslistrc` 已恢复当前 T3 模板基线，`:has()` Polyfill、动态视口回退和生产 CSS 审计全部通过。
- Prettier、TypeScript、ESLint、生产构建和 `git diff --check` 通过。
- Git 差异只包含迁移范围。

除非用户明确要求，不创建 Git 提交或推送。
