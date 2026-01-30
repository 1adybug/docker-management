"use client"

import { FC } from "react"

import { Button, Form, Input } from "antd"
import { useForm, useWatch } from "antd/es/form/Form"
import FormItem from "antd/es/form/FormItem"
import { useRouter } from "next/navigation"
import { schemaToRule } from "soda-antd"

import Brand from "@/components/Brand"

import { useCreateFirstUser } from "@/hooks/useCreateFirstUser"

import { CreateFirstUserParams } from "@/schemas/createFirstUser"
import { phoneSchema } from "@/schemas/phone"
import { usernameSchema } from "@/schemas/username"

const Page: FC = () => {
    const router = useRouter()
    const [form] = useForm<CreateFirstUserParams>()
    const username = useWatch("username", form)
    const phone = useWatch("phone", form)

    const { mutateAsync, isPending } = useCreateFirstUser({
        onSuccess() {
            router.replace("/login")
        },
    })

    return (
        <main className="grid h-full grid-cols-1 sm:grid-cols-2">
            <div className="relative p-8">
                <Brand />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <Form<CreateFirstUserParams> form={form} className="flex w-64 flex-col" onFinish={mutateAsync}>
                        <FormItem<CreateFirstUserParams> name="username" rules={[schemaToRule(usernameSchema)]}>
                            <Input placeholder="用户名" autoComplete="off" />
                        </FormItem>
                        <FormItem<CreateFirstUserParams> name="phone" rules={[schemaToRule(phoneSchema)]}>
                            <Input placeholder="手机号" autoComplete="off" />
                        </FormItem>
                        <Button className="mt-4" type="primary" block disabled={isPending || !username || !phone} htmlType="submit">
                            初始化
                        </Button>
                    </Form>
                </div>
            </div>
            <div className="hidden bg-[url('/login.webp')] bg-cover bg-bottom sm:block" />
        </main>
    )
}

export default Page
