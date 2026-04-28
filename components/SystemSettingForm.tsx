"use client"

import { ComponentProps, FC, useEffect } from "react"

import { Button, Form, Input, InputNumber, Select, Skeleton, Switch } from "antd"
import { useForm } from "antd/es/form/Form"
import FormItem from "antd/es/form/FormItem"
import { clsx, StrictOmit } from "deepsea-tools"

import { PublicSystemSetting, PublicSystemSettingGroup, SystemSettingValueKind } from "@/constants/systemSettings"

import { useQuerySystemSettings } from "@/hooks/useQuerySystemSettings"
import { useUpdateSystemSettings } from "@/hooks/useUpdateSystemSettings"

export interface SystemSettingFormData {
    [key: string]: string | number | boolean | undefined
}

export interface SystemSettingFormProps extends StrictOmit<ComponentProps<"div">, "children"> {}

export function getSystemSettingFormValue(setting: PublicSystemSetting) {
    if (setting.secret) return ""
    if (setting.kind === SystemSettingValueKind.布尔) return setting.value === "1" || setting.value === "true"
    if (setting.kind === SystemSettingValueKind.正整数) return Number(setting.value)
    if (setting.kind === SystemSettingValueKind.可选布尔) return setting.value ?? ""

    return setting.value ?? ""
}

export function getSystemSettingFormValues(groups: PublicSystemSettingGroup[] = []) {
    const values: SystemSettingFormData = {}

    groups.forEach(group => {
        group.settings.forEach(setting => {
            values[setting.key] = getSystemSettingFormValue(setting)
        })
    })

    return values
}

export function renderSystemSettingInput(setting: PublicSystemSetting, disabled: boolean) {
    if (setting.kind === SystemSettingValueKind.布尔) return <Switch disabled={disabled} />

    if (setting.kind === SystemSettingValueKind.可选布尔) {
        return (
            <Select
                disabled={disabled}
                options={[
                    {
                        label: "默认",
                        value: "",
                    },
                    {
                        label: "开启",
                        value: "1",
                    },
                    {
                        label: "关闭",
                        value: "0",
                    },
                ]}
            />
        )
    }

    if (setting.kind === SystemSettingValueKind.正整数) return <InputNumber className="w-full" min={1} precision={0} disabled={disabled} />

    if (setting.kind === SystemSettingValueKind.多行文本)
        return <Input.TextArea autoComplete="off" allowClear autoSize={{ minRows: 2, maxRows: 5 }} disabled={disabled} placeholder={setting.placeholder} />

    if (setting.secret) return <Input.Password autoComplete="new-password" allowClear disabled={disabled} placeholder={setting.placeholder} />

    return <Input autoComplete="off" allowClear disabled={disabled} placeholder={setting.placeholder} />
}

export function renderSystemSettingFormItem(setting: PublicSystemSetting, disabled: boolean) {
    return (
        <FormItem<SystemSettingFormData>
            key={setting.key}
            name={setting.key}
            label={setting.label}
            help={setting.description}
            valuePropName={setting.kind === SystemSettingValueKind.布尔 ? "checked" : undefined}
        >
            {renderSystemSettingInput(setting, disabled)}
        </FormItem>
    )
}

const SystemSettingForm: FC<SystemSettingFormProps> = ({ className, ...rest }) => {
    const [form] = useForm<SystemSettingFormData>()
    const { data, isLoading } = useQuerySystemSettings()

    const { mutateAsync: updateSystemSettings, isPending } = useUpdateSystemSettings({
        onSuccess(groups) {
            form.setFieldsValue(getSystemSettingFormValues(groups))
        },
    })

    useEffect(() => {
        if (!data) return

        form.setFieldsValue(getSystemSettingFormValues(data))
    }, [data, form])

    async function onFinish(values: SystemSettingFormData) {
        await updateSystemSettings({ values })
    }

    const disabled = isLoading || isPending

    return (
        <div className={clsx("flex h-full flex-col overflow-hidden", className)} {...rest}>
            <div className="flex-none border-b border-neutral-200 px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                        <h1 className="text-xl font-semibold text-neutral-900">系统设置</h1>
                        <p className="text-sm text-neutral-500">调整保存后立即生效的运行时配置，密钥字段会保持隐藏。</p>
                    </div>
                    <Button type="primary" className="flex-none" loading={isPending} disabled={isLoading} onClick={() => form.submit()}>
                        保存设置
                    </Button>
                </div>
            </div>
            <div className="overflow-auto px-4 fill-y">
                {isLoading ? (
                    <div className="py-6">
                        <Skeleton active paragraph={{ rows: 16 }} />
                    </div>
                ) : (
                    <Form<SystemSettingFormData> name="system-setting-form" form={form} layout="vertical" disabled={disabled} onFinish={onFinish}>
                        {data?.map(group => (
                            <section key={group.key} className="border-b border-neutral-200 py-6 last:border-b-0">
                                <div className="mb-5 max-w-3xl">
                                    <h2 className="text-base font-semibold text-neutral-900">{group.label}</h2>
                                    <p className="mt-1 text-sm text-neutral-500">{group.description}</p>
                                </div>
                                <div className="grid grid-cols-1 gap-x-6 gap-y-4 lg:grid-cols-2 xl:grid-cols-3">
                                    {group.settings.map(setting => renderSystemSettingFormItem(setting, disabled))}
                                </div>
                            </section>
                        ))}
                        <div className="sticky bottom-0 -mx-4 flex justify-end border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur">
                            <Button type="primary" loading={isPending} disabled={isLoading} onClick={() => form.submit()}>
                                保存设置
                            </Button>
                        </div>
                    </Form>
                )}
            </div>
        </div>
    )
}

export default SystemSettingForm
