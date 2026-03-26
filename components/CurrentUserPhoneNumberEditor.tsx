"use client"

import { ChangeEvent, ComponentProps, FC, useEffect, useRef, useState } from "react"

import { Button, Form, Input, Modal } from "antd"
import { useForm } from "antd/es/form/Form"
import FormItem from "antd/es/form/FormItem"
import { schemaToRule } from "soda-antd"

import { useSendCurrentUserPhoneNumberOtp } from "@/hooks/useSendCurrentUserPhoneNumberOtp"
import { useUpdateCurrentUserProfile } from "@/hooks/useUpdateCurrentUserProfile"

import { User } from "@/prisma/generated/client"

import { otpSchema } from "@/schemas/otp"
import { phoneNumberParser } from "@/schemas/phoneNumber"

export interface CurrentUserPhoneNumberEditorProps extends Omit<ComponentProps<typeof Modal>, "children" | "onOk" | "onCancel"> {
    data: User
    onClose?: () => void
    onSuccess?: (data: User) => void
}

export interface CurrentUserPhoneNumberEditorFormData {
    oldOtp?: string
    newOtp?: string
}

const CurrentUserPhoneNumberEditor: FC<CurrentUserPhoneNumberEditorProps> = ({
    data,
    open,
    onClose,
    onSuccess,
    mask = { enabled: true, closable: true, blur: true },
    okButtonProps: { loading: okButtonLoading, ...okButtonProps } = {},
    cancelButtonProps: { disabled: cancelButtonDisabled, ...cancelButtonProps } = {},
    ...rest
}) => {
    const { enabled, closable, blur } = typeof mask === "boolean" ? { enabled: mask, closable: true, blur: true } : mask
    const isOpen = !!open
    const [form] = useForm<CurrentUserPhoneNumberEditorFormData>()
    const prevOpen = useRef(false)
    const [phoneNumber, setPhoneNumber] = useState(data.phoneNumber)
    const [phoneNumberError, setPhoneNumberError] = useState<string>()
    const [oldOtpLeft, setOldOtpLeft] = useState(0)
    const [newOtpLeft, setNewOtpLeft] = useState(0)
    const isPhoneNumberChanged = phoneNumber !== data.phoneNumber

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
            setOldOtpLeft(0)
            setNewOtpLeft(0)
            onSuccess?.(nextUser)
            onClose?.()
        },
    })

    useEffect(() => {
        const wasOpen = prevOpen.current
        prevOpen.current = isOpen

        if (!isOpen || wasOpen) return

        setPhoneNumber(data.phoneNumber)
        setPhoneNumberError(undefined)
        setOldOtpLeft(0)
        setNewOtpLeft(0)

        form.setFieldsValue({
            oldOtp: undefined,
            newOtp: undefined,
        })
    }, [data.phoneNumber, form, isOpen])

    useEffect(() => {
        if (isOpen) return

        form.resetFields()
        setPhoneNumber(data.phoneNumber)
        setPhoneNumberError(undefined)
        setOldOtpLeft(0)
        setNewOtpLeft(0)
    }, [data.phoneNumber, form, isOpen])

    useEffect(() => {
        if (!isOpen) return
        if (oldOtpLeft === 0 && newOtpLeft === 0) return

        const timeout = setTimeout(() => {
            setOldOtpLeft(left => Math.max(0, left - 1))
            setNewOtpLeft(left => Math.max(0, left - 1))
        }, 1000)

        return () => clearTimeout(timeout)
    }, [isOpen, newOtpLeft, oldOtpLeft])

    useEffect(() => {
        if (isPhoneNumberChanged) return

        form.setFieldsValue({
            oldOtp: undefined,
            newOtp: undefined,
        })

        setOldOtpLeft(0)
        setNewOtpLeft(0)
    }, [form, isPhoneNumberChanged])

    function onPhoneNumberChange(event: ChangeEvent<HTMLInputElement>) {
        setPhoneNumber(event.target.value)
        setPhoneNumberError(undefined)
    }

    function validatePhoneNumber() {
        try {
            const nextPhoneNumber = phoneNumberParser(phoneNumber)
            setPhoneNumber(nextPhoneNumber)
            setPhoneNumberError(undefined)
            return nextPhoneNumber
        } catch (error) {
            const messageText = error instanceof Error ? error.message : "无效的手机号"
            setPhoneNumberError(messageText)
            return undefined
        }
    }

    async function onSendOldOtp() {
        await sendOldPhoneNumberOtp({
            phoneNumber: data.phoneNumber,
        })
    }

    async function onSendNewOtp() {
        const nextPhoneNumber = validatePhoneNumber()
        if (!nextPhoneNumber) return

        if (!isPhoneNumberChanged) {
            message.open({
                type: "warning",
                content: "新手机号不能与当前手机号一致",
            })

            return
        }

        await sendNewPhoneNumberOtp({
            phoneNumber: nextPhoneNumber,
        })
    }

    async function onFinish(values: CurrentUserPhoneNumberEditorFormData) {
        const nextPhoneNumber = validatePhoneNumber()
        if (!nextPhoneNumber) return

        if (!isPhoneNumberChanged) {
            message.open({
                type: "warning",
                content: "新手机号不能与当前手机号一致",
            })

            return
        }

        await updateCurrentUserProfile({
            ...values,
            nickname: data.nickname,
            phoneNumber: nextPhoneNumber,
        })
    }

    const isSendingOtp = isSendOldPhoneNumberOtpPending || isSendNewPhoneNumberOtpPending
    const isSubmitting = isUpdateCurrentUserProfilePending

    return (
        <Modal
            title="修改手机号"
            open={isOpen}
            destroyOnHidden
            mask={{ enabled, closable: closable && !isSubmitting, blur }}
            onOk={() => form.submit()}
            onCancel={() => onClose?.()}
            okText="保存"
            okButtonProps={{ loading: isSubmitting || okButtonLoading, ...okButtonProps }}
            cancelButtonProps={{ disabled: isSubmitting || cancelButtonDisabled, ...cancelButtonProps }}
            {...rest}
        >
            <Form<CurrentUserPhoneNumberEditorFormData>
                name="current-user-phone-number-editor"
                form={form}
                layout="vertical"
                disabled={isSubmitting}
                onFinish={onFinish}
            >
                <FormItem label="新手机号" validateStatus={phoneNumberError ? "error" : undefined} help={phoneNumberError}>
                    <Input autoComplete="off" allowClear value={phoneNumber} onChange={onPhoneNumberChange} />
                </FormItem>
                <div className="mb-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm leading-6 text-orange-700">
                    修改手机号时，需要分别校验当前手机号和新手机号的验证码。
                </div>
                <div className="grid gap-4">
                    <div className="flex gap-3">
                        <FormItem<CurrentUserPhoneNumberEditorFormData>
                            className="mb-0 flex-auto"
                            name="oldOtp"
                            label="原手机号验证码"
                            rules={[schemaToRule(otpSchema)]}
                        >
                            <Input autoComplete="off" allowClear />
                        </FormItem>
                        <Button
                            className="mt-[30px] h-10 min-w-[148px] flex-none"
                            htmlType="button"
                            loading={isSendOldPhoneNumberOtpPending}
                            disabled={oldOtpLeft > 0 || isSendingOtp || isSubmitting}
                            onClick={onSendOldOtp}
                        >
                            {oldOtpLeft > 0 ? `${oldOtpLeft} 秒后重试` : "发送原手机号验证码"}
                        </Button>
                    </div>
                    <div className="flex gap-3">
                        <FormItem<CurrentUserPhoneNumberEditorFormData>
                            className="mb-0 flex-auto"
                            name="newOtp"
                            label="新手机号验证码"
                            rules={[schemaToRule(otpSchema)]}
                        >
                            <Input autoComplete="off" allowClear />
                        </FormItem>
                        <Button
                            className="mt-[30px] h-10 min-w-[148px] flex-none"
                            htmlType="button"
                            loading={isSendNewPhoneNumberOtpPending}
                            disabled={newOtpLeft > 0 || isSendingOtp || isSubmitting}
                            onClick={onSendNewOtp}
                        >
                            {newOtpLeft > 0 ? `${newOtpLeft} 秒后重试` : "发送新手机号验证码"}
                        </Button>
                    </div>
                </div>
                <FormItem<CurrentUserPhoneNumberEditorFormData> noStyle>
                    <Button className="!hidden" htmlType="submit" />
                </FormItem>
            </Form>
        </Modal>
    )
}

export default CurrentUserPhoneNumberEditor
