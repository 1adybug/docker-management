export interface SendQjpSmsParams {
    phone: string | string[]
    content: string
}

export interface QjpSmsResponse {
    success: boolean
    msg: string
}

const phoneReg = /^1[3-9]\d{9}$/

export async function sendQjpSms({ phone, content }: SendQjpSmsParams) {
    phone = Array.isArray(phone) ? phone : [phone]
    phone = Array.from(new Set(phone))
    if (phone.length === 0) throw new Error("phone is required")
    if (phone.length > 1000) throw new Error("phone count must be less than 1000")
    const invalidPhones = phone.filter(p => !phoneReg.test(p))
    if (invalidPhones.length > 0) throw new Error(`invalid phone${invalidPhones.length > 1 ? "s" : ""}: ${invalidPhones.join(",")}`)
    phone = phone.join(",")
    const url = new URL(process.env.QJP_SMS_URL!)
    url.searchParams.set("u_key", "")
    url.searchParams.set("a_key", "")
    url.searchParams.set("mobiles", phone)
    url.searchParams.set("content", content)
    url.searchParams.set("time", String(Math.floor(Date.now() / 1000)))
    const response = await fetch(url)
    if (!response.ok) throw new Error("send sms failed")
    const json: QjpSmsResponse = await response.json()
    if (!json.success) throw new Error(json.msg)
    return json
}
