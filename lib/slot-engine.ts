export type SlotMode = 'fixed' | 'optimal' | 'dynamic'

export interface SlotBooking {
	startMin: number
	duration: number
}

export interface Slot {
	startMin: number
	startTime: string
	isExtra: boolean
}

export interface SlotParams {
	workStart: string
	workEnd: string
	duration: number
	slotStep: number
	slotMode: SlotMode
	bookings: SlotBooking[]
	minNotice: number
	nowMin: number
}

interface CoreParams {
	workStartMin: number
	workEndMin: number
	duration: number
	slotStep: number
	bookings: SlotBooking[]
}

export const timeToMin = (time: string): number => {
	const parts = time.split(':')
	return Number(parts[0]) * 60 + Number(parts[1])
}

export const minToTime = (min: number): string => {
	const h = Math.floor(min / 60)
	const m = min % 60
	return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const bookingEnd = (b: SlotBooking): number => b.startMin + b.duration

const hasOverlap = (
	slotStart: number,
	duration: number,
	booking: SlotBooking,
): boolean =>
	slotStart < bookingEnd(booking) && slotStart + duration > booking.startMin

const isFree =
	(duration: number, bookings: SlotBooking[]) =>
	(startMin: number): boolean =>
		bookings.every((b) => !hasOverlap(startMin, duration, b))

const fitsInDay =
	(duration: number, workEndMin: number) =>
	(startMin: number): boolean =>
		startMin + duration <= workEndMin

const createPosition =
	(from: number, step: number) =>
	(_: unknown, i: number): number =>
		from + i * step

const buildGrid = (from: number, to: number, step: number): number[] => {
	const count = Math.max(0, Math.ceil((to - from) / step))
	return Array.from({ length: count }, createPosition(from, step))
}

const toSlot =
	(isExtra: boolean) =>
	(startMin: number): Slot => ({
		startMin,
		startTime: minToTime(startMin),
		isExtra,
	})

const getLastBookingEnd = (bookings: SlotBooking[]): number =>
	Math.max(...bookings.map(bookingEnd))

const getFixedSlots = (params: CoreParams): Slot[] => {
	const { workStartMin, workEndMin, duration, slotStep, bookings } = params
	return buildGrid(workStartMin, workEndMin, slotStep)
		.filter(fitsInDay(duration, workEndMin))
		.filter(isFree(duration, bookings))
		.map(toSlot(false))
}

const getOptimalSlots = (params: CoreParams): Slot[] => {
	const { workStartMin, workEndMin, duration, slotStep, bookings } = params
	const grid = buildGrid(workStartMin, workEndMin, slotStep)
	const freeGridSlots = grid
		.filter(fitsInDay(duration, workEndMin))
		.filter(isFree(duration, bookings))

	if (bookings.length === 0) return freeGridSlots.map(toSlot(false))

	const lastEnd = getLastBookingEnd(bookings)
	const isOnGrid = grid.includes(lastEnd)
	const canFitExtra =
		!isOnGrid &&
		lastEnd + duration <= workEndMin &&
		isFree(duration, bookings)(lastEnd)

	const regularSlots = freeGridSlots.map(toSlot(false))
	const extraSlots = canFitExtra ? [toSlot(true)(lastEnd)] : []
	const allSlots = [...regularSlots, ...extraSlots]

	const byStartMin = (a: Slot, b: Slot): number => a.startMin - b.startMin
	return [...allSlots].sort(byStartMin)
}

const getDynamicSlots = (params: CoreParams): Slot[] => {
	const { workStartMin, workEndMin, duration, slotStep, bookings } = params

	if (bookings.length === 0) return getFixedSlots(params)

	const lastEnd = getLastBookingEnd(bookings)
	const isBeforeLastEnd = (startMin: number): boolean => startMin < lastEnd

	const beforeSlots = buildGrid(workStartMin, workEndMin, slotStep)
		.filter(isBeforeLastEnd)
		.filter(fitsInDay(duration, workEndMin))
		.filter(isFree(duration, bookings))

	const afterSlots = buildGrid(lastEnd, workEndMin, slotStep)
		.filter(fitsInDay(duration, workEndMin))
		.filter(isFree(duration, bookings))

	const allPositions = [...beforeSlots, ...afterSlots]
	const unique = [...new Set(allPositions)]
	const byValue = (a: number, b: number): number => a - b
	return [...unique].sort(byValue).map(toSlot(false))
}

const MODE_HANDLERS: Record<SlotMode, (params: CoreParams) => Slot[]> = {
	fixed: getFixedSlots,
	optimal: getOptimalSlots,
	dynamic: getDynamicSlots,
}

export const getAvailableSlots = (params: SlotParams): Slot[] => {
	const workStartMin = timeToMin(params.workStart)
	const workEndMin = timeToMin(params.workEnd)

	const coreParams: CoreParams = {
		workStartMin,
		workEndMin,
		duration: params.duration,
		slotStep: params.slotStep,
		bookings: params.bookings,
	}

	const handler = MODE_HANDLERS[params.slotMode]
	const slots = handler(coreParams)

	const minTime = params.nowMin + params.minNotice
	const isAfterNotice = (slot: Slot): boolean => slot.startMin >= minTime

	return slots.filter(isAfterNotice)
}
