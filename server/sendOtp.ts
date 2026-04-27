import { sendAliyunSms } from "./sendAliyunSms"
import { sendQjpSms } from "./sendQjpSms"
import { getSmsConfig } from "./smsConfig"

export interface SendOtpParams {
    phoneNumber: string
    code: string
}

export async function sendOtp({ phoneNumber, code }: SendOtpParams) {
    const { isIntranet } = getSmsConfig()

    if (isIntranet) return sendQjpSms({ phone: phoneNumber, content: `格数科技项目管理，你的登录验证码为 ${code}` })
    return sendAliyunSms({ phone: phoneNumber, signName: "格数科技", templateCode: "SMS_478995533", params: { code } })
}
