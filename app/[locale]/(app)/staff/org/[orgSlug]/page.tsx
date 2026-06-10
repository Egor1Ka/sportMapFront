import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { CalendarViewConfigProvider } from '@/lib/calendar/CalendarViewConfigContext'
import { ORG_ADMIN_CONFIG } from '@/lib/calendar/view-config'
import { OrgCalendarPage } from '@/components/booking/OrgCalendarPage'

export default async function OrgAdminPage({
	params,
}: {
	params: Promise<{ orgSlug: string }>
}) {
	const { orgSlug } = await params
	const t = await getTranslations('booking')

	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center">
					<p className="text-muted-foreground">{t('loading')}</p>
				</div>
			}
		>
			<CalendarViewConfigProvider config={ORG_ADMIN_CONFIG}>
				<OrgCalendarPage orgSlug={orgSlug} />
			</CalendarViewConfigProvider>
		</Suspense>
	)
}
