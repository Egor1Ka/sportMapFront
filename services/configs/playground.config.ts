import { getData, postData, patchData, deleteData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'

interface PlaygroundAddress {
	city: string | null
	district: string | null
	street: string | null
	fullAddress: string | null
}

interface PlaygroundSport {
	id: string
	code: string
	label: string
	icon: string | null
	color: string | null
}

interface PlaygroundCounters {
	activeCheckIns: number
	upcomingEvents: number
}

interface PlaygroundRating {
	average: number | null
	count: number
}

interface PlaygroundViewer {
	isCheckedInHere: boolean
	isOwner: boolean
}

interface Playground {
	id: string
	name: string | null
	description: string | null
	lat: number | null
	lng: number | null
	address: PlaygroundAddress
	sports: PlaygroundSport[]
	photos: string[]
	counters: PlaygroundCounters
	rating: PlaygroundRating
	viewer?: PlaygroundViewer
	createdBy: string | null
	createdAt: string | null
	updatedAt: string | null
}

interface PlaygroundListResponse {
	items: Playground[]
	total: number
	limit: number
	hasMore: boolean
}

interface CreatePlaygroundBody {
	name?: string
	description?: string
	lat: number
	lng: number
	address?: Partial<PlaygroundAddress>
	sports?: string[]
	photos?: string[]
}

interface UpdatePlaygroundBody {
	name?: string | null
	description?: string | null
	lat?: number
	lng?: number
	address?: Partial<PlaygroundAddress>
	sports?: string[]
	photos?: string[]
}

const playgroundApiConfig = {
	listByBbox: endpoint<void, PlaygroundListResponse>({
		url: () => `/api/playgrounds`,
		method: getData,
		defaultErrorMessage: 'Failed to load playgrounds',
	}),

	getById: endpoint<void, Playground>({
		url: ({ id }) => `/api/playgrounds/${id}`,
		method: getData,
		defaultErrorMessage: 'Failed to load playground',
	}),

	create: endpoint<CreatePlaygroundBody, Playground>({
		url: () => `/api/playgrounds`,
		method: postData,
		defaultErrorMessage: 'Failed to create playground',
	}),

	update: endpoint<UpdatePlaygroundBody, Playground>({
		url: ({ id }) => `/api/playgrounds/${id}`,
		method: patchData,
		defaultErrorMessage: 'Failed to update playground',
	}),

	uploadPhoto: endpoint<FormData, Playground>({
		url: ({ id }) => `/api/playgrounds/${id}/photos`,
		method: postData,
		defaultErrorMessage: 'Failed to upload photo',
	}),

	removePhoto: endpoint<void, Playground>({
		url: ({ id }) => `/api/playgrounds/${id}/photos`,
		method: deleteData,
		defaultErrorMessage: 'Failed to remove photo',
	}),
}

export default playgroundApiConfig
export type {
	Playground,
	PlaygroundAddress,
	PlaygroundSport,
	PlaygroundCounters,
	PlaygroundRating,
	PlaygroundViewer,
	PlaygroundListResponse,
	CreatePlaygroundBody,
	UpdatePlaygroundBody,
}
