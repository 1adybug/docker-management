# 项目介绍

格数科技 Next.js 项目模板

## env 文件

根据项目需求，env 文件分为服务端环境变量和公共环境环境变量，服务端环境变量仅服务端可以读取，公共环境环境变量客户端和服务端都能读取。

```env
# 服务端环境变量，仅服务端可以读取
DATABASE_URL="postgresql://postgres:123456@localhost:5432/postgres"
JWT_SECRET="123456"
NEXT_TELEMETRY_DISABLED="1"
ALIYUN_ACCESS_KEY_ID="ALIYUN_ACCESS_KEY_ID"
ALIYUN_ACCESS_KEY_SECRET="ALIYUN_ACCESS_KEY_SECRET"
QJP_SMS_URL="QJP_SMS_URL"

# 公共环境环境变量，客户端和服务端都能读取
NEXT_PUBLIC_COOKIE_PREFIX="NEXT_PUBLIC_COOKIE_PREFIX"

# 可选：内网短信通道开关
IS_INTRANET="0"
```
