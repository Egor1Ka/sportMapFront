import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { CalendarViewConfigProvider } from '@/lib/calendar/CalendarViewConfigContext'
import { STAFF_PUBLIC_CONFIG } from '@/lib/calendar/view-config'
import { BookingPage } from './BookingPage'

export default async function StaffPublicPage({
	params,
}: {
	params: Promise<{ staffSlug: string }>
}) {
	const { staffSlug } = await params
	const t = await getTranslations('booking')

	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center">
					<p className="text-muted-foreground">{t('loading')}</p>
				</div>
			}
		>
			<CalendarViewConfigProvider config={STAFF_PUBLIC_CONFIG}>
				<BookingPage staffSlug={staffSlug} />
			</CalendarViewConfigProvider>
		</Suspense>
	)
}
