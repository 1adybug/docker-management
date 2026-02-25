import { getParser } from "."
import { z } from "zod/v4"

import { domainSchema } from "./domain"

export interface SystemConfigParams {
    allowRegister: boolean
    enableEmailPassword: boolean
    enableEmailOtp: boolean
    enablePhonePassword: boolean
    enablePhoneOtp: boolean
    defaultEmailDomain: string
}

export const defaultSystemConfig: SystemConfigParams = {
    allowRegister: false,
    enableEmailPassword: true,
    enableEmailOtp: true,
    enablePhonePassword: true,
    enablePhoneOtp: true,
    defaultEmailDomain: "geshu.ai",
}

export const systemConfigSchema: z.ZodType<SystemConfigParams> = z
    .object(
        {
            allowRegister: z.boolean({ message: "无效的注册配置" }),
            enableEmailPassword: z.boolean({ message: "无效的邮箱密码配置" }),
            enableEmailOtp: z.boolean({ message: "无效的邮箱验证码配置" }),
            enablePhonePassword: z.boolean({ message: "无效的手机号密码配置" }),
            enablePhoneOtp: z.boolean({ message: "无效的手机号验证码配置" }),
            defaultEmailDomain: domainSchema,
        },
        { message: "无效的系统配置" },
    )
    .refine(
        ({ enableEmailPassword, enableEmailOtp, enablePhonePassword, enablePhoneOtp }) => {
            if (!enableEmailPassword && !enableEmailOtp && !enablePhonePassword && !enablePhoneOtp) return false
            return true
        },
        { message: "至少开启一种登录方式" },
    )

export const systemConfigParser = getParser(systemConfigSchema)
