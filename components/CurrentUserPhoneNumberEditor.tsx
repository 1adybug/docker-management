"use client"

import { type FC, useEffect, useState } from "react"

import { useForm } from "@tanstack/react-form"
import { LoaderCircleIcon } from "lucide-react"
import { z } from "zod"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { useSendCurrentUserPhoneNumberOtp } from "@/hooks/useSendCurrentUserPhoneNumberOtp"
import { useUpdateCurrentUserProfile } from "@/hooks/useUpdateCurrentUserProfile"

import type { User } from "@/prisma/generated/client"

import { otpSchema } from "@/schemas/otp"
import { phoneNumberParser, phoneNumberSchema } from "@/schemas/phoneNumber"
import { updateCurrentUserProfileParser } from "@/schemas/updateCurrentUserProfile"

import { getOnBlurValidator } from "@/utils/getOnBlurValidator"
import { toast } from "@/utils/toast"

const phoneNumberEditorSchema = z.object({
    phoneNumber: phoneNumberSchema,
    oldOtp: otpSchema,
    newOtp: otpSchema,
})

export interface CurrentUserPhoneNumberEditorProps {
    data: User
    open?: boolean
    onClose?: () => void
    onSuccess?: (data: User) => void
}

export const CurrentUserPhoneNumberEditor: FC<CurrentUserPhoneNumberEditorProps> = ({ data, open = false, onClose, onSuccess }) => {
    const [oldOtpLeft, setOldOtpLeft] = useState(0)
    const [newOtpLeft, setNewOtpLeft] = useState(0)

    const { mutateAsync: sendOldPhoneNumberOtp, isPending: isSendOldPhoneNumberOtpPending } = useSendCurrentUserPhoneNumberOtp({
        onSuccess() {
            setOldOtpLeft(60)
        },
    })

    const { mutateAsync: sendNewPhoneNumberOtp, isPending: isSendNewPhoneNumberOtpPending } = useSendCurrentUserPhoneNumberOtp({
        onSuccess() {
            setNewOtpLeft(60)
        },
    })

    const { mutateAsync: updateCurrentUserProfile, isPending: isUpdateCurrentUserProfilePending } = useUpdateCurrentUserProfile({
        onSuccess(nextUser) {
            onSuccess?.(nextUser)
            onClose?.()
        },
    })

    const form = useForm({
        defaultValues: {
            phoneNumber: data.phoneNumber,
            oldOtp: "",
            newOtp: "",
        },
        validators: {
            onSubmit: phoneNumberEditorSchema,
        },
        async onSubmit({ value }) {
            if (value.phoneNumber === data.phoneNumber) {
                toast.warning("新手机号不能与当前手机号一致")
                return
            }

            await updateCurrentUserProfile(
                updateCurrentUserProfileParser({
                    ...value,
                    nickname: data.nickname,
                }),
            )
        },
    })

    useEffect(() => {
        if (!open) {
            form.reset({ phoneNumber: data.phoneNumber, oldOtp: "", newOtp: "" })
            setOldOtpLeft(0)
            setNewOtpLeft(0)
            return
        }

        form.reset({ phoneNumber: data.phoneNumber, oldOtp: "", newOtp: "" })
        setOldOtpLeft(0)
        setNewOtpLeft(0)
    }, [data.phoneNumber, form, open])

    useEffect(() => {
        if (!open || (oldOtpLeft === 0 && newOtpLeft === 0)) return

        const timeout = setTimeout(() => {
            setOldOtpLeft(value => Math.max(0, value - 1))
            setNewOtpLeft(value => Math.max(0, value - 1))
        }, 1000)

        return () => clearTimeout(timeout)
    }, [newOtpLeft, oldOtpLeft, open])

    async function onSendOldOtp() {
        await sendOldPhoneNumberOtp({ phoneNumber: data.phoneNumber })
    }

    async function onSendNewOtp() {
        try {
            const phoneNumber = phoneNumberParser(form.getFieldValue("phoneNumber"))

            if (phoneNumber === data.phoneNumber) {
                toast.warning("新手机号不能与当前手机号一致")
                return
            }

            await sendNewPhoneNumberOtp({ phoneNumber })
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "无效的手机号")
        }
    }

    function onOpenChange(nextOpen: boolean) {
        if (!nextOpen && !isUpdateCurrentUserProfilePending) onClose?.()
    }

    const isSendingOtp = isSendOldPhoneNumberOtpPending || isSendNewPhoneNumberOtpPending
    const isPending = isSendingOtp || isUpdateCurrentUserProfilePending

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={!isUpdateCurrentUserProfilePending}>
                <DialogHeader>
                    <DialogTitle>修改手机号</DialogTitle>
                    <DialogDescription>需要分别验证当前手机号和新手机号。</DialogDescription>
                </DialogHeader>
                <Alert>
                    <AlertTitle>双重验证</AlertTitle>
                    <AlertDescription>验证码均为 4 位数字，有效时间以短信内容为准。</AlertDescription>
                </Alert>
                <form
                    id="phone-number-editor-form"
                    onSubmit={event => {
                        event.preventDefault()
                        event.stopPropagation()
                        void form.handleSubmit()
                    }}
                >
                    <FieldGroup>
                        <form.Field name="phoneNumber" validators={{ onBlur: getOnBlurValidator(phoneNumberSchema) }}>
                            {field => {
                                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor={field.name}>新手机号</FieldLabel>
                                        <Input
                                            id={field.name}
                                            name={field.name}
                                            autoComplete="tel"
                                            disabled={isUpdateCurrentUserProfilePending}
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
                        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                            <form.Field name="oldOtp" validators={{ onBlur: getOnBlurValidator(otpSchema) }}>
                                {field => {
                                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                                    return (
                                        <Field data-invalid={isInvalid}>
                                            <FieldLabel htmlFor={field.name}>原手机号验证码</FieldLabel>
                                            <Input
                                                id={field.name}
                                                name={field.name}
                                                inputMode="numeric"
                                                autoComplete="one-time-code"
                                                disabled={isUpdateCurrentUserProfilePending}
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
                                className="self-end sm:min-w-36"
                                type="button"
                                variant="outline"
                                disabled={oldOtpLeft > 0 || isPending}
                                onClick={() => void onSendOldOtp()}
                            >
                                {isSendOldPhoneNumberOtpPending && <LoaderCircleIcon className="animate-spin" />}
                                {oldOtpLeft > 0 ? `${oldOtpLeft} 秒` : "发送验证码"}
                            </Button>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                            <form.Field name="newOtp" validators={{ onBlur: getOnBlurValidator(otpSchema) }}>
                                {field => {
                                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                                    return (
                                        <Field data-invalid={isInvalid}>
                                            <FieldLabel htmlFor={field.name}>新手机号验证码</FieldLabel>
                                            <Input
                                                id={field.name}
                                                name={field.name}
                                                inputMode="numeric"
                                                autoComplete="one-time-code"
                                                disabled={isUpdateCurrentUserProfilePending}
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
                                className="self-end sm:min-w-36"
                                type="button"
                                variant="outline"
                                disabled={newOtpLeft > 0 || isPending}
                                onClick={() => void onSendNewOtp()}
                            >
                                {isSendNewPhoneNumberOtpPending && <LoaderCircleIcon className="animate-spin" />}
                                {newOtpLeft > 0 ? `${newOtpLeft} 秒` : "发送验证码"}
                            </Button>
                        </div>
                    </FieldGroup>
                </form>
                <DialogFooter>
                    <Button type="button" variant="outline" disabled={isUpdateCurrentUserProfilePending} onClick={onClose}>
                        取消
                    </Button>
                    <form.Subscribe selector={state => [state.canSubmit, state.isSubmitting, state.isPristine]}>
                        {([canSubmit, isSubmitting, isPristine]) => (
                            <Button type="submit" form="phone-number-editor-form" disabled={!canSubmit || isPending || isSubmitting || isPristine}>
                                {(isUpdateCurrentUserProfilePending || isSubmitting) && <LoaderCircleIcon className="animate-spin" />}
                                保存
                            </Button>
                        )}
                    </form.Subscribe>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
