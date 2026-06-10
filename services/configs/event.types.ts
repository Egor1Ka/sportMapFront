import type { PlaygroundSport } from './playground.config'

interface EventCreator {
	id: string
	name: string | null
	avatar: string | null
}

interface PlaygroundEvent {
	id: string
	playgroundId: string
	sport: PlaygroundSport
	creator: EventCreator
	startAt: string
	durationMin: number
	description: string | null
	maxParticipants: number | null
	rsvpCount: number
	isFull: boolean
	status: 'active' | 'cancelled' | 'finished'
	createdAt: string | null
	viewer?: { isRsvped: boolean }
}

type EventListTime = 'upcoming' | 'past' | 'all'

interface EventListResponse {
	items: PlaygroundEvent[]
	total: number
	page: number
	limit: number
	totalPages: number
	time: EventListTime
}

interface CreateEventBody {
	sportId: string
	startAt: string
	durationMin?: number
	description?: string | null
	maxParticipants?: number | null
}

interface UpdateEventBody {
	sportId?: string
	startAt?: string
	durationMin?: number
	description?: string | null
	maxParticipants?: number | null
}

interface EventRsvpResponse {
	rsvpCount: number
	isFull: boolean
	viewer: { isRsvped: boolean }
}

export type {
	EventCreator,
	PlaygroundEvent,
	EventListResponse,
	EventListTime,
	CreateEventBody,
	UpdateEventBody,
	EventRsvpResponse,
}
