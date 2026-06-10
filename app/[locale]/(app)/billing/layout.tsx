import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'
import { buildPageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
	const locale = await getLocale()
	return buildPageMetadata({
		titleKey: 'billing.title',
		descriptionKey: 'billing.description',
		path: '/billing',
		locale,
		noIndex: true,
	})
}

export default function BillingLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return <>{children}</>
}
