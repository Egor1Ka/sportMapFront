// ── Booking Status ──

type BookingStatus =
	| 'pending_payment'
	| 'confirmed'
	| 'cancelled'
	| 'completed'
	| 'no_show'

// ── Staff ──

interface StaffMember {
	id: string
	name: string
	slug: string
	avatar: string
	position: string | null
}

interface StaffBySlugResponse {
	id: string
	name: string
	slug: string
	avatar: string
	position: string | null
	orgId: string | null
	locationIds: string[]
}

// ── Event Type (Service) ──

interface EventType {
	id: string
	name: string
	slug: string
	durationMin: number
	price: number
	currency: string
	color: string
	description: string | null
}

// ── Schedule ──

interface WeeklyHours {
	dayOfWeek: number
	enabled: boolean
	slots: TimeRange[]
}

interface TimeRange {
	start: string
	end: string
}

interface ScheduleTemplate {
	staffId: string
	orgId: string | null
	weeklyHours: WeeklyHours[]
	slotStepMin: number
	slotMode: SlotMode
	timezone: string
}

type SlotMode = 'fixed' | 'optimal' | 'dynamic'

interface ScheduleOverride {
	id: string
	staffId: string
	date: string
	enabled: boolean
	slots: TimeRange[]
	reason: string | null
}

interface CreateScheduleOverrideBody {
	staffId: string
	date: string
	enabled: boolean
	slots: TimeRange[]
	reason?: string
}

// ── Booking ──

interface Invitee {
	name: string
	email: string | null
	phone: string | null
	phoneCountry: string | null
}

interface CreateBookingBody {
	eventTypeId: string
	staffId: string
	startAt: string
	timezone: string
	invitee: Invitee
}

interface BookingResponse {
	id: string
	eventTypeId: string
	eventTypeName: string
	staffId: string
	startAt: string
	endAt: string
	timezone: string
	locationId: string | null
	status: BookingStatus
	cancelToken: string
	invitee: Invitee
	createdAt: string
}

interface StaffBooking {
	id: string
	eventTypeId: string
	eventTypeName: string
	startAt: string
	endAt: string
	status: BookingStatus
	invitee: Invitee
	color: string
	locationId: string | null
	orgId: string | null
}

interface CancelByIdBody {
	bookingId: string
	reason?: string
}

// ── Org ──

interface OrgBySlugResponse {
	id: string
	name: string
	slug: string
	logo: string | null
}

interface OrgStaffMember extends StaffMember {
	bookingCount: number
}

export type {
	BookingStatus,
	SlotMode,
	StaffMember,
	StaffBySlugResponse,
	EventType,
	WeeklyHours,
	TimeRange,
	ScheduleTemplate,
	ScheduleOverride,
	CreateScheduleOverrideBody,
	Invitee,
	CreateBookingBody,
	BookingResponse,
	StaffBooking,
	CancelByIdBody,
	OrgBySlugResponse,
	OrgStaffMember,
}
