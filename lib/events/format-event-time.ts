interface FormatTimeOptions {
	locale: string
	timeZone?: string
}

interface DurationLabels {
	minutesShort: string
	hoursShort: string
}

const formatEventTime = (start: Date, options: FormatTimeOptions): string => {
	const formatter = new Intl.DateTimeFormat(options.locale, {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
		timeZone: options.timeZone,
	})
	return formatter.format(start)
}

const formatDuration = (minutes: number, labels: DurationLabels): string => {
	const hours = Math.floor(minutes / 60)
	const mins = minutes % 60
	if (hours === 0) return `${mins}${labels.minutesShort}`
	if (mins === 0) return `${hours}${labels.hoursShort}`
	return `${hours}${labels.hoursShort} ${mins}${labels.minutesShort}`
}

export { formatEventTime, formatDuration }
export type { FormatTimeOptions, DurationLabels }
