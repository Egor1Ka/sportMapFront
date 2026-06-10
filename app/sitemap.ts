import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/seo'
import { routing } from '@/i18n/routing'

const PUBLIC_PATHS = [
	{ path: '/', priority: 1.0, changeFrequency: 'weekly' as const },
	{ path: '/sports-map', priority: 0.9, changeFrequency: 'daily' as const },
	{ path: '/demo', priority: 0.3, changeFrequency: 'monthly' as const },
]

const buildLanguagesMap = (path: string) => {
	const entries = routing.locales.map(
		(code) => [code, `${SITE.url}${path}`] as const,
	)
	return Object.fromEntries(entries)
}

const toSitemapEntry = ({
	path,
	priority,
	changeFrequency,
}: (typeof PUBLIC_PATHS)[number]) => ({
	url: `${SITE.url}${path}`,
	lastModified: new Date(),
	changeFrequency,
	priority,
	alternates: { languages: buildLanguagesMap(path) },
})

export default function sitemap(): MetadataRoute.Sitemap {
	return PUBLIC_PATHS.map(toSitemapEntry)
}
