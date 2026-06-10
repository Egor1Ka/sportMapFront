import type { ApiErrorResponseBody, Interceptors, RequestConfig } from './types'

interface ApiErrorOptions {
	defaultErrorMessage?: string
	silent?: boolean
	requestConfig?: RequestConfig
	globalInterceptors?: Interceptors
}

class ApiError extends Error {
	status: number
	data: unknown
	silent?: boolean
	defaultErrorMessage?: string
	requestConfig?: RequestConfig
	globalInterceptors?: Interceptors

	private _parsedBody: ApiErrorResponseBody | null | undefined = undefined

	constructor(
		status: number,
		message: string,
		data?: unknown,
		options?: ApiErrorOptions,
	) {
		super(message)
		this.name = 'ApiError'
		this.status = status
		this.data = data
		this.silent = options?.silent
		this.defaultErrorMessage = options?.defaultErrorMessage
		this.requestConfig = options?.requestConfig
		this.globalInterceptors = options?.globalInterceptors
	}

	private _parseBody(): ApiErrorResponseBody | null {
		if (
			typeof this.data === 'object' &&
			this.data !== null &&
			'statusCode' in this.data &&
			'status' in this.data &&
			typeof (this.data as ApiErrorResponseBody).statusCode === 'number' &&
			typeof (this.data as ApiErrorResponseBody).status === 'string'
		) {
			return this.data as ApiErrorResponseBody
		}
		return null
	}

	get body(): ApiErrorResponseBody | null {
		if (this._parsedBody === undefined) {
			this._parsedBody = this._parseBody()
		}
		return this._parsedBody
	}

	get statusMessage(): string | null {
		return this.body?.status ?? null
	}

	get appStatusCode(): number | null {
		return this.body?.statusCode ?? null
	}

	get fieldErrors(): Record<string, string> | null {
		const bodyData = this.body?.data
		if (typeof bodyData !== 'object' || bodyData === null) return null

		const result: Record<string, string> = {}
		let hasErrors = false

		for (const [key, value] of Object.entries(
			bodyData as Record<string, unknown>,
		)) {
			if (
				typeof value === 'object' &&
				value !== null &&
				'error' in value &&
				typeof (value as { error: string }).error === 'string'
			) {
				result[key] = (value as { error: string }).error
				hasErrors = true
			}
		}

		return hasErrors ? result : null
	}

	get isValidationError(): boolean {
		return this.status === 400 && this.statusMessage === 'validationError'
	}

	get displayMessage(): string {
		return (
			this.defaultErrorMessage ?? this.message ?? 'An unexpected error occurred'
		)
	}
}

export { ApiError }
export type { ApiErrorOptions }
