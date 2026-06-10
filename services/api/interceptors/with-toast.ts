'use client'

import { toast } from 'sonner'
import type { ApiError } from '../api-error'
import type { OnError } from '../types'

type ErrorMessageResolver = (error: ApiError) => string | undefined

const STATUS_TO_I18N_KEY: Record<number, string> = {
	0: 'network',
	400: 'badRequest',
	403: 'forbidden',
	404: 'notFound',
	408: 'timeout',
	409: 'conflict',
	422: 'badRequest',
	429: 'tooManyRequests',
	500: 'serverError',
	503: 'serviceUnavailable',
}

function getStatusI18nKey(status: number): string {
	return STATUS_TO_I18N_KEY[status] ?? 'unknown'
}

interface ToastInterceptorOptions {
	getErrorMessage?: ErrorMessageResolver
}

function createToastInterceptor(options?: ToastInterceptorOptions): OnError {
	return (error: ApiError) => {
		if (error.silent) return
		if (error.status === 401) return
		if (error.isValidationError) return

		const resolved = options?.getErrorMessage?.(error)
		const message = error.defaultErrorMessage ?? resolved ?? error.message
		toast.error(message)
	}
}

export { createToastInterceptor, getStatusI18nKey, STATUS_TO_I18N_KEY }
export type { ToastInterceptorOptions, ErrorMessageResolver }
