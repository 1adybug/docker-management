# 项目介绍

格数科技 Next.js 项目模板

## 创建新项目

```bash
git clone https://github.com/1adybug/geshu-next-template my-new-project
cd my-new-project
git remote rename origin template
git remote set-url --push template no_push://template
```

## env 文件

项目将启动、构建、认证核心配置，以及首次登录前就必须可用的短信通道配置放在 `.env` 或部署平台环境变量中。验证码日志打印、限流、用户资料开关、自动备份等运行时配置请登录后台后在“系统设置”页面维护。

说明：

- 以 `NEXT_PUBLIC_` 开头的变量会暴露给浏览器，本项目当前无需配置这类变量
- `NODE_ENV` 由运行命令和框架控制，一般不需要手动设置
- `BETTER_AUTH_SECRET` 在生产环境是强制项，未配置会导致服务启动失败；开发环境会使用仅本地可用的兜底值
- 短信通道和密钥不会进入系统设置，避免首次进入系统时因无法登录而无法配置短信
- 系统设置中的“短信设置”只控制是否在服务端系统日志中打印验证码
- 系统设置中的配置不读取同名环境变量，首次初始化时只写入代码默认值

### 变量清单

| 变量名                        | 必填 | 说明                                    | 示例 / 默认值             |
| ----------------------------- | ---- | --------------------------------------- | ------------------------- |
| `COOKIE_PREFIX`               | 是   | 登录相关 Cookie 前缀                    | `geshu`                   |
| `BETTER_AUTH_SECRET`          | 是   | Better Auth 签名密钥                    | `your_better_auth_secret` |
| `BETTER_AUTH_URL`             | 按需 | 服务端 Better Auth 基础地址             | `https://example.com`     |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | 按需 | 客户端 Better Auth 基础地址             | `https://example.com`     |
| `NEXT_OUTPUT`                 | 否   | Next 构建输出模式                       | `standalone` / `export`   |
| `NEXT_TELEMETRY_DISABLED`     | 否   | 是否关闭 Next 遥测上报                  | `1`                       |
| `REDIS_URL`                   | 按需 | Redis 地址（仅接入 Redis 限流存储时用） | `redis://127.0.0.1:6379`  |
| `IS_INTRANET`                 | 否   | 是否使用内网短信通道                    | `0`                       |
| `QJP_SMS_URL`                 | 按需 | 内网短信服务地址                        | `http://sms.example.com`  |
| `ALIYUN_ACCESS_KEY_ID`        | 按需 | 阿里云短信 AccessKey ID                 | `your_access_key_id`      |
| `ALIYUN_ACCESS_KEY_SECRET`    | 按需 | 阿里云短信 AccessKey Secret             | `your_access_key_secret`  |

### 推荐的本地 `.env` 示例

```env
COOKIE_PREFIX="geshu"
BETTER_AUTH_SECRET="your_better_auth_secret"

# Better Auth URL（按需）
BETTER_AUTH_URL=""

# 客户端可选（未配置时使用当前域名）
NEXT_PUBLIC_BETTER_AUTH_URL=""

# 构建与运行
NEXT_OUTPUT="standalone"
NEXT_TELEMETRY_DISABLED="1"

# 可选：仅在你启用 Redis 限流存储时使用
REDIS_URL="redis://127.0.0.1:6379"

# 短信配置
IS_INTRANET="0"
QJP_SMS_URL=""
ALIYUN_ACCESS_KEY_ID=""
ALIYUN_ACCESS_KEY_SECRET=""
```

### Better Auth URL 解析规则

服务端 `auth` 的 `baseURL` 解析顺序：

1. `BETTER_AUTH_URL`
2. 开发环境兜底 `http://localhost:3000`

客户端 `authClient` 的 `baseURL` 解析顺序：

1. 浏览器当前域名 `window.location.origin`
2. `NEXT_PUBLIC_BETTER_AUTH_URL`
3. 开发环境兜底 `http://localhost:3000`

## 系统设置

管理员登录后可以在“系统设置”页面维护运行时配置。配置保存在数据库中，保存后无需重启即可影响后续请求或调度。

系统设置不会读取同名环境变量。首次初始化时，缺失的配置项会写入代码默认值；之后以数据库中的值为准。

当前包含的设置：

- 基础设置：默认邮箱域名、是否允许用户修改昵称、是否允许用户修改手机号
- 短信设置：是否在服务端系统日志中打印验证码
- 限流设置：是否启用全局限流
- 自动备份：备份开关、备份频率、保留数量、日志保留时长、S3 / 兼容对象存储配置

系统设置中的密钥类设置只在服务端使用。页面不会回显明文，留空保存表示保持原值不变，输入新值才会覆盖。

## 自动备份

项目支持在应用启动时通过 `instrumentation.ts` 自动启动 SQLite 备份调度器。

适用前提：

- 当前部署为单实例或单主实例
- 应用进程是常驻运行，而不是短生命周期 Serverless
- 生产环境的 `/app/data` 已挂载为持久化目录

### 默认策略

- 每小时 1 份，保留 48 小时
- 每天 1 份，保留 30 天
- 每周 1 份，保留 12 周
- 每月 1 份，保留 12 个月
- `OperationLog` 和 `ErrorLog` 默认只保留 1 年内数据

### 系统设置

自动备份配置位于“系统设置 / 自动备份”。保存后会立即同步调度器状态：开启时启动自动备份，关闭时停止自动备份；频率、保留策略和 S3 配置会在后续调度中生效。

#### 备份开关

是否开启自动备份，默认关闭。

#### 备份频率与保留数量

每个层级都有两个配置：

- 备份周期：每隔多少个周期执行一次
- 保留数量：当前层级最多保留多少份本地备份

周期说明：

- 小时备份周期为 `2` 表示每 2 小时备份一次
- 每日备份周期为 `3` 表示每 3 天备份一次
- 每周备份周期为 `2` 表示每 2 周备份一次
- 每月备份周期为 `3` 表示每 3 个月备份一次

备份周期和保留数量都必须是正整数。

#### 日志保留时长

默认 `365d`。

支持格式：

- `30d`
- `52w`
- `24h`
- `90m`

无效时会回退到 `365d`。

#### S3 / 兼容对象存储

字段说明：

- S3 地址：对象存储地址
- S3 区域：区域
- S3 存储桶：桶名
- S3 AccessKey ID：访问密钥 ID
- S3 AccessKey Secret：访问密钥 Secret
- S3 对象前缀：可选，对象前缀
- S3 Path Style：可选，兼容部分 S3 网关

只要任一必填字段缺失或无效，则只做本地备份，不上传对象存储。

### 目录结构

自动备份会在 `data/backups` 下创建目录：

```text
data/backups/
├─ hourly/
├─ daily/
├─ weekly/
├─ monthly/
├─ manifests/
├─ tmp/
└─ state.json
```

说明：

- 各层级目录保存对应备份文件
- `manifests` 保存每份备份的元数据
- `tmp` 保存临时压缩文件
- `state.json` 用于避免同一周期重复备份

### 工作方式

1. 应用启动时注册备份调度器
2. 调度器每分钟检查一次是否进入新的小时 / 日 / 周 / 月周期
3. 命中周期后使用 SQLite 热备份生成一致性快照
4. 备份成功后执行完整性校验
5. 然后按本地保留策略清理旧备份
6. 每天执行一次日志清理
7. 如果 S3 配置有效，再将备份压缩后上传到对象存储

### 注意事项

- 该方案适合单实例常驻进程
- 如果未来部署为多实例，建议补充分布式锁，避免重复备份
- 如果应用长时间停机，错过的周期不会逐个补跑，只会在恢复后补当前周期
- 恢复时建议优先从本地备份恢复，远端对象存储作为灾备副本

## Server Action 限流

项目内的 `server action` 限流能力已经内置在 `createResponseFn` 流程中。  
只要你的 action 是通过 `createResponseFn` 创建的，就会自动进入限流中间件。

核心入口：

- `server/createResponseFn.ts`
- `server/createRateLimit.ts`

### 1. 快速使用

在 `shared` 函数上定义 `rateLimit` 属性即可，推荐使用 `createRateLimit` 获取完整类型提示：

```ts
import { createRateLimit } from "@/server/createRateLimit"

export async function login(params: LoginParams) {
    // ...
}

login.rateLimit = createRateLimit({
    limit: 5,
    windowMs: 60_000,
    message: "登录尝试过于频繁，请稍后再试",
})
```

然后在 `actions` 中正常包一层 `createResponseFn`：

```ts
"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { login } from "@/shared/login"

export const loginAction = createResponseFn(login)
```

### 2. 默认行为

如果 `shared` 函数没有定义 `fn.rateLimit`，会使用全局默认配置：

- `limit`: `120`
- `windowMs`: `60_000`
- `prefix`: `"server-action"`
- `message`: `"操作过于频繁，请稍后再试"`

默认 key 规则：

`{prefix}:{action}:{userId 或 ip 或 anonymous}`

说明：

- 已登录用户优先按 `user.id` 限流
- 未登录用户按 `ip` 限流
- 获取不到 `ip` 时回退到 `anonymous`

### 3. 函数级配置

#### 3.1 自定义 key

当你需要按账号、手机号等字段精细限流时，可以提供 `getKey`：

```ts
import { createRateLimit, RateLimitContext } from "@/server/createRateLimit"

function getLoginRateLimitKey(context: RateLimitContext) {
    const params = context.args[0] as LoginParams | undefined
    const account = params?.account || "unknown-account"
    const ip = context.ip || "unknown-ip"
    return `login:${ip}:${account}`
}

login.rateLimit = createRateLimit({
    limit: 5,
    windowMs: 60_000,
    message: "登录尝试过于频繁，请稍后再试",
    getKey: getLoginRateLimitKey,
})
```

`RateLimitContext` 包含：

- `action`: 当前 action 名称
- `args`: action 参数数组
- `user`: 当前登录用户
- `ip`: 请求来源 IP

#### 3.2 关闭某个函数的限流

方式一，直接关闭：

```ts
someFn.rateLimit = false
```

方式二，使用配置对象关闭：

```ts
import { createRateLimit } from "@/server/createRateLimit"

someFn.rateLimit = createRateLimit({
    enabled: false,
})
```

### 4. 全局开关

#### 4.1 系统设置开关

通过“系统设置 / 限流设置 / 启用全局限流”控制全局是否启用限流。开发环境默认关闭，其他环境默认开启。

#### 4.2 运行时开关

你也可以在服务端代码中动态切换：

```ts
import { isGlobalRateLimitEnabled, setGlobalRateLimitEnabled } from "@/server/createRateLimit"

setGlobalRateLimitEnabled(false)

const enabled = await isGlobalRateLimitEnabled()
console.log(enabled)
```

### 5. 全局策略配置

可以在应用启动时设置全局默认策略：

```ts
import { setGlobalRateLimitOptions } from "@/server/createRateLimit"

setGlobalRateLimitOptions({
    limit: 200,
    windowMs: 120_000,
    prefix: "my-action",
    message: "请求太频繁，请稍后重试",
})
```

### 6. 存储解耦

限流逻辑与存储已解耦，当前支持：

- 内存存储（默认）
- 自建 Redis 存储（通过适配器接入）

#### 6.1 默认内存存储

无需额外配置，系统默认使用：

`createMemoryRateLimitStore()`

适用场景：

- 单实例部署
- 本地开发

注意：

- 多实例下各实例计数独立，不共享限流状态

#### 6.2 使用 Redis 存储

通过 `createRedisRateLimitStore` 提供 `get` / `set` / `delete` 适配函数：

```ts
import { Redis } from "ioredis"

import { createRedisRateLimitStore, setGlobalRateLimitStore } from "@/server/createRateLimit"

const redis = new Redis(process.env.REDIS_URL!)

setGlobalRateLimitStore(
    createRedisRateLimitStore({
        async get(key) {
            return redis.get(key)
        },
        async set({ key, value, ttlMs }) {
            await redis.set(key, value, "PX", ttlMs)
        },
        async delete(key) {
            await redis.del(key)
        },
    }),
)
```

建议在应用启动早期执行一次 `setGlobalRateLimitStore(...)`，避免运行中频繁切换。

### 7. 类型总览

常用类型和函数：

- `RateLimitConfig`
- `RateLimitContext`
- `RateLimitStore`
- `createRateLimit(...)`
- `setGlobalRateLimitOptions(...)`
- `setGlobalRateLimitEnabled(...)`
- `setGlobalRateLimitStore(...)`

### 8. 常见建议

- 登录、验证码、初始化账号等接口建议单独设置更严格的 `rateLimit`
- 管理后台高频查询通常可以用默认全局限流
- 生产多实例部署建议优先使用 Redis 存储，避免限流状态不一致
