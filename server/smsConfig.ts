import { getBooleanFromEnv } from "@/utils/getBooleanFromEnv"

export interface SmsConfig {
    isIntranet: boolean
    aliyunAccessKeyId?: string
    aliyunAccessKeySecret?: string
    qjpSmsUrl?: string
}

export function getOptionalEnvValue(key: string) {
    const value = process.env[key]?.trim()
    return value || undefined
}

export function getSmsConfig(): SmsConfig {
    return {
        isIntranet: getBooleanFromEnv(process.env.IS_INTRANET),
        aliyunAccessKeyId: getOptionalEnvValue("ALIYUN_ACCESS_KEY_ID"),
        aliyunAccessKeySecret: getOptionalEnvValue("ALIYUN_ACCESS_KEY_SECRET"),
        qjpSmsUrl: getOptionalEnvValue("QJP_SMS_URL"),
    }
}
