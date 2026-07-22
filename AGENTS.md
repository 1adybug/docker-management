# Agent Rules

## Base Rules

### 基本原则

- 永远使用中文回复。
- 优先遵守用户当前明确指令、项目现有代码风格和本规则；当三者冲突时，以用户当前明确指令为准，并简要说明原因。
- 不要修改 `node_modules` 文件夹中的任何文件。
- 未经允许，不要启动项目的开发服务。
- 对于 `Electron` 应用，不要尝试在浏览器中加载和验证；如果需要验证，请使用 `playwright`。
- 涉及破坏性变更前必须先确认，例如删除功能、移除字段、改变 API 行为、修改数据结构或引入不兼容变更。

### 语言与文案

- 中文和英文之间保留一个空格。
- 严格区分中文标点和英文标点，不要混用。
- 如果用户输入中混用了中英文标点，应在合适的时候提示其使用正确标点。

### 代码风格

- 优先使用 `const`，只有需要重新赋值时才使用 `let`。
- 优先使用模板字符串，不使用 `+` 拼接字符串。
- 优先使用 `interface` 描述对象结构；函数类型、联合类型、交叉类型和工具类型组合可以使用 `type`。
- 不要为了集中类型而单独生成 `types/index.ts`。类型应在实际使用位置附近声明并导出。
- 函数参数尽量控制在 2 个以内；超过 2 个时使用对象参数。
- 对象参数的类型名称使用函数名的大驼峰形式加 `Params` 后缀，例如 `QueryBookParams`。
- 除了框架要求的 `React` 页面或路由文件以外，导出必须使用具名导出，不要使用 `export default`。
- 不要使用 `enum` 声明枚举，使用 `as const` 对象加类型推导：

    ```typescript
    export const Gender = {
        男: "male",
        女: "female",
    } as const

    export type Gender = (typeof Gender)[keyof typeof Gender]
    ```

### 注释规范

- 优先通过清晰命名和拆分逻辑表达意图，不要添加重复代码含义的注释。
- 对复杂业务规则、非显然约束、兼容性处理和关键副作用添加简洁注释。
- 普通代码注释优先使用 `//`。
- 面向公共 API、导出的类型、导出的函数或需要 IDE 提示的声明时，可以使用 `/** ... */`。

### 函数声明

- **具名实体用 `function`**：需要导出、复用、在别处引用，或作为返回值返回的具名函数，必须使用 `function` 声明，并显式指定函数名。
- **匿名逻辑用箭头函数**：临时逻辑、回调函数和内联函数优先使用箭头函数。
- 禁止使用 `const add = (a, b) => ...` 这种形式定义顶层或具名工具函数。
- 禁止在 `map`、`filter`、`setTimeout` 等回调中使用匿名 `function`。

| 场景               | 推荐声明形式                 | 示例                              |
| :----------------- | :--------------------------- | :-------------------------------- |
| 顶层导出或工具函数 | 必须使用 `function`          | `export function formatData() {}` |
| React 函数组件     | 优先使用箭头函数 + `FC` 类型 | `const MyComp: FC<P> = () => {}`  |
| 自定义 Hooks       | 必须使用 `function`          | `export function useCustom() {}`  |
| 数组或异步回调     | 必须使用箭头函数             | `.map(item => item.id)`           |
| 高阶函数返回的函数 | 必须使用具名 `function`      | `return function resolver() {}`   |
| 组件内独立 Handler | 必须使用 `function`          | `function onSubmit() {}`          |

### 模块导入

- 优先直接从模块中导入需要的方法，而不是使用 `默认导出.方法` 的形式。
- 如果模块本身只提供默认导出，或项目中已有明确统一写法，可以保持项目现有风格。

### Node.js 与文件操作

- 如果某个方法同时存在同步和异步形式，优先使用异步形式。
- 在 `Node.js` 中，优先使用 `Promise` 版本 API，不使用回调版本 API。
- 处理大文件、文件转发、上传下载或持续读写时，优先使用 `createReadStream` 和 `createWriteStream`。
- 处理小型配置文件、元数据或一次性文本内容时，可以使用 `fs/promises` 中的 `readFile`、`writeFile`。

### Git 提交

- 创建 `git` 提交记录时，必须使用 `type: 具体内容` 格式：

    ```text
    feat: add user profile editor
    fix: resolve login redirect error
    docs: update setup guide
    ```

- 在 monorepo 中，必须使用 `type(package): 具体内容` 格式：

    ```text
    feat(wdp-react): add table filter
    fix(deepsea-tools): handle empty config
    ```

### Skill 创建

- 在 Skill 设计中，Markdown 负责声明能力边界、适用场景、操作原则、决策标准、输入输出契约和失败处理。
- 脚本负责实现可重复、可测试、可验证的确定性执行，包括计算、转换、生成、校验、文件操作、网络交互和系统集成。
- 需要语境理解和判断的规则应写入 Markdown。
- 需要稳定复现并承担副作用的动作应封装为脚本。

### 问题修复

- 修复问题时，应优先定位并修正原有逻辑中的根因，保证核心模型、状态流转和业务语义本身正确。
- 不要在错误结果已经产生之后，再叠加补偿逻辑、后处理逻辑或展示层兜底来掩盖问题。
- 如果修复失败并收到新的问题反馈，不要直接继续叠加补丁。
- 继续修改前，必须复盘之前所有改动，判断哪些应保留、哪些应撤回，以及当前新的根因假设是什么。
- 对没有明确依据、可能引入副作用，或不再符合当前判断的改动，应先撤回，再进行下一次最小化修复。
- 每次进行较大修改后，必须使用 `tsc --noEmit` 和 `eslint` 检查代码，确保代码没有错误。

## Style Rules

### 基本原则

- 样式修改应优先使用项目现有设计系统、组件库能力和 `tailwindcss` 工具类。
- 不要为了局部样式引入新的样式体系、组件库主题方案或全局覆盖规则。
- 修改样式前，先判断目标是组件库主题、单个组件实例，还是普通 DOM 布局；不同目标使用不同方式处理。
- 优先保持现有 UI 风格与交互一致，避免为了实现局部样式引入额外视觉变化。

### 实现优先级

样式实现按以下顺序选择：

1. 组件库提供的主题、属性、插槽、`className`、`classNames` 或类似配置。
2. `className`、`classNames` 或其他类名属性配合 `tailwindcss`。
3. 组件附近已有的 CSS 文件、CSS Module 或项目约定的样式文件。
4. `style` 属性、CSS 变量或新的 CSS 规则。
5. `!important`。

只有前一种方式无法清晰实现时，才使用后一种方式。

### 组件库样式

- 对于 `Ant Design`、`@heroui/react` 等组件库组件，优先使用组件库提供的属性或主题能力修改样式。
- 如果需要修改组件库的全局样式，在 `@/components/Registry.tsx` 中通过 `ConfigProvider` 或类似全局配置组件处理。
- 如果只需要修改某个局部区域的组件样式，使用局部 `ConfigProvider` 包裹目标组件。
- 对于 `React` 组件，也就是非 `div` 等 HTML 元素，谨慎使用 `!important` 覆盖样式；优先使用组件暴露的属性，例如 `radius`、`shape`、`variant`、`color` 等。
- 对于 `Ant Design` 的按钮，优先使用 `color` + `variant` 组合实现不同样式；当 `color` 不是 `default` 时，`variant` 尽量不要使用 `outlined`。

### Tailwind 与动态样式

- 普通布局与视觉样式优先使用 `tailwindcss` 工具类。
- 条件类名使用 `deepsea-tools` 中的 `clsx`。
- 不要使用模板字符串拼接动态 Tailwind 类名，例如 ``className={`w-${width}px`}``。
- 有限状态的动态样式，应枚举为稳定类名后再用 `clsx` 选择。
- 真正运行时才知道的尺寸、坐标、颜色等值，可以使用 `style` 属性或 CSS 变量承载。

```tsx
const sizeClassName = isLarge ? "h-12 px-4" : "h-8 px-3"

return <div className={clsx("text-base", sizeClassName, className)} />
```

### 布局稳定性

- 使用 `flex` 布局时，宽度或高度必须保持固定的子元素应设置 `flex-none`。
- 列表、工具栏、按钮组、表格操作列等区域应避免因为内容变化发生明显横向抖动。
- 如果内容可能溢出，优先通过 `min-w-0`、`truncate`、`overflow-hidden`、`shrink`、`flex-none` 等工具类明确伸缩行为。

### 滚动条抖动

如果容器在不同状态下有时出现纵向滚动条、有时不出现，导致右侧按钮或内容边界横向抖动，应使用 CSS 动态 `padding` 抵消滚动条宽度，不要硬编码滚动条宽度。

处理步骤：

1. 确定内容区域在没有滚动条时的理论宽度，例如窗口宽度减去左侧固定侧边栏宽度：`calc(100vw - 84px)`。
2. 设置左侧 `padding` 为基础值，例如 `28px`。
3. 右侧 `padding` 设置为基础值减去“理论宽度和当前容器实际宽度的差值”。

```css
.content {
    padding-left: 28px;
    padding-right: calc(28px - ((100vw - 84px) - 100%));
}
```

其中 `100%` 是当前内容容器实际可用宽度。没有滚动条时差值为 `0`；有滚动条时差值等于滚动条占用宽度，从而抵消横向偏移。

响应式场景下，如果侧边栏宽度或基础 `padding` 改变，也要在对应断点同步更新公式。

## React Rules

### 基本原则

- 项目的 `React` 版本为 `19`，生成代码时优先使用 `React 19` 的稳定能力与推荐写法。
- 组件优先使用函数式组件，不使用类组件。
- 如果组件内部没有逻辑，只有一个返回节点，优先使用箭头函数隐式返回，不要额外写 `return`。
- 禁止使用 `<></>`，必须从 `react` 中导入并使用 `Fragment`。
- 如果组件没有 `children`，使用自闭合标签，例如 `<div />`，不要写成 `<div></div>`。
- `React` 类型与全局类型或项目内命名冲突时，使用别名导入：

    ```tsx
    import { MouseEvent as ReactMouseEvent } from "react"
    ```

- 变量别名使用小驼峰命名，类型别名使用大驼峰命名。

### React 19

- 使用 `Actions` 处理异步数据变更、提交状态、错误处理、乐观更新与表单提交；异步提交函数优先命名为 `xxxAction`。
- 表单提交优先使用 `<form action={xxxAction}>`、元素级 `formAction`、`useActionState`、`useFormStatus` 与 `requestFormReset`。
- 需要乐观 UI 时优先使用 `useOptimistic`。
- 需要在渲染阶段读取 `Promise` 或条件读取 `Context` 时优先使用 `use`，但不要在渲染期间创建未缓存的 `Promise`。
- 函数组件需要接收 `ref` 时，优先将 `ref` 作为普通 `props` 接收，新组件不要优先使用 `forwardRef`。
- 新增 `Context` Provider 时优先使用 `<SomeContext value={value}>`，不要优先使用 `<SomeContext.Provider>`。
- 回调 `ref` 需要清理逻辑时可以返回清理函数；没有清理逻辑时不要使用隐式返回。
- 需要初始占位值的延迟渲染时优先使用 `useDeferredValue(value, initialValue)`。
- 页面级元数据优先直接在组件中渲染 `<title>`、`<meta>` 与 `<link>`，让 `React` 自动提升到 `<head>`。
- 组件依赖样式表时可以渲染 `<link rel="stylesheet" precedence="...">` 或 `<style precedence="...">`，让 `React` 管理顺序、加载与去重。
- 组件依赖异步脚本时可以直接渲染 `<script async src="...">`，让 `React` 管理提升与去重。
- 需要优化资源加载时，优先使用 `react-dom` 中的 `prefetchDNS`、`preconnect`、`preload` 与 `preinit`。
- 静态站点生成优先使用 `react-dom/static` 中的 `prerender` 与 `prerenderToNodeStream`。
- 框架支持时优先考虑 `React Server Components` 与 `Server Actions`，其中 `"use server"` 仅用于 `Server Actions`。
- 需要保留隐藏页面状态、预渲染下一步界面或降低隐藏内容优先级时，可以使用 `Activity`。
- `Effect` 中由外部系统触发、但需要读取最新 `props` 或 `state` 的事件逻辑，优先使用 `useEffectEvent`。
- `React Server Components` 中需要在缓存生命周期结束时中止或清理异步工作，可以使用 `cacheSignal`。
- 需要 Web Components 时可以直接使用 `Custom Elements`，`React 19` 已支持属性与 SSR 行为。

### Props 设计

- 组件的根元素或根组件类型，是当前组件 `props` 的基础类型。
- 当前组件所需的原始业务数据统一使用 `data` 属性传入。
- `data` 指整个项目中的原始数据类型，例如从 `queryBook` 接口获取到的 `Book`。
- 没有特殊原因时，不要把业务数据拆成大量平铺属性传入组件。
- 尽量直接在函数式组件参数中解构 `props`，并将剩余属性收集为 `rest`。
- 根元素是 HTML 元素时，继承对应元素类型，例如 `StrictOmit<ComponentProps<"div">, "children">`。
- 根组件是其他组件时，继承 `StrictOmit<ComponentProps<typeof Component>, "children">`；如果已有明确的 `ComponentProps` 类型，则优先继承该类型。

```tsx
import { ComponentProps, FC } from "react"

import { clsx, StrictOmit } from "deepsea-tools"

export interface Book {
    id: string
    name: string
    isbn: string
}

export interface BookProps extends StrictOmit<ComponentProps<"div">, "children"> {
    data?: Book
}

export const Book: FC<BookProps> = ({ className, data, ...rest }) => (
    <div className={clsx("container", className)} {...rest}>
        <div>{data?.name}</div>
        <div>{data?.isbn}</div>
    </div>
)
```

### JSX 属性顺序

组件的 `props` 书写顺序如下：

1. 身份属性：`ref`、`key`、`id`。
2. 样式属性：`className`、`classNames`、`style`、`size` 等。
3. 数据属性：`value`、`defaultValue`、`data` 等。
4. 回调事件：`onClick`、`onChange` 等。
5. 透传属性：`...rest`。

示例：

```tsx
<OtherInput ref={ref} className={className} value={value} onValueChange={onValueChange} {...rest} />
```

### className

- 如果需要给根组件设置 `className`，使用 `deepsea-tools` 中的 `clsx` 合并内置类名与外部类名。
- 不要手写字符串拼接类名，条件类名也使用 `clsx`。

```tsx
return (
    <div className={clsx("container", className)} {...rest}>
        ...
    </div>
)
```

### 事件处理

- 事件处理函数使用 `on` + 事件名命名，例如 `onClick`，不要命名为 `handleClick`。
- 如果组件内部事件与 `props` 中的事件同名，将外部事件重命名为下划线前缀，内部逻辑优先执行，然后调用外部事件。

```tsx
import { ComponentProps, FC, MouseEvent as ReactMouseEvent } from "react"

import { StrictOmit } from "deepsea-tools"

export interface AppProps extends StrictOmit<ComponentProps<"div">, "children"> {}

export const App: FC<AppProps> = ({ onClick: _onClick, ...rest }) => {
    function onClick(event: ReactMouseEvent<HTMLDivElement, MouseEvent>) {
        console.log("onClick")

        _onClick?.(event)
    }

    return (
        <div onClick={onClick} {...rest}>
            Hello World!
        </div>
    )
}
```

### 受控组件

- 受控组件使用 `value` 和 `onValueChange` 实现。
- `value` 和 `onValueChange` 都应该是可选属性。
- 组件内部使用 `soda-hooks` 中的 `useInputState` 同步内部状态与外部状态。
- 内部更新状态后，再调用外部传入的 `onValueChange`。

```tsx
import { ComponentProps, FC } from "react"

import { StrictOmit } from "deepsea-tools"
import { useInputState } from "soda-hooks"

export interface MyInputProps extends StrictOmit<ComponentProps<typeof OtherInput>, "value" | "onValueChange"> {
    value?: string
    onValueChange?: (value: string) => void
}

export const MyInput: FC<MyInputProps> = ({ value: _value, onValueChange: _onValueChange, ...rest }) => {
    const [value, setValue] = useInputState(_value)

    function onValueChange(value: string) {
        setValue(value)
        _onValueChange?.(value)
    }

    return <OtherInput value={value} onValueChange={onValueChange} {...rest} />
}
```

### ref 处理

- 需要接收外部 `ref` 时，优先直接从 `props` 中解构 `ref`。
- 如果组件内部也需要根节点引用，使用内部 `useRef` 保存节点，再通过 `useImperativeHandle` 暴露给外部 `ref`。

```tsx
import { ComponentProps, FC, useImperativeHandle, useRef } from "react"

import { StrictOmit } from "deepsea-tools"

export interface AppProps extends StrictOmit<ComponentProps<"div">, "children"> {}

export const App: FC<AppProps> = ({ ref, ...rest }) => {
    const container = useRef<HTMLDivElement>(null)

    useImperativeHandle(ref, () => container.current!)

    return (
        <div ref={container} {...rest}>
            Hello World!
        </div>
    )
}
```

### 组件与页面

生成组件或页面时，遵循以下规则：

1. 先分析页面结构，识别重复的 UI 片段与逻辑，并判断是否值得抽取。
2. 不要为了抽取而抽取，优先考虑维护成本、可读性与测试价值。
3. 新增组件或页面前，检查已有目录，尤其是 `@/components` 与 `@/utils`，优先复用已有实现。
4. 抽取的公共组件放在 `@/components` 目录下，公共工具函数放在 `@/utils` 目录下。
5. 禁止把公共组件或公共工具函数随意放入业务页面目录。
6. 抽取时保持原有 UI 风格与交互一致，避免引入不必要的样式或行为变化。
7. 组件拆分应提升可读性与可测试性；如果拆分后跨文件沟通成本明显增加，则保留在原文件。
8. 抽取出的组件与工具必须提供清晰的 `props`、函数签名与命名，便于维护与扩展。

### 第三方组件

- 新增 `shadcn/ui` 组件时禁止凭空生成组件代码，必须先使用命令行工具添加：

    ```bash
    npx shadcn@latest add <component-name>
    ```

- `@/components/ui/**/*.tsx` 是项目设计系统源码。项目级默认预设、通用尺寸变体、稳定语义属性或通用组件 API 应直接在对应组件中维护；只服务于单个页面或单次使用的差异仍在调用处通过 props 或 `className` 实现。
- 再次通过 CLI 覆盖已有组件前，必须先审计并保留项目级定制，不能把组件源码中的预设改动重新迁移成全局 CSS 选择器。
- 新增或更新组件时必须遵循 [`components/ui/README.md`](components/ui/README.md) 中的适配流程、当前项目级预设和验证清单。
- 如果使用 `ai-elements` 组件，禁止修改原始组件，一般路径为 `@/components/ai-elements/**/*.tsx`。

## API Rules

当用户发送 API 文档并要求生成代码时，按照以下规则创建 `@/apis` 与 `@/hooks` 相关代码。

### 基本原则

- 只根据 API 文档中明确提供的信息生成代码，不要臆造字段、枚举值、接口路径或响应结构。
- 如果文档缺少请求路径、请求方法、参数位置、响应结构等关键信息，应先指出缺失点；能够根据上下文安全推断时，可以说明推断依据后继续生成。
- 使用 4 个空格缩进，文件尾部保留一个空行。
- API 函数的文件名、函数名与接口语义保持一致，例如 `queryUser.ts` 导出 `queryUser`。
- API 函数是顶层可复用函数，按照 `base.md` 的函数声明规则使用 `function` 声明。
- 生成新文件前，优先检查已有 `@/apis`、`@/hooks` 中是否存在可复用类型、枚举或函数，避免重复定义。

### 参数命名

- 对象参数统一命名为 `params`，类型命名为函数名的大驼峰形式加 `Params` 后缀，例如 `QueryUserParams`。
- 如果参数对象的所有属性都是可选的，给 `params` 添加默认值 `= {}`。
- 获取详情接口如果只接收一个唯一标识符，可以直接使用标识符参数，例如 `id: User["id"]`，不强制包装为对象。
- 请求参数较复杂时，优先保持文档字段名，不要为了前端语义擅自改名。

```typescript
export async function queryUser(params: QueryUserParams = {}) {
    const response = await request<Page<User>>("/user/query", { search: params })
    return response
}

export async function getUser(id: User["id"]) {
    const response = await request<User>(`/user/${id}`)
    return response
}
```

### 类型建模

- 如果响应是分页数据，使用 `deepsea-tools` 中的 `Page` 泛型，例如 `Page<User>`。
- 如果响应是对象，除非文档明确说明字段可选，否则不要使用 `?` 标记可选。
- 新增参数与更新参数通常应复用原始模型类型，灵活使用 `Omit`、`Pick`、`Partial` 等工具类型。
- 如果字段说明中体现了枚举含义，按照 `base.md` 的枚举规则建模，并用该枚举类型替代原先的 `string` 或 `number` 类型。
- 枚举对象的 `key` 使用中文说明，`value` 使用文档取值，`key` 的长度尽量保持一致。
- 类型、枚举和接口函数应尽可能复用已有定义；如果两个接口文件之间关系明确，直接导入已有类型，不要重复声明。

```typescript
export interface User {
    id: string
    name: string
    status: UserStatus
    createdAt: string
    updatedAt: string
}

export interface AddUserParams extends Omit<User, "id" | "createdAt" | "updatedAt"> {}

export interface UpdateUserParams extends User {}
```

### 请求实现

- API 请求始终使用 `@/utils/request` 中的 `request` 函数。
- 将返回值类型传给 `request` 的泛型参数。
- 不要直接返回 `request(...)`，应先赋值给 `response`，再返回 `response`。
- Query 参数传给 `search` 属性，不需要额外拼接 URL。
- Body 参数传给 `body` 属性，不需要 `JSON.stringify`，不需要手动设置 `Content-Type: application/json`。
- Body 请求如果文档没有特殊要求，不需要显式设置 `method: "POST"`，由 `request` 内部处理。
- 如果文档明确要求 `DELETE`、`PUT`、`PATCH` 等方法，必须显式传递 `method`。

```typescript
import { request } from "@/utils/request"

export async function addUser(params: AddUserParams) {
    const response = await request<User>("/user/add", { body: params })
    return response
}

export async function deleteUser(params: DeleteUserParams) {
    const response = await request<User>("/user/delete", {
        method: "DELETE",
        body: params,
    })

    return response
}
```

### 常规接口

常规资源接口通常分为 5 类。以 `User` 为例：

| 类型     | 函数名       | 参数               | 返回值       | 说明                     |
| :------- | :----------- | :----------------- | :----------- | :----------------------- |
| 查询列表 | `queryUser`  | `QueryUserParams`  | `Page<User>` | 参数通常放在 `search` 中 |
| 获取详情 | `getUser`    | `User["id"]`       | `User`       | 使用资源唯一标识符       |
| 新增     | `addUser`    | `AddUserParams`    | `User`       | 参数通常放在 `body` 中   |
| 更新     | `updateUser` | `UpdateUserParams` | `User`       | 参数通常放在 `body` 中   |
| 删除     | `deleteUser` | `DeleteUserParams` | `User`       | 请求方法通常为 `DELETE`  |

### Hook 生成

- 每个 API 函数生成对应 Hook，文件放在 `@/hooks` 目录下。
- Hook 文件名为 `use` + 函数名大驼峰形式，例如 `queryUser` 对应 `useQueryUser.ts`。
- `queryKey` 使用 API 函数名的短横线命名，例如 `query-user`、`get-user`。
- 查询类接口使用 `createUseQuery`。
- 新增、更新、删除等操作类接口使用 `createUseMutation`。
- 操作成功后，应刷新受影响的查询缓存，例如列表查询与当前详情查询。
- 消息提示优先使用项目已有实现；如果项目没有统一提示组件，不要为了 Hook 主动引入新的 UI 库。

#### 查询列表

```typescript
import { createUseQuery } from "soda-tanstack-query"
import { queryUser } from "@/apis/queryUser"

export const useQueryUser = createUseQuery({
    queryFn: queryUser,
    queryKey: "query-user",
})
```

#### 获取详情

详情接口的 Hook 应允许标识符为空；为空时返回 `null`，避免发送无效请求。

```typescript
import { isNonNullable } from "deepsea-tools"
import { createUseQuery } from "soda-tanstack-query"
import { getUser } from "@/apis/getUser"
import type { User } from "@/apis/queryUser"

export function getUserOptional(id?: User["id"]) {
    return isNonNullable(id) ? getUser(id) : null
}

export const useGetUser = createUseQuery({
    queryFn: getUserOptional,
    queryKey: "get-user",
})
```

#### 操作接口

以下示例以项目已使用 `Ant Design` 的 `message` 为前提；如果项目使用其他提示组件，应替换为项目已有实现。

```typescript
import { useId } from "react"

import { message } from "antd"
import { createUseMutation } from "soda-tanstack-query"
import { addUser } from "@/apis/addUser"

export const useAddUser = createUseMutation(() => {
    const key = useId()

    return {
        mutationFn: addUser,
        onMutate() {
            message.open({
                key,
                type: "loading",
                content: "新增用户中...",
                duration: 0,
            })
        },
        onSuccess(data, variables, onMutateResult, context) {
            context.client.invalidateQueries({ queryKey: ["query-user"] })
            context.client.invalidateQueries({ queryKey: ["get-user", data.id] })

            message.open({
                key,
                type: "success",
                content: "新增用户成功",
            })
        },
        onError() {
            message.destroy(key)
        },
    }
})
```

## Next Rules

针对 `Next.js` 16 项目。需要确认框架行为时，优先查看项目内文档：`node_modules/next/dist/docs/`。

### 基本原则

- 业务逻辑优先放在 `@/shared`，`Server Action` 只作为薄封装。
- 所有来自客户端或外部请求的参数都必须先经过 `schema` 校验。
- `"use server"` 只放在 `@/actions` 等真正声明 `Server Action` 的文件中，不要放在普通业务函数里。
- 客户端调用服务端能力时，优先走 `shared -> actions -> presets -> hooks` 链路。
- 如果需要同时暴露 `Server Action` 与 `API Route`，优先通过 `createSharedFn` 的 `route` 配置复用同一份 `shared` 逻辑。

### Server Action 工作流

创建一个 `Server Action` 时，以 `addUser` 为例，按以下顺序生成文件：

| 步骤 | 文件                            | 职责                            |
| :--- | :------------------------------ | :------------------------------ |
| 1    | `@/schemas/addUser.ts`          | 声明参数校验、参数类型与 parser |
| 2    | `@/shared/addUser.ts`           | 实现服务端业务逻辑              |
| 3    | `@/actions/addUser.ts`          | 声明 `"use server"` 并包装响应  |
| 4    | `@/presets/createUseAddUser.ts` | 声明 mutation 默认行为          |
| 5    | `@/hooks/useAddUser.ts`         | 生成客户端 Hook                 |

#### Schema

```typescript
import { getParser } from "."
import { z } from "zod"

import { phoneSchema } from "./phone"

import { roleSchema } from "./role"

import { usernameSchema } from "./username"

export const addUserSchema = z.object(
    {
        username: usernameSchema,
        phone: phoneSchema,
        role: roleSchema,
    },
    { message: "无效的用户参数" },
)

export type AddUserParams = z.infer<typeof addUserSchema>

export const addUserParser = getParser(addUserSchema)
```

#### Shared

- `shared` 文件不写 `"use server"`。
- `schema` 必须传给 `createSharedFn`。
- 如果需要权限控制，使用 `filter`。
- 如果需要暴露为 `API Route`，使用 `route`；`bodyType` 必须和实际请求体类型一致。
- 函数内部需要向客户端暴露错误时，使用 `ClientError`。

```typescript
import { prisma } from "@/prisma"
import { type AddUserParams, addUserSchema } from "@/schemas/addUser"
import { createSharedFn } from "@/server/createSharedFn"
import { isAdmin } from "@/server/isAdmin"
import { ClientError } from "@/utils/clientError"

export const addUser = createSharedFn({
    name: "addUser",
    schema: addUserSchema,
    filter: isAdmin,
    route: {
        pathname: "/users",
        bodyType: "json",
    },
})(async function addUser(params: AddUserParams) {
    const count = await prisma.user.count({ where: { username: params.username } })

    if (count > 0) throw new ClientError("用户名已存在")

    const user = await prisma.user.create({ data: params })
    return user
})
```

#### Action

- `@/actions/*.ts` 文件顶部必须放 `"use server"`。
- `Action` 文件只负责把 `shared` 函数包装为响应函数，不写业务逻辑。
- 命名使用 `xxxAction`。

```typescript
"use server"

import { createResponseFn } from "@/server/createResponseFn"
import { addUser } from "@/shared/addUser"

export const addUserAction = createResponseFn(addUser)
```

#### Preset

- `preset` 文件负责声明 mutation 的默认提示、缓存刷新与副作用。
- 消息提示优先使用项目已有实现；下面示例以项目已使用 `Ant Design` 的 `message` 为前提。
- 成功后刷新所有受影响的 query，例如列表与详情。

```typescript
import { useId } from "react"

import { message } from "antd"
import { withUseMutationDefaults } from "soda-tanstack-query"
import type { addUser } from "@/shared/addUser"

export const createUseAddUser = withUseMutationDefaults<typeof addUser>(() => {
    const key = useId()

    return {
        onMutate() {
            message.open({
                key,
                type: "loading",
                content: "新增用户中...",
                duration: 0,
            })
        },
        onSuccess(data, variables, onMutateResult, context) {
            context.client.invalidateQueries({ queryKey: ["query-user"] })
            context.client.invalidateQueries({ queryKey: ["get-user", data.id] })

            message.open({
                key,
                type: "success",
                content: "新增用户成功",
            })
        },
        onError() {
            message.destroy(key)
        },
    }
})
```

#### Hook

- `hook` 文件负责把 `Action` 转为客户端请求函数，并套用对应 `preset`。
- 客户端请求函数命名为 `xxxClient`。
- Hook 命名为 `useXxx`。

```typescript
import { createRequestFn } from "deepsea-tools"
import { addUserAction } from "@/actions/addUser"
import { createUseAddUser } from "@/presets/createUseAddUser"

export const addUserClient = createRequestFn(addUserAction)

export const useAddUser = createUseAddUser(addUserClient)
```

### Schema 设计

- `schema` 文件放在 `@/schemas` 目录下。
- 组合型对象或数组字段应尽量独立成文件，便于复用，不要直接堆在业务 schema 中。
- 字段级 schema 的命名使用字段名加 `Schema` 后缀，例如 `usernameSchema`。
- 参数类型使用 schema 名称对应的大驼峰形式加 `Params` 后缀，例如 `AddUserParams`。
- 每个 schema 文件都应导出对应的 `parser`，命名为 `xxxParser`。

不要把可复用字段直接写在业务 schema 里：

```typescript
export const addUserSchema = z.object(
    {
        username: z.string({ message: "无效的用户名" }),
    },
    { message: "无效的用户参数" },
)
```

应抽取为字段级 schema：

```typescript
import { getParser } from "."
import { z } from "zod"

export const usernameSchema = z
    .string({ message: "无效的用户名" })
    .min(4, { message: "用户名长度不能低于 4 位" })
    .max(16, { message: "用户名长度不能超过 16 位" })
    .regex(/^[a-zA-Z0-9_]+$/, { message: "用户名只能包含字母、数字和下划线" })
    .regex(/^[a-zA-Z]/, { message: "用户名必须以字母开头" })

export type UsernameParams = z.infer<typeof usernameSchema>

export const usernameParser = getParser(usernameSchema)
```

### Utils 与 Server

- `@/utils` 目录只能放客户端可访问，或客户端与服务端都可访问的工具函数。
- 只能在服务端访问的工具函数、鉴权逻辑、数据库逻辑、密钥相关逻辑，必须放在 `@/server` 或其他明确的服务端目录下。
- 不要从客户端组件、客户端 Hook 或浏览器可执行代码中导入 `@/server` 文件。

### API Route

- 只有功能必须通过 HTTP 接口暴露时才创建 `API Route`，例如第三方调用、Webhook、文件下载或 `Server Action` 无法覆盖的场景。
- 成功响应是 JSON 数据时，优先使用 `shared -> action/route -> preset -> hooks/apis` 链路，不要直接写独立 `route.ts`。
- 需要创建 JSON `API Route` 时，优先给 `createSharedFn` 配置 `route`。
- 只有成功响应不是 JSON 时，才允许直接定义独立 `route.ts`。
- 文件下载、二进制流、图片流、上游流式透传等场景，可以保留独立 `route.ts`。
- 即使保留独立 `route.ts`，核心业务逻辑也应尽量复用 `@/shared`。
