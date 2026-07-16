import { withUseMutationDefaults } from "soda-tanstack-query"
import { toast } from "sonner"

import type { sendPhoneNumberOtp } from "@/shared/sendPhoneNumberOtp"

export const createUseSendPhoneNumberOtp = withUseMutationDefaults<typeof sendPhoneNumberOtp>(() => ({
    onMutate(variables, context) {},
    onSuccess(data, variables, onMutateResult, context) {
        toast.success(`验证码已发送至 ${data.phoneNumber}`)
    },
    onError(error, variables, onMutateResult, context) {},
    onSettled(data, error, variables, onMutateResult, context) {},
}))
