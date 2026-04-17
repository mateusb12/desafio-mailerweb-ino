import type { Booking, BookingFormInput } from "../types/domain"

export type CalendarBookingItem = {
  booking: Booking
  column: number
  columnCount: number
  endMinutes: number
  height: number
  startMinutes: number
  top: number
}

export type CalendarSelection = {
  column: number
  columnCount: number
  conflicts: boolean
  endMinutes: number
  height: number
  startMinutes: number
  top: number
}

type TimedCalendarItem = {
  id: string
  startMinutes: number
  endMinutes: number
  type: "booking" | "selection"
}

export const hourHeight = 72
export const defaultDayStart = 7 * 60
export const defaultDayEnd = 20 * 60

export function getLocalDateKey(value: string) {
  return value.slice(0, 10)
}

export function minutesFromTime(value: string) {
  const [hourPart, minutePart = "0"] = value.split(":")
  const hour = Number(hourPart)
  const minute = Number(minutePart)

  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null
  }

  return hour * 60 + minute
}

export function minutesFromDateTime(value: string) {
  const time = value.split("T")[1]?.slice(0, 5)
  if (!time) return null

  return minutesFromTime(time)
}

export function formatCalendarTime(totalMinutes: number) {
  const hour = Math.floor(totalMinutes / 60)
  const minute = totalMinutes % 60

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

export function rangesOverlap(
  startMinutes: number,
  endMinutes: number,
  otherStartMinutes: number,
  otherEndMinutes: number,
) {
  return startMinutes < otherEndMinutes && endMinutes > otherStartMinutes
}

export function getBookingMinutes(booking: Booking) {
  const startMinutes = minutesFromDateTime(booking.start_at)
  const endMinutes = minutesFromDateTime(booking.end_at)

  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return null
  }

  return { startMinutes, endMinutes }
}

export function createSelectionRange(form: BookingFormInput, selectedDate: string) {
  if (form.date !== selectedDate || !form.roomId) return null

  const startMinutes = minutesFromTime(form.startTime)
  const endMinutes = minutesFromTime(form.endTime)

  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return null
  }

  return { startMinutes, endMinutes }
}

function assignLayoutColumns(items: TimedCalendarItem[]) {
  const sorted = [...items].sort((first, second) => {
    if (first.startMinutes !== second.startMinutes) {
      return first.startMinutes - second.startMinutes
    }

    return second.endMinutes - first.endMinutes
  })
  const positioned = new Map<string, { column: number; columnCount: number }>()
  let activeGroup: TimedCalendarItem[] = []
  let activeGroupEnd = 0

  function flushGroup() {
    if (activeGroup.length === 0) return

    const columnEnds: number[] = []
    const assigned = activeGroup.map(item => {
      const availableColumn = columnEnds.findIndex(end => end <= item.startMinutes)
      const column =
        availableColumn >= 0 ? availableColumn : columnEnds.length

      columnEnds[column] = item.endMinutes

      return { item, column }
    })
    const columnCount = Math.max(1, columnEnds.length)

    assigned.forEach(({ item, column }) => {
      positioned.set(item.id, { column, columnCount })
    })

    activeGroup = []
    activeGroupEnd = 0
  }

  sorted.forEach(item => {
    if (activeGroup.length > 0 && item.startMinutes >= activeGroupEnd) {
      flushGroup()
    }

    activeGroup.push(item)
    activeGroupEnd = Math.max(activeGroupEnd, item.endMinutes)
  })

  flushGroup()

  return positioned
}

export function getCalendarWindow(items: Array<{ startMinutes: number; endMinutes: number }>) {
  if (items.length === 0) {
    return { startMinutes: defaultDayStart, endMinutes: defaultDayEnd }
  }

  const earliest = Math.min(...items.map(item => item.startMinutes))
  const latest = Math.max(...items.map(item => item.endMinutes))
  const startMinutes = Math.max(0, Math.min(defaultDayStart, Math.floor(earliest / 60) * 60))
  const endMinutes = Math.min(
    24 * 60,
    Math.max(defaultDayEnd, Math.ceil(latest / 60) * 60),
  )

  return { startMinutes, endMinutes }
}

export function buildCalendarLayout(params: {
  bookings: Booking[]
  editingId: string | null
  form: BookingFormInput
  selectedDate: string
  selectedRoomId: string
}) {
  const bookingRanges = params.bookings
    .map(booking => {
      const minutes = getBookingMinutes(booking)
      if (!minutes) return null

      return { booking, ...minutes }
    })
    .filter(item => item !== null)
    .filter(item => getLocalDateKey(item.booking.start_at) === params.selectedDate)
    .filter(item => {
      return !params.selectedRoomId || item.booking.roomId === params.selectedRoomId
    })

  const shouldShowSelection =
    !params.selectedRoomId || params.selectedRoomId === params.form.roomId
  const selectionRange = shouldShowSelection
    ? createSelectionRange(params.form, params.selectedDate)
    : null
  const selectionConflicts = selectionRange
    ? params.bookings.some(booking => {
        if (booking.id === params.editingId) return false
        if (booking.status === "cancelled") return false
        if (booking.roomId !== params.form.roomId) return false
        if (getLocalDateKey(booking.start_at) !== params.selectedDate) return false

        const minutes = getBookingMinutes(booking)
        if (!minutes) return false

        return rangesOverlap(
          selectionRange.startMinutes,
          selectionRange.endMinutes,
          minutes.startMinutes,
          minutes.endMinutes,
        )
      })
    : false

  const timedItems: TimedCalendarItem[] = bookingRanges.map(item => ({
    id: item.booking.id,
    startMinutes: item.startMinutes,
    endMinutes: item.endMinutes,
    type: "booking",
  }))

  if (selectionRange) {
    timedItems.push({
      id: "selection",
      startMinutes: selectionRange.startMinutes,
      endMinutes: selectionRange.endMinutes,
      type: "selection",
    })
  }

  const window = getCalendarWindow(timedItems)
  const minuteHeight = hourHeight / 60
  const positioned = assignLayoutColumns(timedItems)
  const toTop = (minutes: number) =>
    Math.max(0, (minutes - window.startMinutes) * minuteHeight)
  const toHeight = (startMinutes: number, endMinutes: number) =>
    Math.max(34, (endMinutes - startMinutes) * minuteHeight)

  const items: CalendarBookingItem[] = bookingRanges.map(item => {
    const position = positioned.get(item.booking.id) ?? {
      column: 0,
      columnCount: 1,
    }

    return {
      booking: item.booking,
      column: position.column,
      columnCount: position.columnCount,
      endMinutes: item.endMinutes,
      height: toHeight(item.startMinutes, item.endMinutes),
      startMinutes: item.startMinutes,
      top: toTop(item.startMinutes),
    }
  })

  const selectionPosition = positioned.get("selection") ?? {
    column: 0,
    columnCount: 1,
  }
  const selection: CalendarSelection | null = selectionRange
    ? {
        column: selectionPosition.column,
        columnCount: selectionPosition.columnCount,
        conflicts: selectionConflicts,
        endMinutes: selectionRange.endMinutes,
        height: toHeight(selectionRange.startMinutes, selectionRange.endMinutes),
        startMinutes: selectionRange.startMinutes,
        top: toTop(selectionRange.startMinutes),
      }
    : null

  return {
    dayEndMinutes: window.endMinutes,
    dayHeight: (window.endMinutes - window.startMinutes) * minuteHeight,
    dayStartMinutes: window.startMinutes,
    items,
    selection,
  }
}
