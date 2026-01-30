"use client"

import { FC, useEffect, useState } from "react"

import { Button, Form, Input } from "antd"
import { useForm, useWatch } from "antd/es/form/Form"
import FormItem from "antd/es/form/FormItem"
import { schemaToRule } from "soda-antd"

import Brand from "@/components/Brand"

import { useLogin } from "@/hooks/useLogin"
import { useSendCaptcha } from "@/hooks/useSendCaptcha"

import { accountSchema } from "@/schemas/account"
import { captchaSchema } from "@/schemas/captcha"
import { LoginParams } from "@/schemas/login"

const Page: FC = () => {
    const [form] = useForm<LoginParams>()
    const [left, setleft] = useState(0)
    const account = useWatch("account", form)
    const captcha = useWatch("captcha", form)

    const { mutateAsync: login, isPending: isLoginPending } = useLogin()

    const { mutateAsync: sendCaptcha, isPending: isSendCaptchaPending } = useSendCaptcha({
        onSuccess() {
            setleft(60)
        },
    })

    useEffect(() => {
        if (left <= 0) return
        const timeout = setTimeout(() => setleft(l => l - 1), 1000)
        return () => clearTimeout(timeout)
    }, [left])

    const isRequesting = isLoginPending || isSendCaptchaPending

    return (
        <main className="grid h-full grid-cols-1 sm:grid-cols-2">
            <div className="relative p-8">
                <Brand />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <Form<LoginParams> form={form} className="flex w-64 flex-col" onFinish={login}>
                        <FormItem<LoginParams> name="account" rules={[schemaToRule(accountSchema)]}>
                            <Input placeholder="用户名或手机号" autoComplete="off" />
                        </FormItem>
                        <div className="flex gap-2">
                            <FormItem<LoginParams> name="captcha" rules={[schemaToRule(captchaSchema)]}>
                                <Input placeholder="验证码" autoComplete="off" />
                            </FormItem>
                            <Button
                                className="min-w-24"
                                color="purple"
                                variant="solid"
                                disabled={isRequesting || left > 0 || !account}
                                onClick={() => sendCaptcha(account)}
                            >
                                {left > 0 ? `${left} 秒后重试` : "发送验证码"}
                            </Button>
                        </div>
                        <Button className="mt-4" type="primary" block disabled={isRequesting || !account || !captcha} htmlType="submit">
                            登录
                        </Button>
                    </Form>
                </div>
            </div>
            <div className="hidden bg-[url('/login.webp')] bg-cover bg-bottom sm:block" />
        </main>
    )
}

export default Page
