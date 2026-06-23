"use client"

import {
    type ComponentProps,
    type FC,
    type KeyboardEvent as ReactKeyboardEvent,
    type MouseEvent as ReactMouseEvent,
    type ReactNode,
    useEffect,
    useState,
} from "react"

import { IconAt, IconCalendarPlus, IconCheck, IconClockEdit, IconId, IconPencil, IconPhone, IconShieldCheck, IconUserCircle } from "@tabler/icons-react"
import { Avatar, Button, Card, Tag, Tooltip } from "antd"
import { type StrictOmit, clsx, formatTime, getEnumKey } from "deepsea-tools"
import { useRouter } from "next/navigation"

import { useUpdateCurrentUserProfile } from "@/hooks/useUpdateCurrentUserProfile"

import type { User } from "@/prisma/generated/client"

import { nicknameParser } from "@/schemas/nickname"
import { UserRole } from "@/schemas/userRole"

import CurrentUserPhoneNumberEditor from "./CurrentUserPhoneNumberEditor"

export interface ProfileDetailItemProps extends StrictOmit<ComponentProps<"div">, "children"> {
    icon?: ReactNode
    label: string
    valueExtra?: ReactNode
    children?: ReactNode
}

export const ProfileDetailItem: FC<ProfileDetailItemProps> = ({ className, icon, label, valueExtra, children, ...rest }) => (
    <div className={clsx("flex gap-3 border-b border-neutral-100 py-4 last:border-b-0", className)} {...rest}>
        <div className="flex size-9 flex-none items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">{icon}</div>
        <div className="min-w-0 flex-auto">
            <div className="text-sm font-medium text-neutral-500">{label}</div>
            <div className="mt-1 flex min-h-9 min-w-0 items-center justify-between gap-2 text-base text-neutral-900 sm:gap-3">
                <div className="min-w-0 flex-auto break-words">{children}</div>
                {valueExtra ? <div className="flex flex-none items-center">{valueExtra}</div> : null}
            </div>
        </div>
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
    const [nicknameInputValue, setNicknameInputValue] = useState(data.nickname)
    const [isPhoneNumberEditorOpen, setIsPhoneNumberEditorOpen] = useState(false)

    const { mutateAsync: updateCurrentUserProfile, isPending: isUpdateCurrentUserProfilePending } = useUpdateCurrentUserProfile({
        onSuccess(nextUser) {
            setCurrentUser(nextUser)
            setNicknameInputValue(nextUser.nickname)
            setIsEditingNickname(false)
            router.refresh()
        },
    })

    useEffect(() => {
        setCurrentUser(data)
        setNicknameInputValue(data.nickname)
        setIsEditingNickname(false)
    }, [data])

    function onEditNickname() {
        setNicknameInputValue(currentUser.nickname)
        setIsEditingNickname(true)
    }

    function onNicknameActionClick() {
        if (isEditingNickname) void onSubmitNickname()
        else onEditNickname()
    }

    function onNicknameButtonMouseDown(event: ReactMouseEvent<HTMLButtonElement, MouseEvent>) {
        if (!isEditingNickname) return
        event.preventDefault()
    }

    function onNicknameInputValueChange(event: React.ChangeEvent<HTMLInputElement>) {
        setNicknameInputValue(event.target.value)
    }

    async function onSubmitNickname() {
        if (!isEditingNickname || isUpdateCurrentUserProfilePending) return

        const nickname = nicknameInputValue.trim()

        if (!nickname || nickname === currentUser.nickname) {
            setNicknameInputValue(currentUser.nickname)
            setIsEditingNickname(false)
            return
        }

        try {
            nicknameParser(nickname)
        } catch (error) {
            const messageText = error instanceof Error ? error.message : "昵称格式不正确"

            message.open({
                type: "error",
                content: messageText,
            })

            return
        }

        const nextUser = await updateCurrentUserProfile({
            nickname,
            phoneNumber: currentUser.phoneNumber,
        })

        setCurrentUser(nextUser)
    }

    function onNicknameBlur() {
        void onSubmitNickname()
    }

    function onNicknameInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
        if (event.key !== "Enter") return

        event.preventDefault()
        void onSubmitNickname()
    }

    function onPhoneNumberEditorClose() {
        setIsPhoneNumberEditorOpen(false)
    }

    function onOpenPhoneNumberEditor() {
        setIsPhoneNumberEditorOpen(true)
    }

    function onPhoneNumberEditorSuccess(nextUser: User) {
        setCurrentUser(nextUser)
        router.refresh()
    }

    const roleName = getEnumKey(UserRole, currentUser.role)

    return (
        <div className={clsx("h-full overflow-auto bg-neutral-50", className)} {...rest}>
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 py-4 sm:gap-6 sm:px-4 sm:py-6 md:px-6">
                <section className="rounded-lg border border-neutral-200 bg-white px-4 py-4 shadow-sm sm:px-5 sm:py-5 md:px-6">
                    <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
                        <Avatar className="size-16 flex-none bg-blue-600 text-2xl font-semibold" size={64}>
                            {getAvatarText(currentUser)}
                        </Avatar>
                        <div className="min-w-0 flex-auto">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="m-0 max-w-full truncate text-xl font-semibold text-neutral-950 sm:text-2xl">{currentUser.nickname}</h1>
                                <Tag className="m-0" color={currentUser.role === UserRole.管理员 ? "blue" : "default"}>
                                    {roleName}
                                </Tag>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-neutral-500">
                                <span className="inline-flex min-w-0 items-center gap-1.5">
                                    <IconAt className="flex-none" size={16} />
                                    <span className="truncate">{currentUser.name}</span>
                                </span>
                                <span className="inline-flex min-w-0 items-center gap-1.5">
                                    <IconPhone className="flex-none" size={16} />
                                    <span className="truncate">{currentUser.phoneNumber}</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                <Card
                    className="overflow-hidden [&_.ant-card-body]:p-4 sm:[&_.ant-card-body]:p-6 [&_.ant-card-head]:px-4 sm:[&_.ant-card-head]:px-6"
                    title="基础资料"
                >
                    <ProfileDetailItem
                        icon={<IconUserCircle size={20} />}
                        label="昵称"
                        valueExtra={
                            allowUpdateNickname ? (
                                <Tooltip title={isEditingNickname ? "保存昵称" : "修改昵称"}>
                                    <Button
                                        type="text"
                                        size="small"
                                        className="flex-none text-neutral-500"
                                        disabled={isUpdateCurrentUserProfilePending}
                                        icon={isEditingNickname ? <IconCheck size={16} /> : <IconPencil size={16} />}
                                        aria-label={isEditingNickname ? "保存昵称" : "修改昵称"}
                                        onMouseDown={onNicknameButtonMouseDown}
                                        onClick={onNicknameActionClick}
                                    />
                                </Tooltip>
                            ) : undefined
                        }
                    >
                        <div className="h-6 min-w-0 text-base leading-6">
                            {isEditingNickname ? (
                                <input
                                    autoFocus
                                    autoComplete="off"
                                    className="block h-6 w-full min-w-0 appearance-none border-0 bg-transparent p-0 text-base leading-6 text-neutral-900 outline-none disabled:cursor-not-allowed disabled:text-neutral-400"
                                    disabled={isUpdateCurrentUserProfilePending}
                                    value={nicknameInputValue}
                                    onBlur={onNicknameBlur}
                                    onChange={onNicknameInputValueChange}
                                    onKeyDown={onNicknameInputKeyDown}
                                />
                            ) : (
                                <div className="h-6 truncate leading-6">{currentUser.nickname}</div>
                            )}
                        </div>
                    </ProfileDetailItem>
                    <ProfileDetailItem icon={<IconAt size={20} />} label="用户名">
                        {currentUser.name}
                    </ProfileDetailItem>
                    <ProfileDetailItem
                        icon={<IconPhone size={20} />}
                        label="手机号"
                        valueExtra={
                            allowUpdatePhoneNumber ? (
                                <Tooltip title="修改手机号">
                                    <Button
                                        type="text"
                                        size="small"
                                        className="flex-none text-neutral-500"
                                        icon={<IconPencil size={16} />}
                                        aria-label="修改手机号"
                                        onClick={onOpenPhoneNumberEditor}
                                    />
                                </Tooltip>
                            ) : undefined
                        }
                    >
                        {currentUser.phoneNumber}
                    </ProfileDetailItem>
                    <ProfileDetailItem icon={<IconShieldCheck size={20} />} label="角色">
                        {roleName}
                    </ProfileDetailItem>
                    <ProfileDetailItem icon={<IconId size={20} />} label="账号 ID">
                        {currentUser.id}
                    </ProfileDetailItem>
                    <ProfileDetailItem icon={<IconCalendarPlus size={20} />} label="注册时间">
                        {formatTime(currentUser.createdAt)}
                    </ProfileDetailItem>
                    <ProfileDetailItem icon={<IconClockEdit size={20} />} label="最近更新">
                        {formatTime(currentUser.updatedAt)}
                    </ProfileDetailItem>
                </Card>
            </div>
            {allowUpdatePhoneNumber && isPhoneNumberEditorOpen && (
                <CurrentUserPhoneNumberEditor
                    data={currentUser}
                    open={isPhoneNumberEditorOpen}
                    onClose={onPhoneNumberEditorClose}
                    onSuccess={onPhoneNumberEditorSuccess}
                />
            )}
        </div>
    )
}
