"use client"

import type { FC } from "react"

import { useInputState } from "soda-hooks"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { type UserRoleParams, UserRole } from "@/schemas/userRole"

const userRoleItems = {
    [UserRole.管理员]: "管理员",
    [UserRole.用户]: "用户",
} satisfies Record<UserRoleParams, string>

export interface RoleSelectProps {
    id?: string
    value?: UserRoleParams
    disabled?: boolean
    invalid?: boolean
    onBlur?: () => void
    onValueChange?: (value: UserRoleParams) => void
}

export const RoleSelect: FC<RoleSelectProps> = ({ id, value: _value, disabled, invalid, onBlur, onValueChange: _onValueChange }) => {
    const [value, setValue] = useInputState<UserRoleParams | undefined>(_value)

    function onValueChange(value: string) {
        const nextValue = value as UserRoleParams
        setValue(nextValue)
        _onValueChange?.(nextValue)
    }

    return (
        <Select value={value} disabled={disabled} onValueChange={onValueChange}>
            <SelectTrigger id={id} className="w-full" aria-invalid={invalid} onBlur={onBlur}>
                <SelectValue placeholder="选择角色" />
            </SelectTrigger>
            <SelectContent>
                {Object.entries(userRoleItems).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                        {label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
