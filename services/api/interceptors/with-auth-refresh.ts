'use client'

import { ApiError } from '../api-error'
import { request } from '../request'
import type { OnError } from '../types'

function safeRedirect(path: string, fallback: string): void {
	try {
		const url = new URL(path, window.location.origin)
		if (url.origin !== window.location.origin) {
			window.location.href = fallback
			return
		}
		window.location.href = url.pathname + url.search
	} catch {
		window.location.href = fallback
	}
}

function createAuthRefreshInterceptor(
	refreshUrl: string,
	loginPath: string,
): OnError {
	let refreshPromise: Promise<void> | null = null
	let refreshSucceeded = false

	return async (error: ApiError) => {
		if (error.status !== 401) return
		if (!error.requestConfig) return
		if (error.requestConfig._isRetry) return

		const requestUrl = error.requestConfig.url({})
		if (requestUrl.includes(refreshUrl)) return

		if (refreshPromise) {
			await refreshPromise
			if (!refreshSucceeded) return
		} else {
			refreshSucceeded = false

			refreshPromise = fetch(refreshUrl, {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
					'X-Requested-With': 'XMLHttpRequest',
				},
			})
				.then((res) => {
					if (!res.ok) throw new Error('Refresh failed')
					refreshSucceeded = true
				})
				.finally(() => {
					refreshPromise = null
				})

			try {
				await refreshPromise
			} catch {
				if (typeof window !== 'undefined') {
					safeRedirect(loginPath, '/login')
				}
				return new Promise(() => {})
			}
		}

		return request(
			{ ...error.requestConfig, _isRetry: true },
			error.globalInterceptors,
		)
	}
}

export { createAuthRefreshInterceptor }
