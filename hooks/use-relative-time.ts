'use client'

import { useTranslations } from 'next-intl'
import { useNowClock } from './use-now-clock'

interface UseRelativeTimeInput {
	startAt: string
	durationMin: number
}

interface RelativeTimeResult {
	phase: 'upcoming' | 'happening' | 'finished'
	label: string
}

const minutesBetween = (later: Date, earlier: Date): number =>
	Math.round((later.getTime() - earlier.getTime()) / 60_000)

const formatMinutes = (minutes: number): string => {
	const hours = Math.floor(minutes / 60)
	const mins = minutes % 60
	if (hours === 0) return `${mins}м`
	if (mins === 0) return `${hours}ч`
	return `${hours}ч ${mins}м`
}

const useRelativeTime = ({
	startAt,
	durationMin,
}: UseRelativeTimeInput): RelativeTimeResult => {
	const start = new Date(startAt)
	const minutesToStart = minutesBetween(start, new Date())
	const fastTick = minutesToStart <= 60 && minutesToStart > -durationMin
	const now = useNowClock(fastTick ? 30_000 : 60_000)
	const t = useTranslations('events')

	const minutesUntilStart = minutesBetween(start, now)
	const minutesUntilEnd = minutesUntilStart + durationMin

	if (minutesUntilEnd <= 0) {
		return { phase: 'finished', label: t('finished') }
	}
	if (minutesUntilStart <= 0) {
		const endTime = new Intl.DateTimeFormat(undefined, {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false,
		}).format(new Date(start.getTime() + durationMin * 60_000))
		return { phase: 'happening', label: t('happening', { endTime }) }
	}
	return {
		phase: 'upcoming',
		label: t('startsIn', { value: formatMinutes(minutesUntilStart) }),
	}
}

export { useRelativeTime }
export type { RelativeTimeResult }
