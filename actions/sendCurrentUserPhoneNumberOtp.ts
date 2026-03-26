"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { sendCurrentUserPhoneNumberOtp } from "@/shared/sendCurrentUserPhoneNumberOtp"

export const sendCurrentUserPhoneNumberOtpAction = createResponseFn(sendCurrentUserPhoneNumberOtp)
