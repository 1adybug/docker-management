import { phoneSchema } from "@/schemas/phone"

import { ClientError } from "@/utils/clientError"

export interface SendMsgParams {
    phone: string | string[]
    content: string
}

export async function sendMsg({ phone, content }: SendMsgParams) {
    phone = Array.isArray(phone) ? phone : [phone]
    phone = Array.from(new Set(phone))
    if (phone.length === 0) throw new ClientError("手机号不能为空")
    content = content.trim()
    if (content.length === 0) throw new ClientError("内容不能为空")
    if (phone.some(p => !phoneSchema.safeParse(p).success)) throw new ClientError("无效的手机号")
}
