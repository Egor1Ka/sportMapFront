import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'
import { buildPageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
	const locale = await getLocale()
	return buildPageMetadata({
		titleKey: 'dashboard.title',
		descriptionKey: 'dashboard.description',
		path: '/dashboard',
		locale,
		noIndex: true,
	})
}

export default function DashboardPage() {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
			<h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
			<p className="text-muted-foreground max-w-md text-center">
				This is a placeholder page inside the protected app zone. Replace this
				with your application content.
			</p>
		</div>
	)
}
