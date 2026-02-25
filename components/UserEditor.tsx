import { ComponentProps, FC, useEffect } from "react"

import { Button, Form, Input, Modal } from "antd"
import { useForm } from "antd/es/form/Form"
import FormItem from "antd/es/form/FormItem"
import { isNonNullable } from "deepsea-tools"
import { schemaToRule } from "soda-antd"

import { useAddUser } from "@/hooks/useAddUser"
import { useGetUser } from "@/hooks/useGetUser"
import { useUpdateUser } from "@/hooks/useUpdateUser"

import { AddUserParams } from "@/schemas/addUser"
import { phoneNumberSchema } from "@/schemas/phoneNumber"
import { UpdateUserParams } from "@/schemas/updateUser"
import { usernameSchema } from "@/schemas/username"

import RoleSelect from "./RoleSelect"

export interface UserEditorProps extends Omit<ComponentProps<typeof Modal>, "title" | "children" | "onOk" | "onClose"> {
    id?: string
    onClose?: () => void
}

const UserEditor: FC<UserEditorProps> = ({
    id,
    open,
    mask = { enabled: true, closable: true, blur: true },
    onClose,
    okButtonProps: { loading: okButtonLoading, ...okButtonProps } = {},
    cancelButtonProps: { disabled: cancelButtonDisabled, ...cancelButtonProps } = {},
    ...rest
}) => {
    const { enabled, closable, blur } = typeof mask === "boolean" ? { enabled: mask, closable: true, blur: true } : mask
    const isUpdate = isNonNullable(id)
    const [form] = useForm<AddUserParams>()
    const { data, isLoading } = useGetUser(id, { enabled: !!open })

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

    useEffect(() => {
        if (!open || !data) return
        form.setFieldsValue(data as AddUserParams)
    }, [open, data, form])

    useEffect(() => {
        if (isNonNullable(id)) return () => form.resetFields()
    }, [id, form])

    const isPending = isAddUserPending || isUpdateUserPending

    const isRequesting = isLoading || isPending

    function onFinish(values: AddUserParams) {
        if (isUpdate) updateUser({ id: id!, ...values } as UpdateUserParams)
        else addUser(values)
    }

    return (
        <Modal
            title={`${isUpdate ? "修改用户" : "新增用户"}`}
            open={open}
            mask={{ enabled, closable: closable && !isPending, blur }}
            onOk={() => form.submit()}
            okButtonProps={{ loading: isRequesting || okButtonLoading, ...okButtonProps }}
            cancelButtonProps={{ disabled: isPending || cancelButtonDisabled, ...cancelButtonProps }}
            onCancel={() => onClose?.()}
            {...rest}
        >
            <Form<AddUserParams> form={form} disabled={isRequesting} labelCol={{ flex: "56px" }} onFinish={onFinish}>
                <FormItem<AddUserParams> name="name" label="用户名" rules={[schemaToRule(usernameSchema)]}>
                    <Input autoComplete="off" allowClear />
                </FormItem>
                <FormItem<AddUserParams> name="phoneNumber" label="手机号" rules={[schemaToRule(phoneNumberSchema)]}>
                    <Input autoComplete="off" allowClear />
                </FormItem>
                <FormItem<AddUserParams> name="role" label="角色">
                    <RoleSelect />
                </FormItem>
                <FormItem<AddUserParams> noStyle>
                    <Button className="!hidden" htmlType="submit">
                        提交
                    </Button>
                </FormItem>
            </Form>
        </Modal>
    )
}

export default UserEditor
