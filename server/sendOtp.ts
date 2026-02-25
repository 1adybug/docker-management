import { IsIntranet } from "@/constants"

import { sendAliyunSms } from "./sendAliyunSms"
import { sendQjpSms } from "./sendQjpSms"

export interface SendOtpParams {
    phoneNumber: string
    code: string
}

export function sendOtp({ phoneNumber, code }: SendOtpParams) {
    if (IsIntranet) return sendQjpSms({ phone: phoneNumber, content: `格数科技项目管理，你的登录验证码为 ${code}` })
    return sendAliyunSms({ phone: phoneNumber, signName: "格数科技", templateCode: "SMS_478995533", params: { code } })
}
