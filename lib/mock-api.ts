import type {
	StaffBySlugResponse,
	EventType,
	ScheduleTemplate,
	ScheduleOverride,
	CreateScheduleOverrideBody,
	CreateBookingBody,
	BookingResponse,
	StaffBooking,
	BookingStatus,
	CancelByIdBody,
	OrgBySlugResponse,
	OrgStaffMember,
	SlotMode,
} from '@/services/configs/booking.types'
import {
	mockStaff,
	mockEventTypes,
	mockSchedule,
	mockStaffBookings,
	mockOrgStaff,
	mockOrgBookingsByStaff,
} from './mock'
import {
	getAvailableSlots,
	timeToMin,
	type Slot,
	type SlotMode as SlotEngineMode,
	type SlotBooking,
} from './slot-engine'

// ── Local State Store ──

let bookingsStore: StaffBooking[] = [...mockStaffBookings]
let overridesStore: ScheduleOverride[] = []
let nextBookingIndex = 100

const generateId = (): string => {
	nextBookingIndex += 1
	return `mock-${Date.now()}-${nextBookingIndex}`
}

const generateCancelToken = (): string =>
	`ct-${Math.random().toString(36).slice(2, 12)}`

// ── Delay simulator ──

const delay = (ms: number = 100): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms))

// ── Staff API ──

const getStaffBySlug = async (slug: string): Promise<StaffBySlugResponse> => {
	await delay()
	if (slug === mockStaff.slug) return { ...mockStaff }
	throw new Error(`Staff not found: ${slug}`)
}

// ── Event Types API ──

const getEventTypes = async (_staffId: string): Promise<EventType[]> => {
	await delay()
	return [...mockEventTypes]
}

// ── Schedule API ──

const getScheduleTemplate = async (
	staffId: string,
): Promise<ScheduleTemplate> => {
	await delay()
	return { ...mockSchedule, staffId }
}

const updateScheduleTemplate = async (
	staffId: string,
	_orgId: string | null,
	weeklyHours: ScheduleTemplate['weeklyHours'],
	slotMode?: SlotMode,
	slotStepMin?: number,
): Promise<ScheduleTemplate> => {
	await delay()
	if (staffId !== mockStaff.id)
		throw new Error(`Staff not found: ${staffId}`)
	const updated = {
		...mockSchedule,
		weeklyHours,
		...(slotMode !== undefined && { slotMode }),
		...(slotStepMin !== undefined && { slotStepMin }),
	}
	return updated
}

const createScheduleOverride = async (
	body: CreateScheduleOverrideBody,
): Promise<ScheduleOverride> => {
	await delay()
	const override: ScheduleOverride = {
		id: generateId(),
		staffId: body.staffId,
		date: body.date,
		enabled: body.enabled,
		slots: body.slots,
		reason: body.reason ?? null,
	}
	overridesStore = [...overridesStore, override]
	return override
}

// ── Booking API ──

const createBooking = async (
	body: CreateBookingBody,
): Promise<BookingResponse> => {
	await delay(200)

	const eventType = mockEventTypes.find((e) => e.id === body.eventTypeId)
	if (!eventType)
		throw new Error(`Event type not found: ${body.eventTypeId}`)

	const bookingId = generateId()
	const cancelToken = generateCancelToken()
	const startDate = new Date(body.startAt)
	const endDate = new Date(
		startDate.getTime() + eventType.durationMin * 60000,
	)

	const response: BookingResponse = {
		id: bookingId,
		eventTypeId: body.eventTypeId,
		eventTypeName: eventType.name,
		staffId: body.staffId,
		startAt: body.startAt,
		endAt: endDate.toISOString(),
		timezone: body.timezone,
		locationId: null,
		status: 'confirmed',
		cancelToken,
		invitee: body.invitee,
		createdAt: new Date().toISOString(),
	}

	const staffBooking: StaffBooking = {
		id: bookingId,
		eventTypeId: body.eventTypeId,
		eventTypeName: eventType.name,
		startAt: body.startAt,
		endAt: endDate.toISOString(),
		status: 'confirmed',
		invitee: body.invitee,
		color: eventType.color,
		locationId: null,
		orgId: null,
	}

	bookingsStore = [...bookingsStore, staffBooking]

	return response
}

const getStaffBookings = async (
	staffId: string,
	dateFrom: string,
	dateTo: string,
	status?: BookingStatus[],
	locationId?: string,
): Promise<StaffBooking[]> => {
	await delay()

	const isInDateRange = (b: StaffBooking): boolean => {
		const bookingDate = b.startAt.split('T')[0]
		return bookingDate >= dateFrom && bookingDate <= dateTo
	}

	const matchesStatus = (b: StaffBooking): boolean =>
		!status || status.length === 0 || status.includes(b.status)

	const matchesLocation = (b: StaffBooking): boolean =>
		!locationId || b.locationId === locationId

	const applyFilters = (bookings: StaffBooking[]): StaffBooking[] =>
		bookings
			.filter(isInDateRange)
			.filter(matchesStatus)
			.filter(matchesLocation)

	const orgBookings = mockOrgBookingsByStaff[staffId]
	if (orgBookings) {
		return applyFilters(orgBookings)
	}

	const isCurrentStaff = staffId === mockStaff.id
	if (!isCurrentStaff) return []

	return applyFilters(bookingsStore)
}

const cancelById = async (
	body: CancelByIdBody,
): Promise<BookingResponse | null> => {
	await delay()

	const matchesId = (b: StaffBooking): boolean => b.id === body.bookingId

	const found = bookingsStore.find(matchesId)
	if (!found) throw new Error(`Booking not found: ${body.bookingId}`)

	const markCancelled = (b: StaffBooking): StaffBooking =>
		b.id === body.bookingId ? { ...b, status: 'cancelled' } : b

	bookingsStore = bookingsStore.map(markCancelled)

	return null
}

// ── Org API ──

const getOrgBySlug = async (slug: string): Promise<OrgBySlugResponse> => {
	await delay()
	if (slug === 'demo-org') {
		return {
			id: '807f1f77bcf86cd799439001',
			name: 'Demo Studio',
			slug: 'demo-org',
			logo: null,
		}
	}
	throw new Error(`Org not found: ${slug}`)
}

const getOrgStaff = async (
	orgId: string,
): Promise<OrgStaffMember[]> => {
	await delay()
	if (orgId === '807f1f77bcf86cd799439001') {
		return [...mockOrgStaff]
	}
	return []
}

// ── Slots API ──

const toSlotBooking = (b: StaffBooking): SlotBooking => {
	const start = new Date(b.startAt)
	const end = new Date(b.endAt)
	const startMin = start.getUTCHours() * 60 + start.getUTCMinutes()
	const duration = Math.round((end.getTime() - start.getTime()) / 60000)
	return { startMin, duration }
}

const getAvailableSlotsForStaff = async (
	staffId: string,
	eventTypeId: string,
	date: string,
	locationId?: string,
	slotMode?: SlotEngineMode,
): Promise<Slot[]> => {
	await delay()

	const eventType = mockEventTypes.find((e) => e.id === eventTypeId)
	if (!eventType) throw new Error(`Event type not found: ${eventTypeId}`)

	const schedule = await getScheduleTemplate(staffId)
	const dateObj = new Date(`${date}T00:00:00Z`)
	const dayOfWeek = dateObj.getUTCDay()
	const daySchedule = schedule.weeklyHours.find(
		(d) => d.dayOfWeek === dayOfWeek,
	)
	if (!daySchedule || !daySchedule.enabled || daySchedule.slots.length === 0) {
		return []
	}

	const dayBookings = await getStaffBookings(
		staffId,
		date,
		date,
		['confirmed', 'pending_payment'],
		locationId,
	)

	const bookings = dayBookings.map(toSlotBooking)
	const workSlot = daySchedule.slots[0]
	const resolvedMode = slotMode ?? schedule.slotMode ?? 'fixed'

	const now = new Date()
	const todayStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
	const isToday = date === todayStr
	const nowMin = isToday
		? now.getUTCHours() * 60 + now.getUTCMinutes()
		: 0

	return getAvailableSlots({
		workStart: workSlot.start,
		workEnd: workSlot.end,
		duration: eventType.durationMin,
		slotStep: schedule.slotStepMin,
		slotMode: resolvedMode,
		bookings,
		minNotice: 0,
		nowMin,
	})
}

// ── Exports ──

export const staffApi = {
	getBySlug: getStaffBySlug,
}

export const eventTypeApi = {
	getByStaff: getEventTypes,
}

export const scheduleApi = {
	getTemplate: getScheduleTemplate,
	updateTemplate: updateScheduleTemplate,
	createOverride: createScheduleOverride,
}

export const bookingApi = {
	create: createBooking,
	getByStaff: getStaffBookings,
	cancelById,
}

export const slotsApi = {
	getAvailable: getAvailableSlotsForStaff,
}

export const orgApi = {
	getBySlug: getOrgBySlug,
	getStaff: getOrgStaff,
}

