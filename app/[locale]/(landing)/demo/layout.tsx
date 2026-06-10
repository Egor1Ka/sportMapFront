import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'
import { buildPageMetadata } from '@/lib/seo'

export async function generateMetadata(): Promise<Metadata> {
	const locale = await getLocale()
	return buildPageMetadata({
		titleKey: 'demo.title',
		descriptionKey: 'demo.description',
		path: '/demo',
		locale,
	})
}

export default function DemoLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return <>{children}</>
}
