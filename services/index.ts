export { ApiError } from './api/api-error'
export { request } from './api/request'
export {
	getData,
	postData,
	putData,
	patchData,
	deleteData,
} from './api/methods'
export { createApiMethods } from './api/create-api-methods'
export { endpoint } from './api/types'
export { createAuthRefreshInterceptor } from './api/interceptors/with-auth-refresh'
export {
	createToastInterceptor,
	getStatusI18nKey,
	STATUS_TO_I18N_KEY,
} from './api/interceptors/with-toast'
export { setServerErrors } from './api/set-server-errors'
export type {
	UrlFunction,
	RequestConfig,
	BeforeRequest,
	AfterResponse,
	OnError,
	Interceptors,
	MethodParams,
	MethodParamsWithBody,
	EndpointConfig,
	MappedApiMethods,
	ApiErrorResponseBody,
} from './api/types'
import { createApiMethods } from './api/create-api-methods'
import { createAuthRefreshInterceptor } from './api/interceptors/with-auth-refresh'
import { createToastInterceptor } from './api/interceptors/with-toast'
import authApiConfig from './configs/auth.config'
import userApiConfig from './configs/user.config'
import billingApiConfig from './configs/billing.config'
import playgroundApiConfig from './configs/playground.config'
import playgroundEditRequestApiConfig from './configs/playground-edit-request.config'
import sportApiConfig from './configs/sport.config'
import commentApiConfig from './configs/comment.config'
import ratingApiConfig from './configs/rating.config'
import eventApiConfig from './configs/event.config'
import checkInApiConfig from './configs/check-in.config'

const defaultInterceptors = {
	interceptors: {
		onError: [
			createAuthRefreshInterceptor('/api/auth/refresh', '/login'),
			createToastInterceptor(),
		],
	},
}

const publicInterceptors = {
	interceptors: {
		onError: [createToastInterceptor()],
	},
}

export const authApi = createApiMethods(authApiConfig)
export const userApi = createApiMethods(userApiConfig, defaultInterceptors)
export const billingApi = createApiMethods(
	billingApiConfig,
	defaultInterceptors,
)
export const playgroundApi = createApiMethods(
	playgroundApiConfig,
	publicInterceptors,
)
export const playgroundEditRequestApi = createApiMethods(
	playgroundEditRequestApiConfig,
	defaultInterceptors,
)
export const sportApi = createApiMethods(sportApiConfig, publicInterceptors)
export const commentApi = createApiMethods(commentApiConfig, defaultInterceptors)
export const ratingApi = createApiMethods(ratingApiConfig, defaultInterceptors)
export const eventApi = createApiMethods(eventApiConfig, defaultInterceptors)
export const checkInApi = createApiMethods(checkInApiConfig, defaultInterceptors)
export type { User, UpdateUserBody } from './configs/user.config'
export type {
	Plan,
	BillingSubscription,
	BillingPayment,
	BillingOrder,
	BillingCatalog,
	CatalogPlan,
	CatalogProduct,
} from './configs/billing.config'
export type {
	Playground,
	PlaygroundAddress,
	PlaygroundSport,
	PlaygroundCounters,
	PlaygroundViewer,
	PlaygroundListResponse,
	CreatePlaygroundBody,
	UpdatePlaygroundBody,
} from './configs/playground.config'
export type {
	EditRequestStatus,
	EditRequestDiff,
	PlaygroundEditRequest,
	EditRequestWithPlayground,
	EditRequestListResponse,
	SubmitEditRequestBody,
	PendingCountResponse,
} from './configs/playground-edit-request.config'
export type {
	EventCreator,
	PlaygroundEvent,
	EventListResponse,
	EventListTime,
	CreateEventBody,
	UpdateEventBody,
	EventRsvpResponse,
} from './configs/event.types'
export type { CheckInViewer, CheckInResponse } from './configs/check-in.types'
export type { Sport, SportListResponse, CreateSportBody } from './configs/sport.config'
export type {
	Comment,
	CommentAuthor,
	CommentListResponse,
	CreateCommentBody,
	DeleteCommentResponse,
} from './configs/comment.config'
export type {
	Rating,
	RatingUser,
	RatingAggregate,
	UpsertRatingBody,
} from './configs/rating.config'
export type {
	BookingStatus,
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
} from './configs/booking.types'
