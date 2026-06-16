import type { Metadata } from 'next'
import type { Playground } from '@/services'
import { SITE } from '@/lib/seo'

type RouteParams = { id: string; locale: string }
type Props = {
	params: Promise<RouteParams>
	children: React.ReactNode
}

const LOCALE_TAG_BY_CODE: Record<string, string> = {
	en: 'en_US',
	uk: 'uk_UA',
}

const DEFAULT_OG_IMAGE = `${SITE.url}/opengraph-image`
const FALLBACK_DESCRIPTION =
	'Sports playground on Dvir — photos, ratings and reviews.'

const fetchPlayground = async (id: string): Promise<Playground | null> => {
	const backendUrl = process.env.BACKEND_URL ?? ''
	try {
		const response = await fetch(`${backendUrl}/api/playgrounds/${id}`, {
			cache: 'no-store',
		})
		if (!response.ok) return null
		const json = await response.json()
		return json.data ?? null
	} catch {
		return null
	}
}

const buildTitle = (playground: Playground): string => {
	if (playground.name) return playground.name
	const { fullAddress, street, city } = playground.address
	if (fullAddress) return fullAddress
	if (street && city) return `${street}, ${city}`
	if (city) return city
	return `${SITE.name} — sports playground`
}

const buildDescription = (playground: Playground): string => {
	if (playground.description) return playground.description
	const labels = playground.sports.map((sport) => sport.label).filter(Boolean)
	if (labels.length > 0) return labels.join(', ')
	return FALLBACK_DESCRIPTION
}

const buildImage = (playground: Playground): string => {
	const photo = playground.photos[0]
	return photo ? photo : DEFAULT_OG_IMAGE
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { id, locale } = await params
	const url = `${SITE.url}/sports-map/${id}`
	const playground = await fetchPlayground(id)

	if (!playground) {
		return {
			metadataBase: new URL(SITE.url),
			title: `${SITE.name} — sports playground`,
			alternates: { canonical: url },
		}
	}

	const title = buildTitle(playground)
	const description = buildDescription(playground)
	const image = buildImage(playground)
	const ogLocale = LOCALE_TAG_BY_CODE[locale] ?? 'uk_UA'
	const fullTitle = `${title} — ${SITE.name}`

	return {
		metadataBase: new URL(SITE.url),
		title: fullTitle,
		description,
		alternates: { canonical: url },
		openGraph: {
			title: fullTitle,
			description,
			url,
			siteName: SITE.name,
			locale: ogLocale,
			type: 'website',
			images: [{ url: image, width: 1200, height: 630, alt: title }],
		},
		twitter: {
			card: 'summary_large_image',
			title: fullTitle,
			description,
			images: [image],
		},
	}
}

export default function PlaygroundDetailLayout({ children }: Props) {
	return <>{children}</>
}
