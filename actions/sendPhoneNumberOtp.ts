"use server"

import { createResponseFn } from "@/server/createResponseFn"

import { sendPhoneNumberOtp } from "@/shared/sendPhoneNumberOtp"

export const sendPhoneNumberOtpAction = createResponseFn(sendPhoneNumberOtp)
