export function isMonitoringEnabled(): boolean {
	return !!(process.env.NEW_RELIC_LICENSE_KEY && process.env.NEW_RELIC_APP_NAME)
}

export async function initMonitoring(): Promise<void> {
	if (process.env.NEXT_RUNTIME !== 'nodejs') return
	if (!isMonitoringEnabled()) return

	await import('newrelic')
}
