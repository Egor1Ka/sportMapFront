import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { routing } from '@/i18n/routing'

export const SITE = {
	name: 'Dvir',
	url: process.env.NEXT_PUBLIC_SITE_URL || 'https://dvir.app',
	twitter: '@dvir',
	keywords: [
		'sports playgrounds',
		'sports map',
		'basketball court near me',
		'football pitch',
		'community sports',
		'playground reviews',
		'qr code playground',
	],
} as const

const LOCALE_TAG_BY_CODE: Record<string, string> = {
	en: 'en_US',
	uk: 'uk_UA',
}

const buildLanguagesMap = (path: string) => {
	const entries = routing.locales.map((code) => [code, `${SITE.url}${path}`] as const)
	return Object.fromEntries(entries)
}

type PageMetadataInput = {
	titleKey: string
	descriptionKey: string
	path: string
	locale: string
	noIndex?: boolean
	imagePath?: string
}

const resolveImageUrl = (path: string | undefined): string => {
	const safePath = path ?? '/opengraph-image'
	if (safePath.startsWith('http')) return safePath
	return `${SITE.url}${safePath}`
}

export async function buildPageMetadata({
	titleKey,
	descriptionKey,
	path,
	locale,
	noIndex = false,
	imagePath,
}: PageMetadataInput): Promise<Metadata> {
	const t = await getTranslations('seo')
	const title = t(titleKey)
	const description = t(descriptionKey)
	const url = `${SITE.url}${path}`
	const ogImage = resolveImageUrl(imagePath)
	const ogLocale = LOCALE_TAG_BY_CODE[locale] ?? 'en_US'

	return {
		metadataBase: new URL(SITE.url),
		title,
		description,
		keywords: [...SITE.keywords],
		alternates: {
			canonical: url,
			languages: buildLanguagesMap(path),
		},
		openGraph: {
			title,
			description,
			url,
			siteName: SITE.name,
			locale: ogLocale,
			type: 'website',
			images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
		},
		twitter: {
			card: 'summary_large_image',
			title,
			description,
			creator: SITE.twitter,
			images: [ogImage],
		},
		robots: noIndex
			? { index: false, follow: false }
			: { index: true, follow: true },
	}
}
