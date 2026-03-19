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

项目目前主要使用服务端环境变量，建议在本地使用 `.env` 或 `.env.local`，生产环境使用部署平台注入变量。

说明：

- 以 `NEXT_PUBLIC_` 开头的变量会暴露给浏览器，本项目当前无需配置这类变量
- `NODE_ENV` 由运行命令和框架控制，一般不需要手动设置
- `BETTER_AUTH_SECRET` 在生产环境是强制项，未配置会导致服务启动失败；开发环境会使用仅本地可用的兜底值
- 下面表格中的“必填”是按当前代码路径和默认实现整理

### 变量清单

| 变量名                        | 必填       | 说明                                                     | 示例 / 默认值                 |
| ----------------------------- | ---------- | -------------------------------------------------------- | ----------------------------- |
| `COOKIE_PREFIX`               | 是         | 登录相关 Cookie 前缀                                     | `geshu`                       |
| `DEFAULT_EMAIL_DOMAIN`        | 是         | 临时邮箱域名（用于手机号生成邮箱）                       | `example.com`                 |
| `BETTER_AUTH_SECRET`          | 是         | Better Auth 签名密钥                                     | `your_better_auth_secret`     |
| `BETTER_AUTH_URL`             | 按需       | 服务端 Better Auth 基础地址                              | `https://example.com`         |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | 按需       | 客户端 Better Auth 基础地址                              | `https://example.com`         |
| `IS_INTRANET`                 | 否         | 是否走内网短信通道                                       | `0`（默认关闭）               |
| `ALIYUN_ACCESS_KEY_ID`        | 按需       | 阿里云短信密钥 ID（公网短信时需要）                      | `your_key_id`                 |
| `ALIYUN_ACCESS_KEY_SECRET`    | 按需       | 阿里云短信密钥 Secret（公网短信时需要）                  | `your_key_secret`             |
| `QJP_SMS_URL`                 | 按需       | 内网短信服务地址（内网短信时需要）                       | `http://sms.example.com/send` |
| `RATE_LIMIT_ENABLED`          | 否         | 全局限流开关                                             | `1`（默认开启）               |
| `DOCKER_PATH_MAPPINGS`        | 否         | 宿主机路径到容器路径的映射，用于读取外部 compose 文件    | `/srv/app=>/host-app`         |
| `PROJECTS_ROOT`               | 否         | 平台项目在当前运行环境可访问的根目录                     | `/app/projects`               |
| `PROJECTS_HOST_ROOT`          | 否         | 平台项目在宿主机上的真实根目录，默认等于 `PROJECTS_ROOT` | `/home/projects`              |
| `NEXT_OUTPUT`                 | 否         | Next 构建输出模式                                        | `standalone` / `export`       |
| `DATABASE_URL`                | 按部署方式 | 数据库连接字符串（如改用外部数据库时使用）               | `postgresql://...`            |
| `JWT_SECRET`                  | 按认证配置 | 兼容旧认证方案时使用（当前默认不依赖）                   | `your_jwt_secret`             |
| `NEXT_TELEMETRY_DISABLED`     | 否         | 是否关闭 Next 遥测上报                                   | `1`                           |
| `REDIS_URL`                   | 按需       | Redis 地址（仅使用 Redis 限流存储时需要）                | `redis://127.0.0.1:6379`      |

### 推荐的本地 `.env` 示例

```env
COOKIE_PREFIX="geshu"
DEFAULT_EMAIL_DOMAIN="example.com"
BETTER_AUTH_SECRET="your_better_auth_secret"

# Better Auth URL（按需）
BETTER_AUTH_URL=""

# 客户端可选（未配置时使用当前域名）
NEXT_PUBLIC_BETTER_AUTH_URL=""

IS_INTRANET="0"

# 短信配置（按需启用）
ALIYUN_ACCESS_KEY_ID=""
ALIYUN_ACCESS_KEY_SECRET=""
QJP_SMS_URL=""

# 限流配置
RATE_LIMIT_ENABLED="1"

# 构建与运行
NEXT_OUTPUT="standalone"
NEXT_TELEMETRY_DISABLED="1"

# 可选：仅在你启用 Redis 限流存储时使用
REDIS_URL="redis://127.0.0.1:6379"
```

### 容器内管理宿主机 Docker

如果本项目运行在 Docker 容器内，并且你希望它管理宿主机上的“非平台项目” `docker-compose.yml`，除了挂载 `/var/run/docker.sock` 以外，还需要把宿主机上的 compose 目录额外挂载进当前容器。

同时通过 `DOCKER_PATH_MAPPINGS` 告诉系统“宿主机路径”与“容器内挂载路径”的对应关系，格式支持两种：

```env
DOCKER_PATH_MAPPINGS="/srv/projects=>/host-projects"
```

```env
DOCKER_PATH_MAPPINGS="/srv/projects=>/host-projects||/data/compose=>/host-compose"
```

也支持 JSON 数组：

```env
DOCKER_PATH_MAPPINGS='[{"from":"/srv/projects","to":"/host-projects"}]'
```

例如宿主机的外部项目位于 `/srv/projects/demo/docker-compose.yml`，你可以这样挂载：

```yaml
services:
    app:
        volumes:
            - /var/run/docker.sock:/var/run/docker.sock
            - /srv/projects:/host-projects:ro
        environment:
            DOCKER_PATH_MAPPINGS: /srv/projects=>/host-projects
```

这样容器管理中的“非平台项目”就可以读取宿主机上的 compose 文件，并执行 `docker compose` 相关命令。

### 平台项目目录

平台内创建的项目默认保存在当前运行目录下的 `projects` 文件夹中。你也可以通过以下环境变量覆盖：

```env
PROJECTS_ROOT="/app/projects"
PROJECTS_HOST_ROOT="/home/projects"
```

- `PROJECTS_ROOT` 表示当前应用实际读写项目文件时使用的目录
- `PROJECTS_HOST_ROOT` 表示 Docker 守护进程解析平台项目 `docker-compose.yml` 时应当使用的宿主机目录
- 在物理机直接运行本项目时，通常只需要设置 `PROJECTS_ROOT`，或者两个变量都不设置
- 当本项目运行在容器中，并且宿主机目录挂载到容器内的路径不同，例如 `/home/projects:/app/projects`，请同时设置这两个变量

例如：

```yaml
services:
    app:
        volumes:
            - /var/run/docker.sock:/var/run/docker.sock
            - /home/projects:/app/projects
        environment:
            PROJECTS_ROOT: /app/projects
            PROJECTS_HOST_ROOT: /home/projects
```

这样平台项目的 `docker-compose.yml` 会继续写入容器中的 `/app/projects`，但执行 `docker compose` 时会按照宿主机的 `/home/projects` 解析相对路径。

### Better Auth URL 解析规则

服务端 `auth` 的 `baseURL` 解析顺序：

1. `BETTER_AUTH_URL`
2. 开发环境兜底 `http://localhost:3000`

客户端 `authClient` 的 `baseURL` 解析顺序：

1. 浏览器当前域名 `window.location.origin`
2. `NEXT_PUBLIC_BETTER_AUTH_URL`
3. 开发环境兜底 `http://localhost:3000`

## Server Action 限流

项目内的 `server action` 限流能力已经内置在 `createResponseFn` 流程中。  
只要你的 action 是通过 `createResponseFn` 创建的，就会自动进入限流中间件。

核心入口：

- `server/createResponseFn.ts`
- `server/rateLimit/index.ts`
- `server/rateLimit/types.ts`

### 1. 快速使用

在 `shared` 函数上定义 `rateLimit` 属性即可，推荐使用 `createRateLimit` 获取完整类型提示：

```ts
import { createRateLimit } from "@/server/rateLimit"

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
import { createRateLimit, RateLimitContext } from "@/server/rateLimit"

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
import { createRateLimit } from "@/server/rateLimit"

someFn.rateLimit = createRateLimit({
    enabled: false,
})
```

### 4. 全局开关

#### 4.1 环境变量开关

通过 `RATE_LIMIT_ENABLED` 控制全局是否启用限流：

- `"1"` / `"true"` / `"yes"` / `"on"`: 开启
- `"0"` / `"false"` / `"no"` / `"off"`: 关闭
- 不设置: 默认开启

#### 4.2 运行时开关

你也可以在服务端代码中动态切换：

```ts
import { isGlobalRateLimitEnabled, setGlobalRateLimitEnabled } from "@/server/rateLimit"

setGlobalRateLimitEnabled(false)

const enabled = isGlobalRateLimitEnabled()
console.log(enabled)
```

### 5. 全局策略配置

可以在应用启动时设置全局默认策略：

```ts
import { setGlobalRateLimitOptions } from "@/server/rateLimit"

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
import { createRedisRateLimitStore, setGlobalRateLimitStore } from "@/server/rateLimit"

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
