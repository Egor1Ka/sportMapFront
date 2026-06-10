'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { type SlotMode } from '@/lib/slot-engine'
import {
	type ViewMode,
	type ConfirmedBooking,
	CalendarProvider,
	CalendarCore,
	createClientStrategy,
	createStaffStrategy,
} from '@/lib/calendar'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { useViewConfig } from '@/lib/calendar/CalendarViewConfigContext'
import { formatDateISO, getWeekDates } from '@/lib/calendar/utils'
import { staffApi, eventTypeApi, bookingApi, scheduleApi } from '@/lib/mock-api'
import { toCalendarDisplayBooking } from '@/lib/mock'
import { getWorkHoursForDate } from '@/lib/calendar/utils'
import type { StaffBySlugResponse, EventType, ScheduleTemplate } from '@/services/configs/booking.types'
import type { CalendarDisplayBooking } from '@/lib/mock'
import type { ClientInfoData } from '@/components/booking/ClientInfoForm'

const todayStr = (): string => formatDateISO(new Date())
const browserTimezone = (): string =>
	Intl.DateTimeFormat().resolvedOptions().timeZone

interface BookingPageProps {
	staffSlug: string
}

interface StaffData {
	staff: StaffBySlugResponse
	eventTypes: EventType[]
	schedule: ScheduleTemplate
	bookings: CalendarDisplayBooking[]
}

function BookingPage({ staffSlug }: BookingPageProps) {
	const searchParams = useSearchParams()
	const router = useRouter()

	const viewConfig = useViewConfig()
	const canBookForClient = viewConfig.canBookForClient

	const t = useTranslations('booking')
	const locale = useLocale()
	const tCalendar = useTranslations('calendar')

	const selectedEventTypeId = searchParams.get('eventType')
	const dateStr = searchParams.get('date') ?? todayStr()
	const selectedSlotTime = searchParams.get('slot')
	const slotMode = (searchParams.get('mode') as SlotMode) ?? 'fixed'
	const view = (searchParams.get('view') as ViewMode) ?? 'day'

	const [confirmedBooking, setConfirmedBooking] =
		useState<ConfirmedBooking | null>(null)
	const [staffData, setStaffData] = useState<StaffData | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const loadedRangeRef = useRef<{ from: string; to: string; view: string } | null>(null)

	useEffect(() => {
		const computeDateRange = (): { from: string; to: string } => {
			if (view === 'week') {
				const weekDates = getWeekDates(dateStr)
				return { from: weekDates[0], to: weekDates[6] }
			}
			if (view === 'month') {
				const d = new Date(dateStr + 'T00:00:00')
				const year = d.getFullYear()
				const month = d.getMonth()
				const firstDay = formatDateISO(new Date(year, month, 1))
				const lastDay = formatDateISO(new Date(year, month + 1, 0))
				return { from: firstDay, to: lastDay }
			}
			return { from: dateStr, to: dateStr }
		}

		const range = computeDateRange()
		const loaded = loadedRangeRef.current
		const isWithinLoadedRange =
			loaded !== null &&
			loaded.view === view &&
			dateStr >= loaded.from &&
			dateStr <= loaded.to

		if (isWithinLoadedRange) return

		const loadStaffData = async () => {
			try {
				setLoading(true)
				setError(null)

				const { from, to } = range
				const staff = await staffApi.getBySlug(staffSlug)
				const [eventTypes, schedule, staffBookings] = await Promise.all([
					eventTypeApi.getByStaff(staff.id),
					scheduleApi.getTemplate(staff.id),
					bookingApi.getByStaff(staff.id, from, to),
				])

				const bookings = staffBookings.map(toCalendarDisplayBooking)

				setStaffData({ staff, eventTypes, schedule, bookings })
				loadedRangeRef.current = { ...range, view }
			} catch (err) {
				const message =
					err instanceof Error ? err.message : t('loadError')
				setError(message)
			} finally {
				setLoading(false)
			}
		}

		loadStaffData()
	}, [staffSlug, dateStr, view])

	const setParams = (updates: Record<string, string | null>) => {
		const params = new URLSearchParams(searchParams.toString())
		const applyEntry = ([key, value]: [string, string | null]) => {
			if (value === null) params.delete(key)
			else params.set(key, value)
		}
		Object.entries(updates).forEach(applyEntry)
		router.replace(`?${params.toString()}`, { scroll: false })
	}

	const handleEventTypeSelect = (eventTypeId: string) => {
		setParams({ eventType: eventTypeId, slot: null })
		setConfirmedBooking(null)
	}

	const handleSlotSelect = (time: string, slotDate?: string) => {
		const updates: Record<string, string | null> = { slot: time }
		if (slotDate && slotDate !== dateStr) updates.date = slotDate
		setParams(updates)
	}

	const handleModeChange = (mode: SlotMode) => {
		setParams({ mode, slot: null })
		setConfirmedBooking(null)
	}

	const handleViewChange = (newView: ViewMode) => {
		setParams({ view: newView, slot: null })
	}

	const handleDateChange = (newDate: string) => {
		setParams({ date: newDate, slot: null })
		setConfirmedBooking(null)
	}

	const handleDayClick = (newDate: string) => {
		setParams({ date: newDate, view: 'day', slot: null })
		setConfirmedBooking(null)
	}

	const createBookingWithInvitee = async (invitee: {
		name: string
		email: string | null
		phone: string | null
		phoneCountry: string | null
	}) => {
		if (!staffData || !selectedEventTypeId || !selectedSlotTime) return

		const eventType = staffData.eventTypes.find(
			(e) => e.id === selectedEventTypeId,
		)
		if (!eventType) return

		const startAt = `${dateStr}T${selectedSlotTime}:00.000Z`

		try {
			setIsSubmitting(true)
			const response = await bookingApi.create({
				eventTypeId: selectedEventTypeId,
				staffId: staffData.staff.id,
				startAt,
				timezone: browserTimezone(),
				invitee,
			})

			setConfirmedBooking({
				bookingId: response.id,
				eventTypeId: response.eventTypeId,
				eventTypeName: response.eventTypeName,
				startAt: response.startAt,
				endAt: response.endAt,
				timezone: response.timezone,
				locationId: response.locationId,
				cancelToken: response.cancelToken,
				status: response.status,
				color: eventType.color,
				durationMin: eventType.durationMin,
				price: eventType.price,
				currency: eventType.currency,
				invitee: response.invitee,
			})
		} catch (err) {
			const message =
				err instanceof Error ? err.message : t('bookingFailed')
			setError(message)
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleConfirm = async () => {
		await createBookingWithInvitee({
			name: t('defaultClient'),
			email: null,
			phone: null,
			phoneCountry: null,
		})
	}

	const handleConfirmWithClient = async (data: ClientInfoData) => {
		await createBookingWithInvitee({
			name: data.name,
			email: data.email || null,
			phone: data.phone || null,
			phoneCountry: null,
		})
	}

	const handleCancel = async () => {
		if (!confirmedBooking) return

		try {
			await bookingApi.cancelById({
				bookingId: confirmedBooking.bookingId,
				reason: t('cancelledByStaff'),
			})
			setConfirmedBooking(null)
			setParams({ slot: null })
		} catch (err) {
			const message =
				err instanceof Error ? err.message : t('cancelFailed')
			setError(message)
		}
	}

	const handleSaveSchedule = async (weeklyHours: ScheduleTemplate['weeklyHours']) => {
		if (!staffData) return
		await scheduleApi.updateTemplate(staffData.staff.id, staffData.schedule.orgId, weeklyHours)
		const schedule = await scheduleApi.getTemplate(staffData.staff.id)
		setStaffData({ ...staffData, schedule })
	}

	const handleSaveOverride = async (body: Parameters<typeof scheduleApi.createOverride>[0]) => {
		await scheduleApi.createOverride(body)
		if (!staffData) return
		const schedule = await scheduleApi.getTemplate(staffData.staff.id)
		setStaffData({ ...staffData, schedule })
	}

	const handleResetSlot = () => {
		setParams({ slot: null })
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<p className="text-muted-foreground text-sm">{t('loading')}</p>
			</div>
		)
	}

	if (error || !staffData) {
		return (
			<div className="flex items-center justify-center py-20">
				<p className="text-destructive text-sm">
					{error ?? t('loadError')}
				</p>
			</div>
		)
	}

	const workHours = getWorkHoursForDate(staffData.schedule.weeklyHours, dateStr)
	const workStart = workHours?.workStart ?? '10:00'
	const workEnd = workHours?.workEnd ?? '18:00'

	const isDisabledDay = (wh: { dayOfWeek: number; enabled: boolean }): boolean =>
		!wh.enabled
	const toDayOfWeek = (wh: { dayOfWeek: number }): number => wh.dayOfWeek
	const disabledDays = staffData.schedule.weeklyHours
		.filter(isDisabledDay)
		.map(toDayOfWeek)

	const strategy = canBookForClient
		? createStaffStrategy({
				staffName: tCalendar('mySchedule'),
				locale,
				eventTypes: staffData.eventTypes,
				bookings: staffData.bookings,
				schedule: staffData.schedule,
				selectedEventTypeId,
				selectedSlot: selectedSlotTime,
				slotMode,
				confirmedBooking,
				date: dateStr,
				onSelectEventType: handleEventTypeSelect,
				onSelectSlot: handleSlotSelect,
				onConfirmWithClient: handleConfirmWithClient,
				onCancel: handleCancel,
				onResetSlot: handleResetSlot,
				onModeChange: handleModeChange,
				isSubmitting,
				onSaveSchedule: handleSaveSchedule,
				onSaveOverride: handleSaveOverride,
			})
		: createClientStrategy({
				eventTypes: staffData.eventTypes,
				bookings: staffData.bookings,
				schedule: staffData.schedule,
				staffName: staffData.staff.name,
				locale,
				selectedEventTypeId,
				selectedSlot: selectedSlotTime,
				slotMode,
				confirmedBooking,
				date: dateStr,
				onSelectEventType: handleEventTypeSelect,
				onSelectSlot: handleSlotSelect,
				onConfirm: handleConfirm,
				onCancel: handleCancel,
				onResetSlot: handleResetSlot,
				onModeChange: handleModeChange,
			})

	return (
		<CalendarProvider strategy={strategy}>
			<CalendarCore
				date={dateStr}
				view={view}
				onViewChange={handleViewChange}
				onDateChange={handleDateChange}
				onDayClick={handleDayClick}
				workStart={workStart}
				workEnd={workEnd}
				disabledDays={disabledDays}
			/>
		</CalendarProvider>
	)
}

export { BookingPage }
