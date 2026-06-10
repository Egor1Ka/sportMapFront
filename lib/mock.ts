import type {
	StaffBySlugResponse,
	EventType,
	ScheduleTemplate,
	StaffBooking,
	BookingStatus,
	OrgStaffMember,
} from '@/services/configs/booking.types'

// ── Staff ──

export const mockStaff: StaffBySlugResponse = {
	id: '507f1f77bcf86cd799439011',
	name: 'Анна Коваленко',
	slug: 'anna-kovalenko',
	avatar: '/avatars/anna.jpg',
	position: 'Стиліст',
	orgId: null,
	locationIds: [],
}

// ── Event Types (Services) ──

export const mockEventTypes: EventType[] = [
	{
		id: '607f1f77bcf86cd799439001',
		name: 'Стрижка',
		slug: 'haircut',
		durationMin: 60,
		price: 500,
		currency: 'UAH',
		color: '#8B5CF6',
		description: null,
	},
	{
		id: '607f1f77bcf86cd799439002',
		name: 'Фарбування',
		slug: 'coloring',
		durationMin: 120,
		price: 1200,
		currency: 'UAH',
		color: '#EC4899',
		description: null,
	},
	{
		id: '607f1f77bcf86cd799439003',
		name: 'Укладка',
		slug: 'styling',
		durationMin: 45,
		price: 350,
		currency: 'UAH',
		color: '#06B6D4',
		description: null,
	},
	{
		id: '607f1f77bcf86cd799439004',
		name: 'Манікюр',
		slug: 'manicure',
		durationMin: 30,
		price: 250,
		currency: 'UAH',
		color: '#F59E0B',
		description: null,
	},
]

// ── Schedule ──

const buildWeekday = (dayOfWeek: number, enabled: boolean) => ({
	dayOfWeek,
	enabled,
	slots: enabled ? [{ start: '10:00', end: '18:00' }] : [],
})

export const mockSchedule: ScheduleTemplate = {
	staffId: mockStaff.id,
	orgId: null,
	weeklyHours: [
		buildWeekday(0, true),
		buildWeekday(1, true),
		buildWeekday(2, false),
		buildWeekday(3, true),
		buildWeekday(4, true),
		buildWeekday(5, true),
		buildWeekday(6, false),
	],
	slotStepMin: 30,
	slotMode: 'fixed',
	timezone: 'Europe/Kyiv',
}

// ── Existing Bookings (as StaffBooking[]) ──

const formatDateISO = (d: Date): string => {
	const year = d.getFullYear()
	const month = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

const relativeDate = (daysOffset: number): string => {
	const d = new Date()
	d.setDate(d.getDate() + daysOffset)
	return formatDateISO(d)
}

const today = relativeDate(0)
const tomorrow = relativeDate(1)
const dayAfterTomorrow = relativeDate(2)
const yesterday = relativeDate(-1)

const toISODateTime = (date: string, hoursMin: string): string =>
	`${date}T${hoursMin}:00.000Z`

export const mockStaffBookings: StaffBooking[] = [
	{
		id: '707f1f77bcf86cd799439001',
		eventTypeId: '607f1f77bcf86cd799439001',
		eventTypeName: 'Стрижка',
		startAt: toISODateTime(today, '10:00'),
		endAt: toISODateTime(today, '11:00'),
		status: 'confirmed' as BookingStatus,
		invitee: { name: 'Марія', email: null, phone: null, phoneCountry: null },
		color: '#8B5CF6',
		locationId: null,
		orgId: null,
	},
	{
		id: '707f1f77bcf86cd799439002',
		eventTypeId: '607f1f77bcf86cd799439002',
		eventTypeName: 'Фарбування',
		startAt: toISODateTime(today, '14:00'),
		endAt: toISODateTime(today, '15:30'),
		status: 'confirmed' as BookingStatus,
		invitee: { name: 'Олена', email: null, phone: null, phoneCountry: null },
		color: '#EC4899',
		locationId: null,
		orgId: null,
	},
	{
		id: '707f1f77bcf86cd799439003',
		eventTypeId: '607f1f77bcf86cd799439003',
		eventTypeName: 'Укладка',
		startAt: toISODateTime(tomorrow, '12:00'),
		endAt: toISODateTime(tomorrow, '13:00'),
		status: 'confirmed' as BookingStatus,
		invitee: { name: 'Ірина', email: null, phone: null, phoneCountry: null },
		color: '#06B6D4',
		locationId: null,
		orgId: null,
	},
	{
		id: '707f1f77bcf86cd799439004',
		eventTypeId: '607f1f77bcf86cd799439004',
		eventTypeName: 'Манікюр',
		startAt: toISODateTime(dayAfterTomorrow, '13:00'),
		endAt: toISODateTime(dayAfterTomorrow, '13:45'),
		status: 'confirmed' as BookingStatus,
		invitee: { name: 'Софія', email: null, phone: null, phoneCountry: null },
		color: '#F59E0B',
		locationId: null,
		orgId: null,
	},
	{
		id: '707f1f77bcf86cd799439005',
		eventTypeId: '607f1f77bcf86cd799439002',
		eventTypeName: 'Фарбування',
		startAt: toISODateTime(yesterday, '11:00'),
		endAt: toISODateTime(yesterday, '13:00'),
		status: 'completed' as BookingStatus,
		invitee: {
			name: 'Катерина',
			email: null,
			phone: null,
			phoneCountry: null,
		},
		color: '#EC4899',
		locationId: null,
		orgId: null,
	},
]

// ── Converters: StaffBooking → CalendarDisplayBooking ──

export interface CalendarDisplayBooking {
	startMin: number
	duration: number
	label: string
	color: string
	date: string
	bookingId: string
	status: BookingStatus
}

const timeToMinFromISO = (iso: string): number => {
	const d = new Date(iso)
	return d.getUTCHours() * 60 + d.getUTCMinutes()
}

const dateFromISO = (iso: string): string => iso.split('T')[0]

const diffMinutes = (startISO: string, endISO: string): number => {
	const start = new Date(startISO).getTime()
	const end = new Date(endISO).getTime()
	return Math.round((end - start) / 60000)
}

export const toCalendarDisplayBooking = (
	b: StaffBooking,
): CalendarDisplayBooking => ({
	startMin: timeToMinFromISO(b.startAt),
	duration: diffMinutes(b.startAt, b.endAt),
	label: `${b.eventTypeName} — ${b.invitee.name}`,
	color: b.color,
	date: dateFromISO(b.startAt),
	bookingId: b.id,
	status: b.status,
})

// ── Org Mock Data ──

const mockOrgStaffMember1: StaffBySlugResponse = {
	id: '507f1f77bcf86cd799439011',
	name: 'Анна Коваленко',
	slug: 'anna-kovalenko',
	avatar: '/avatars/anna.jpg',
	position: 'Стиліст',
	orgId: '807f1f77bcf86cd799439001',
	locationIds: ['loc-001'],
}

const mockOrgStaffMember2: StaffBySlugResponse = {
	id: '507f1f77bcf86cd799439012',
	name: 'Олена Шевченко',
	slug: 'olena-shevchenko',
	avatar: '/avatars/olena.jpg',
	position: 'Колорист',
	orgId: '807f1f77bcf86cd799439001',
	locationIds: ['loc-001', 'loc-002'],
}

const mockOrgStaffMember3: StaffBySlugResponse = {
	id: '507f1f77bcf86cd799439013',
	name: 'Ірина Бондаренко',
	slug: 'iryna-bondarenko',
	avatar: '/avatars/iryna.jpg',
	position: 'Манікюрист',
	orgId: '807f1f77bcf86cd799439001',
	locationIds: ['loc-002'],
}

export const mockOrgStaff: OrgStaffMember[] = [
	{ ...mockOrgStaffMember1, bookingCount: 2 },
	{ ...mockOrgStaffMember2, bookingCount: 1 },
	{ ...mockOrgStaffMember3, bookingCount: 2 },
]

const mockOrgBookings: StaffBooking[] = [
	{
		id: '807f1f77bcf86cd799439101',
		eventTypeId: '607f1f77bcf86cd799439001',
		eventTypeName: 'Стрижка',
		startAt: toISODateTime(today, '10:00'),
		endAt: toISODateTime(today, '11:00'),
		status: 'confirmed' as BookingStatus,
		invitee: { name: 'Марія', email: null, phone: null, phoneCountry: null },
		color: '#8B5CF6',
		locationId: 'loc-001',
		orgId: '807f1f77bcf86cd799439001',
	},
	{
		id: '807f1f77bcf86cd799439102',
		eventTypeId: '607f1f77bcf86cd799439002',
		eventTypeName: 'Фарбування',
		startAt: toISODateTime(today, '14:00'),
		endAt: toISODateTime(today, '16:00'),
		status: 'confirmed' as BookingStatus,
		invitee: { name: 'Софія', email: null, phone: null, phoneCountry: null },
		color: '#EC4899',
		locationId: 'loc-001',
		orgId: '807f1f77bcf86cd799439001',
	},
	{
		id: '807f1f77bcf86cd799439103',
		eventTypeId: '607f1f77bcf86cd799439002',
		eventTypeName: 'Фарбування',
		startAt: toISODateTime(today, '11:00'),
		endAt: toISODateTime(today, '13:00'),
		status: 'confirmed' as BookingStatus,
		invitee: { name: 'Катерина', email: null, phone: null, phoneCountry: null },
		color: '#EC4899',
		locationId: 'loc-002',
		orgId: '807f1f77bcf86cd799439001',
	},
	{
		id: '807f1f77bcf86cd799439104',
		eventTypeId: '607f1f77bcf86cd799439004',
		eventTypeName: 'Манікюр',
		startAt: toISODateTime(today, '10:00'),
		endAt: toISODateTime(today, '10:30'),
		status: 'confirmed' as BookingStatus,
		invitee: { name: 'Олена', email: null, phone: null, phoneCountry: null },
		color: '#F59E0B',
		locationId: 'loc-002',
		orgId: '807f1f77bcf86cd799439001',
	},
	{
		id: '807f1f77bcf86cd799439105',
		eventTypeId: '607f1f77bcf86cd799439004',
		eventTypeName: 'Манікюр',
		startAt: toISODateTime(tomorrow, '13:00'),
		endAt: toISODateTime(tomorrow, '13:30'),
		status: 'confirmed' as BookingStatus,
		invitee: { name: 'Тетяна', email: null, phone: null, phoneCountry: null },
		color: '#F59E0B',
		locationId: 'loc-002',
		orgId: '807f1f77bcf86cd799439001',
	},
]

// staffId → bookings mapping for org view
export const mockOrgBookingsByStaff: Record<string, StaffBooking[]> = {
	[mockOrgStaffMember1.id]: [mockOrgBookings[0], mockOrgBookings[1]],
	[mockOrgStaffMember2.id]: [mockOrgBookings[2]],
	[mockOrgStaffMember3.id]: [mockOrgBookings[3], mockOrgBookings[4]],
}

