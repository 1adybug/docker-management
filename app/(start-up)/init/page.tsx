"use client"

import { FC } from "react"

import { Button, Form, Input } from "antd"
import { useForm } from "antd/es/form/Form"
import FormItem from "antd/es/form/FormItem"
import { useRouter } from "next/navigation"
import { schemaToRule } from "soda-antd"

import { useCreateFirstUser } from "@/hooks/useCreateFirstUser"

import { CreateFirstUserParams } from "@/schemas/createFirstUser"
import { phoneNumberSchema } from "@/schemas/phoneNumber"
import { usernameSchema } from "@/schemas/username"

const Page: FC = () => {
    const router = useRouter()
    const [form] = useForm<CreateFirstUserParams>()

    const { mutateAsync, isPending } = useCreateFirstUser({
        onSuccess() {
            router.replace("/login")
        },
    })

    return (
        <Form<CreateFirstUserParams> form={form} className="!mx-auto flex w-64 flex-col" onFinish={mutateAsync}>
            <FormItem<CreateFirstUserParams> name="name" rules={[schemaToRule(usernameSchema)]}>
                <Input placeholder="用户名" autoComplete="off" />
            </FormItem>
            <FormItem<CreateFirstUserParams> name="phoneNumber" rules={[schemaToRule(phoneNumberSchema)]}>
                <Input placeholder="手机号" autoComplete="off" />
            </FormItem>
            <Button className="mt-4" type="primary" block disabled={isPending} htmlType="submit">
                初始化
            </Button>
        </Form>
    )
}

export default Page
