"use client"

import type { ComponentProps, FC } from "react"

import { zhCN } from "date-fns/locale"
import { CalendarDaysIcon, XIcon } from "lucide-react"
import { useInputState } from "soda-hooks"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { formatDateTime } from "@/utils/formatDateTime"

const weekdayNames = ["日", "一", "二", "三", "四", "五", "六"] as const

function formatWeekdayName(date: Date) {
    return weekdayNames[date.getDay()]
}

export interface DatePickerProps extends Omit<ComponentProps<typeof Button>, "children" | "value" | "onChange"> {
    value?: Date
    onValueChange?: (value?: Date) => void
}

export const DatePicker: FC<DatePickerProps> = ({ value: _value, onValueChange: _onValueChange, ...rest }) => {
    const [value, setValue] = useInputState<Date | undefined>(_value)

    function onValueChange(value?: Date) {
        setValue(value)
        _onValueChange?.(value)
    }

    return (
        <div className="flex w-full min-w-0 items-center gap-1 sm:w-auto">
            <Popover>
                <PopoverTrigger
                    render={<Button className="min-w-0 flex-auto justify-start font-normal sm:min-w-44" type="button" variant="outline" {...rest} />}
                >
                    <CalendarDaysIcon />
                    <span className="truncate">{value ? formatDateTime(value, "YYYY年M月D日") : "选择日期"}</span>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" locale={zhCN} weekStartsOn={1} selected={value} formatters={{ formatWeekdayName }} onSelect={onValueChange} />
                </PopoverContent>
            </Popover>
            {value && (
                <Button type="button" variant="ghost" size="icon-sm" aria-label="清除日期" onClick={() => onValueChange(undefined)}>
                    <XIcon />
                </Button>
            )}
        </div>
    )
}
