"use client"

import { type ComponentProps, type FC, type ReactNode, useEffect, useState } from "react"

import { useForm } from "@tanstack/react-form"
import { type StrictOmit, clsx, getEnumKey } from "deepsea-tools"
import {
    AtSignIcon,
    BadgeCheckIcon,
    CalendarPlusIcon,
    ClockIcon,
    IdCardIcon,
    LoaderCircleIcon,
    PencilIcon,
    PhoneIcon,
    ShieldCheckIcon,
    UserRoundIcon,
    XIcon,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { z } from "zod"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

import { useUpdateCurrentUserProfile } from "@/hooks/useUpdateCurrentUserProfile"

import type { User } from "@/prisma/generated/client"

import { nicknameSchema } from "@/schemas/nickname"
import { updateCurrentUserProfileParser } from "@/schemas/updateCurrentUserProfile"
import { UserRole } from "@/schemas/userRole"

import { formatDateTime } from "@/utils/formatDateTime"
import { getOnBlurValidator } from "@/utils/getOnBlurValidator"

import { CurrentUserPhoneNumberEditor } from "./CurrentUserPhoneNumberEditor"

const nicknameFormSchema = z.object({
    nickname: nicknameSchema,
})

export interface ProfileInformationItemProps extends StrictOmit<ComponentProps<"div">, "children"> {
    icon: ReactNode
    label: string
    description?: ReactNode
    action?: ReactNode
    children?: ReactNode
}

export const ProfileInformationItem: FC<ProfileInformationItemProps> = ({ className, icon, label, description, action, children, ...rest }) => (
    <div className={clsx("flex flex-col gap-3 py-4 sm:flex-row sm:items-start", className)} {...rest}>
        <div className="flex size-10 flex-none items-center justify-center rounded-2xl bg-muted text-muted-foreground">{icon}</div>
        <div className="min-w-0 flex-auto">
            <div className="text-xs font-medium tracking-wide text-muted-foreground">{label}</div>
            <div className="mt-1 min-h-6 break-words text-sm font-medium">{children}</div>
            {description && <div className="mt-1 text-xs text-muted-foreground">{description}</div>}
        </div>
        {action && <div className="flex flex-none items-center sm:pt-1">{action}</div>}
    </div>
)

export interface CurrentUserProfileProps extends StrictOmit<ComponentProps<"div">, "children"> {
    data: User
    allowUpdateNickname: boolean
    allowUpdatePhoneNumber: boolean
}

function getAvatarText(user: User) {
    const name = user.nickname || user.name
    return name.slice(0, 1).toUpperCase()
}

export const CurrentUserProfile: FC<CurrentUserProfileProps> = ({ className, data, allowUpdateNickname, allowUpdatePhoneNumber, ...rest }) => {
    const router = useRouter()
    const [currentUser, setCurrentUser] = useState(data)
    const [isEditingNickname, setIsEditingNickname] = useState(false)
    const [isPhoneNumberEditorOpen, setIsPhoneNumberEditorOpen] = useState(false)

    const { mutateAsync: updateCurrentUserProfile, isPending } = useUpdateCurrentUserProfile({
        onSuccess(nextUser) {
            setCurrentUser(nextUser)
            setIsEditingNickname(false)
            router.refresh()
        },
    })

    const nicknameForm = useForm({
        defaultValues: {
            nickname: data.nickname,
        },
        validators: {
            onSubmit: nicknameFormSchema,
        },
        async onSubmit({ value }) {
            if (value.nickname.trim() === currentUser.nickname) {
                setIsEditingNickname(false)
                return
            }

            await updateCurrentUserProfile(
                updateCurrentUserProfileParser({
                    nickname: value.nickname,
                    phoneNumber: currentUser.phoneNumber,
                }),
            )
        },
    })

    useEffect(() => {
        setCurrentUser(data)
        setIsEditingNickname(false)
        nicknameForm.reset({ nickname: data.nickname })
    }, [data, nicknameForm])

    function onEditNickname() {
        nicknameForm.reset({ nickname: currentUser.nickname })
        setIsEditingNickname(true)
    }

    function onCancelEditNickname() {
        nicknameForm.reset({ nickname: currentUser.nickname })
        setIsEditingNickname(false)
    }

    function onPhoneNumberEditorSuccess(nextUser: User) {
        setCurrentUser(nextUser)
        router.refresh()
    }

    const roleName = getEnumKey(UserRole, currentUser.role)

    return (
        <div className={clsx("space-y-6", className)} {...rest}>
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">个人中心</h1>
                <p className="mt-1 text-sm text-muted-foreground">查看账户信息并维护个人资料。</p>
            </div>

            <Card className="relative isolate overflow-hidden">
                <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5" aria-hidden />
                <CardContent className="flex flex-col gap-5 pt-8 sm:flex-row sm:items-end">
                    <Avatar className="size-24 flex-none shadow-sm ring-4 ring-card">
                        <AvatarFallback className="bg-primary text-3xl font-semibold text-primary-foreground">{getAvatarText(currentUser)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-auto pb-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-2xl font-semibold tracking-tight">{currentUser.nickname}</h2>
                            <Badge variant={currentUser.role === UserRole.管理员 ? "default" : "secondary"}>{roleName}</Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                                <AtSignIcon className="size-4" />
                                {currentUser.name}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <PhoneIcon className="size-4" />
                                {currentUser.phoneNumber}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-none items-center gap-2 rounded-2xl bg-background/70 px-3 py-2 text-xs text-muted-foreground ring-1 ring-foreground/5 backdrop-blur-sm">
                        <ShieldCheckIcon className="size-4 text-primary" />
                        账户状态正常
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
                <Card>
                    <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 border-b">
                        <div className="space-y-1.5">
                            <CardTitle>个人资料</CardTitle>
                            <CardDescription>用于识别账户和接收验证信息。</CardDescription>
                        </div>
                        <div className="flex-none">
                            <Badge variant="outline">
                                <UserRoundIcon data-icon="inline-start" />
                                个人账户
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ProfileInformationItem
                            icon={<UserRoundIcon className="size-5" />}
                            label="昵称"
                            description={allowUpdateNickname ? "昵称会显示在后台导航和个人资料中。" : "系统当前不允许修改昵称。"}
                            action={
                                !isEditingNickname && allowUpdateNickname ? (
                                    <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={onEditNickname}>
                                        <PencilIcon />
                                        修改
                                    </Button>
                                ) : undefined
                            }
                        >
                            {isEditingNickname ? (
                                <form
                                    id="nickname-form"
                                    className="max-w-md space-y-3"
                                    onSubmit={event => {
                                        event.preventDefault()
                                        event.stopPropagation()
                                        void nicknameForm.handleSubmit()
                                    }}
                                >
                                    <nicknameForm.Field name="nickname" validators={{ onBlur: getOnBlurValidator(nicknameSchema) }}>
                                        {field => {
                                            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                                            return (
                                                <Field data-invalid={isInvalid}>
                                                    <FieldLabel className="sr-only" htmlFor={field.name}>
                                                        昵称
                                                    </FieldLabel>
                                                    <Input
                                                        autoFocus
                                                        id={field.name}
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
                                    </nicknameForm.Field>
                                    <div className="flex flex-wrap gap-2">
                                        <nicknameForm.Subscribe selector={state => [state.canSubmit, state.isSubmitting, state.isPristine]}>
                                            {([canSubmit, isSubmitting, isPristine]) => (
                                                <Button type="submit" size="sm" disabled={!canSubmit || isPending || isSubmitting || isPristine}>
                                                    {(isPending || isSubmitting) && <LoaderCircleIcon className="animate-spin" />}
                                                    保存昵称
                                                </Button>
                                            )}
                                        </nicknameForm.Subscribe>
                                        <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={onCancelEditNickname}>
                                            <XIcon />
                                            取消
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                currentUser.nickname
                            )}
                        </ProfileInformationItem>
                        <Separator />
                        <ProfileInformationItem icon={<AtSignIcon className="size-5" />} label="用户名" description="用户名是账户的唯一登录标识。">
                            {currentUser.name}
                        </ProfileInformationItem>
                        <Separator />
                        <ProfileInformationItem
                            icon={<PhoneIcon className="size-5" />}
                            label="手机号"
                            description={allowUpdatePhoneNumber ? "修改手机号需要分别验证当前号码和新号码。" : "系统当前不允许修改手机号。"}
                            action={
                                allowUpdatePhoneNumber ? (
                                    <Button type="button" size="sm" variant="outline" onClick={() => setIsPhoneNumberEditorOpen(true)}>
                                        <PencilIcon />
                                        修改
                                    </Button>
                                ) : undefined
                            }
                        >
                            {currentUser.phoneNumber}
                        </ProfileInformationItem>
                        <Separator />
                        <ProfileInformationItem icon={<BadgeCheckIcon className="size-5" />} label="系统角色" description="角色决定可以访问的后台功能。">
                            <Badge variant={currentUser.role === UserRole.管理员 ? "default" : "secondary"}>{roleName}</Badge>
                        </ProfileInformationItem>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="border-b">
                        <CardTitle>账户信息</CardTitle>
                        <CardDescription>由系统自动维护的账户记录。</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ProfileInformationItem icon={<IdCardIcon className="size-5" />} label="账号 ID" description="用于系统内部识别此账户。">
                            <span className="break-all font-mono text-xs">{currentUser.id}</span>
                        </ProfileInformationItem>
                        <Separator />
                        <ProfileInformationItem icon={<CalendarPlusIcon className="size-5" />} label="注册时间">
                            {formatDateTime(currentUser.createdAt)}
                        </ProfileInformationItem>
                        <Separator />
                        <ProfileInformationItem icon={<ClockIcon className="size-5" />} label="最近更新">
                            {formatDateTime(currentUser.updatedAt)}
                        </ProfileInformationItem>
                    </CardContent>
                    <CardFooter className="gap-2 border-t pt-6 text-xs text-muted-foreground">
                        <ShieldCheckIcon className="size-4 text-primary" />
                        账户标识和时间记录不可手动修改。
                    </CardFooter>
                </Card>
            </div>

            {allowUpdatePhoneNumber && (
                <CurrentUserPhoneNumberEditor
                    data={currentUser}
                    open={isPhoneNumberEditorOpen}
                    onClose={() => setIsPhoneNumberEditorOpen(false)}
                    onSuccess={onPhoneNumberEditorSuccess}
                />
            )}
        </div>
    )
}
