"use client"

import type { ComponentProps, FC } from "react"

import { zhCN } from "date-fns/locale"
import { CalendarDaysIcon, XIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { useInputState } from "soda-hooks"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { formatDateTime } from "@/utils/formatDateTime"

const weekdayNames = ["日", "一", "二", "三", "四", "五", "六"] as const

function formatWeekdayName(date: Date) {
    return weekdayNames[date.getDay()]
}

export interface DateRangePickerProps extends Omit<ComponentProps<typeof Button>, "children" | "value" | "onChange"> {
    value?: DateRange
    onValueChange?: (value?: DateRange) => void
}

export const DateRangePicker: FC<DateRangePickerProps> = ({ value: _value, onValueChange: _onValueChange, ...rest }) => {
    const [value, setValue] = useInputState<DateRange | undefined>(_value)

    function onValueChange(value?: DateRange) {
        setValue(value)
        _onValueChange?.(value)
    }

    function onClear() {
        onValueChange(undefined)
    }

    const label = value?.from
        ? value.to
            ? `${formatDateTime(value.from, "YYYY年M月D日")} 至 ${formatDateTime(value.to, "YYYY年M月D日")}`
            : formatDateTime(value.from, "YYYY年M月D日")
        : "选择日期范围"

    return (
        <div className="flex w-full min-w-0 items-center gap-1 sm:w-auto">
            <Popover>
                <PopoverTrigger asChild>
                    <Button className="min-w-0 flex-auto justify-start font-normal sm:min-w-56" type="button" variant="outline" {...rest}>
                        <CalendarDaysIcon />
                        <span className="truncate">{label}</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto overflow-hidden rounded-3xl border-border/60 bg-popover/95 p-0 backdrop-blur-md" align="start">
                    <Calendar
                        className="bg-transparent"
                        mode="range"
                        locale={zhCN}
                        weekStartsOn={1}
                        numberOfMonths={2}
                        selected={value}
                        formatters={{ formatWeekdayName }}
                        onSelect={onValueChange}
                    />
                </PopoverContent>
            </Popover>
            {value?.from && (
                <Button className="h-7 w-7" type="button" variant="ghost" size="icon" aria-label="清除日期范围" onClick={onClear}>
                    <XIcon />
                </Button>
            )}
        </div>
    )
}
