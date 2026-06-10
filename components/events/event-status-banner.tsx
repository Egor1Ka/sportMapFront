import { useTranslations } from 'next-intl'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { PlaygroundEvent } from '@/services'

interface EventStatusBannerProps {
	status: PlaygroundEvent['status']
}

function EventStatusBanner({ status }: EventStatusBannerProps) {
	const t = useTranslations('events')

	if (status === 'cancelled') {
		return (
			<Alert variant="destructive" data-slot="event-status-banner">
				<AlertDescription>{t('cancelled')}</AlertDescription>
			</Alert>
		)
	}
	if (status === 'finished') {
		return (
			<Alert data-slot="event-status-banner">
				<AlertDescription>{t('finished')}</AlertDescription>
			</Alert>
		)
	}
	return null
}

export { EventStatusBanner }
