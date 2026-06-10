'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { type SlotMode } from '@/lib/slot-engine'
import {
	type ViewMode,
	type ConfirmedBooking,
	CalendarProvider,
	CalendarCore,
	createOrgStrategy,
} from '@/lib/calendar'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { useViewConfig } from '@/lib/calendar/CalendarViewConfigContext'
import { formatDateISO, getWeekDates } from '@/lib/calendar/utils'
import { orgApi, bookingApi, eventTypeApi, scheduleApi } from '@/lib/booking-api-client'
import { toCalendarDisplayBooking } from '@/lib/booking-utils'
import { getWorkHoursForDate } from '@/lib/calendar/utils'
import { StaffTabs } from '@/components/booking/StaffTabs'
import type {
	OrgBySlugResponse,
	OrgStaffMember,
	EventType,
	ScheduleTemplate,
	CalendarDisplayBooking,
	StaffBooking,
} from '@/services/configs/booking.types'
import type { ClientInfoData } from '@/components/booking/ClientInfoForm'
import type { BookingDetail } from '@/components/booking/BookingDetailPanel'
import type { BookingStatus } from '@/services/configs/booking.types'

const todayStr = (): string => formatDateISO(new Date())
const browserTimezone = (): string =>
	Intl.DateTimeFormat().resolvedOptions().timeZone

interface OrgCalendarPageProps {
	orgSlug: string
}

interface OrgData {
	org: OrgBySlugResponse
	staffList: OrgStaffMember[]
	bookings: CalendarDisplayBooking[]
	staffBookings: StaffBooking[]
	eventTypes: EventType[]
	eventTypesByStaff: Map<string, EventType[]>
	schedule: ScheduleTemplate | null
}

function OrgCalendarPage({ orgSlug }: OrgCalendarPageProps) {
	const searchParams = useSearchParams()
	const router = useRouter()
	const viewConfig = useViewConfig()
	const t = useTranslations('booking')
	const locale = useLocale()

	const dateStr = searchParams.get('date') ?? todayStr()
	const view = (searchParams.get('view') as ViewMode) ?? 'day'
	const selectedStaffId = searchParams.get('staff') ?? null
	const selectedEventTypeId = searchParams.get('eventType') ?? null
	const selectedSlotTime = searchParams.get('slot') ?? null
	const slotMode = (searchParams.get('mode') as SlotMode) ?? 'fixed'

	const [orgData, setOrgData] = useState<OrgData | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [confirmedBooking, setConfirmedBooking] =
		useState<ConfirmedBooking | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [selectedBooking, setSelectedBooking] = useState<BookingDetail | null>(null)
	const loadedRangeRef = useRef<{ from: string; to: string; view: string; staffId: string | null } | null>(null)

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
			loaded.staffId === selectedStaffId &&
			dateStr >= loaded.from &&
			dateStr <= loaded.to

		if (isWithinLoadedRange) return

		const loadOrgData = async () => {
			try {
				setLoading(true)
				setError(null)

				const { from, to } = range
				const org = await orgApi.getBySlug(orgSlug)
				const staffList = await orgApi.getStaff(org.id)

				const staffToLoad =
					selectedStaffId && viewConfig.staffTabBehavior === 'select-one'
						? staffList.filter((s) => s.id === selectedStaffId)
						: staffList

				const fetchStaffEventTypes = async (
					staffId: string,
				): Promise<[string, EventType[]]> => {
					const list = await eventTypeApi.getByStaff(staffId)
					return [staffId, list]
				}

				const perStaffEntries = await Promise.all(
					staffList.map((s) => fetchStaffEventTypes(s.id)),
				)
				const eventTypesByStaff = new Map<string, EventType[]>(perStaffEntries)

				const dedupeById = (
					acc: Map<string, EventType>,
					et: EventType,
				): Map<string, EventType> => {
					acc.set(et.id, et)
					return acc
				}
				const takeList = (entry: [string, EventType[]]): EventType[] => entry[1]
				const unionMap = perStaffEntries
					.flatMap(takeList)
					.reduce(dedupeById, new Map<string, EventType>())
				const eventTypes = Array.from(unionMap.values())

				const schedule = selectedStaffId
					? await scheduleApi.getTemplate(selectedStaffId).catch(() => null)
					: null

				const bookingArrays = await Promise.all(
					staffToLoad.map((s) =>
						bookingApi.getByStaff(s.id, from, to, eventTypes, undefined, undefined, org.id),
					),
				)

				const allStaffBookings = bookingArrays.flat()
				const allBookings = allStaffBookings.map(toCalendarDisplayBooking)

				setOrgData({ org, staffList, bookings: allBookings, staffBookings: allStaffBookings, eventTypes, eventTypesByStaff, schedule })
				loadedRangeRef.current = { ...range, view, staffId: selectedStaffId }
			} catch (err) {
				const message =
					err instanceof Error ? err.message : t('loadError')
				setError(message)
			} finally {
				setLoading(false)
			}
		}

		loadOrgData()
	}, [orgSlug, dateStr, view, selectedStaffId, viewConfig.staffTabBehavior, viewConfig.canBookForClient])

	const setParams = (updates: Record<string, string | null>) => {
		const params = new URLSearchParams(searchParams.toString())
		const applyEntry = ([key, value]: [string, string | null]) => {
			if (value === null) params.delete(key)
			else params.set(key, value)
		}
		Object.entries(updates).forEach(applyEntry)
		router.replace(`?${params.toString()}`, { scroll: false })
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

	const handleStaffSelect = (staffId: string | null) => {
		setParams({ staff: staffId, eventType: null, slot: null })
		setConfirmedBooking(null)
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

	const handleConfirmWithClient = async (data: ClientInfoData) => {
		if (!orgData || !selectedEventTypeId || !selectedSlotTime) return

		if (!selectedStaffId) {
			setError(t('pickStaffFirst'))
			return
		}
		const activeStaffId = selectedStaffId

		const eventType = orgData.eventTypes.find(
			(e) => e.id === selectedEventTypeId,
		)
		if (!eventType) return

		const startAt = `${dateStr}T${selectedSlotTime}:00.000Z`

		try {
			setIsSubmitting(true)
			const response = await bookingApi.create({
				eventTypeId: selectedEventTypeId,
				staffId: activeStaffId,
				startAt,
				timezone: browserTimezone(),
				invitee: {
					name: data.name,
					email: data.email || null,
					phone: data.phone || null,
					phoneCountry: null,
				},
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

	const handleCancel = async () => {
		if (!confirmedBooking) return

		try {
			await bookingApi.cancelById({
				bookingId: confirmedBooking.bookingId,
				reason: t('cancelledByAdmin'),
			})
			setConfirmedBooking(null)
			setParams({ slot: null })
		} catch (err) {
			const message =
				err instanceof Error ? err.message : t('cancelFailed')
			setError(message)
		}
	}

	const handleResetSlot = () => {
		setParams({ slot: null })
	}

	const handleBookingClick = (bookingId: string) => {
		if (!orgData) return
		const booking = orgData.staffBookings.find((b) => b.id === bookingId)
		if (!booking) return

		const eventType = orgData.eventTypes.find(
			(e) => e.id === booking.eventTypeId,
		)
		const startDate = new Date(booking.startAt)
		const endDate = new Date(booking.endAt)
		const durationMin = Math.round(
			(endDate.getTime() - startDate.getTime()) / 60000,
		)

		setSelectedBooking({
			id: booking.id,
			eventTypeName: booking.eventTypeName,
			color: eventType ? eventType.color : '#888',
			startAt: booking.startAt,
			endAt: booking.endAt,
			durationMin,
			date: booking.startAt.split('T')[0],
			status: booking.status,
			invitee: {
				name: booking.invitee.name,
				email: booking.invitee.email,
				phone: booking.invitee.phone,
			},
			payment: { status: 'none', amount: 0, currency: 'uah' },
		})
	}

	const handleCloseBooking = () => {
		setSelectedBooking(null)
	}

	const handleBookingStatusChange = (bookingId: string, newStatus: BookingStatus) => {
		setSelectedBooking((prev) =>
			prev && prev.id === bookingId ? { ...prev, status: newStatus } : prev,
		)
		loadedRangeRef.current = null
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<p className="text-muted-foreground text-sm">{t('loading')}</p>
			</div>
		)
	}

	if (error || !orgData) {
		return (
			<div className="flex items-center justify-center py-20">
				<p className="text-destructive text-sm">
					{error ?? t('loadError')}
				</p>
			</div>
		)
	}

	const DEFAULT_WEEKLY_HOURS = Array.from({ length: 7 }, (_, i) => ({
		dayOfWeek: i,
		enabled: i >= 1 && i <= 5,
		slots: i >= 1 && i <= 5 ? [{ start: '10:00', end: '18:00' }] : [],
	}))
	const defaultSchedule: ScheduleTemplate = {
		staffId: '',
		orgId: null,
		weeklyHours: DEFAULT_WEEKLY_HOURS,
		slotStepMin: 30,
		slotMode: 'fixed',
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
	}
	const scheduleSource = orgData.schedule ?? defaultSchedule
	const workHours = getWorkHoursForDate(scheduleSource.weeklyHours, dateStr)
	const workStart = workHours?.workStart ?? '10:00'
	const workEnd = workHours?.workEnd ?? '18:00'

	const isDisabledDay = (wh: { dayOfWeek: number; enabled: boolean }): boolean =>
		!wh.enabled
	const toDayOfWeek = (wh: { dayOfWeek: number }): number => wh.dayOfWeek
	const disabledDays = scheduleSource.weeklyHours
		.filter(isDisabledDay)
		.map(toDayOfWeek)

	const strategy = createOrgStrategy({
		orgName: orgData.org.name,
		locale,
		selectStaffLabel: t('selectStaffToView'),
		bookingDetailsLabel: t('bookingDetails'),
		bookings: orgData.bookings,
		canBookForClient: viewConfig.canBookForClient,
		eventTypes: orgData.eventTypes,
		schedule: orgData.schedule ?? undefined,
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
		onBookingClick: handleBookingClick,
		selectedBooking,
		onCloseBooking: handleCloseBooking,
		onBookingStatusChange: handleBookingStatusChange,
	})

	const staffTabsSlot = viewConfig.showStaffTabs ? (
		<StaffTabs
			staff={orgData.staffList}
			selectedId={selectedStaffId}
			behavior={viewConfig.staffTabBehavior}
			onSelect={handleStaffSelect}
		/>
	) : null

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
				staffTabsSlot={staffTabsSlot}
			/>
		</CalendarProvider>
	)
}

export { OrgCalendarPage }
