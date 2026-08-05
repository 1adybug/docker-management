import { sendAliyunSms } from "./sendAliyunSms"
import { sendQjpSms } from "./sendQjpSms"
import { getSmsConfig, hasSmsSendingConfig } from "./smsConfig"

export interface SendOtpParams {
    phoneNumber: string
    code: string
}

export async function sendOtp({ phoneNumber, code }: SendOtpParams) {
    const smsConfig = getSmsConfig()

    if (!hasSmsSendingConfig(smsConfig)) return

    if (smsConfig.isIntranet) return sendQjpSms({ phone: phoneNumber, content: `格数科技项目模板，你的登录验证码为 ${code}` })
    return sendAliyunSms({ phone: phoneNumber, signName: "格数科技", templateCode: "SMS_478995533", params: { code } })
}
