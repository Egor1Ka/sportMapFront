import { addDays, isSameDay, startOfDay } from 'date-fns'

interface MinimalEvent {
	startAt: string
}

interface DayGroup<E extends MinimalEvent> {
	key: string
	date: Date
	dayOffset: number | null
	events: E[]
}

const toDayKey = (date: Date): string =>
	`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`

const getDayOffset = (date: Date, now: Date): number | null => {
	const todayStart = startOfDay(now)
	if (isSameDay(date, todayStart)) return 0
	if (isSameDay(date, addDays(todayStart, 1))) return 1
	if (isSameDay(date, addDays(todayStart, -1))) return -1
	return null
}

const groupEventsByDate = <E extends MinimalEvent>(
	events: E[],
	now: Date = new Date(),
): DayGroup<E>[] => {
	const groups = new Map<string, DayGroup<E>>()
	const addToGroup = (event: E) => {
		const date = startOfDay(new Date(event.startAt))
		const key = toDayKey(date)
		const existing = groups.get(key)
		if (existing) {
			existing.events.push(event)
			return
		}
		groups.set(key, {
			key,
			date,
			dayOffset: getDayOffset(date, now),
			events: [event],
		})
	}
	events.forEach(addToGroup)
	return Array.from(groups.values())
}

const formatGroupLabel = (
	group: DayGroup<MinimalEvent>,
	locale: string,
	labels: { today: string; tomorrow: string; yesterday: string },
): string => {
	if (group.dayOffset === 0) return labels.today
	if (group.dayOffset === 1) return labels.tomorrow
	if (group.dayOffset === -1) return labels.yesterday
	return new Intl.DateTimeFormat(locale, {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
	}).format(group.date)
}

export { groupEventsByDate, formatGroupLabel }
export type { DayGroup }
