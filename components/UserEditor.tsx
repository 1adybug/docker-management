"use client"

import { type FC, useEffect } from "react"

import { useForm } from "@tanstack/react-form"
import { LoaderCircleIcon } from "lucide-react"

import { RoleSelect } from "@/components/RoleSelect"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { useAddUser } from "@/hooks/useAddUser"
import { useGetUser } from "@/hooks/useGetUser"
import { useUpdateUser } from "@/hooks/useUpdateUser"

import { addUserParser, addUserSchema } from "@/schemas/addUser"
import { nicknameSchema } from "@/schemas/nickname"
import { phoneNumberSchema } from "@/schemas/phoneNumber"
import { updateUserParser } from "@/schemas/updateUser"
import { usernameSchema } from "@/schemas/username"
import { type UserRoleParams, UserRole, UserRoleSchema } from "@/schemas/userRole"

import { getOnBlurValidator } from "@/utils/getOnBlurValidator"

export interface UserEditorProps {
    id?: string
    open?: boolean
    onClose?: () => void
}

export const UserEditor: FC<UserEditorProps> = ({ id, open = false, onClose }) => {
    const isUpdate = !!id
    const { data, isLoading } = useGetUser(id, { enabled: open })

    const { mutateAsync: addUser, isPending: isAddUserPending } = useAddUser({
        onSuccess() {
            onClose?.()
        },
    })

    const { mutateAsync: updateUser, isPending: isUpdateUserPending } = useUpdateUser({
        onSuccess() {
            onClose?.()
        },
    })

    const form = useForm({
        defaultValues: {
            name: "",
            nickname: "",
            phoneNumber: "",
            role: UserRole.用户 as UserRoleParams,
        },
        validators: {
            onSubmit: addUserSchema,
        },
        async onSubmit({ value }) {
            const values = addUserParser(value)

            if (id) await updateUser(updateUserParser({ id, ...values }))
            else await addUser(values)
        },
    })

    useEffect(() => {
        if (!open) {
            form.reset({ name: "", nickname: "", phoneNumber: "", role: UserRole.用户 })
            return
        }

        form.reset({
            name: data?.name ?? "",
            nickname: data?.nickname ?? "",
            phoneNumber: data?.phoneNumber ?? "",
            role: data?.role ?? UserRole.用户,
        })
    }, [data, form, open])

    const isPending = isLoading || isAddUserPending || isUpdateUserPending

    function onOpenChange(nextOpen: boolean) {
        if (!nextOpen && !isPending) onClose?.()
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={!isPending}>
                <DialogHeader>
                    <DialogTitle>{isUpdate ? "修改用户" : "新增用户"}</DialogTitle>
                    <DialogDescription>填写用户基础信息并选择系统角色。</DialogDescription>
                </DialogHeader>
                <form
                    id="user-editor-form"
                    onSubmit={event => {
                        event.preventDefault()
                        event.stopPropagation()
                        void form.handleSubmit()
                    }}
                >
                    <FieldGroup>
                        <form.Field name="name" validators={{ onBlur: getOnBlurValidator(usernameSchema) }}>
                            {field => {
                                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor={field.name}>用户名</FieldLabel>
                                        <Input
                                            id={field.name}
                                            name={field.name}
                                            autoComplete="off"
                                            disabled={isPending}
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
                        <form.Field name="nickname" validators={{ onBlur: getOnBlurValidator(nicknameSchema) }}>
                            {field => {
                                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor={field.name}>昵称</FieldLabel>
                                        <Input
                                            id={field.name}
                                            name={field.name}
                                            autoComplete="off"
                                            disabled={isPending}
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
                        <form.Field name="phoneNumber" validators={{ onBlur: getOnBlurValidator(phoneNumberSchema) }}>
                            {field => {
                                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor={field.name}>手机号</FieldLabel>
                                        <Input
                                            id={field.name}
                                            name={field.name}
                                            autoComplete="tel"
                                            disabled={isPending}
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
                        <form.Field name="role" validators={{ onBlur: getOnBlurValidator(UserRoleSchema) }}>
                            {field => {
                                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor={field.name}>角色</FieldLabel>
                                        <RoleSelect
                                            id={field.name}
                                            value={field.state.value}
                                            disabled={isPending}
                                            invalid={isInvalid}
                                            onBlur={field.handleBlur}
                                            onValueChange={field.handleChange}
                                        />
                                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                    </Field>
                                )
                            }}
                        </form.Field>
                    </FieldGroup>
                </form>
                <DialogFooter>
                    <Button type="button" variant="outline" disabled={isPending} onClick={onClose}>
                        取消
                    </Button>
                    <form.Subscribe selector={state => [state.canSubmit, state.isSubmitting, state.isPristine]}>
                        {([canSubmit, isSubmitting, isPristine]) => (
                            <Button type="submit" form="user-editor-form" disabled={!canSubmit || isPending || isSubmitting || isPristine}>
                                {(isPending || isSubmitting) && <LoaderCircleIcon className="animate-spin" />}
                                保存
                            </Button>
                        )}
                    </form.Subscribe>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
