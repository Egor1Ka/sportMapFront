import { getData, postData, patchData, deleteData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type {
	PlaygroundEvent,
	EventListResponse,
	CreateEventBody,
	UpdateEventBody,
	EventRsvpResponse,
} from './event.types'

const eventApiConfig = {
	listByPlayground: endpoint<void, EventListResponse>({
		url: ({ playgroundId }) => `/api/playgrounds/${playgroundId}/events`,
		method: getData,
		defaultErrorMessage: 'Failed to load events',
	}),

	getById: endpoint<void, PlaygroundEvent>({
		url: ({ id }) => `/api/events/${id}`,
		method: getData,
		defaultErrorMessage: 'Failed to load event',
	}),

	create: endpoint<CreateEventBody, PlaygroundEvent>({
		url: ({ playgroundId }) => `/api/playgrounds/${playgroundId}/events`,
		method: postData,
		defaultErrorMessage: 'Failed to create event',
	}),

	update: endpoint<UpdateEventBody, PlaygroundEvent>({
		url: ({ id }) => `/api/events/${id}`,
		method: patchData,
		defaultErrorMessage: 'Failed to update event',
	}),

	cancel: endpoint<void, PlaygroundEvent>({
		url: ({ id }) => `/api/events/${id}/cancel`,
		method: postData,
		defaultErrorMessage: 'Failed to cancel event',
	}),

	rsvp: endpoint<void, EventRsvpResponse>({
		url: ({ id }) => `/api/events/${id}/rsvp`,
		method: postData,
		defaultErrorMessage: 'Failed to RSVP',
	}),

	unrsvp: endpoint<void, EventRsvpResponse>({
		url: ({ id }) => `/api/events/${id}/rsvp`,
		method: deleteData,
		defaultErrorMessage: 'Failed to cancel RSVP',
	}),
}

export default eventApiConfig
