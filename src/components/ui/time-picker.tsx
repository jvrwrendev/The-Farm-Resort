import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface TimePicker12hProps {
  value: string
  onChange: (value: string) => void
  className?: string
  minTime?: string
}

function parse24(value: string): { hour: number; minute: number; period: 'AM' | 'PM' } {
  const [h, m] = (value || '00:00').split(':').map((x) => Number(x) || 0)
  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return { hour, minute: m, period }
}

function to24(hour: number, minute: number, period: 'AM' | 'PM'): string {
  let h = hour % 12
  if (period === 'PM') h += 12
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function TimePicker12h({ value, onChange, className, minTime }: TimePicker12hProps) {
  const parsed = parse24(value)
  const [hour, setHour] = useState(parsed.hour)
  const [minute, setMinute] = useState(parsed.minute)
  const [period, setPeriod] = useState<'AM' | 'PM'>(parsed.period)

  useEffect(() => {
    const p = parse24(value)
    setHour(p.hour)
    setMinute(p.minute)
    setPeriod(p.period)
  }, [value])

  const emit = (h: number, m: number, p: 'AM' | 'PM') => {
    onChange(to24(h, m, p))
  }

  const minutes = Array.from({ length: 60 }, (_, i) => i)

  const minMinutes = minTime ? (Number(minTime.split(':')[0]) * 60 + Number(minTime.split(':')[1])) : null

  const isDisabled = (h: number, m: number, p: 'AM' | 'PM') => {
    if (minMinutes === null) return false
    return (h % 12 + (p === 'PM' ? 12 : 0)) * 60 + m < minMinutes
  }

  return (
    <div className={`flex items-center gap-1 ${className ?? ''}`}>
      <Select
        value={String(hour)}
        onValueChange={(v) => {
          const h = Number(v)
          setHour(h)
          emit(h, minute, period)
        }}
      >
        <SelectTrigger className="w-[70px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
            <SelectItem key={h} value={String(h)} disabled={isDisabled(h, 59, period) && isDisabled(h, 0, period)}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground">:</span>
      <Select
        value={String(minute)}
        onValueChange={(v) => {
          const m = Number(v)
          setMinute(m)
          emit(hour, m, period)
        }}
      >
        <SelectTrigger className="w-[70px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {minutes.map((m) => (
            <SelectItem key={m} value={String(m)} disabled={isDisabled(hour, m, period)}>
              {String(m).padStart(2, '0')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={period}
        onValueChange={(v) => {
          const p = v as 'AM' | 'PM'
          setPeriod(p)
          emit(hour, minute, p)
        }}
      >
        <SelectTrigger className="w-[70px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}