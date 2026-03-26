import { getParser } from "."
import { z } from "zod/v4"

import { nicknameSchema } from "./nickname"
import { otpSchema } from "./otp"
import { phoneNumberSchema } from "./phoneNumber"

export const updateCurrentUserProfileSchema = z.object(
    {
        nickname: nicknameSchema,
        phoneNumber: phoneNumberSchema,
        oldOtp: otpSchema.optional(),
        newOtp: otpSchema.optional(),
    },
    { message: "无效的个人资料参数" },
)

export type UpdateCurrentUserProfileParams = z.infer<typeof updateCurrentUserProfileSchema>

export const updateCurrentUserProfileParser = getParser(updateCurrentUserProfileSchema)
