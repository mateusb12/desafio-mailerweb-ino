import { useEffect, useMemo, useRef, useState } from "react"

type TimeInputProps = {
  ariaLabel: string
  id?: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  disabled?: boolean
}

const fieldClass =
  "h-[44px] w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 pr-11 text-slate-900 outline-none focus:border-blue-600 focus:shadow-[0_0_0_4px_rgba(37,99,235,0.14)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"

function pad(value: number) {
  return String(value).padStart(2, "0")
}

function createTimeOptions() {
  return Array.from({ length: 24 * 4 }, (_, index) => {
    const totalMinutes = index * 15
    const hour = Math.floor(totalMinutes / 60)
    const minute = totalMinutes % 60

    return `${pad(hour)}:${pad(minute)}`
  })
}

const TIME_OPTIONS = createTimeOptions()

function normalizeTime(value: string) {
  const trimmed = value.trim()
  const match = trimmed.match(/^(\d{1,2}):?(\d{0,2})$/)
  if (!match) return ""

  const hour = Number(match[1])
  const minute = Number(match[2] || "0")
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return ""

  const roundedMinute = Math.min(45, Math.round(minute / 15) * 15)

  return `${pad(hour)}:${pad(roundedMinute)}`
}

export default function TimeInput({
  ariaLabel,
  id,
  value,
  onChange,
  required = false,
  disabled = false,
}: TimeInputProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const [draftValue, setDraftValue] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const options = TIME_OPTIONS
  const displayValue = isEditing ? draftValue : value
  const filteredOptions = useMemo(() => {
    const typed = isEditing ? draftValue.trim() : ""
    if (!typed) return options

    return options.filter(option => option.startsWith(typed))
  }, [draftValue, isEditing, options])

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

  useEffect(() => {
    if (!isOpen || !value) return

    const selected = listRef.current?.querySelector<HTMLButtonElement>(
      `[data-time="${value}"]`,
    )
    selected?.scrollIntoView({ block: "nearest" })
  }, [isOpen, value])

  function commitTypedValue() {
    const normalized = normalizeTime(displayValue)
    setIsEditing(false)

    if (normalized) {
      onChange(normalized)
      setDraftValue(normalized)
      return
    }

    if (!displayValue.trim()) {
      onChange("")
      return
    }

    setDraftValue(value)
  }

  function selectTime(time: string) {
    onChange(time)
    setDraftValue(time)
    setIsEditing(false)
    setIsOpen(false)
  }

  function moveSelection(delta: number) {
    const currentIndex = options.indexOf(value)
    const nextIndex =
      currentIndex >= 0
        ? Math.min(options.length - 1, Math.max(0, currentIndex + delta))
        : delta > 0
          ? 0
          : options.length - 1

    selectTime(options[nextIndex])
    setIsOpen(true)
  }

  return (
    <div className="relative min-w-0" ref={wrapperRef}>
      <input
        aria-label={ariaLabel}
        className={fieldClass}
        id={id}
        inputMode="numeric"
        disabled={disabled}
        onBlur={commitTypedValue}
        onChange={event => {
          setDraftValue(event.target.value)
          setIsEditing(true)
          setIsOpen(true)
        }}
        onFocus={() => {
          if (!disabled) setIsOpen(true)
        }}
        onKeyDown={event => {
          if (disabled) return

          if (event.key === "ArrowDown") {
            event.preventDefault()
            moveSelection(1)
          }

          if (event.key === "ArrowUp") {
            event.preventDefault()
            moveSelection(-1)
          }

          if (event.key === "Escape") setIsOpen(false)
        }}
        placeholder="hh:mm"
        required={required}
        value={displayValue}
      />

      <button
        aria-label={`Abrir opcoes de ${ariaLabel.toLowerCase()}`}
        className="absolute right-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-600/15 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-slate-500 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-300 dark:disabled:hover:bg-transparent dark:disabled:hover:text-slate-300"
        disabled={disabled}
        onClick={() => setIsOpen(current => !current)}
        type="button"
      >
        <span
          aria-hidden="true"
          className="mt-1 size-0 border-x-[5px] border-t-[6px] border-x-transparent border-t-current"
        />
      </button>

      {isOpen && !disabled && (
        <div
          className="absolute left-0 z-30 mt-2 max-h-60 w-full min-w-[9rem] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-900"
          ref={listRef}
          role="listbox"
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map(option => {
              const isSelected = option === value

              return (
                <button
                  aria-selected={isSelected}
                  className={`flex h-9 w-full items-center rounded-lg px-3 text-left text-sm font-extrabold focus:outline-none focus:ring-4 focus:ring-blue-600/15 ${
                    isSelected
                      ? "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-400 dark:text-slate-950 dark:hover:bg-blue-200"
                      : "text-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-blue-300"
                  }`}
                  data-time={option}
                  key={option}
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => selectTime(option)}
                  role="option"
                  type="button"
                >
                  {option}
                </button>
              )
            })
          ) : (
            <div className="px-3 py-2 text-sm font-bold text-slate-500 dark:text-slate-400">
              Sem horarios
            </div>
          )}
        </div>
      )}
    </div>
  )
}