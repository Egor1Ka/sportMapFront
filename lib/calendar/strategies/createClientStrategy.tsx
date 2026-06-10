import type {
	CalendarStrategy,
	CalendarBlock,
	ConfirmedBooking,
	ViewMode,
} from '../types'
import {
	formatDateLocale,
	formatWeekRange,
	formatMonth,
	getWeekDates,
	getBookingsForDate,
	findEventType,
	getWorkHoursForDate,
	getCalendarLocale,
} from '../utils'
import {
	getAvailableSlots,
	timeToMin,
	minToTime,
	type SlotMode,
	type Slot,
} from '@/lib/slot-engine'
import type { EventType, ScheduleTemplate } from '@/services/configs/booking.types'
import type { CalendarDisplayBooking } from '@/lib/mock'
import { ServiceList } from '@/components/booking/ServiceList'
import { SlotModeSelector } from '@/components/booking/SlotModeSelector'
import { BookingPanel } from '@/components/booking/BookingPanel'
import { Separator } from '@/components/ui/separator'

interface ClientStrategyParams {
	eventTypes: EventType[]
	bookings: CalendarDisplayBooking[]
	schedule: ScheduleTemplate
	staffName: string
	selectedEventTypeId: string | null
	selectedSlot: string | null
	slotMode: SlotMode
	confirmedBooking: ConfirmedBooking | null
	date: string
	onSelectEventType: (eventTypeId: string) => void
	onSelectSlot: (time: string, date?: string) => void
	onConfirm: () => void
	onCancel: () => void
	onResetSlot: () => void
	onModeChange: (mode: SlotMode) => void
	locale: string
}

const createClientStrategy = (
	params: ClientStrategyParams,
): CalendarStrategy => {
	const {
		eventTypes,
		bookings,
		schedule,
		staffName,
		selectedEventTypeId,
		selectedSlot,
		slotMode,
		confirmedBooking,
		date,
		onSelectEventType,
		onSelectSlot,
		onConfirm,
		onCancel,
		onResetSlot,
		onModeChange,
		locale,
	} = params

	const calendarLocale = getCalendarLocale(locale)
	const selectedEventType = findEventType(eventTypes, selectedEventTypeId)

	const allBookings = (() => {
		if (!confirmedBooking || !selectedEventType) return bookings
		const startDate = new Date(confirmedBooking.startAt)
		const confirmedStartMin =
			startDate.getUTCHours() * 60 + startDate.getUTCMinutes()
		const confirmedDate = confirmedBooking.startAt.split('T')[0]
		return [
			...bookings,
			{
				startMin: confirmedStartMin,
				duration: confirmedBooking.durationMin,
				label: confirmedBooking.eventTypeName,
				color: confirmedBooking.color,
				date: confirmedDate,
				bookingId: confirmedBooking.bookingId,
				status: confirmedBooking.status,
			},
		]
	})()

	return {
		getBlocks(blockDate: string): CalendarBlock[] {
			const dayBookings = getBookingsForDate(allBookings, blockDate)

			const toBookingBlock = (
				booking: CalendarDisplayBooking,
				index: number,
			): CalendarBlock => ({
				id: `booking-${blockDate}-${index}`,
				startMin: booking.startMin,
				duration: booking.duration,
				date: blockDate,
				color: booking.color,
				label: booking.label,
				sublabel: `${minToTime(booking.startMin)}–${minToTime(booking.startMin + booking.duration)}`,
				blockType: 'booking',
			})

			const bookingBlocks = dayBookings.map(toBookingBlock)

			if (!selectedEventType || confirmedBooking) return bookingBlocks

			const workHours = getWorkHoursForDate(schedule.weeklyHours,blockDate)
			if (!workHours) return bookingBlocks

			const dayBookingsForSlots = getBookingsForDate(bookings, blockDate)
			const toSlotEngine = (b: CalendarDisplayBooking) => ({
				startMin: b.startMin,
				duration: b.duration,
			})

			const slots = getAvailableSlots({
				workStart: workHours.workStart,
				workEnd: workHours.workEnd,
				duration: selectedEventType.durationMin,
				slotStep: schedule.slotStepMin,
				slotMode,
				bookings: dayBookingsForSlots.map(toSlotEngine),
				minNotice: 30,
				nowMin: 0,
			})

			const toDropZoneBlock = (slot: Slot): CalendarBlock | null => {
				if (selectedSlot === slot.startTime && blockDate === date) return null

				return {
					id: `slot-${blockDate}-${slot.startMin}`,
					startMin: slot.startMin,
					duration: selectedEventType.durationMin,
					date: blockDate,
					color: slot.isExtra ? '#FB923C' : selectedEventType.color,
					borderStyle: 'dashed' as const,
					label: slot.startTime,
					blockType: 'dropzone',
					onClick: () => onSelectSlot(slot.startTime, blockDate),
				}
			}

			const isNotNull = <T,>(v: T | null): v is T => v !== null
			const dropZoneBlocks = slots.map(toDropZoneBlock).filter(isNotNull)

			const pendingBlock: CalendarBlock[] = (() => {
				if (!selectedSlot || blockDate !== date) return []
				const slotMin = timeToMin(selectedSlot)
				return [
					{
						id: `pending-${blockDate}`,
						startMin: slotMin,
						duration: selectedEventType.durationMin,
						date: blockDate,
						color: selectedEventType.color,
						opacity: 0.6,
						label: selectedEventType.name,
						sublabel: `${selectedSlot}–${minToTime(slotMin + selectedEventType.durationMin)}`,
						blockType: 'pending' as const,
					},
				]
			})()

			return [...bookingBlocks, ...dropZoneBlocks, ...pendingBlock]
		},

		renderSidebar() {
			return (
				<>
					<ServiceList
						eventTypes={eventTypes}
						selectedId={selectedEventTypeId}
						onSelect={onSelectEventType}
					/>
					<Separator className="my-4" />
					<SlotModeSelector value={slotMode} onChange={onModeChange} />
				</>
			)
		},

		renderPanel() {
			return (
				<BookingPanel
					selectedEventType={selectedEventType}
					selectedSlot={selectedSlot}
					slotMode={slotMode}
					confirmedBooking={confirmedBooking}
					onConfirm={onConfirm}
					onCancel={onCancel}
					onResetSlot={onResetSlot}
				/>
			)
		},

		onCellClick(clickDate: string, startMin: number) {
			if (!selectedEventType) return

			const workHours = getWorkHoursForDate(schedule.weeklyHours,clickDate)
			if (!workHours) return

			const dayBookingsForSlots = getBookingsForDate(bookings, clickDate)
			const toSlotEngine = (b: CalendarDisplayBooking) => ({
				startMin: b.startMin,
				duration: b.duration,
			})

			const slots = getAvailableSlots({
				workStart: workHours.workStart,
				workEnd: workHours.workEnd,
				duration: selectedEventType.durationMin,
				slotStep: schedule.slotStepMin,
				slotMode,
				bookings: dayBookingsForSlots.map(toSlotEngine),
				minNotice: 30,
				nowMin: 0,
			})

			const isAfterClick = (slot: { startMin: number }): boolean =>
				slot.startMin >= startMin
			const nearest = slots.find(isAfterClick)
			if (nearest) onSelectSlot(nearest.startTime, clickDate)
		},

		allowRangeSelect: false,

		getTitle(titleDate: string, view: ViewMode): string {
			if (view === 'week')
				return `${staffName} — ${formatWeekRange(getWeekDates(titleDate), calendarLocale)}`
			if (view === 'month') return `${staffName} — ${formatMonth(titleDate, calendarLocale)}`
			return `${staffName} — ${formatDateLocale(titleDate, calendarLocale)}`
		},
	}
}

export { createClientStrategy }
export type { ClientStrategyParams }
