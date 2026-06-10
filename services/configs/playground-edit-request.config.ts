import { getData, postData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type { Playground, PlaygroundAddress } from './playground.config'

type EditRequestStatus = 'pending' | 'approved' | 'rejected'

interface EditRequestDiff {
	name?: string | null
	description?: string | null
	address?: Partial<PlaygroundAddress>
	lat?: number
	lng?: number
}

interface PlaygroundEditRequest {
	id: string
	playgroundId: string
	authorId: string
	authorName: string | null
	authorEmail: string | null
	diff: EditRequestDiff
	status: EditRequestStatus
	createdAt: string
	resolvedAt: string | null
	resolvedBy: string | null
}

interface EditRequestWithPlayground {
	request: PlaygroundEditRequest
	playground: Playground
}

interface EditRequestListResponse {
	items: EditRequestWithPlayground[]
	total: number
}

interface SubmitEditRequestBody {
	diff: EditRequestDiff
}

interface PendingCountResponse {
	count: number
}

const playgroundEditRequestApiConfig = {
	submit: endpoint<SubmitEditRequestBody, PlaygroundEditRequest>({
		url: ({ id }) => `/api/playgrounds/${id}/edit-requests`,
		method: postData,
		defaultErrorMessage: 'Failed to submit request',
	}),

	list: endpoint<void, EditRequestListResponse>({
		url: () => `/api/admin/playground-edit-requests`,
		method: getData,
		defaultErrorMessage: 'Failed to load requests',
	}),

	pendingCount: endpoint<void, PendingCountResponse>({
		url: () => `/api/admin/playground-edit-requests/count`,
		method: getData,
	}),

	getById: endpoint<void, EditRequestWithPlayground>({
		url: ({ id }) => `/api/admin/playground-edit-requests/${id}`,
		method: getData,
		defaultErrorMessage: 'Failed to load request',
	}),

	approve: endpoint<void, Playground>({
		url: ({ id }) => `/api/admin/playground-edit-requests/${id}/approve`,
		method: postData,
		defaultErrorMessage: 'Failed to approve request',
	}),

	reject: endpoint<void, PlaygroundEditRequest>({
		url: ({ id }) => `/api/admin/playground-edit-requests/${id}/reject`,
		method: postData,
		defaultErrorMessage: 'Failed to reject request',
	}),
}

export default playgroundEditRequestApiConfig
export type {
	EditRequestStatus,
	EditRequestDiff,
	PlaygroundEditRequest,
	EditRequestWithPlayground,
	EditRequestListResponse,
	SubmitEditRequestBody,
	PendingCountResponse,
}
