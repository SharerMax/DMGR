import * as React from 'react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

export interface DatePickerProps {
  value?: Date | null
  onChange?: (date: Date | null) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ value, onChange, placeholder = '选择日期', className, disabled }, ref) => {
    const formatDateValue = (date: Date | null | undefined): string => {
      if (!date) return ''
      return format(date, 'yyyy-MM-dd')
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      if (!val) {
        onChange?.(null)
        return
      }
      const newDate = new Date(val)
      onChange?.(newDate)
    }

    return (
      <Input
        type="date"
        ref={ref}
        value={formatDateValue(value)}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={cn('w-full', className)}
      />
    )
  }
)

DatePicker.displayName = 'DatePicker'

export interface DateRangePickerProps {
  startDate?: Date | null
  endDate?: Date | null
  onStartDateChange?: (date: Date | null) => void
  onEndDateChange?: (date: Date | null) => void
  startPlaceholder?: string
  endPlaceholder?: string
  className?: string
  disabled?: boolean
}

export const DateRangePicker = React.forwardRef<HTMLDivElement, DateRangePickerProps>(
  (
    {
      startDate,
      endDate,
      onStartDateChange,
      onEndDateChange,
      startPlaceholder = '开始日期',
      endPlaceholder = '结束日期',
      className,
      disabled,
    },
    ref
  ) => {
    const formatDateValue = (date: Date | null | undefined): string => {
      if (!date) return ''
      return format(date, 'yyyy-MM-dd')
    }

    return (
      <div ref={ref} className={cn('flex items-center gap-2', className)}>
        <Input
          type="date"
          value={formatDateValue(startDate)}
          onChange={(e) => {
            const val = e.target.value
            onStartDateChange?.(val ? new Date(val) : null)
          }}
          placeholder={startPlaceholder}
          disabled={disabled}
          className="w-full"
        />
        <span className="text-muted-foreground shrink-0">至</span>
        <Input
          type="date"
          value={formatDateValue(endDate)}
          onChange={(e) => {
            const val = e.target.value
            onEndDateChange?.(val ? new Date(val) : null)
          }}
          placeholder={endPlaceholder}
          disabled={disabled}
          className="w-full"
        />
      </div>
    )
  }
)

DateRangePicker.displayName = 'DateRangePicker'
