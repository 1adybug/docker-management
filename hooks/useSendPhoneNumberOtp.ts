import { useId } from "react"

import { useMutation, UseMutationOptions } from "@tanstack/react-query"
import { createRequestFn } from "deepsea-tools"

import { sendPhoneNumberOtpAction } from "@/actions/sendPhoneNumberOtp"

import { accountSchema } from "@/schemas/account"

export const sendPhoneNumberOtpClient = createRequestFn({
    fn: sendPhoneNumberOtpAction,
    schema: accountSchema,
})

export interface UseSendPhoneNumberOtpParams<TOnMutateResult = unknown> extends Omit<
    UseMutationOptions<Awaited<ReturnType<typeof sendPhoneNumberOtpClient>>, Error, Parameters<typeof sendPhoneNumberOtpClient>[0], TOnMutateResult>,
    "mutationFn"
> {}

export function useSendPhoneNumberOtp<TOnMutateResult = unknown>({
    onMutate,
    onSuccess,
    onError,
    onSettled,
    ...rest
}: UseSendPhoneNumberOtpParams<TOnMutateResult> = {}) {
    const key = useId()

    return useMutation({
        mutationFn: sendPhoneNumberOtpClient,
        onMutate(variables, context) {
            return onMutate?.(variables, context) as TOnMutateResult | Promise<TOnMutateResult>
        },
        onSuccess(data, variables, onMutateResult, context) {
            message.open({
                key,
                type: "success",
                content: `验证码已发送至 ${data.phoneNumber}`,
            })

            return onSuccess?.(data, variables, onMutateResult, context)
        },
        onError(error, variables, onMutateResult, context) {
            message.destroy(key)

            return onError?.(error, variables, onMutateResult, context)
        },
        onSettled(data, error, variables, onMutateResult, context) {
            return onSettled?.(data, error, variables, onMutateResult, context)
        },
        ...rest,
    })
}
