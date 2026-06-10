import type {
	EndpointConfig,
	Interceptors,
	MappedApiMethods,
	MethodParams,
	MethodParamsWithBody,
	UrlFunction,
} from './types'

type ApiMethodFn = (
	params: MethodParams | MethodParamsWithBody<unknown>,
) => Promise<unknown>

function createApiMethods<
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	T extends Record<string, EndpointConfig<any, any>>,
>(config: T, options?: { interceptors?: Interceptors }): MappedApiMethods<T> {
	const methods: Record<string, ApiMethodFn> = {}

	for (const [key, ep] of Object.entries(config)) {
		methods[key] = (
			params: MethodParams | MethodParamsWithBody<unknown> = {},
		) => {
			const mergedHeaders = { ...ep.defaultHeaders, ...params.headers }
			const mergedQuery = { ...ep.defaultQuery, ...params.queryParams }

			return ep.method(
				{
					url: ep.url,
					...params,
					headers: mergedHeaders,
					queryParams: mergedQuery,
					defaultErrorMessage: ep.defaultErrorMessage,
					silent: params.silent,
				} as unknown as MethodParamsWithBody<unknown> & { url: UrlFunction },
				options?.interceptors,
			)
		}
	}

	return methods as MappedApiMethods<T>
}

export { createApiMethods }
