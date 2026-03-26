import { createRequestFn } from "deepsea-tools"

import { sendCurrentUserPhoneNumberOtpAction } from "@/actions/sendCurrentUserPhoneNumberOtp"

import { createUseSendCurrentUserPhoneNumberOtp } from "@/presets/createUseSendCurrentUserPhoneNumberOtp"

import { sendCurrentUserPhoneNumberOtpSchema } from "@/schemas/sendCurrentUserPhoneNumberOtp"

export const sendCurrentUserPhoneNumberOtpClient = createRequestFn({
    fn: sendCurrentUserPhoneNumberOtpAction,
    schema: sendCurrentUserPhoneNumberOtpSchema,
})

export const useSendCurrentUserPhoneNumberOtp = createUseSendCurrentUserPhoneNumberOtp(sendCurrentUserPhoneNumberOtpClient)
