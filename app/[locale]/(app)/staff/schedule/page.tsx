import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { CalendarViewConfigProvider } from '@/lib/calendar/CalendarViewConfigContext'
import { STAFF_SELF_CONFIG } from '@/lib/calendar/view-config'
import { BookingPage } from '../../book/[staffSlug]/BookingPage'

export default async function StaffSelfPage() {
	const t = await getTranslations('booking')

	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center">
					<p className="text-muted-foreground">{t('loading')}</p>
				</div>
			}
		>
			<CalendarViewConfigProvider config={STAFF_SELF_CONFIG}>
				<BookingPage staffSlug="anna-kovalenko" />
			</CalendarViewConfigProvider>
		</Suspense>
	)
}
