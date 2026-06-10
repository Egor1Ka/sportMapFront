import { ApiError } from './api-error'
import type { Interceptors, OnError, RequestConfig } from './types'

const DEFAULT_TIMEOUT = 30_000

function buildUrl(
	url: RequestConfig['url'],
	pathParams: RequestConfig['pathParams'] = {},
	queryParams: RequestConfig['queryParams'] = {},
): string {
	const base = url(pathParams)

	const isDefinedEntry = ([, value]: [string, unknown]) =>
		value !== undefined && value !== null
	const toStringEntry = ([key, value]: [string, unknown]): [string, string] => [
		key,
		String(value),
	]

	const filtered = Object.fromEntries(
		Object.entries(queryParams).filter(isDefinedEntry).map(toStringEntry),
	)

	const query = new URLSearchParams(filtered).toString()
	return query ? `${base}?${query}` : base
}

async function parseResponse(response: Response): Promise<unknown> {
	const contentLength = response.headers.get('content-length')
	if (response.status === 204 || contentLength === '0') {
		return null
	}

	const contentType = response.headers.get('content-type') ?? ''

	if (contentType.includes('application/json')) {
		return response.json()
	}

	return response.text()
}

function mergeInterceptors(
	global?: Interceptors,
	perCall?: Interceptors,
): Interceptors {
	return {
		beforeRequest: [
			...(global?.beforeRequest ?? []),
			...(perCall?.beforeRequest ?? []),
		],
		afterResponse: [
			...(global?.afterResponse ?? []),
			...(perCall?.afterResponse ?? []),
		],
		onError: [...(global?.onError ?? []), ...(perCall?.onError ?? [])],
	}
}

async function runOnErrorInterceptors<T>(
	handlers: OnError[],
	error: ApiError,
): Promise<T | undefined> {
	for (const fn of handlers) {
		const result = await fn(error)
		if (result !== undefined) return result as T
	}
	return undefined
}

async function request<T>(
	config: RequestConfig,
	globalInterceptors?: Interceptors,
): Promise<T> {
	const interceptors = mergeInterceptors(
		globalInterceptors,
		config.interceptors,
	)

	let finalConfig = config
	for (const fn of interceptors.beforeRequest ?? []) {
		finalConfig = await fn(finalConfig)
	}

	const url = buildUrl(
		finalConfig.url,
		finalConfig.pathParams,
		finalConfig.queryParams,
	)

	const controller = new AbortController()
	const timeoutId = setTimeout(
		() => controller.abort(),
		finalConfig.timeout ?? DEFAULT_TIMEOUT,
	)

	const errorOpts = {
		defaultErrorMessage: finalConfig.defaultErrorMessage,
		silent: finalConfig.silent,
		requestConfig: finalConfig,
		globalInterceptors,
	}

	try {
		const defaultHeaders: Record<string, string> = {}
		if (finalConfig.body && !(finalConfig.body instanceof FormData)) {
			defaultHeaders['Content-Type'] = 'application/json'
		}

		const response = await fetch(url, {
			method: finalConfig.method ?? 'GET',
			headers: { ...defaultHeaders, ...finalConfig.headers },
			body: finalConfig.body
				? finalConfig.body instanceof FormData
					? finalConfig.body
					: JSON.stringify(finalConfig.body)
				: undefined,
			signal: controller.signal,
		})

		const data = await parseResponse(response)

		if (!response.ok) {
			throw new ApiError(response.status, response.statusText, data, errorOpts)
		}

		let result: unknown = data
		for (const fn of interceptors.afterResponse ?? []) {
			result = await fn(result, finalConfig)
		}

		return result as T
	} catch (error) {
		if (error instanceof ApiError) {
			const recovery = await runOnErrorInterceptors<T>(
				interceptors.onError ?? [],
				error,
			)
			if (recovery !== undefined) return recovery
			throw error
		}

		if (error instanceof Error && error.name === 'AbortError') {
			const timeoutError = new ApiError(
				408,
				'Request timeout',
				undefined,
				errorOpts,
			)
			const recovery = await runOnErrorInterceptors<T>(
				interceptors.onError ?? [],
				timeoutError,
			)
			if (recovery !== undefined) return recovery
			throw timeoutError
		}

		const networkError = new ApiError(0, 'Network error', error, errorOpts)
		const recovery = await runOnErrorInterceptors<T>(
			interceptors.onError ?? [],
			networkError,
		)
		if (recovery !== undefined) return recovery
		throw networkError
	} finally {
		clearTimeout(timeoutId)
	}
}

export { request, mergeInterceptors }
