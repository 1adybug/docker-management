import { createRequestFn } from "deepsea-tools"

import { sendPhoneNumberOtpAction } from "@/actions/sendPhoneNumberOtp"

import { createUseSendPhoneNumberOtp } from "@/presets/createUseSendPhoneNumberOtp"

export const sendPhoneNumberOtpClient = createRequestFn(sendPhoneNumberOtpAction)

export const useSendPhoneNumberOtp = createUseSendPhoneNumberOtp(sendPhoneNumberOtpClient)
