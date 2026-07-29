"use client"

import { type FC, type ReactNode, useEffect, useState } from "react"

import { useForm } from "@tanstack/react-form"
import { getErrorMessage } from "deepsea-tools"
import { LoaderCircleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { useLogin } from "@/hooks/useLogin"
import { useSendPhoneNumberOtp } from "@/hooks/useSendPhoneNumberOtp"

import { accountParser, accountSchema } from "@/schemas/account"
import { loginParser, loginSchema } from "@/schemas/login"
import { otpSchema } from "@/schemas/otp"

import { getOnBlurValidator } from "@/utils/getOnBlurValidator"
import { toast } from "@/utils/toast"

export interface PhoneLoginFormProps {
    children?: ReactNode
    disabled?: boolean
    pending?: boolean
    submitLabel?: string
    onLoginSuccess?: () => Promise<void> | void
}

export const PhoneLoginForm: FC<PhoneLoginFormProps> = ({ children, disabled = false, pending = false, submitLabel = "登录", onLoginSuccess }) => {
    const [left, setLeft] = useState(0)

    const { mutateAsync: sendPhoneNumberOtp, isPending: isSendPhoneNumberOtpPending } = useSendPhoneNumberOtp({
        onSuccess() {
            setLeft(60)
        },
    })

    const { mutateAsync: login, isPending: isLoginPending } = useLogin({
        async onSuccess() {
            await onLoginSuccess?.()
        },
    })

    const form = useForm({
        defaultValues: {
            account: "",
            otp: "",
        },
        validators: {
            onSubmit: loginSchema,
        },
        async onSubmit({ value }) {
            await login(loginParser(value))
        },
    })

    useEffect(() => {
        if (left === 0) return
        const timeout = setTimeout(() => setLeft(Math.max(0, left - 1)), 1000)
        return () => clearTimeout(timeout)
    }, [left])

    async function sendOtp() {
        try {
            await sendPhoneNumberOtp(accountParser(form.getFieldValue("account")))
        } catch (error) {
            toast.error(getErrorMessage(error))
        }
    }

    const isPending = pending || isLoginPending
    const isDisabled = disabled || isPending

    return (
        <form
            id="phone-login-form"
            className="space-y-4"
            onSubmit={event => {
                event.preventDefault()
                event.stopPropagation()
                void form.handleSubmit()
            }}
        >
            <FieldGroup>
                <form.Field name="account" validators={{ onBlur: getOnBlurValidator(accountSchema) }}>
                    {field => {
                        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                        return (
                            <Field data-invalid={isInvalid}>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    placeholder="用户名或手机号"
                                    autoComplete="username"
                                    disabled={isDisabled}
                                    aria-invalid={isInvalid}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={event => field.handleChange(event.target.value)}
                                />
                                {isInvalid && <FieldError errors={field.state.meta.errors} />}
                            </Field>
                        )
                    }}
                </form.Field>
                <div className="flex items-start gap-2">
                    <form.Field name="otp" validators={{ onBlur: getOnBlurValidator(otpSchema) }}>
                        {field => {
                            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                            return (
                                <Field className="min-w-0 flex-auto" data-invalid={isInvalid}>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        inputMode="numeric"
                                        placeholder="验证码"
                                        autoComplete="one-time-code"
                                        disabled={isDisabled}
                                        aria-invalid={isInvalid}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={event => field.handleChange(event.target.value)}
                                    />
                                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                </Field>
                            )
                        }}
                    </form.Field>
                    <Button
                        className="w-32 flex-none"
                        type="button"
                        variant="outline"
                        disabled={isDisabled || left > 0 || isSendPhoneNumberOtpPending}
                        onClick={() => void sendOtp()}
                    >
                        {isSendPhoneNumberOtpPending && <LoaderCircleIcon className="animate-spin" />}
                        {left > 0 ? `${left} 秒` : "发送验证码"}
                    </Button>
                </div>
            </FieldGroup>
            <form.Subscribe selector={state => [state.canSubmit, state.isSubmitting, state.isPristine]}>
                {([canSubmit, isSubmitting, isPristine]) => (
                    <Button className="w-full" type="submit" disabled={isDisabled || !canSubmit || isSubmitting || isPristine}>
                        {(isPending || isSubmitting) && <LoaderCircleIcon className="animate-spin" />}
                        {pending ? "正在绑定..." : submitLabel}
                    </Button>
                )}
            </form.Subscribe>
            {children}
        </form>
    )
}
