"use client"

import type { FC } from "react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { type DockerContainerStatus, DockerContainerStatus as DockerContainerStatusValues } from "@/constants"

export interface DockerContainerStatusSelectProps {
    className?: string
    value?: DockerContainerStatus
    disabled?: boolean
    onValueChange?: (value: DockerContainerStatus) => void
}

export const DockerContainerStatusSelect: FC<DockerContainerStatusSelectProps> = ({ className, value, disabled, onValueChange }) => (
    <Select value={value} disabled={disabled} onValueChange={nextValue => onValueChange?.(nextValue as DockerContainerStatus)}>
        <SelectTrigger className={className}>
            <SelectValue placeholder="选择状态" />
        </SelectTrigger>
        <SelectContent>
            {Object.entries(DockerContainerStatusValues).map(([label, value]) => (
                <SelectItem key={value} value={value}>
                    {label}
                </SelectItem>
            ))}
        </SelectContent>
    </Select>
)
