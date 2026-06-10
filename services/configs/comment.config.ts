import { getData, postData, deleteData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'

interface CommentAuthor {
	id: string | null
	name: string | null
	avatar: string | null
}

interface Comment {
	id: string
	targetType: 'playground'
	targetId: string
	text: string
	author: CommentAuthor
	createdAt: string | null
	updatedAt: string | null
}

interface CommentListResponse {
	items: Comment[]
	total: number
	limit: number
	offset: number
	hasMore: boolean
}

interface CreateCommentBody {
	targetType: 'playground'
	targetId: string
	text: string
}

interface DeleteCommentResponse {
	id: string
}

const commentApiConfig = {
	list: endpoint<void, CommentListResponse>({
		url: () => `/api/comments`,
		method: getData,
		defaultErrorMessage: 'Failed to load comments',
	}),
	create: endpoint<CreateCommentBody, Comment>({
		url: () => `/api/comments`,
		method: postData,
		defaultErrorMessage: 'Failed to post comment',
	}),
	remove: endpoint<void, DeleteCommentResponse>({
		url: ({ id }) => `/api/comments/${id}`,
		method: deleteData,
		defaultErrorMessage: 'Failed to delete comment',
	}),
}

export default commentApiConfig
export type {
	Comment,
	CommentAuthor,
	CommentListResponse,
	CreateCommentBody,
	DeleteCommentResponse,
}
