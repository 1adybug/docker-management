import type { ComponentProps, FC } from "react"

import { Button, DatePicker, Form, Input, Modal } from "antd"
import { useForm } from "antd/es/form/Form"
import FormItem from "antd/es/form/FormItem"
import type { Dayjs } from "dayjs"

import { useBanUser } from "@/hooks/useBanUser"
import { useGetUser } from "@/hooks/useGetUser"

import { getDateTime } from "@/utils/formatDateTime"

export interface BanUserEditorProps extends Omit<ComponentProps<typeof Modal>, "children" | "onOk" | "onCancel"> {
    id?: string
    onClose?: () => void
}

interface BanUserFormData {
    banReason: string
    banDate?: Dayjs
}

export const BanUserEditor: FC<BanUserEditorProps> = ({
    id,
    open,
    mask = { enabled: true, closable: true, blur: true },
    onClose,
    okButtonProps: { loading: okButtonLoading, ...okButtonProps } = {},
    cancelButtonProps: { disabled: cancelButtonDisabled, ...cancelButtonProps } = {},
    ...rest
}) => {
    const { enabled, closable, blur } = typeof mask === "boolean" ? { enabled: mask, closable: true, blur: true } : mask
    const [form] = useForm<BanUserFormData>()
    const selectedBanDate = Form.useWatch("banDate", form)

    const { data, isLoading } = useGetUser(id, { enabled: !!open })

    const { mutateAsync: banUserAsync, isPending: isBanUserPending } = useBanUser({
        onSuccess() {
            onClose?.()
        },
    })

    const isPending = isBanUserPending

    const isRequesting = isLoading || isPending

    function onFinish({ banReason, banDate }: BanUserFormData) {
        if (!id) return
        const banExpiresIn = banDate ? banDate.diff(getDateTime(), "second") : undefined
        if (!!banExpiresIn && banExpiresIn <= 0) return message.warning("封禁时间必须大于当前时间")
        banUserAsync({ userId: id, banReason, banExpiresIn })
    }

    return (
        <Modal
            title={`封禁用户 ${data?.name}`}
            open={open}
            mask={{ enabled, closable: closable && !isPending, blur }}
            onOk={() => form.submit()}
            okButtonProps={{ loading: isRequesting || okButtonLoading, ...okButtonProps }}
            cancelButtonProps={{ disabled: isPending || cancelButtonDisabled, ...cancelButtonProps }}
            onCancel={() => onClose?.()}
            {...rest}
        >
            <Form<BanUserFormData> name="ban-user-editor" form={form} labelCol={{ flex: "70px" }} disabled={isRequesting} onFinish={onFinish}>
                <FormItem<BanUserFormData> name="banReason" label="封禁理由">
                    <Input allowClear autoComplete="off" />
                </FormItem>
                <div className="flex gap-2">
                    <FormItem<BanUserFormData> name="banDate" label="封禁时间">
                        <DatePicker showTime disabledDate={date => date.valueOf() < getDateTime().startOf("day").valueOf()} />
                    </FormItem>
                    <div className="flex h-8 flex-none items-center">
                        <Button type="text" size="small" onClick={() => form.setFieldsValue({ banDate: getDateTime().add(1, "day") })}>
                            1天
                        </Button>
                        <Button type="text" size="small" onClick={() => form.setFieldsValue({ banDate: getDateTime().add(1, "week") })}>
                            1周
                        </Button>
                        <Button type="text" size="small" onClick={() => form.setFieldsValue({ banDate: getDateTime().add(1, "month") })}>
                            1月
                        </Button>
                        <Button type="text" size="small" onClick={() => form.setFieldsValue({ banDate: getDateTime().add(1, "year") })}>
                            1年
                        </Button>
                        <Button
                            size="small"
                            color={selectedBanDate ? "default" : "primary"}
                            variant={selectedBanDate ? "text" : "filled"}
                            onClick={() => form.setFieldsValue({ banDate: undefined })}
                        >
                            永久
                        </Button>
                    </div>
                </div>
                <FormItem<BanUserFormData> noStyle>
                    <Button className="!hidden" htmlType="submit">
                        提交
                    </Button>
                </FormItem>
            </Form>
        </Modal>
    )
}
