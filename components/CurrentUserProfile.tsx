"use client"

import { ComponentProps, FC, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode, useEffect, useState } from "react"

import { IconCheck, IconPencil } from "@tabler/icons-react"
import { Button, Card, Input } from "antd"
import { clsx, formatTime, getEnumKey, StrictOmit } from "deepsea-tools"
import { useRouter } from "next/navigation"

import { useUpdateCurrentUserProfile } from "@/hooks/useUpdateCurrentUserProfile"

import { User } from "@/prisma/generated/client"

import { nicknameParser } from "@/schemas/nickname"
import { UserRole } from "@/schemas/userRole"

import CurrentUserPhoneNumberEditor from "./CurrentUserPhoneNumberEditor"

export interface ProfileDetailItemProps extends StrictOmit<ComponentProps<"div">, "children"> {
    label: string
    valueExtra?: ReactNode
    children?: ReactNode
}

export const ProfileDetailItem: FC<ProfileDetailItemProps> = ({ className, label, valueExtra, children, ...rest }) => (
    <div className={clsx("flex flex-col gap-3 border-b border-neutral-100 py-5 last:border-b-0", className)} {...rest}>
        <div className="text-sm font-medium text-neutral-500">{label}</div>
        <div className="flex items-center justify-between gap-3 text-base text-neutral-900">
            <div className="min-w-0 flex-auto">{children}</div>
            {valueExtra}
        </div>
    </div>
)

export interface CurrentUserProfileProps extends StrictOmit<ComponentProps<"div">, "children"> {
    data: User
    allowUpdateNickname: boolean
    allowUpdatePhoneNumber: boolean
}

const CurrentUserProfile: FC<CurrentUserProfileProps> = ({ className, data, allowUpdateNickname, allowUpdatePhoneNumber, ...rest }) => {
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

    function onNicknamePressEnter(event: ReactKeyboardEvent<HTMLInputElement>) {
        event.preventDefault()
        void onSubmitNickname()
    }

    function onPhoneNumberEditorClose() {
        setIsPhoneNumberEditorOpen(false)
    }

    function onPhoneNumberEditorSuccess(nextUser: User) {
        setCurrentUser(nextUser)
        router.refresh()
    }

    return (
        <div className={clsx("mx-auto flex h-full w-full max-w-5xl flex-col gap-6 px-4 py-6", className)} {...rest}>
            <title>个人中心</title>
            <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-neutral-900">个人中心</h1>
                <p className="text-sm text-neutral-500">
                    查看当前账号资料
                    {allowUpdateNickname || allowUpdatePhoneNumber ? "，并在这里管理可编辑的个人信息。" : "。当前环境未开放昵称和手机号自助修改。"}
                </p>
            </div>
            <div className="w-full max-w-[420px]">
                <Card className="overflow-hidden">
                    <div className="space-y-1">
                        <div className="text-lg font-semibold text-neutral-900">{currentUser.nickname}</div>
                        <div className="text-sm text-neutral-500">@{currentUser.name}</div>
                    </div>
                    <div className="mt-4">
                        <ProfileDetailItem
                            label="昵称"
                            valueExtra={
                                allowUpdateNickname ? (
                                    <Button
                                        type="text"
                                        size="small"
                                        className="flex-none text-neutral-500"
                                        disabled={isUpdateCurrentUserProfilePending}
                                        icon={isEditingNickname ? <IconCheck size={16} /> : <IconPencil size={16} />}
                                        onMouseDown={onNicknameButtonMouseDown}
                                        onClick={isEditingNickname ? () => void onSubmitNickname() : onEditNickname}
                                    />
                                ) : undefined
                            }
                        >
                            <div className="relative h-8">
                                <div
                                    className={clsx(
                                        "absolute inset-0 flex items-center transition-opacity",
                                        isEditingNickname ? "pointer-events-none opacity-0" : "opacity-100",
                                    )}
                                >
                                    {currentUser.nickname}
                                </div>
                                {isEditingNickname && (
                                    <div className="absolute inset-0">
                                        <Input
                                            autoFocus
                                            autoComplete="off"
                                            allowClear
                                            className="h-8"
                                            disabled={isUpdateCurrentUserProfilePending}
                                            value={nicknameInputValue}
                                            onBlur={onNicknameBlur}
                                            onChange={onNicknameInputValueChange}
                                            onPressEnter={onNicknamePressEnter}
                                        />
                                    </div>
                                )}
                            </div>
                        </ProfileDetailItem>
                        <ProfileDetailItem
                            label="手机号"
                            valueExtra={
                                allowUpdatePhoneNumber ? (
                                    <Button
                                        type="text"
                                        size="small"
                                        className="flex-none text-neutral-500"
                                        icon={<IconPencil size={16} />}
                                        onClick={() => setIsPhoneNumberEditorOpen(true)}
                                    />
                                ) : undefined
                            }
                        >
                            {currentUser.phoneNumber}
                        </ProfileDetailItem>
                        <ProfileDetailItem label="角色">{getEnumKey(UserRole, currentUser.role)}</ProfileDetailItem>
                        <ProfileDetailItem label="注册时间">{formatTime(currentUser.createdAt)}</ProfileDetailItem>
                        <ProfileDetailItem label="最近更新">{formatTime(currentUser.updatedAt)}</ProfileDetailItem>
                    </div>
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

export default CurrentUserProfile
