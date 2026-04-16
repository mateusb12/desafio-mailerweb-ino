import { useEffect, useMemo, useRef, useState } from "react"

type DateInputProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  required?: boolean
}

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
})

const weekdayFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
})

const fieldClass =
  "h-[44px] w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 pr-11 text-slate-900 outline-none focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(37,99,235,0.14)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"

function pad(value: number) {
  return String(value).padStart(2, "0")
}

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function parseIsoDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(year, month, day)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null
  }

  return date
}

function parseDisplayDate(value: string) {
  const trimmed = value.trim()
  const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)

  if (brMatch) {
    const day = Number(brMatch[1])
    const month = Number(brMatch[2]) - 1
    const year = Number(brMatch[3])
    const date = new Date(year, month, day)

    if (
      date.getFullYear() === year &&
      date.getMonth() === month &&
      date.getDate() === day
    ) {
      return toIsoDate(date)
    }
  }

  if (isoMatch) {
    const year = Number(isoMatch[1])
    const month = Number(isoMatch[2]) - 1
    const day = Number(isoMatch[3])
    const date = new Date(year, month, day)

    if (
      date.getFullYear() === year &&
      date.getMonth() === month &&
      date.getDate() === day
    ) {
      return toIsoDate(date)
    }
  }

  return ""
}

function formatDisplayDate(value: string) {
  const date = parseIsoDate(value)
  if (!date) return value

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
}

function getCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const startOffset = firstDay.getDay()
  const start = new Date(year, month, 1 - startOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
}

export default function DateInput({
  id,
  value,
  onChange,
  required = false,
}: DateInputProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [draftValue, setDraftValue] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => {
    return parseIsoDate(value) ?? new Date()
  })

  const displayValue = isEditing ? draftValue : formatDisplayDate(value)
  const days = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth])
  const weekdays = useMemo(() => {
    const baseSunday = new Date(2024, 0, 7)

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(baseSunday)
      date.setDate(baseSunday.getDate() + index)
      return weekdayFormatter.format(date).replace(".", "")
    })
  }, [])

  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)

    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [isOpen])

  function commitTypedValue() {
    const parsed = parseDisplayDate(displayValue)
    setIsEditing(false)

    if (parsed) {
      onChange(parsed)
      setVisibleMonth(parseIsoDate(parsed) ?? new Date())
      return
    }

    if (!displayValue.trim()) {
      onChange("")
      return
    }

    setDraftValue(formatDisplayDate(value))
  }

  function selectDate(date: Date) {
    const isoDate = toIsoDate(date)
    onChange(isoDate)
    setDraftValue(formatDisplayDate(isoDate))
    setIsEditing(false)
    setVisibleMonth(date)
    setIsOpen(false)
  }

  function changeMonth(delta: number) {
    setVisibleMonth(
      current => new Date(current.getFullYear(), current.getMonth() + delta, 1),
    )
  }

  return (
    <div className="relative min-w-0" ref={wrapperRef}>
      <input
        aria-label="Data da reserva"
        className={fieldClass}
        id={id}
        inputMode="numeric"
        onBlur={commitTypedValue}
        onChange={event => {
          setDraftValue(event.target.value)
          setIsEditing(true)
        }}
        onFocus={() => {
  setIsOpen(true)
}}
        onKeyDown={event => {
          if (event.key === "ArrowDown") {
            event.preventDefault()
            setIsOpen(true)
          }

          if (event.key === "Escape") setIsOpen(false)
        }}
        placeholder="dd/mm/aaaa"
        required={required}
        value={displayValue}
      />

      <button
        aria-label="Abrir calendario"
        className="absolute right-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-600/15 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-300"
        onClick={() => setIsOpen(current => !current)}
        type="button"
      >
        <span
          aria-hidden="true"
          className="relative size-4 rounded-[3px] border-2 border-current before:absolute before:left-0 before:top-[3px] before:h-0.5 before:w-full before:bg-current"
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              aria-label="Mes anterior"
              className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg font-extrabold text-slate-600 hover:border-blue-600 hover:text-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-600/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-blue-400 dark:hover:text-blue-300"
              onClick={() => changeMonth(-1)}
              type="button"
            >
              {"<"}
            </button>

            <strong className="min-w-0 text-center text-sm capitalize text-[#172033] dark:text-slate-50">
              {monthFormatter.format(visibleMonth)}
            </strong>

            <button
              aria-label="Proximo mes"
              className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg font-extrabold text-slate-600 hover:border-blue-600 hover:text-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-600/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-blue-400 dark:hover:text-blue-300"
              onClick={() => changeMonth(1)}
              type="button"
            >
              {">"}
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {weekdays.map(weekday => (
              <span
                className="py-1 text-[0.68rem] font-extrabold uppercase text-slate-400 dark:text-slate-500"
                key={weekday}
              >
                {weekday}
              </span>
            ))}

            {days.map(day => {
              const isoDate = toIsoDate(day)
              const isSelected = value === isoDate
              const isOutsideMonth = day.getMonth() !== visibleMonth.getMonth()

              return (
                <button
                  aria-pressed={isSelected}
                  className={`inline-flex aspect-square min-w-0 items-center justify-center rounded-lg text-sm font-extrabold focus:outline-none focus:ring-4 focus:ring-blue-600/15 ${
                    isSelected
                      ? "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-400 dark:text-slate-950 dark:hover:bg-blue-200"
                      : isOutsideMonth
                        ? "text-slate-300 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                        : "text-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-blue-300"
                  }`}
                  key={isoDate}
                  onClick={() => selectDate(day)}
                  type="button"
                >
                  {day.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
