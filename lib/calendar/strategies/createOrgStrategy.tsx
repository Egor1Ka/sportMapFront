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
import { StaffBookingPanel } from '@/components/booking/StaffBookingPanel'
import { Separator } from '@/components/ui/separator'
import type { ClientInfoData } from '@/components/booking/ClientInfoForm'

interface OrgStrategyParams {
	orgName: string
	bookings: CalendarDisplayBooking[]
	canBookForClient: boolean
	eventTypes?: EventType[]
	schedule?: ScheduleTemplate
	selectedEventTypeId?: string | null
	selectedSlot?: string | null
	slotMode?: SlotMode
	confirmedBooking?: ConfirmedBooking | null
	date?: string
	onSelectEventType?: (eventTypeId: string) => void
	onSelectSlot?: (time: string, date?: string) => void
	onConfirmWithClient?: (data: ClientInfoData) => void
	onCancel?: () => void
	onResetSlot?: () => void
	onModeChange?: (mode: SlotMode) => void
	isSubmitting?: boolean
	locale: string
	selectStaffLabel?: string
	bookingDetailsLabel?: string
}

const createOrgStrategy = (params: OrgStrategyParams): CalendarStrategy => {
	const {
		orgName,
		bookings,
		canBookForClient,
		eventTypes = [],
		schedule,
		selectedEventTypeId = null,
		selectedSlot = null,
		slotMode = 'fixed',
		confirmedBooking = null,
		date = '',
		onSelectEventType,
		onSelectSlot,
		onConfirmWithClient,
		onCancel,
		onResetSlot,
		onModeChange,
		isSubmitting = false,
		locale,
		selectStaffLabel = 'Select a staff member to view the schedule',
		bookingDetailsLabel = 'Booking details',
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

	const buildBookingBlocks = (blockDate: string): CalendarBlock[] => {
		const dayBookings = getBookingsForDate(allBookings, blockDate)

		const toBookingBlock = (
			booking: CalendarDisplayBooking,
			index: number,
		): CalendarBlock => ({
			id: `org-booking-${blockDate}-${index}`,
			startMin: booking.startMin,
			duration: booking.duration,
			date: blockDate,
			color: booking.color,
			label: booking.label,
			sublabel: `${minToTime(booking.startMin)}–${minToTime(booking.startMin + booking.duration)}`,
			blockType: 'booking',
		})

		return dayBookings.map(toBookingBlock)
	}

	const buildSlotBlocks = (blockDate: string): CalendarBlock[] => {
		if (!canBookForClient || !selectedEventType || !schedule || confirmedBooking)
			return []

		const workHours = getWorkHoursForDate(schedule.weeklyHours,blockDate)
		if (!workHours) return []

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
			minNotice: 0,
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
				onClick: () => onSelectSlot?.(slot.startTime, blockDate),
			}
		}

		const isNotNull = <T,>(v: T | null): v is T => v !== null
		return slots.map(toDropZoneBlock).filter(isNotNull)
	}

	const buildPendingBlock = (blockDate: string): CalendarBlock[] => {
		if (!canBookForClient || !selectedEventType || !selectedSlot || blockDate !== date)
			return []
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
	}

	return {
		getBlocks(blockDate: string): CalendarBlock[] {
			const bookingBlocks = buildBookingBlocks(blockDate)
			const dropZoneBlocks = buildSlotBlocks(blockDate)
			const pendingBlocks = buildPendingBlock(blockDate)
			return [...bookingBlocks, ...dropZoneBlocks, ...pendingBlocks]
		},

		renderSidebar() {
			if (!canBookForClient || eventTypes.length === 0) {
				return (
					<div className="text-muted-foreground p-4 text-sm">
						{selectStaffLabel}
					</div>
				)
			}

			return (
				<>
					<ServiceList
						eventTypes={eventTypes}
						selectedId={selectedEventTypeId}
						onSelect={onSelectEventType ?? (() => {})}
					/>
					<Separator className="my-4" />
					<SlotModeSelector
						value={slotMode}
						onChange={onModeChange ?? (() => {})}
					/>
				</>
			)
		},

		renderPanel() {
			if (!canBookForClient) {
				return (
					<div className="text-muted-foreground p-4 text-sm">
						{bookingDetailsLabel}
					</div>
				)
			}

			return (
				<StaffBookingPanel
					selectedEventType={selectedEventType}
					selectedSlot={selectedSlot}
					slotMode={slotMode}
					confirmedBooking={confirmedBooking}
					onConfirmWithClient={onConfirmWithClient ?? (() => {})}
					onCancel={onCancel ?? (() => {})}
					onResetSlot={onResetSlot ?? (() => {})}
					isSubmitting={isSubmitting}
				/>
			)
		},

		onCellClick(clickDate: string, startMin: number) {
			if (!canBookForClient || !selectedEventType || !schedule) return

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
				minNotice: 0,
				nowMin: 0,
			})

			const isAfterClick = (slot: { startMin: number }): boolean =>
				slot.startMin >= startMin
			const nearest = slots.find(isAfterClick)
			if (nearest) onSelectSlot?.(nearest.startTime, clickDate)
		},

		allowRangeSelect: false,

		getTitle(titleDate: string, view: ViewMode): string {
			if (view === 'week')
				return `${orgName} — ${formatWeekRange(getWeekDates(titleDate), calendarLocale)}`
			if (view === 'month') return `${orgName} — ${formatMonth(titleDate, calendarLocale)}`
			return `${orgName} — ${formatDateLocale(titleDate, calendarLocale)}`
		},
	}
}

export { createOrgStrategy }
export type { OrgStrategyParams }
