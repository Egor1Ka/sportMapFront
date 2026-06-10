'use client'

import { useCallback, useEffect, useState } from 'react'
import { playgroundEditRequestApi, ApiError } from '@/services'

const POLL_INTERVAL_MS = 60_000

const useAdminPendingCount = (enabled: boolean): number => {
	const [count, setCount] = useState(0)

	const fetchCount = useCallback(async () => {
		if (!enabled) return
		try {
			const result = await playgroundEditRequestApi.pendingCount({ silent: true })
			setCount(result.count)
		} catch (err) {
			if (!(err instanceof ApiError)) return
		}
	}, [enabled])

	useEffect(() => {
		if (!enabled) return
		const initialTimeoutId = setTimeout(fetchCount, 0)
		const intervalId = setInterval(fetchCount, POLL_INTERVAL_MS)
		const onVisibility = () => {
			if (document.visibilityState === 'visible') fetchCount()
		}
		document.addEventListener('visibilitychange', onVisibility)
		return () => {
			clearTimeout(initialTimeoutId)
			clearInterval(intervalId)
			document.removeEventListener('visibilitychange', onVisibility)
		}
	}, [enabled, fetchCount])

	return enabled ? count : 0
}

export { useAdminPendingCount }
