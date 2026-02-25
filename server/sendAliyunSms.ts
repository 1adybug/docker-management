import Credential from "@alicloud/credentials"
import Dysmsapi, { SendSmsRequest } from "@alicloud/dysmsapi20170525"
import { Config } from "@alicloud/openapi-client"
import { RuntimeOptions } from "@alicloud/tea-util"

import { AliyunAccessKeyId, AliyunAccessKeySecret } from "@/constants"

import { phoneNumberRegex } from "@/schemas/phoneNumber"

export interface SendAliyunSmsParams {
    phone: string | string[]
    signName: string
    templateCode: string
    params: Record<string, string>
}

export async function sendAliyunSms({ phone, signName, templateCode, params }: SendAliyunSmsParams) {
    phone = Array.isArray(phone) ? phone : [phone]
    phone = Array.from(new Set(phone))
    if (phone.length === 0) throw new Error("phone is required")
    if (phone.length > 1000) throw new Error("phone count must be less than 1000")
    const invalidPhones = phone.filter(p => !phoneNumberRegex.test(p))
    if (invalidPhones.length > 0) throw new Error(`invalid phone${invalidPhones.length > 1 ? "s" : ""}: ${invalidPhones.join(",")}`)
    phone = phone.join(",")
    const credential = new Credential()
    const config = new Config({ credential })
    config.accessKeyId = AliyunAccessKeyId
    config.accessKeySecret = AliyunAccessKeySecret
    config.endpoint = `dysmsapi.aliyuncs.com`
    const client = new Dysmsapi(config)

    const sendSmsRequest = new SendSmsRequest({
        phoneNumbers: phone,
        signName,
        templateCode,
        templateParam: JSON.stringify(params),
    })

    const response = await client.sendSmsWithOptions(sendSmsRequest, new RuntimeOptions({}))
    if (response.body?.code !== "OK") throw new Error(response.body?.message)
    return response
}
