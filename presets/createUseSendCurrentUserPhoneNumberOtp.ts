import { withUseMutationDefaults } from "soda-tanstack-query"

import type { sendCurrentUserPhoneNumberOtp } from "@/shared/sendCurrentUserPhoneNumberOtp"

import { toast } from "@/utils/toast"

export const createUseSendCurrentUserPhoneNumberOtp = withUseMutationDefaults<typeof sendCurrentUserPhoneNumberOtp>(() => ({
    onMutate(variables, context) {},
    onSuccess(data, variables, onMutateResult, context) {
        toast.success(`验证码已发送至 ${data.phoneNumber}`)
    },
    onError(error, variables, onMutateResult, context) {},
    onSettled(data, error, variables, onMutateResult, context) {},
}))
