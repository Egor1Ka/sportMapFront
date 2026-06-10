import type { ApiError } from './api-error'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

type UrlFunction = (pathParams: Record<string, string | number>) => string

interface RequestConfig {
	url: UrlFunction
	method?: HttpMethod
	pathParams?: Record<string, string | number>
	queryParams?: Record<string, string | number | boolean | undefined | null>
	body?: unknown
	headers?: Record<string, string>
	timeout?: number
	interceptors?: Interceptors
	silent?: boolean
	defaultErrorMessage?: string
	_isRetry?: boolean
}

type BeforeRequest = (
	config: RequestConfig,
) => RequestConfig | Promise<RequestConfig>

type AfterResponse = (
	data: unknown,
	config: RequestConfig,
) => unknown | Promise<unknown>

type OnError = (error: ApiError) => void | unknown | Promise<void | unknown>

interface Interceptors {
	beforeRequest?: BeforeRequest[]
	afterResponse?: AfterResponse[]
	onError?: OnError[]
}

interface MethodParams {
	pathParams?: Record<string, string | number>
	queryParams?: Record<string, string | number | boolean | undefined | null>
	headers?: Record<string, string>
	timeout?: number
	interceptors?: Interceptors
	silent?: boolean
}

interface ApiErrorResponseBody {
	statusCode: number
	status: string
	data?: unknown
}

interface MethodParamsWithBody<T> extends MethodParams {
	body: T
}

interface EndpointConfig<TRequest = void, TResponse = unknown> {
	url: UrlFunction
	method: MethodFunction | MethodFunctionWithBody
	defaultErrorMessage?: string
	defaultHeaders?: Record<string, string>
	defaultQuery?: Record<string, string | number | boolean>
	_req?: TRequest
	_res?: TResponse
}

type MethodFunction = <T>(
	params: MethodParams & { url: UrlFunction },
	globalInterceptors?: Interceptors,
) => Promise<T>

type MethodFunctionWithBody = <T>(
	params: MethodParamsWithBody<unknown> & { url: UrlFunction },
	globalInterceptors?: Interceptors,
) => Promise<T>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MappedApiMethods<T extends Record<string, EndpointConfig<any, any>>> = {
	[K in keyof T]: T[K] extends EndpointConfig<infer TReq, infer TRes>
		? TReq extends void
			? (params?: MethodParams) => Promise<TRes>
			: (params: MethodParamsWithBody<TReq>) => Promise<TRes>
		: never
}

function endpoint<TRequest = void, TResponse = unknown>(
	config: Omit<EndpointConfig<TRequest, TResponse>, '_req' | '_res'>,
): EndpointConfig<TRequest, TResponse> {
	return config as EndpointConfig<TRequest, TResponse>
}

export type {
	HttpMethod,
	UrlFunction,
	RequestConfig,
	BeforeRequest,
	AfterResponse,
	OnError,
	Interceptors,
	MethodParams,
	MethodParamsWithBody,
	MethodFunction,
	MethodFunctionWithBody,
	EndpointConfig,
	MappedApiMethods,
	ApiErrorResponseBody,
}

export { endpoint }
