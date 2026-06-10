import { initMonitoring } from '@/lib/monitoring'

export async function register() {
	await initMonitoring()
}
