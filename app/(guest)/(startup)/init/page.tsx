"use client"

import type { FC } from "react"

import { useForm } from "@tanstack/react-form"
import { LoaderCircleIcon } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { useCreateFirstUser } from "@/hooks/useCreateFirstUser"

import { createFirstUserParser, createFirstUserSchema } from "@/schemas/createFirstUser"
import { nicknameSchema } from "@/schemas/nickname"
import { phoneNumberSchema } from "@/schemas/phoneNumber"
import { usernameSchema } from "@/schemas/username"

const fields = [
    { name: "name", label: "用户名", autoComplete: "username", schema: usernameSchema },
    { name: "nickname", label: "昵称", autoComplete: "nickname", schema: nicknameSchema },
    { name: "phoneNumber", label: "手机号", autoComplete: "tel", schema: phoneNumberSchema },
] as const

const Page: FC = () => {
    const router = useRouter()

    const { mutateAsync, isPending } = useCreateFirstUser({
        onSuccess() {
            router.replace("/login")
        },
    })

    const form = useForm({
        defaultValues: {
            name: "",
            nickname: "",
            phoneNumber: "",
        },
        validators: {
            onSubmit: createFirstUserSchema,
        },
        async onSubmit({ value }) {
            await mutateAsync(createFirstUserParser(value))
        },
    })

    return (
        <Card>
            <CardHeader>
                <CardTitle>初始化系统</CardTitle>
                <CardDescription>创建首位管理员后即可开始使用。</CardDescription>
            </CardHeader>
            <CardContent>
                <form
                    id="create-first-user-form"
                    onSubmit={event => {
                        event.preventDefault()
                        event.stopPropagation()
                        void form.handleSubmit()
                    }}
                >
                    <FieldGroup>
                        {fields.map(({ name, label, autoComplete, schema }) => (
                            <form.Field key={name} name={name} validators={{ onBlur: schema }}>
                                {field => {
                                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                                    return (
                                        <Field data-invalid={isInvalid}>
                                            <Input
                                                id={field.name}
                                                name={field.name}
                                                placeholder={label}
                                                autoComplete={autoComplete}
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
                        ))}
                    </FieldGroup>
                    <form.Subscribe selector={state => [state.canSubmit, state.isSubmitting, state.isPristine]}>
                        {([canSubmit, isSubmitting, isPristine]) => (
                            <Button className="mt-6 w-full" type="submit" disabled={!canSubmit || isSubmitting || isPending || isPristine}>
                                {(isSubmitting || isPending) && <LoaderCircleIcon className="animate-spin" />}
                                初始化
                            </Button>
                        )}
                    </form.Subscribe>
                </form>
            </CardContent>
        </Card>
    )
}

export default Page
