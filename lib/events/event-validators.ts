const MIN_LEAD_MS = 5 * 60 * 1000
const MAX_WINDOW_MS = 48 * 60 * 60 * 1000

const isWithin48hFuture = (start: Date, now: Date = new Date()): boolean => {
	const diff = start.getTime() - now.getTime()
	return diff >= MIN_LEAD_MS && diff <= MAX_WINDOW_MS
}

const isStartInPast = (start: Date, now: Date = new Date()): boolean =>
	start.getTime() < now.getTime()

export { isWithin48hFuture, isStartInPast }
