'use client'

import { useEffect, useState } from 'react'

const useNowClock = (intervalMs: number = 30_000): Date => {
	const [now, setNow] = useState(() => new Date())

	useEffect(() => {
		const tick = () => setNow(new Date())
		const id = window.setInterval(tick, intervalMs)
		return () => window.clearInterval(id)
	}, [intervalMs])

	return now
}

export { useNowClock }
