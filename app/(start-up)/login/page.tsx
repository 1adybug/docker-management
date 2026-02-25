"use client"

import { FC, useEffect, useState } from "react"

import { Button, Form, Input } from "antd"
import { useForm } from "antd/es/form/Form"
import FormItem from "antd/es/form/FormItem"
import { useRouter } from "next/navigation"
import { schemaToRule } from "soda-antd"

import { useLogin } from "@/hooks/useLogin"
import { useSendPhoneNumberOtp } from "@/hooks/useSendPhoneNumberOtp"

import { accountSchema } from "@/schemas/account"
import { LoginParams } from "@/schemas/login"
import { otpSchema } from "@/schemas/otp"

const Page: FC = () => {
    const router = useRouter()
    const [form] = useForm<LoginParams>()
    const [left, setLeft] = useState(0)

    const { mutateAsync: sendPhoneNumberOtp, isPending: isSendPhoneNumberOtpPending } = useSendPhoneNumberOtp({
        onSuccess() {
            setLeft(60)
        },
    })

    const { mutateAsync: login, isPending: isLoginPending } = useLogin({
        onSuccess() {
            router.refresh()
        },
    })

    useEffect(() => {
        if (left === 0) return
        const timeout = setTimeout(() => setLeft(Math.max(0, left - 1)), 1000)
        return () => clearTimeout(timeout)
    }, [left])

    function sendOtp() {
        sendPhoneNumberOtp(form.getFieldValue("account"))
    }

    return (
        <Form<LoginParams> form={form} className="!mx-auto flex w-64 flex-col" onFinish={login} disabled={isLoginPending}>
            <FormItem<LoginParams> name="account" rules={[schemaToRule(accountSchema)]}>
                <Input placeholder="用户名或手机号" autoComplete="off" />
            </FormItem>
            <div className="flex gap-2">
                <FormItem<LoginParams> name="otp" rules={[schemaToRule(otpSchema)]}>
                    <Input placeholder="验证码" autoComplete="off" />
                </FormItem>
                <Button className="w-[112px] flex-none" onClick={sendOtp} loading={isSendPhoneNumberOtpPending} disabled={left > 0}>
                    {left > 0 ? `${left} 秒后重试` : "发送验证码"}
                </Button>
            </div>
            <Button className="mt-4" type="primary" block disabled={isLoginPending} htmlType="submit">
                登录
            </Button>
        </Form>
    )
}

export default Page
