"use client"

import { type ComponentProps, type FC, useEffect } from "react"

import { useForm } from "@tanstack/react-form"
import { type StrictOmit, clsx } from "deepsea-tools"
import { LoaderCircleIcon } from "lucide-react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"

import { type PublicSystemSetting, type PublicSystemSettingGroup, SystemSettingValueKind } from "@/constants/systemSettings"

import { useQuerySystemSettings } from "@/hooks/useQuerySystemSettings"
import { useUpdateSystemSettings } from "@/hooks/useUpdateSystemSettings"

import { updateSystemSettingsParser } from "@/schemas/updateSystemSettings"

import { getOnBlurValidator } from "@/utils/getOnBlurValidator"

export interface SystemSettingFormData {
    [key: string]: string | number | boolean | undefined
}

export interface SystemSettingFormProps extends StrictOmit<ComponentProps<"div">, "children"> {}

const systemSettingFormValueSchema = z.union([z.string(), z.number(), z.boolean(), z.undefined()])
const systemSettingFormSchema = z.record(z.string(), systemSettingFormValueSchema)

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

interface SystemSettingInputProps {
    setting: PublicSystemSetting
    value: string | number | boolean | undefined
    disabled: boolean
    invalid: boolean
    onBlur: () => void
    onValueChange: (value: string | number | boolean | undefined) => void
}

const SystemSettingInput: FC<SystemSettingInputProps> = ({ setting, value, disabled, invalid, onBlur, onValueChange }) => {
    if (setting.kind === SystemSettingValueKind.布尔)
        return <Switch checked={Boolean(value)} disabled={disabled} aria-invalid={invalid} onBlur={onBlur} onCheckedChange={onValueChange} />

    if (setting.kind === SystemSettingValueKind.可选布尔) {
        return (
            <Select
                value={value === "" || value === undefined ? "default" : `${value}`}
                disabled={disabled}
                onValueChange={nextValue => onValueChange(nextValue === "default" ? "" : nextValue)}
            >
                <SelectTrigger className="w-full" aria-invalid={invalid} onBlur={onBlur}>
                    <SelectValue placeholder="默认" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="default">默认</SelectItem>
                    <SelectItem value="1">开启</SelectItem>
                    <SelectItem value="0">关闭</SelectItem>
                </SelectContent>
            </Select>
        )
    }

    if (setting.kind === SystemSettingValueKind.正整数) {
        return (
            <Input
                type="number"
                min={1}
                step={1}
                disabled={disabled}
                aria-invalid={invalid}
                value={value === undefined ? "" : `${value}`}
                onBlur={onBlur}
                onChange={event => onValueChange(event.target.value ? Number(event.target.value) : undefined)}
            />
        )
    }

    return (
        <Input
            type={setting.secret ? "password" : "text"}
            autoComplete={setting.secret ? "new-password" : "off"}
            disabled={disabled}
            placeholder={setting.placeholder}
            aria-invalid={invalid}
            value={`${value ?? ""}`}
            onBlur={onBlur}
            onChange={event => onValueChange(event.target.value)}
        />
    )
}

export const SystemSettingForm: FC<SystemSettingFormProps> = ({ className, ...rest }) => {
    const { data, isLoading } = useQuerySystemSettings()
    const { mutateAsync: updateSystemSettings, isPending } = useUpdateSystemSettings()

    const form = useForm({
        defaultValues: {} as SystemSettingFormData,
        validators: {
            onSubmit: systemSettingFormSchema,
        },
        async onSubmit({ value }) {
            const groups = await updateSystemSettings(updateSystemSettingsParser({ values: value }))
            form.reset(getSystemSettingFormValues(groups))
        },
    })

    useEffect(() => {
        if (data) form.reset(getSystemSettingFormValues(data))
    }, [data, form])

    const disabled = isLoading || isPending

    return (
        <div className={clsx("space-y-6", className)} {...rest}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">系统设置</h1>
                    <p className="mt-1 text-sm text-muted-foreground">调整保存后立即生效的运行时配置，密钥字段保持隐藏。</p>
                </div>
                <form.Subscribe selector={state => [state.canSubmit, state.isSubmitting, state.isPristine]}>
                    {([canSubmit, isSubmitting, isPristine]) => (
                        <Button type="submit" form="system-setting-form" disabled={!canSubmit || disabled || isSubmitting || isPristine}>
                            {(isPending || isSubmitting) && <LoaderCircleIcon className="animate-spin" />}
                            保存设置
                        </Button>
                    )}
                </form.Subscribe>
            </div>
            {isLoading ? (
                <div className="grid gap-4 lg:grid-cols-2">
                    {Array.from({ length: 4 }, (_, index) => (
                        <Skeleton key={index} className="h-64 rounded-2xl" />
                    ))}
                </div>
            ) : (
                <form
                    id="system-setting-form"
                    className="columns-1 gap-4 lg:columns-2"
                    onSubmit={event => {
                        event.preventDefault()
                        event.stopPropagation()
                        void form.handleSubmit()
                    }}
                >
                    {data?.map(group => (
                        <Card key={group.key} className="mb-4 break-inside-avoid">
                            <CardHeader>
                                <CardTitle>{group.label}</CardTitle>
                                <CardDescription>{group.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                {group.settings.map(setting => (
                                    <form.Field key={setting.key} name={setting.key} validators={{ onBlur: getOnBlurValidator(systemSettingFormValueSchema) }}>
                                        {field => {
                                            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                                            return (
                                                <Field
                                                    orientation={setting.kind === SystemSettingValueKind.布尔 ? "horizontal" : "vertical"}
                                                    data-invalid={isInvalid}
                                                >
                                                    <div className="min-w-0 flex-auto">
                                                        <FieldLabel htmlFor={setting.key}>{setting.label}</FieldLabel>
                                                        {setting.description && <FieldDescription>{setting.description}</FieldDescription>}
                                                    </div>
                                                    <div className={setting.kind === SystemSettingValueKind.布尔 ? "flex-none" : "w-full"}>
                                                        <SystemSettingInput
                                                            setting={setting}
                                                            value={field.state.value}
                                                            disabled={disabled}
                                                            invalid={isInvalid}
                                                            onBlur={field.handleBlur}
                                                            onValueChange={field.handleChange}
                                                        />
                                                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                                    </div>
                                                </Field>
                                            )
                                        }}
                                    </form.Field>
                                ))}
                            </CardContent>
                        </Card>
                    ))}
                </form>
            )}
        </div>
    )
}
