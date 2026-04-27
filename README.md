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

项目目前区分“部署级环境变量”和“系统设置”两类配置。建议在本地使用 `.env` 或 `.env.local`，生产环境使用部署平台注入变量。

说明：

- 以 `NEXT_PUBLIC_` 开头的变量会暴露给浏览器，本项目当前无需配置这类变量
- `NODE_ENV` 由运行命令和框架控制，一般不需要手动设置
- `BETTER_AUTH_SECRET` 在生产环境是强制项，未配置会导致服务启动失败；开发环境会使用仅本地可用的兜底值
- 当前版本固定使用项目内的 SQLite 文件数据库，不读取 `DATABASE_URL`
- 运行时配置已经迁移到“系统设置”页面，首次升级后不会自动从旧环境变量导入，需要管理员登录后手动补配
- 下面表格中的“必填”是按当前代码路径和默认实现整理

### 变量清单

| 变量名                        | 必填 | 说明                                      | 示例 / 默认值                 |
| ----------------------------- | ---- | ----------------------------------------- | ----------------------------- |
| `COOKIE_PREFIX`               | 是   | 登录相关 Cookie 前缀                      | `geshu`                       |
| `DEFAULT_EMAIL_DOMAIN`        | 是   | 临时邮箱域名（用于手机号生成邮箱）        | `example.com`                 |
| `BETTER_AUTH_SECRET`          | 是   | Better Auth 签名密钥                      | `your_better_auth_secret`     |
| `BETTER_AUTH_URL`             | 按需 | 服务端 Better Auth 基础地址               | `https://example.com`         |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | 按需 | 客户端 Better Auth 基础地址               | `https://example.com`         |
| `IS_INTRANET`                 | 否   | 是否走内网短信通道                        | `0`（默认关闭）               |
| `ALIYUN_ACCESS_KEY_ID`        | 按需 | 阿里云短信密钥 ID（公网短信时需要）       | `your_key_id`                 |
| `ALIYUN_ACCESS_KEY_SECRET`    | 按需 | 阿里云短信密钥 Secret（公网短信时需要）   | `your_key_secret`             |
| `QJP_SMS_URL`                 | 按需 | 内网短信服务地址（内网短信时需要）        | `http://sms.example.com/send` |
| `NEXT_OUTPUT`                 | 否   | Next 构建输出模式                         | `standalone` / `export`       |
| `NEXT_TELEMETRY_DISABLED`     | 否   | 是否关闭 Next 遥测上报                    | `1`                           |
| `REDIS_URL`                   | 按需 | Redis 地址（仅使用 Redis 限流存储时需要） | `redis://127.0.0.1:6379`      |

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

# 构建与运行
NEXT_OUTPUT="standalone"
NEXT_TELEMETRY_DISABLED="1"

# 可选：仅在你启用 Redis 限流存储时使用
REDIS_URL="redis://127.0.0.1:6379"
```

### 系统设置迁移项

以下配置已迁移到管理员“系统设置”页面维护，不再推荐通过环境变量配置：

- `PRINT_AUTH_OTP`
- `RATE_LIMIT_ENABLED`
- `ALLOW_CURRENT_USER_UPDATE_NICKNAME`
- `ALLOW_CURRENT_USER_UPDATE_PHONE_NUMBER`
- `AUTO_BACKUP_*`
- `DOCKER_PATH_MAPPINGS`
- `PROJECTS_ROOT`
- `PROJECTS_HOST_ROOT`
- `DOCKER_TEMP_ROOT`
- `USE_SYSTEM_7ZA`

### 容器内管理宿主机 Docker

如果本项目运行在 Docker 容器内，并且你希望它管理宿主机上的“非平台项目” `docker-compose.yml`，除了挂载 `/var/run/docker.sock` 以外，还需要把宿主机上的 compose 目录额外挂载进当前容器。

同时在管理员“系统设置”页面中配置“Docker 路径映射”，告诉系统“宿主机路径”与“容器内挂载路径”的对应关系，格式支持两种：

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

平台内创建的项目默认保存在当前运行目录下的 `projects` 文件夹中。你也可以在管理员“系统设置”页面中修改“项目根目录”和“宿主机项目根目录”：

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

### Docker 临时目录

平台在上传镜像包、解压 `dist`、执行 `docker build` 之前，会先创建一个临时工作目录。

- 默认会优先使用当前运行目录下的 `data/tmp/docker`
- 如果在系统设置中配置了 `DOCKER_TEMP_ROOT`，则优先使用该目录
- 只有前两者都不可用时，才会回退到系统临时目录，例如容器内的 `/tmp`

这样可以避免部分容器环境里 `/tmp` 权限异常导致的 `EACCES: permission denied, mkdtemp '/tmp/docker-management-*'` 问题。

如果你希望显式指定目录，推荐在容器部署时配置：

```yaml
services:
    app:
        environment:
            DOCKER_TEMP_ROOT: /app/data/tmp/docker
```

### 系统 7za

如果你需要在上传静态 7z 包时优先使用宿主机的 `7za` 命令，可以在管理员“系统设置”页面开启“使用系统 7za”。

- 保存时会立即校验当前运行环境的 PATH 中是否存在 `7za`
- 校验失败不会写入数据库
- 若后续宿主机移除了 `7za`，再次构建静态镜像时会直接报错，不会静默回退

### Better Auth URL 解析规则

服务端 `auth` 的 `baseURL` 解析顺序：

1. `BETTER_AUTH_URL`
2. 开发环境兜底 `http://localhost:3000`

客户端 `authClient` 的 `baseURL` 解析顺序：

1. 浏览器当前域名 `window.location.origin`
2. `NEXT_PUBLIC_BETTER_AUTH_URL`
3. 开发环境兜底 `http://localhost:3000`

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

自动备份相关项已经迁移到管理员“系统设置”页面，保存后立即生效，应用会自动同步备份调度器。

#### `AUTO_BACKUP_ENABLED`

是否开启自动备份，默认关闭。

#### `AUTO_BACKUP_SCHEDULE_*`

使用系统设置配置备份频率与保留数量，不再推荐通过环境变量维护。

示例：

```env
AUTO_BACKUP_SCHEDULE_HOURLY_EVERY="1"
AUTO_BACKUP_SCHEDULE_HOURLY_RETAIN="48"
AUTO_BACKUP_SCHEDULE_DAILY_EVERY="1"
AUTO_BACKUP_SCHEDULE_DAILY_RETAIN="30"
AUTO_BACKUP_SCHEDULE_WEEKLY_EVERY="1"
AUTO_BACKUP_SCHEDULE_WEEKLY_RETAIN="12"
AUTO_BACKUP_SCHEDULE_MONTHLY_EVERY="1"
AUTO_BACKUP_SCHEDULE_MONTHLY_RETAIN="12"
```

字段说明：

- `AUTO_BACKUP_SCHEDULE_*_EVERY`: 每隔多少个周期执行一次
- `AUTO_BACKUP_SCHEDULE_*_RETAIN`: 当前层级最多保留多少份本地备份

周期说明：

- `AUTO_BACKUP_SCHEDULE_HOURLY_EVERY="2"` 表示每 2 小时备份一次
- `AUTO_BACKUP_SCHEDULE_DAILY_EVERY="3"` 表示每 3 天备份一次
- `AUTO_BACKUP_SCHEDULE_WEEKLY_EVERY="2"` 表示每 2 周备份一次
- `AUTO_BACKUP_SCHEDULE_MONTHLY_EVERY="3"` 表示每 3 个月备份一次

所有 `EVERY` 和 `RETAIN` 字段都必须是正整数。

如果某个字段为空、缺失或不是正整数，只会回退该字段的默认值，不影响其他字段。

#### `AUTO_BACKUP_LOG_RETENTION`

日志保留时长，默认 `365d`。

支持格式：

- `30d`
- `52w`
- `24h`
- `90m`

无效时会回退到 `365d`。

#### `AUTO_BACKUP_S3_*`

使用系统设置配置 S3 或兼容对象存储，不再推荐通过环境变量维护。

示例：

```env
AUTO_BACKUP_S3_ENDPOINT="https://s3.example.com"
AUTO_BACKUP_S3_REGION="auto"
AUTO_BACKUP_S3_BUCKET="example-backups"
AUTO_BACKUP_S3_ACCESS_KEY_ID="your_access_key_id"
AUTO_BACKUP_S3_SECRET_ACCESS_KEY="your_secret_access_key"
AUTO_BACKUP_S3_PREFIX="geshu-next-template"
AUTO_BACKUP_S3_FORCE_PATH_STYLE="1"
```

字段说明：

- `AUTO_BACKUP_S3_ENDPOINT`: 对象存储地址
- `AUTO_BACKUP_S3_REGION`: 区域
- `AUTO_BACKUP_S3_BUCKET`: 桶名
- `AUTO_BACKUP_S3_ACCESS_KEY_ID`: 访问密钥 ID
- `AUTO_BACKUP_S3_SECRET_ACCESS_KEY`: 访问密钥 Secret
- `AUTO_BACKUP_S3_PREFIX`: 可选，对象前缀
- `AUTO_BACKUP_S3_FORCE_PATH_STYLE`: 可选，兼容部分 S3 网关，支持 `1`、`0`、`true`、`false`、`yes`、`no`、`on`、`off`

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
7. 如果 `AUTO_BACKUP_S3_*` 配置有效，再将备份压缩后上传到对象存储

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

#### 4.1 系统设置开关

通过管理员“系统设置”页面中的“启用全局限流”控制全局是否启用限流。保存后立即生效。

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
