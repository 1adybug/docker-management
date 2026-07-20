"use client"

import { type FC, useEffect } from "react"

import { useForm } from "@tanstack/react-form"
import { clsx } from "deepsea-tools"
import { LoaderCircleIcon } from "lucide-react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import { useBanUser } from "@/hooks/useBanUser"
import { useGetUser } from "@/hooks/useGetUser"

import { banReasonSchema } from "@/schemas/banReason"
import { banUserParser } from "@/schemas/banUser"

import { getDateTime } from "@/utils/formatDateTime"
import { getOnBlurValidator } from "@/utils/getOnBlurValidator"
import { toast } from "@/utils/toast"

const banUserFormSchema = z.object({
    banReason: banReasonSchema,
    banDate: z.string(),
})

export interface BanUserEditorProps {
    id?: string
    open?: boolean
    onClose?: () => void
}

export const BanUserEditor: FC<BanUserEditorProps> = ({ id, open = false, onClose }) => {
    const { data, isLoading } = useGetUser(id, { enabled: open })

    const { mutateAsync: banUser, isPending } = useBanUser({
        onSuccess() {
            onClose?.()
        },
    })

    const form = useForm({
        defaultValues: {
            banReason: "",
            banDate: "",
        },
        validators: {
            onSubmit: banUserFormSchema,
        },
        async onSubmit({ value }) {
            if (!id) return

            const banDate = value.banDate ? getDateTime(value.banDate) : undefined
            const banExpiresIn = banDate?.diff(getDateTime(), "second")

            if (banExpiresIn !== undefined && banExpiresIn <= 0) {
                toast.warning("封禁时间必须大于当前时间")
                return
            }

            await banUser(
                banUserParser({
                    userId: id,
                    banReason: value.banReason || undefined,
                    banExpiresIn,
                }),
            )
        },
    })

    useEffect(() => {
        form.reset({ banReason: "", banDate: "" })
    }, [form, id, open])

    function onOpenChange(nextOpen: boolean) {
        if (!nextOpen && !isPending) onClose?.()
    }

    function setBanDate(amount: number, unit: "day" | "week" | "month" | "year") {
        form.setFieldValue("banDate", getDateTime().add(amount, unit).format("YYYY-MM-DDTHH:mm"))
    }

    const isRequesting = isLoading || isPending

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={clsx(
                    "rounded-4xl sm:rounded-4xl [&>button]:inline-flex [&>button]:h-7 [&>button]:w-7 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-2xl",
                    isPending && "[&>button]:hidden",
                )}
            >
                <DialogHeader>
                    <DialogTitle>封禁用户 {data?.name}</DialogTitle>
                    <DialogDescription>可以设置到期时间，留空表示永久封禁。</DialogDescription>
                </DialogHeader>
                <form
                    id="ban-user-form"
                    onSubmit={event => {
                        event.preventDefault()
                        event.stopPropagation()
                        void form.handleSubmit()
                    }}
                >
                    <FieldGroup>
                        <form.Field name="banReason" validators={{ onBlur: getOnBlurValidator(banReasonSchema) }}>
                            {field => {
                                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor={field.name}>封禁理由</FieldLabel>
                                        <Input
                                            id={field.name}
                                            name={field.name}
                                            autoComplete="off"
                                            disabled={isRequesting}
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
                        <form.Field name="banDate">
                            {field => (
                                <Field>
                                    <FieldLabel htmlFor={field.name}>封禁到期时间</FieldLabel>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        type="datetime-local"
                                        lang="zh-CN"
                                        min={getDateTime().format("YYYY-MM-DDTHH:mm")}
                                        disabled={isRequesting}
                                        value={field.state.value}
                                        onChange={event => field.handleChange(event.target.value)}
                                    />
                                </Field>
                            )}
                        </form.Field>
                        <div className="flex flex-wrap gap-2">
                            <Button type="button" size="sm" variant="outline" disabled={isRequesting} onClick={() => setBanDate(1, "day")}>
                                1 天
                            </Button>
                            <Button type="button" size="sm" variant="outline" disabled={isRequesting} onClick={() => setBanDate(1, "week")}>
                                1 周
                            </Button>
                            <Button type="button" size="sm" variant="outline" disabled={isRequesting} onClick={() => setBanDate(1, "month")}>
                                1 月
                            </Button>
                            <Button type="button" size="sm" variant="outline" disabled={isRequesting} onClick={() => setBanDate(1, "year")}>
                                1 年
                            </Button>
                            <form.Subscribe selector={state => state.values.banDate}>
                                {banDate => (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={banDate ? "outline" : "secondary"}
                                        disabled={isRequesting}
                                        aria-pressed={!banDate}
                                        onClick={() => form.setFieldValue("banDate", "")}
                                    >
                                        永久
                                    </Button>
                                )}
                            </form.Subscribe>
                        </div>
                    </FieldGroup>
                </form>
                <DialogFooter>
                    <Button type="button" variant="outline" disabled={isPending} onClick={onClose}>
                        取消
                    </Button>
                    <form.Subscribe selector={state => [state.canSubmit, state.isSubmitting, state.isPristine]}>
                        {([canSubmit, isSubmitting, isPristine]) => (
                            <Button type="submit" form="ban-user-form" disabled={!canSubmit || isRequesting || isSubmitting || isPristine}>
                                {(isRequesting || isSubmitting) && <LoaderCircleIcon className="animate-spin" />}
                                确认封禁
                            </Button>
                        )}
                    </form.Subscribe>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
