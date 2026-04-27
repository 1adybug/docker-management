export const SystemSettingValueKind = {
    文本: "text",
    密钥: "secret",
    布尔: "boolean",
    可选布尔: "optionalBoolean",
    正整数: "positiveInteger",
    时长: "duration",
    地址: "url",
    多行文本: "textarea",
    绝对路径: "absolutePath",
} as const

export type SystemSettingValueKind = (typeof SystemSettingValueKind)[keyof typeof SystemSettingValueKind]

export const SystemSettingGroupKey = {
    基础设置: "base",
    短信设置: "sms",
    限流设置: "rate-limit",
    自动备份: "auto-backup",
    Docker项目设置: "docker-project",
} as const

export type SystemSettingGroupKey = (typeof SystemSettingGroupKey)[keyof typeof SystemSettingGroupKey]

export const SystemSettingKey = {
    打印验证码日志: "PRINT_AUTH_OTP",
    全局限流: "RATE_LIMIT_ENABLED",
    允许修改昵称: "ALLOW_CURRENT_USER_UPDATE_NICKNAME",
    允许修改手机号: "ALLOW_CURRENT_USER_UPDATE_PHONE_NUMBER",
    自动备份: "AUTO_BACKUP_ENABLED",
    小时备份周期: "AUTO_BACKUP_SCHEDULE_HOURLY_EVERY",
    小时备份保留数量: "AUTO_BACKUP_SCHEDULE_HOURLY_RETAIN",
    每日备份周期: "AUTO_BACKUP_SCHEDULE_DAILY_EVERY",
    每日备份保留数量: "AUTO_BACKUP_SCHEDULE_DAILY_RETAIN",
    每周备份周期: "AUTO_BACKUP_SCHEDULE_WEEKLY_EVERY",
    每周备份保留数量: "AUTO_BACKUP_SCHEDULE_WEEKLY_RETAIN",
    每月备份周期: "AUTO_BACKUP_SCHEDULE_MONTHLY_EVERY",
    每月备份保留数量: "AUTO_BACKUP_SCHEDULE_MONTHLY_RETAIN",
    自动备份日志保留: "AUTO_BACKUP_LOG_RETENTION",
    自动备份S3地址: "AUTO_BACKUP_S3_ENDPOINT",
    自动备份S3区域: "AUTO_BACKUP_S3_REGION",
    自动备份S3桶: "AUTO_BACKUP_S3_BUCKET",
    自动备份S3密钥ID: "AUTO_BACKUP_S3_ACCESS_KEY_ID",
    自动备份S3密钥Secret: "AUTO_BACKUP_S3_SECRET_ACCESS_KEY",
    自动备份S3前缀: "AUTO_BACKUP_S3_PREFIX",
    自动备份S3PathStyle: "AUTO_BACKUP_S3_FORCE_PATH_STYLE",
    Docker路径映射: "DOCKER_PATH_MAPPINGS",
    项目根目录: "PROJECTS_ROOT",
    宿主机项目根目录: "PROJECTS_HOST_ROOT",
    Docker临时目录: "DOCKER_TEMP_ROOT",
    使用系统7za: "USE_SYSTEM_7ZA",
} as const

export type SystemSettingKey = (typeof SystemSettingKey)[keyof typeof SystemSettingKey]

export interface SystemSettingGroupDefinition {
    key: SystemSettingGroupKey
    label: string
    description: string
}

export interface SystemSettingDefinition {
    key: SystemSettingKey
    group: SystemSettingGroupKey
    kind: SystemSettingValueKind
    label: string
    description: string
    defaultValue: string
    placeholder?: string
    required?: boolean
}

export interface PublicSystemSetting {
    key: SystemSettingKey
    kind: SystemSettingValueKind
    label: string
    description: string
    value?: string
    hasValue: boolean
    secret: boolean
    placeholder?: string
}

export interface PublicSystemSettingGroup {
    key: SystemSettingGroupKey
    label: string
    description: string
    settings: PublicSystemSetting[]
}

export const SystemSettingGroups: SystemSettingGroupDefinition[] = [
    {
        key: SystemSettingGroupKey.基础设置,
        label: "基础设置",
        description: "管理用户自助修改能力。",
    },
    {
        key: SystemSettingGroupKey.短信设置,
        label: "短信设置",
        description: "管理验证码调试日志，短信通道和密钥仍由环境变量配置。",
    },
    {
        key: SystemSettingGroupKey.限流设置,
        label: "限流设置",
        description: "控制服务端动作的全局限流开关。",
    },
    {
        key: SystemSettingGroupKey.自动备份,
        label: "自动备份",
        description: "配置本地备份策略和 S3 兼容对象存储上传。",
    },
    {
        key: SystemSettingGroupKey.Docker项目设置,
        label: "Docker / 项目运行设置",
        description: "管理项目目录、路径映射、临时目录与系统 7za 行为。",
    },
]

export const SystemSettingDefinitions: SystemSettingDefinition[] = [
    {
        key: SystemSettingKey.允许修改昵称,
        group: SystemSettingGroupKey.基础设置,
        kind: SystemSettingValueKind.布尔,
        label: "允许用户修改昵称",
        description: "关闭后，个人中心不再显示昵称编辑入口。",
        defaultValue: "1",
    },
    {
        key: SystemSettingKey.允许修改手机号,
        group: SystemSettingGroupKey.基础设置,
        kind: SystemSettingValueKind.布尔,
        label: "允许用户修改手机号",
        description: "关闭后，个人中心不再显示手机号编辑入口。",
        defaultValue: "1",
    },
    {
        key: SystemSettingKey.打印验证码日志,
        group: SystemSettingGroupKey.短信设置,
        kind: SystemSettingValueKind.布尔,
        label: "在日志中打印验证码",
        description: "开启后，发送手机号验证码时会在服务端系统日志打印账户和验证码。",
        defaultValue: "0",
    },
    {
        key: SystemSettingKey.全局限流,
        group: SystemSettingGroupKey.限流设置,
        kind: SystemSettingValueKind.布尔,
        label: "启用全局限流",
        description: "关闭后，服务端动作不再执行全局频率限制。",
        defaultValue: "1",
    },
    {
        key: SystemSettingKey.自动备份,
        group: SystemSettingGroupKey.自动备份,
        kind: SystemSettingValueKind.布尔,
        label: "启用自动备份",
        description: "开启后，应用会按策略定期备份 SQLite 数据库。",
        defaultValue: "0",
    },
    {
        key: SystemSettingKey.小时备份周期,
        group: SystemSettingGroupKey.自动备份,
        kind: SystemSettingValueKind.正整数,
        label: "小时备份周期",
        description: "每隔多少小时执行一次小时级备份。",
        defaultValue: "1",
    },
    {
        key: SystemSettingKey.小时备份保留数量,
        group: SystemSettingGroupKey.自动备份,
        kind: SystemSettingValueKind.正整数,
        label: "小时备份保留数量",
        description: "小时级本地备份最多保留多少份。",
        defaultValue: "48",
    },
    {
        key: SystemSettingKey.每日备份周期,
        group: SystemSettingGroupKey.自动备份,
        kind: SystemSettingValueKind.正整数,
        label: "每日备份周期",
        description: "每隔多少天执行一次日级备份。",
        defaultValue: "1",
    },
    {
        key: SystemSettingKey.每日备份保留数量,
        group: SystemSettingGroupKey.自动备份,
        kind: SystemSettingValueKind.正整数,
        label: "每日备份保留数量",
        description: "日级本地备份最多保留多少份。",
        defaultValue: "30",
    },
    {
        key: SystemSettingKey.每周备份周期,
        group: SystemSettingGroupKey.自动备份,
        kind: SystemSettingValueKind.正整数,
        label: "每周备份周期",
        description: "每隔多少周执行一次周级备份。",
        defaultValue: "1",
    },
    {
        key: SystemSettingKey.每周备份保留数量,
        group: SystemSettingGroupKey.自动备份,
        kind: SystemSettingValueKind.正整数,
        label: "每周备份保留数量",
        description: "周级本地备份最多保留多少份。",
        defaultValue: "12",
    },
    {
        key: SystemSettingKey.每月备份周期,
        group: SystemSettingGroupKey.自动备份,
        kind: SystemSettingValueKind.正整数,
        label: "每月备份周期",
        description: "每隔多少个月执行一次月级备份。",
        defaultValue: "1",
    },
    {
        key: SystemSettingKey.每月备份保留数量,
        group: SystemSettingGroupKey.自动备份,
        kind: SystemSettingValueKind.正整数,
        label: "每月备份保留数量",
        description: "月级本地备份最多保留多少份。",
        defaultValue: "12",
    },
    {
        key: SystemSettingKey.自动备份日志保留,
        group: SystemSettingGroupKey.自动备份,
        kind: SystemSettingValueKind.时长,
        label: "日志保留时长",
        description: "自动清理操作日志和错误日志时保留的时长。",
        defaultValue: "365d",
        placeholder: "365d",
    },
    {
        key: SystemSettingKey.自动备份S3地址,
        group: SystemSettingGroupKey.自动备份,
        kind: SystemSettingValueKind.地址,
        label: "S3 地址",
        description: "S3 或兼容对象存储的 endpoint。",
        defaultValue: "",
        placeholder: "https://s3.example.com",
    },
    {
        key: SystemSettingKey.自动备份S3区域,
        group: SystemSettingGroupKey.自动备份,
        kind: SystemSettingValueKind.文本,
        label: "S3 区域",
        description: "S3 或兼容对象存储的区域。",
        defaultValue: "",
        placeholder: "auto",
    },
    {
        key: SystemSettingKey.自动备份S3桶,
        group: SystemSettingGroupKey.自动备份,
        kind: SystemSettingValueKind.文本,
        label: "S3 存储桶",
        description: "用于保存备份文件的对象存储桶。",
        defaultValue: "",
        placeholder: "example-backups",
    },
    {
        key: SystemSettingKey.自动备份S3密钥ID,
        group: SystemSettingGroupKey.自动备份,
        kind: SystemSettingValueKind.密钥,
        label: "S3 AccessKey ID",
        description: "对象存储访问密钥 ID。",
        defaultValue: "",
    },
    {
        key: SystemSettingKey.自动备份S3密钥Secret,
        group: SystemSettingGroupKey.自动备份,
        kind: SystemSettingValueKind.密钥,
        label: "S3 AccessKey Secret",
        description: "对象存储访问密钥 Secret。",
        defaultValue: "",
    },
    {
        key: SystemSettingKey.自动备份S3前缀,
        group: SystemSettingGroupKey.自动备份,
        kind: SystemSettingValueKind.文本,
        label: "S3 对象前缀",
        description: "上传到对象存储时使用的对象 key 前缀。",
        defaultValue: "geshu-next-template",
        placeholder: "geshu-next-template",
    },
    {
        key: SystemSettingKey.自动备份S3PathStyle,
        group: SystemSettingGroupKey.自动备份,
        kind: SystemSettingValueKind.可选布尔,
        label: "S3 Path Style",
        description: "兼容部分 S3 网关时使用，未设置则交由 SDK 默认处理。",
        defaultValue: "",
    },
    {
        key: SystemSettingKey.Docker路径映射,
        group: SystemSettingGroupKey.Docker项目设置,
        kind: SystemSettingValueKind.多行文本,
        label: "Docker 路径映射",
        description: "宿主机路径到当前运行环境路径的映射，支持换行、|| 分隔或 JSON 数组格式。",
        defaultValue: "",
        placeholder: "/srv/projects=>/host-projects\n/data/compose=>/host-compose",
    },
    {
        key: SystemSettingKey.项目根目录,
        group: SystemSettingGroupKey.Docker项目设置,
        kind: SystemSettingValueKind.绝对路径,
        label: "项目根目录",
        description: "当前应用实际读写项目文件时使用的目录，留空则使用默认 projects 目录。",
        defaultValue: "",
        placeholder: "/app/projects",
    },
    {
        key: SystemSettingKey.宿主机项目根目录,
        group: SystemSettingGroupKey.Docker项目设置,
        kind: SystemSettingValueKind.绝对路径,
        label: "宿主机项目根目录",
        description: "Docker 守护进程解析项目 compose 文件时使用的宿主机目录，留空则跟随项目根目录。",
        defaultValue: "",
        placeholder: "/home/projects",
    },
    {
        key: SystemSettingKey.Docker临时目录,
        group: SystemSettingGroupKey.Docker项目设置,
        kind: SystemSettingValueKind.绝对路径,
        label: "Docker 临时目录",
        description: "用于构建 Docker 镜像的临时目录根路径，留空则使用系统默认候选目录。",
        defaultValue: "",
        placeholder: "/app/data/tmp/docker",
    },
    {
        key: SystemSettingKey.使用系统7za,
        group: SystemSettingGroupKey.Docker项目设置,
        kind: SystemSettingValueKind.布尔,
        label: "使用系统 7za",
        description: "开启后优先调用宿主机 PATH 中的 7za 解压 7z 文件，保存时会校验命令可用性。",
        defaultValue: "0",
    },
]

export function getSystemSettingDefinition(key: string) {
    return SystemSettingDefinitions.find(definition => definition.key === key)
}
