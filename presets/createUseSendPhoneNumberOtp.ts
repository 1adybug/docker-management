import { useId } from "react"

import { withUseMutationDefaults } from "soda-tanstack-query"

import { sendPhoneNumberOtp } from "@/shared/sendPhoneNumberOtp"

export const createUseSendPhoneNumberOtp = withUseMutationDefaults<typeof sendPhoneNumberOtp>(() => {
    const key = useId()

    return {
        onMutate(variables, context) {},
        onSuccess(data, variables, onMutateResult, context) {
            message.open({
                key,
                type: "success",
                content: `验证码已发送至 ${data.phoneNumber}`,
            })
        },
        onError(error, variables, onMutateResult, context) {
            message.destroy(key)
        },
        onSettled(data, error, variables, onMutateResult, context) {},
    }
})
