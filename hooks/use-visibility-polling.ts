'use client'

import { useEffect } from 'react'

const useVisibilityPolling = (
	callback: () => void,
	intervalMs: number = 60_000,
): void => {
	useEffect(() => {
		const tick = () => {
			if (document.visibilityState === 'visible') callback()
		}
		const id = window.setInterval(tick, intervalMs)
		return () => window.clearInterval(id)
	}, [callback, intervalMs])
}

export { useVisibilityPolling }
