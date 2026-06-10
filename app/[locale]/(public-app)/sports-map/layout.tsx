import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'
import { buildPageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
	const locale = await getLocale()
	return buildPageMetadata({
		titleKey: 'sportsMap.title',
		descriptionKey: 'sportsMap.description',
		path: '/sports-map',
		locale,
	})
}

export default function SportsMapLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return <>{children}</>
}
