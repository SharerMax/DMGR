import type { DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface DatePickerProps {
  value?: Date | null
  onChange?: (date: Date | null) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DatePicker({ value, onChange, placeholder = '选择日期', className, disabled }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={(
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !value && 'text-muted-foreground',
              className,
            )}
            disabled={disabled}
          />
        )}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {value ? format(value, 'yyyy-MM-dd') : <span>{placeholder}</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ?? undefined}
          onSelect={date => onChange?.(date ?? null)}
          locale={zhCN}
        />
      </PopoverContent>
    </Popover>
  )
}

export interface DateRangePickerProps {
  value?: DateRange | undefined
  onChange?: (range: DateRange | undefined) => void
  startPlaceholder?: string
  endPlaceholder?: string
  className?: string
  disabled?: boolean
}

export function DateRangePicker({
  value,
  onChange,
  startPlaceholder = '开始日期',
  endPlaceholder = '结束日期',
  className,
  disabled,
}: DateRangePickerProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={(
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !value?.from && !value?.to && 'text-muted-foreground',
              className,
            )}
            disabled={disabled}
          />
        )}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {value?.from
          ? (
              value?.to
                ? (
                    <>
                      {format(value.from, 'yyyy-MM-dd')}
                      <span className="mx-2 text-muted-foreground">至</span>
                      {format(value.to, 'yyyy-MM-dd')}
                    </>
                  )
                : (
                    format(value.from, 'yyyy-MM-dd')
                  )
            )
          : (
              <span>
                {startPlaceholder}
                {' '}
                -
                {endPlaceholder}
              </span>
            )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={value}
          onSelect={range => onChange?.(range)}
          numberOfMonths={2}
          disabled={disabled}
          locale={zhCN}
        />
      </PopoverContent>
    </Popover>
  )
}
